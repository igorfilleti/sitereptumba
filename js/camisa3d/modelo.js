/* =====================================================================
   MODELO 3D — "FC Porto Shirt" de Carlos.Maciel (CC BY 4.0), sem a arte
   original (textura e relevo do Porto removidos). Carrega o glTF, deixa a camisa de frente e em metros, e
   "assa" o design da Rep. Tumba na textura dela.

   Peças do molde (UV) desse modelo:
     gola  v < .056 · mangas .056 ≤ v < .28 (esquerda de quem veste: u .38–.76)
     frente u < .5 · costas u ≥ .5 (v ≥ .28)
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DESIGN, COR } from './estampa.js';

/* trama do tecido dry-fit (mapa de normais gerado por código, repetido pelo molde) */
function trama() {
  const N = 128, cel = 8, alt = new Float32Array(N * N), data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ox = (Math.floor(y / cel) % 2) * cel / 2;
    const u = ((x + ox) % cel) / cel - .5, v = (y % cel) / cel - .5;
    alt[y * N + x] = Math.min(1, Math.hypot(u * 1.25, v) * 2.4);   // furinhos da malha
  }
  const h = (x, y) => alt[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 1.2, dy = (h(x, y + 1) - h(x, y - 1)) * 1.2, l = Math.hypot(dx, dy, 1);
    data.set([(-dx / l * .5 + .5) * 255, (dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255, 255], (y * N + x) * 4);
  }
  const t = new THREE.DataTexture(data, N, N);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(18, 18);  // 1 unidade do molde ≈ 1,1 m → ~4 mm por ponto
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

const URL_MODELO = new URL('../../assets/models/camisa/scene.gltf', import.meta.url).href;
const GIRO = -170 * Math.PI / 180;      // o arquivo vem girado; assim a frente fica para +z
export const ALTURA = .74;              // comprimento do tamanho M de referência (m)

export const peca = (u, v) => (v < .056 ? 'gola' : v < .28 ? 'manga' : u < .5 ? 'frente' : 'costas');

/* O modelo original tem gola redonda; a arte pede gola em U suave.
   Puxa a gola e o alto da frente para baixo até formar o U (o peito comprime
   suavemente) e estica a própria peça da gola até a espessura da camisa real,
   convertida para a escala do modelo. O U termina onde acaba o vermelho dos ombros. */
const GOLA_PECA_VISIVEL = .0091;   // espessura de frente por unidade de esticamento da peça da gola (medida na tela)
export const GOLA_V = {
  meia: .088, base: .5, curva: 1.7,                // curva > 1 arredonda o fundo (1 = V reto)
  fundo: DESIGN.ombro * DESIGN.faixa               // borda de baixo da gola = fim do vermelho dos ombros
};
const perfilGola = t => Math.pow(t, GOLA_V.curva);   // 0 no centro, 1 na lateral do decote
function golaV(geo, escalaReal) {
  const p = geo.attributes.position, uv = geo.attributes.uv, { meia, fundo, base } = GOLA_V;
  const estica = DESIGN.gola.espessura * escalaReal / GOLA_PECA_VISIVEL;
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // decote original da frente: altura máxima da frente por faixa de 1 cm em x
  const passo = .01, n = Math.round(meia / passo) + 2, decote = new Array(2 * n + 1).fill(0);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (peca(uv.getX(i), uv.getY(i)) === 'frente' && Math.abs(x) <= (n - .5) * passo) { const b = Math.round(x / passo) + n; decote[b] = Math.max(decote[b], p.getY(i)); }
  }
  const N = x => { const f = x / passo + n, i = Math.max(0, Math.min(2 * n - 1, Math.floor(f))), t = f - i; return decote[i] * (1 - t) + decote[i + 1] * t; };
  const bordaY = (N(-meia) + N(meia)) / 2;
  const alvo = x => fundo + (bordaY - fundo) * perfilGola(Math.min(1, Math.abs(x) / meia));   // nova linha do U
  // um único campo de deslocamento para o peito e a gola: pontos da costura andam juntos
  const D = (x, y) => (Math.abs(x) >= meia || y <= base ? 0 : Math.min(0, alvo(x) - N(x)) * Math.min(1, (y - base) / (N(x) - base)));

  // a gola é uma tira dobrada: as duas bordas (v mínimo e máximo) ficam na costura e o
  // meio da tira é a borda de cima. Para cada posição ao longo da tira (u), guarda a
  // costura original; a gola acompanha a costura e só estica para cima a partir dela.
  let vMin = 1, vMax = 0, uMin = 1, uMax = 0;
  const gola = [];
  for (let i = 0; i < p.count; i++) if (peca(uv.getX(i), uv.getY(i)) === 'gola') {
    gola.push(i); vMin = Math.min(vMin, uv.getY(i)); vMax = Math.max(vMax, uv.getY(i)); uMin = Math.min(uMin, uv.getX(i)); uMax = Math.max(uMax, uv.getX(i));
  }
  const vMeio = (vMin + vMax) / 2, nu = 240, cost = Array.from({ length: nu }, () => [0, 0, 0]);
  const binU = u => Math.max(0, Math.min(nu - 1, Math.floor((u - uMin) / (uMax - uMin) * nu)));
  for (const i of gola) if (Math.abs(uv.getY(i) - vMeio) / (vMax - vMeio) > .92) { const c = cost[binU(uv.getX(i))]; c[0] += p.getX(i); c[1] += p.getY(i); c[2]++; }
  for (let b = 0; b < nu; b++) if (!cost[b][2]) {                        // faixas sem pontos: usa a vizinha mais próxima
    for (let k = 1; k < nu; k++) { const o = cost[b - k]?.[2] ? cost[b - k] : cost[b + k]?.[2] ? cost[b + k] : null; if (o) { cost[b] = [o[0] / o[2], o[1] / o[2], 1]; break; } }
  }
  const costura = cost.map(c => [c[0] / c[2], c[1] / c[2]]);

  const novoY = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), k = peca(uv.getX(i), uv.getY(i));
    novoY[i] = y;
    if (k === 'frente') novoY[i] = y + D(x, y);
    else if (k === 'gola') {
      const [xc, yc] = costura[binU(uv.getX(i))];
      const frente = suave(-.03, -.005, p.getZ(i));                     // 0 na gola de trás, 1 na da frente
      const s = (estica - 1) * (1 - suave(.6, 1, Math.abs(xc) / meia)); // estica no U, some nas laterais
      novoY[i] = y + frente * (D(x, yc) + (y - yc) * s);              // x próprio: casa exato com o peito
    }
  }
  for (let i = 0; i < p.count; i++) p.setY(i, novoY[i]);
  p.needsUpdate = true;
  geo.computeBoundingBox();
}
/* Nas mangas as listras seguem a manga (paralelas ao punho), não o tronco.
   As linhas de v constante do molde são paralelas à boca da manga, mas v não
   cresce por igual ao longo dela; por isso cada vértice ganha a distância real até a
   boca, medida no eixo da manga e dividida pelo comprimento total da manga (0 = punho,
   1 = ombro, no ponto mais longo): atributo "dManga". */
