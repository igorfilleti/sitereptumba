/* =====================================================================
   MODELOS 3D — masculina: "Men Regular Apparel Fit Sporty T-Shirt" de BINARYCLOTH
   (CC BY 4.0, manga raglan); feminina (baby look): "T-Shirt for Female" de DaaGHrii
   (CC BY 4.0). Carrega o glTF, deixa a camisa de frente e em metros, e "assa" o
   design da Rep. Tumba na textura dela.
   ===================================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DESIGN, COR, limitesListras } from './estampa.js';

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

const ALTURA = .74;   // comprimento do tamanho M masculino de referência (m)

/* ---------- os dois modelos: masculina e baby look ----------
   Os dois ganham os mesmos atributos por ponto, usados pelo forno e pela física:
     aPeca    0 gola · 1 manga · 2 frente · 3 costas
     aGola    distância até o decote (m); a faixa preta vai onde ela é menor que ext.golaFaixa
     dManga   fração da manga, do punho (0) ao ombro (1)
     aMangaUV posição (m) na manga esquerda: em volta dela e ao longo dela, a partir da divisa
              vermelha/branca de cima (onde vai a Unicamp); 99 fora dela */
const PERFIS = {
  // masculina M de referência: 52 × 74 cm; manga raglan no 3D, pintada como a manga da camisa real
  M: { url: new URL('../../assets/models/masculina/camisa.glb', import.meta.url).href, altura: ALTURA, ref: [52, ALTURA * 100], giro: 0, mangaReal: true },
  // baby look M de referência: 44 × 60 cm
  F: { url: new URL('../../assets/models/feminina/scene.gltf', import.meta.url).href, altura: .60, ref: [44, 60], giro: Math.PI / 2 }
};
export const referencia = g => PERFIS[g].ref;

export async function carregarModelo(g = 'M') {
  const P = PERFIS[g];
  const gltf = await new GLTFLoader().loadAsync(P.url);
  gltf.scene.updateMatrixWorld(true);
  let malha = null;
  gltf.scene.traverse(o => { if (o.isMesh) malha = o; });
  if (!malha) throw new Error('Malha da camisa não encontrada no modelo.');

  // coordenadas de projeto: x centrado, y = 0 na barra, z centrado, em metros
  const geo = malha.geometry.clone();
  // atributos compactados (inteiros normalizados) viram float antes de mexer na malha
  for (const [nome, at] of Object.entries(geo.attributes)) if (!(at.array instanceof Float32Array)) {
    const v = new Float32Array(at.count * at.itemSize);
    for (let i = 0; i < at.count; i++) for (let c = 0; c < at.itemSize; c++) v[i * at.itemSize + c] = at.getComponent(i, c);
    geo.setAttribute(nome, new THREE.BufferAttribute(v, at.itemSize));
  }
  geo.applyMatrix4(malha.matrixWorld);
  orientar(geo, P.giro);
  geo.computeBoundingBox();
  const b = geo.boundingBox, k = P.altura / (b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geo.scale(k, k, k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();
  const { max } = geo.boundingBox;
  const ext = { X: Math.max(max.x, -geo.boundingBox.min.x) + .005, Z: Math.max(max.z, -geo.boundingBox.min.z) + .005, L: P.altura };
  prepararModelo(geo, ext, P);
  // altura usada nas listras do tronco: a própria altura, salvo ajuste do modelo
  if (!geo.attributes.aY) geo.setAttribute('aY', new THREE.BufferAttribute(Float32Array.from({ length: geo.attributes.position.count }, (_, i) => geo.attributes.position.getY(i)), 1));

  const material = new THREE.MeshPhysicalMaterial({
    normalMap: trama(), normalScale: new THREE.Vector2(.18, .18),
    roughness: .88, metalness: 0,
    side: THREE.DoubleSide
  });
  // o avesso (visto pela gola e pelas mangas) é claro e levemente sombreado, como no tecido sublimado
  pesosBalanco(geo, ext);
  material.onBeforeCompile = sh => {
    balancoNoShader(sh);
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.86), .75) * .8;');
  };
  // a sombra usa a mesma deformação do balanço
  const profundidade = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  profundidade.onBeforeCompile = balancoNoShader;
  return { geo, material, profundidade, ext };
}

