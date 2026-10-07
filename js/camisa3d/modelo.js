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
const PUNHO_V = .105;                   // ~3 cm de punho: a barra da manga é dobrada e ocupa o início do molde

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

  const material = new THREE.MeshPhysicalMaterial({
    normalMap: trama(), normalScale: new THREE.Vector2(.18, .18),
    roughness: .82, metalness: 0,
    sheen: .25, sheenRoughness: .6, sheenColor: new THREE.Color(0xffffff),
    side: THREE.DoubleSide
  });
  // o avesso (visto pela gola e pelas mangas) fica mais escuro, como na sombra
  material.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb *= .62;');
  };
  return { geo, material, ext };
}

/* ---------- forno: pinta o design na textura, peça por peça ---------- */
const VS = `
uniform vec2 uDesloc;
varying vec3 vP; varying vec2 vUv;
void main() {
  vP = position; vUv = uv;
  gl_Position = vec4(uv.x * 2. - 1. + uDesloc.x, uv.y * 2. - 1. + uDesloc.y, 0., 1.);
}`;
const FS = `
uniform sampler2D tFrente, tCostas, tManga;
uniform vec3 uExt; uniform float uFaixa, uPunhoV;
uniform vec3 cBranco, cVermelho, cPreto;
varying vec3 vP; varying vec2 vUv;
vec4 adesivo(sampler2D t, vec2 c) { return (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1.) ? vec4(0.) : texture2D(t, c); }
void main() {
  // listras horizontais (a da barra é vermelha), com borda suavizada
  float s = vP.y / (2. * uFaixa), w = max(fwidth(s), 1e-4);
  float verm = 1. - smoothstep(.25 - w, .25 + w, abs(fract(s) - .25));
  vec3 c = mix(cBranco, cVermelho, verm);
  bool gola = vUv.y < .056, manga = !gola && vUv.y < .28;
  vec4 a = vec4(0.);
  if (gola || (manga && vUv.y < uPunhoV)) c = cPreto;
  else if (manga) { if (vUv.x > .38 && vUv.x < .76) a = adesivo(tManga, vec2((uExt.z - vP.z) / (2. * uExt.z), vP.y / uExt.y)); }
  else if (vUv.x < .5) a = adesivo(tFrente, vec2((vP.x + uExt.x) / (2. * uExt.x), vP.y / uExt.y));
  else a = adesivo(tCostas, vec2((uExt.x - vP.x) / (2. * uExt.x), vP.y / uExt.y));
  c = mix(c, a.rgb, a.a);
  gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);   // saída linear; o alvo sRGB codifica de volta
}`;

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
      uExt: { value: new THREE.Vector3(ext.X, ext.L, ext.Z) }, uFaixa: { value: DESIGN.faixa },
      uPunhoV: { value: PUNHO_V }, uDesloc: { value: new THREE.Vector2() },
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