function distanciaManga(geo) {
  const p = geo.attributes.position, uv = geo.attributes.uv, d = new Float32Array(p.count);
  const passo = .005;
  for (const lado of [u => u < .38, u => u >= .38 && u < .76]) {
    const idx = [];
    for (let i = 0; i < p.count; i++) if (peca(uv.getX(i), uv.getY(i)) === 'manga' && lado(uv.getX(i))) idx.push(i);
    const vMin = Math.min(...idx.map(i => uv.getY(i))), vMax = Math.max(...idx.map(i => uv.getY(i)));
    const nb = Math.ceil((vMax - vMin) / passo) + 1, soma = Array.from({ length: nb }, () => [0, 0, 0, 0]);
    for (const i of idx) { const s = soma[Math.floor((uv.getY(i) - vMin) / passo)]; s[0] += p.getX(i); s[1] += p.getY(i); s[2] += p.getZ(i); s[3]++; }
    const centro = soma.map(s => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : null));
    const ini = centro.find(Boolean), fim = [...centro].reverse().find(Boolean);
    const e = [fim[0] - ini[0], fim[1] - ini[1], fim[2] - ini[2]], l = Math.hypot(...e);
    // distância de cada faixa de v até a boca, ao longo do eixo (sempre crescente)
    let ult = 0;
    const dist = centro.map(c => (ult = c ? Math.max(ult, ((c[0] - ini[0]) * e[0] + (c[1] - ini[1]) * e[1] + (c[2] - ini[2]) * e[2]) / l) : ult));
    for (const i of idx) {
      const f = (uv.getY(i) - vMin) / passo - .5, b = Math.max(0, Math.min(nb - 2, Math.floor(f))), t = Math.min(1, Math.max(0, f - b));
      d[i] = (dist[b] * (1 - t) + dist[b + 1] * t) / dist[nb - 1];
    }
    (geo.userData.compManga ||= []).push(dist[nb - 1]);
  }
  geo.setAttribute('dManga', new THREE.BufferAttribute(d, 1));
}