/* gira para as mangas ficarem em x (a baby look vem com elas em z) e a frente
   (o lado de decote mais fundo) para +z */
function orientar(geo, giro) {
  geo.rotateY(giro);
  geo.computeBoundingBox();
  const p = geo.attributes.position, b = geo.boundingBox, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, h = b.max.y - b.min.y;
  // no meio (x ≈ 0), o ponto mais alto de cada lado: a frente tem o decote mais baixo
  let topoF = -1e9, topoT = -1e9;
  for (let i = 0; i < p.count; i++) {
    if (Math.abs(p.getX(i) - cx) > .02 * h) continue;
    if (p.getZ(i) > cz) topoF = Math.max(topoF, p.getY(i)); else topoT = Math.max(topoT, p.getY(i));
  }
  if (topoF > topoT) geo.rotateY(Math.PI);
}

/* classifica as peças pelas ilhas do molde e mede tudo pela geometria */
function prepararModelo(geo, ext, perfil) {
  const p = geo.attributes.position, idx = geo.index.array, n = p.count;
  const pos = i => [p.getX(i), p.getY(i), p.getZ(i)];
  // ilhas (peças): pontos ligados por triângulos
  const pai = Int32Array.from({ length: n }, (_, i) => i);
  const raiz = i => { while (pai[i] !== i) i = pai[i] = pai[pai[i]]; return i; };
  for (let t = 0; t < idx.length; t += 3) { const a = raiz(idx[t]); pai[raiz(idx[t + 1])] = a; pai[raiz(idx[t + 2])] = a; }
  const ilhas = new Map();
  for (let i = 0; i < n; i++) { const r = raiz(i), s = ilhas.get(r) || { r, n: 0, x: 0, z: 0 }; s.n++; s.x += p.getX(i); s.z += p.getZ(i); ilhas.set(r, s); }
  const grandes = [...ilhas.values()].filter(s => s.n > n * .03).map(s => ({ ...s, cx: s.x / s.n, cz: s.z / s.n }));
  // mangas: as duas ilhas mais afastadas do meio em x; o resto é tronco, frente em +z
  const mangas = [...grandes].sort((a, b) => Math.abs(b.cx) - Math.abs(a.cx)).slice(0, 2);
  const tipo = new Map();
  for (const s of [...ilhas.values()]) {
    const gr = grandes.find(q => q.r === s.r);
    tipo.set(s.r, !gr ? 'gola' : mangas.includes(gr) ? (gr.cx > 0 ? 'mangaE' : 'mangaD') : gr.cz > 0 ? 'frente' : 'costas');
  }
  const tipoDe = i => tipo.get(raiz(i));

  // bordas abertas (decote, barra, bocas): arestas de um só triângulo, juntando pontos na mesma posição (costuras)
  const grupo = new Int32Array(n), mapa = new Map();
  for (let i = 0; i < n; i++) {
    const ch = pos(i).map(c => Math.round(c * 1e4)).join(',');
    if (!mapa.has(ch)) mapa.set(ch, mapa.size);
    grupo[i] = mapa.get(ch);
  }
  const ng = mapa.size, arestas = new Map();
  for (let t = 0; t < idx.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = grupo[idx[t + e]], b = grupo[idx[t + (e + 1) % 3]], ch = a < b ? a * ng + b : b * ng + a;
    arestas.set(ch, (arestas.get(ch) || 0) + 1);
  }
  const naBorda = new Uint8Array(ng);
  for (const [ch, c] of arestas) if (c === 1) { naBorda[Math.floor(ch / ng)] = 1; naBorda[ch % ng] = 1; }

  ext.escalaReal = ESCALA_REAL_F;
  ext.golaFaixa = DESIGN.gola.espessura * ext.escalaReal;
  const pc = new Float32Array(n), gl = new Float32Array(n).fill(9), dm = new Float32Array(n), mu = new Float32Array(n * 2).fill(99);
  for (let i = 0; i < n; i++) { const t = tipoDe(i); pc[i] = t === 'gola' ? 0 : t === 'frente' ? 2 : t === 'costas' ? 3 : 1; }
  // peças pequenas no alto (ribana da gola, fita da nuca): são a gola, inteira preta, e o tronco não leva faixa
  const temGola = pc.includes(0);

  // mangas: eixo do centro da boca (a borda aberta; a cava é costurada no tronco) ao centro da manga
  const fr = listrasManga(), compr = [];
  for (const lado of ['mangaE', 'mangaD']) {
    const ids = []; for (let i = 0; i < n; i++) if (tipoDe(i) === lado) ids.push(i);
    // borda do punho: a borda aberta da peça longe do corpo (a raglan também tem borda aberta na gola)
    const sxl = lado === 'mangaE' ? 1 : -1, todas = ids.filter(i => naBorda[grupo[i]]);
    const xMax = Math.max(...todas.map(i => sxl * p.getX(i))), borda = todas.filter(i => sxl * p.getX(i) > xMax * .6);
    const media = l => l.reduce((s, i) => [s[0] + p.getX(i) / l.length, s[1] + p.getY(i) / l.length, s[2] + p.getZ(i) / l.length], [0, 0, 0]);
    const A = media(borda);
    let u = [0, 0, 0], proj = null, ini = 0, comp = 0;
    const eixo = B => {
      const e = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...e); u = e.map(c => c / L);
      proj = q => (q[0] - A[0]) * u[0] + (q[1] - A[1]) * u[1] + (q[2] - A[2]) * u[2];
      ini = -1e9; for (const i of borda) ini = Math.max(ini, proj(pos(i)));   // ponto da boca mais perto do corpo
    };
    eixo(media(ids));
    if (perfil.mangaReal) {
      // manga raglan no 3D: a arte segue a camisa real, com a costura da manga vertical na largura do
      // tronco (onde ficam as costuras laterais). O que a peça raglan tem para dentro disso vira tronco
      const sx = Math.sign(A[0]);
      let xCava = 0; for (let i = 0; i < n; i++) if (pc[i] >= 2 && tipoDe(i) !== lado) xCava = Math.max(xCava, sx * p.getX(i));
      for (const i of ids) if (sx * p.getX(i) < xCava) pc[i] = p.getZ(i) > 0 ? 2 : 3;
      eixo(media(ids.filter(i => pc[i] === 1)));
      // a costura em volta da manga: plano perpendicular ao eixo, passando pela ponta do ombro (o alto da
      // manga na largura do tronco). Assim as faixas dão a volta inteira na manga, também por baixo
      let ponta = null;
      for (const i of ids) if (Math.abs(sx * p.getX(i) - xCava) < .01 && (ponta === null || p.getY(i) > p.getY(ponta))) ponta = i;
      comp = proj(pos(ponta)) - ini;
      // manga: dentro da volta do braço e para fora da linha vertical do ombro (a listra da gola vai até ela)
      // (a linha vertical só vale na altura da listra da gola; ela é conferida de novo no forno)
      for (const i of ids) pc[i] = proj(pos(i)) - ini < comp && sx * p.getX(i) >= xCava ? 1 : p.getZ(i) > 0 ? 2 : 3;
      // o forno traça essa costura por posição (linha limpa, sem degraus dos triângulos)
      (ext.costuras ||= {})[lado] = [...u, u[0] * A[0] + u[1] * A[1] + u[2] * A[2] + ini + comp];
      (ext.cavaX ||= {})[lado] = xCava;
    } else {
      // como na baby look: a fração vai da boca ao ponto da manga mais longe dela (alto da cava)
      let fim = -1e9; for (const i of ids) if (pc[i] === 1) fim = Math.max(fim, proj(pos(i)));
      comp = fim - ini;
    }
    compr.push(comp);
    const naManga = perfil.mangaReal ? ids : ids.filter(i => pc[i] === 1);
    for (const i of naManga) dm[i] = Math.min(1, Math.max(0, (proj(pos(i)) - ini) / comp));
    if (lado === 'mangaE') {
      // lado de fora: o ponto mais afastado do corpo no meio da manga; "em volta" é perpendicular ao eixo
      let fora = null; for (const i of naManga) if (dm[i] > .4 && dm[i] < .7 && (fora === null || p.getX(i) > p.getX(fora))) fora = i;
      const F0 = pos(fora), nn = [1, 0, 0];
      let ea = [nn[1] * u[2] - nn[2] * u[1], nn[2] * u[0] - nn[0] * u[2], nn[0] * u[1] - nn[1] * u[0]];
      const la = Math.hypot(...ea) * (ea[2] > 0 ? -1 : 1); ea = ea.map(c => c / la);   // vista de fora (+x), a direita da logo é -z
      const topo = ini + fr.z * comp;
      const rf = [F0[0] - A[0] - u[0] * proj(F0), F0[1] - A[1] - u[1] * proj(F0), F0[2] - A[2] - u[2] * proj(F0)], raio = Math.hypot(...rf);
      for (const i of naManga) {
        const q = pos(i);
        // em volta: arco a partir do lado de fora (ângulo × raio), para a logo não encolher na curva
        const r = [q[0] - A[0] - u[0] * proj(q), q[1] - A[1] - u[1] * proj(q), q[2] - A[2] - u[2] * proj(q)];
        const ang = Math.atan2(r[0] * ea[0] + r[1] * ea[1] + r[2] * ea[2], (r[0] * rf[0] + r[1] * rf[1] + r[2] * rf[2]) / raio);
        mu[i * 2] = ang * raio; mu[i * 2 + 1] = proj(q) - topo;
      }
      ext.manga = { W: .2, H: .2, vermAlt: (fr.z - fr.y) * comp };
    }
  }

  // decote: borda do tronco (já com o ombro da raglan) no alto, perto do meio
  const decote = [];
  for (let i = 0; i < n; i++) if (naBorda[grupo[i]] && pc[i] >= 2 && p.getY(i) > ext.L * .75 && Math.abs(p.getX(i)) < ext.X * .5) decote.push(pos(i));
  if (!decote.length) for (let i = 0; i < n; i++) if (pc[i] === 0) decote.push(pos(i));
  // listras do tronco: do recorte do decote com o ombro (o ponto mais alto dele) até a barra
  const alturaOmbro = Math.max(...decote.map(q => q[1]));
  ext.listras = limitesListras(alturaOmbro);
  if (perfil.mangaReal) {
    // o ombro do 3D cai até a cava; na camisa real (plana) a listra vermelha da gola cobre o ombro todo até
    // a costura da manga. A altura usada nas listras sobe junto com a queda do ombro, diluída na listra branca
    // logo abaixo da do ombro, para a listra do ombro manter a largura até a cava
    const passo = .01, topo = [];
    for (let i = 0; i < n; i++) if (pc[i] >= 2) { const b = Math.floor(Math.abs(p.getX(i)) / passo); topo[b] = Math.max(topo[b] || 0, p.getY(i)); }
    let xNeck = 0; topo.forEach((t, b) => { if (t >= topo[xNeck] || 0) xNeck = b; });
    for (let b = xNeck + 1; b < topo.length; b++) topo[b] = Math.min(topo[b] ?? topo[b - 1], topo[b - 1]);
    const topoEm = x => { const f = Math.abs(x) / passo - .5, b = Math.max(0, Math.min(topo.length - 2, Math.floor(f))), t = Math.min(1, Math.max(0, f - b)); return b < xNeck ? alturaOmbro : (topo[b] ?? alturaOmbro) * (1 - t) + (topo[b + 1] ?? topo[b]) * t; };
    const yL = new Float32Array(n), base = ext.listras[8];   // só da listra branca do nome para cima: as de baixo ficam retas
    for (let i = 0; i < n; i++) {
      const y = p.getY(i), t = Math.min(alturaOmbro, topoEm(p.getX(i)));
      const w = Math.min(1, Math.max(0, (y - base) / (alturaOmbro - base)));
      // nas costas, a nuca não pode ficar mais alta que os lados (degrau): o centro desce até o nível de
      // logo depois do pescoço, e a listra vermelha cobre esse pedaço
      const queda = Math.max(0, alturaOmbro - t), quedaNuca = p.getZ(i) < 0 ? Math.max(0, alturaOmbro - Math.min(alturaOmbro, topoEm((xNeck + 5) * passo))) : 0;
      yL[i] = y + Math.max(queda, quedaNuca) * w;
    }
    // borda de cima da listra do nome no meio das costas (onde aY = limite): a estampa centraliza o nome nela
    { const q = Math.max(0, alturaOmbro - Math.min(alturaOmbro, topoEm((xNeck + 5) * passo))), k = q / (alturaOmbro - base);
      ext.nomeTopo = (ext.listras[9] + k * base) / (1 + k); }
    geo.setAttribute('aY', new THREE.BufferAttribute(yL, 1));
  }
  if (!temGola) for (let i = 0; i < n; i++) {
    if (pc[i] === 1) continue;
    const [x, y, z] = pos(i);
    if (y < ext.L * .6) continue;
    let d = 9; for (const q of decote) d = Math.min(d, (x - q[0]) ** 2 + (y - q[1]) ** 2 + (z - q[2]) ** 2);
    gl[i] = Math.sqrt(d);
  }
  geo.userData.compManga = compr;
  // com costura traçada no forno, a peça da manga inteira vai como manga (o forno decide pelo plano)
  if (ext.costuras) for (let i = 0; i < n; i++) if (tipoDe(i) === 'mangaE' || tipoDe(i) === 'mangaD') pc[i] = 1;
  geo.setAttribute('aPeca', new THREE.BufferAttribute(pc, 1));
  geo.setAttribute('aGola', new THREE.BufferAttribute(gl, 1));
  geo.setAttribute('dManga', new THREE.BufferAttribute(dm, 1));
  geo.setAttribute('aMangaUV', new THREE.BufferAttribute(mu, 2));
}
const ESCALA_REAL_F = .806;   // real → modelo (medida da manga real de 28,2 cm num modelo de 74 cm)

/* ---------- física leve do pano (mola) ----------
   Não é simulação de tecido (pesada demais para o site): cada ponto tem um peso de balanço
   (0 = preso nos ombros e na gola; 1 = barra) e, na placa de vídeo, gira um pouco em volta do eixo
   da camisa, com ondulação; a barra também se abre (girando rápido) e balança para a frente e para trás
   (inclinando). Os valores vêm de molas calculadas no viewer. */
export const BALANCO = { uTorcao: { value: 0 }, uAbertura: { value: 0 }, uPendulo: { value: 0 }, uTempo: { value: 0 } };
function pesosBalanco(geo, ext) {
  const p = geo.attributes.position, pc = geo.attributes.aPeca, gl = geo.attributes.aGola, dm = geo.attributes.dManga, w = new Float32Array(p.count);
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (let i = 0; i < p.count; i++) {
    const k = pc.getX(i);
    if (k === 0 || gl.getX(i) < ext.golaFaixa) w[i] = 0;
    else if (k === 1) w[i] = .9 * Math.pow(1 - dm.getX(i), 1.3);              // a boca da manga balança mais
    else w[i] = Math.pow(1 - suave(0, ext.L * .8, p.getY(i)), 1.6);                    // do peito (preso) à barra (solta)
  }
  geo.setAttribute('aBalanco', new THREE.BufferAttribute(w, 1));
}
function balancoNoShader(sh) {
  for (const [nome, u] of Object.entries(BALANCO)) sh.uniforms[nome] = u;
  sh.vertexShader = `attribute float aBalanco;
uniform float uTorcao, uAbertura, uPendulo, uTempo;
float onda(vec3 p) { return 1. + .55 * sin(p.y * 10. - uTempo * 6. + p.x * 6.) + .2 * sin(p.y * 23. + uTempo * 9.); }
float anguloBalanco(vec3 p) { return uTorcao * aBalanco * onda(p); }
vec2 girarBalanco(vec2 v, float a) { float c = cos(a), s = sin(a); return vec2(c * v.x + s * v.y, -s * v.x + c * v.y); }
` + sh.vertexShader
    .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\n objectNormal.xz = girarBalanco(objectNormal.xz, anguloBalanco(position));')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.xz = girarBalanco(transformed.xz, anguloBalanco(position));' +
      // barra se abrindo para fora (como saia ao girar) e balançando para a frente/trás (pêndulo)
      '\n { float w2 = aBalanco * aBalanco; float lr = length(transformed.xz); if (lr > 1e-4) transformed.xz += transformed.xz / lr * uAbertura * w2 * onda(position);' +
      '\n   transformed.z += uPendulo * w2 * (.8 + .2 * onda(position)); }');
}