export async function carregarModelo() {
  const gltf = await new GLTFLoader().loadAsync(URL_MODELO);
  gltf.scene.updateMatrixWorld(true);
  let malha = null;
  gltf.scene.traverse(o => { if (o.isMesh && o.material.name === 'Louis_Vuitton_Original') malha = o; });
  if (!malha) throw new Error('Malha da camisa não encontrada no modelo.');

  // coordenadas de projeto: x centrado, y = 0 na barra, z centrado, em metros
  const geo = malha.geometry.clone();
  geo.applyMatrix4(malha.matrixWorld);
  geo.rotateY(GIRO);
  geo.computeBoundingBox();
  const b = geo.boundingBox, k = ALTURA / (b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geo.scale(k, k, k);
  geo.computeBoundingBox();
  const { max } = geo.boundingBox;
  const ext = { X: Math.max(max.x, -geo.boundingBox.min.x) + .005, Z: Math.max(max.z, -geo.boundingBox.min.z) + .005, L: ALTURA };
  distanciaManga(geo);
  // camisa real → modelo: a manga real mede DESIGN.real.manga; a do modelo, o que foi medido acima
  const compManga = geo.userData.compManga.reduce((s, v) => s + v, 0) / geo.userData.compManga.length;
  const escalaReal = compManga / DESIGN.real.manga;
  ext.escalaReal = escalaReal;                     // a estampa converte medidas reais com isso
  golaV(geo, escalaReal);

  const material = new THREE.MeshPhysicalMaterial({
    normalMap: trama(), normalScale: new THREE.Vector2(.18, .18),
    roughness: .88, metalness: 0,
    side: THREE.DoubleSide
  });
  // o avesso (visto pela gola e pelas mangas) é claro e levemente sombreado, como no tecido sublimado
  material.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86), .75) * .8;');
  };
  return { geo, material, ext };
}

/* ---------- forno: pinta o design na textura, peça por peça ---------- */
const VS = `
uniform vec2 uDesloc;
attribute float dManga;
varying vec3 vP; varying vec2 vUv; varying float vDm;
void main() {
  vP = position; vUv = uv; vDm = dManga;
  gl_Position = vec4(uv.x * 2. - 1. + uDesloc.x, uv.y * 2. - 1. + uDesloc.y, 0., 1.);
}`;
const FS = `
uniform sampler2D tFrente, tCostas, tManga;
uniform vec3 uExt; uniform float uFaixa, uOmbro;
uniform vec3 uManga;   // fim do punho, da branca e da vermelha (fração da manga, a partir do punho)
uniform vec3 cBranco, cVermelho, cPreto;
varying vec3 vP; varying vec2 vUv; varying float vDm;
vec4 adesivo(sampler2D t, vec2 c) { return (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1.) ? vec4(0.) : texture2D(t, c); }
void main() {
  // tronco: listras horizontais (a da barra é vermelha), com borda suavizada
  float s = vP.y / (2. * uFaixa), w = max(fwidth(s), 1e-4);
  float verm = 1. - smoothstep(.25 - w, .25 + w, abs(fract(s) - .25));
  verm = max(verm, smoothstep(uOmbro - w * 2. * uFaixa, uOmbro + w * 2. * uFaixa, vP.y));   // ombros vermelhos
  vec3 c = mix(cBranco, cVermelho, verm);
  bool gola = vUv.y < .056, manga = !gola && vUv.y < .28;
  if (manga) {   // manga, do punho ao ombro: preto, branca, vermelha, branca (paralelas ao punho)
    float wm = max(fwidth(vDm), 1e-4);
    c = mix(cBranco, cVermelho, smoothstep(uManga.y - wm, uManga.y + wm, vDm) * (1. - smoothstep(uManga.z - wm, uManga.z + wm, vDm)));
    c = mix(cPreto, c, smoothstep(uManga.x - wm, uManga.x + wm, vDm));
  }
  vec4 a = vec4(0.);
  if (gola) c = cPreto;
  else if (manga) { if (vUv.x > .38 && vUv.x < .76) a = adesivo(tManga, vec2((uExt.z - vP.z) / (2. * uExt.z), vP.y / uExt.y)); }
  else if (vUv.x < .5) a = adesivo(tFrente, vec2((vP.x + uExt.x) / (2. * uExt.x), vP.y / uExt.y));
  else a = adesivo(tCostas, vec2((uExt.x - vP.x) / (2. * uExt.x), vP.y / uExt.y));
  c = mix(c, a.rgb, a.a);
  gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);   // saída linear; o alvo sRGB codifica de volta
}`;

/* faixas da manga (cm, do punho ao ombro), proporcionais ao comprimento do modelo */
function listrasManga() {
  const m = DESIGN.manga.listras, total = m.punho + m.branca1 + m.vermelha + m.branca2;
  return new THREE.Vector3(m.punho / total, (m.punho + m.branca1) / total, (m.punho + m.branca1 + m.vermelha) / total);
}

export function criarForno(renderer, geo, ext, telas, tamanho = 2048) {
  const alvo = new THREE.WebGLRenderTarget(tamanho, tamanho, {
    colorSpace: THREE.SRGBColorSpace, generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter
  });
  alvo.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const tex = {};
  for (const [nome, cv] of Object.entries(telas)) { tex[nome] = new THREE.CanvasTexture(cv); tex[nome].minFilter = THREE.LinearFilter; tex[nome].generateMipmaps = false; }
  const hex = h => new THREE.Color().setRGB(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), THREE.LinearSRGBColorSpace);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    uniforms: {
      tFrente: { value: tex.frente }, tCostas: { value: tex.costas }, tManga: { value: tex.manga },
      uExt: { value: new THREE.Vector3(ext.X, ext.L, ext.Z) }, uFaixa: { value: DESIGN.faixa }, uOmbro: { value: DESIGN.ombro * DESIGN.faixa },
      uManga: { value: listrasManga() }, uDesloc: { value: new THREE.Vector2() },
      cBranco: { value: hex(COR.branco) }, cVermelho: { value: hex(COR.vermelho) }, cPreto: { value: hex(COR.preto) }
    }
  });
  const cena = new THREE.Scene(), cam = new THREE.Camera();
  cena.add(new THREE.Mesh(geo, mat));
  // desenha deslocado em volta antes da passada final: estende as bordas das peças
  // e evita frestas nas costuras quando a textura é reduzida (mipmaps)
  const passos = [];
  for (const r of [3, 1.5]) for (let i = 0; i < 8; i++) { const t = i / 8 * Math.PI * 2; passos.push([Math.cos(t) * r * 2 / tamanho, Math.sin(t) * r * 2 / tamanho]); }
  passos.push([0, 0]);

  function assar() {
    for (const t of Object.values(tex)) t.needsUpdate = true;
    const antes = renderer.getRenderTarget(), autoClear = renderer.autoClear;
    renderer.setRenderTarget(alvo);
    renderer.setClearColor(0xffffff, 1); renderer.clear();
    renderer.autoClear = false;
    for (const [x, y] of passos) { mat.uniforms.uDesloc.value.set(x, y); renderer.render(cena, cam); }
    renderer.autoClear = autoClear; renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(antes);
  }
  return { textura: alvo.texture, assar };
}