/* ---------- forno: pinta o design na textura, peça por peça ---------- */
const VS = `
uniform vec2 uDesloc;
attribute float dManga, aPeca, aGola, aY;
attribute vec2 aMangaUV;
varying vec3 vP; varying vec2 vMu; varying float vDm, vPeca, vGola, vY;
void main() {
  vP = position; vY = aY; vMu = aMangaUV; vDm = dManga; vPeca = aPeca; vGola = aGola;
  gl_Position = vec4(uv.x * 2. - 1. + uDesloc.x, uv.y * 2. - 1. + uDesloc.y, 0., 1.);
}`;
const FS = `
uniform sampler2D tFrente, tCostas, tManga, tRelevo, tBrilho;
uniform int uModo;   // 0 = cor; 1 = relevo (altura dos bordados); 2 = rugosidade (borracha mais lisa)
uniform vec3 uExt;
uniform float uGolaFaixa, uCava;   // uCava > 0: costura da manga traçada pelos planos uCostE/uCostD
uniform vec4 uCostE, uCostD;      // normal (do punho para o corpo) e posição da costura
uniform vec2 uCavaX;              // linha vertical do ombro (|x|), esquerda e direita   // espessura da faixa preta da gola (em aGola)
uniform vec2 uMangaWH;
uniform float uLim[10];   // limites entre as 11 listras do tronco, da barra para cima
uniform vec3 uManga;   // fim do punho, da branca e da vermelha (fração da manga, a partir do punho)
uniform vec3 cBranco, cVermelho, cPreto;
varying vec3 vP; varying vec2 vMu; varying float vDm, vPeca, vGola, vY;
vec4 adesivo(sampler2D t, vec2 c) { return (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1.) ? vec4(0.) : texture2D(t, c); }
void main() {
  // tronco: listras horizontais (a da barra é vermelha), com borda suavizada
  // a da barra é vermelha; cada limite alterna a cor (borda suavizada)
  float w = max(fwidth(vY), 1e-5), verm = 1.;
  for (int i = 0; i < 10; i++) { float t = smoothstep(uLim[i] - w, uLim[i] + w, vY); verm += mod(float(i), 2.) < .5 ? -t : t; }
  vec3 c = mix(cBranco, cVermelho, verm);
  bool manga = vPeca > .5 && vPeca < 1.5, frente = vPeca > 1.5 && vPeca < 2.5;
  if (uCava > 0. && manga) { vec4 cs = vP.x > 0. ? uCostE : uCostD; manga = dot(vP, cs.xyz) < cs.w && (vY < uLim[9] || abs(vP.x) >= (vP.x > 0. ? uCavaX.x : uCavaX.y)); frente = !manga && vP.z > 0.; }
  float wg = max(fwidth(vGola), 1e-5), gola = vPeca < .5 ? 1. : 1. - smoothstep(uGolaFaixa - wg, uGolaFaixa + wg, vGola);
  if (manga) {   // manga, do punho ao ombro: preto, branca, vermelha, branca (paralelas ao punho)
    float wm = max(fwidth(vDm), 1e-4);
    c = mix(cBranco, cVermelho, smoothstep(uManga.y - wm, uManga.y + wm, vDm) * (1. - smoothstep(uManga.z - wm, uManga.z + wm, vDm)));
    c = mix(cPreto, c, smoothstep(uManga.x - wm, uManga.x + wm, vDm));
  }
  vec4 a = vec4(0.);
  // manga esquerda: o adesivo é desenhado no próprio molde, como na sublimação (fica reto e paralelo às listras)
  if (manga) { if (vMu.x < 90.) a = adesivo(tManga, vec2(.5 + vMu.x / uMangaWH.x, .5 + vMu.y / uMangaWH.y)); }
  else if (frente) a = adesivo(tFrente, vec2((vP.x + uExt.x) / (2. * uExt.x), vP.y / uExt.y));
  else a = adesivo(tCostas, vec2((uExt.x - vP.x) / (2. * uExt.x), vP.y / uExt.y));
  if (uModo == 2) {   // rugosidade: 1 = tecido; menor = mais liso (só na frente)
    vec4 b = frente ? adesivo(tBrilho, vec2((vP.x + uExt.x) / (2. * uExt.x), vP.y / uExt.y)) : vec4(0.);
    gl_FragColor = vec4(vec3(b.a > .5 ? b.g : 1.), 1.); return;
  }
  if (uModo == 1) {   // relevo: só os bordados da frente sobem
    float h = frente ? adesivo(tRelevo, vec2((vP.x + uExt.x) / (2. * uExt.x), vP.y / uExt.y)).r : 0.;
    gl_FragColor = vec4(vec3(h), 1.); return;
  }
  c = c * (1. - a.a) + a.rgb;   // adesivo com alfa pré-multiplicado
  c = mix(c, cPreto, gola);
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
  const relevo = new THREE.WebGLRenderTarget(tamanho, tamanho, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const rugosidade = new THREE.WebGLRenderTarget(tamanho / 2, tamanho / 2, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const tex = {};
  // alfa pré-multiplicado: nas bordas dos adesivos a filtragem não mistura o "preto transparente" do canvas,
  // então branco sobre listra branca funde no tecido, sem contorno cinza
  for (const [nome, cv] of Object.entries(telas)) { tex[nome] = new THREE.CanvasTexture(cv); tex[nome].minFilter = THREE.LinearFilter; tex[nome].generateMipmaps = false; tex[nome].premultiplyAlpha = true; }
  const hex = h => new THREE.Color().setRGB(...[1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255), THREE.LinearSRGBColorSpace);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
    uniforms: {
      tFrente: { value: tex.frente }, tCostas: { value: tex.costas }, tManga: { value: tex.manga }, tRelevo: { value: tex.relevo }, tBrilho: { value: tex.brilho }, uModo: { value: 0 },
      uExt: { value: new THREE.Vector3(ext.X, ext.L, ext.Z) }, uLim: { value: ext.listras },
      uManga: { value: listrasManga() }, uDesloc: { value: new THREE.Vector2() },
      uGolaFaixa: { value: ext.golaFaixa }, uCava: { value: ext.costuras ? 1 : 0 }, uCavaX: { value: new THREE.Vector2(ext.cavaX?.mangaE || 0, ext.cavaX?.mangaD || 0) }, uCostE: { value: new THREE.Vector4(...(ext.costuras?.mangaE || [0, 0, 0, 0])) }, uCostD: { value: new THREE.Vector4(...(ext.costuras?.mangaD || [0, 0, 0, 0])) }, uMangaWH: { value: new THREE.Vector2(ext.manga.W, ext.manga.H) },
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

  // completo = false (ao digitar): só a frente e as costas mudaram; refaz apenas a textura de cor
  // frente = false: só as costas mudaram (nome digitado)
  function assar(completo = true, frente = true) {
    for (const [nome, t] of Object.entries(tex)) if (completo || (nome === 'frente' && frente) || nome === 'costas') t.needsUpdate = true;
    const antes = renderer.getRenderTarget(), autoClear = renderer.autoClear;
    renderer.autoClear = false;
    const passadas = [[0, alvo, 0xffffff], [1, relevo, 0x000000], [2, rugosidade, 0xffffff]];
    for (const [modo, rt, fundo] of completo ? passadas : passadas.slice(0, 1)) {
      mat.uniforms.uModo.value = modo;
      renderer.setRenderTarget(rt);
      // ao digitar, as bordas estendidas das costuras (passadas deslocadas) não mudam: basta a passada final por cima
      if (completo) { renderer.setClearColor(fundo, 1); renderer.clear(); }
      for (const [x, y] of completo ? passos : [[0, 0]]) { mat.uniforms.uDesloc.value.set(x, y); renderer.render(cena, cam); }
    }
    renderer.autoClear = autoClear; renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(antes);
  }
  return { textura: alvo.texture, relevo: relevo.texture, rugosidade: rugosidade.texture, assar };
}

