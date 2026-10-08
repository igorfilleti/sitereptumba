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

// camisa.glb: só a camisa, simplificada para ~15 mil triângulos (gltf-transform/meshoptimizer) e compactada.
// As normais foram suavizadas (60 passadas, fora do site): a luz vê um tecido liso, sem as dobras do
// modelo original, e o formato do tronco fica intacto (nenhum ponto da malha mudou de lugar).
const URL_MODELO = new URL('../../assets/models/camisa/camisa.glb', import.meta.url).href;
const GIRO = -170 * Math.PI / 180;      // o arquivo vem girado; assim a frente fica para +z
export const ALTURA = .74;              // comprimento do tamanho M de referência (m)

export const peca = (u, v) => (v < .056 ? 'gola' : v < .28 ? 'manga' : u < .5 ? 'frente' : 'costas');

/* O modelo original tem gola redonda; a arte pede gola em U suave.
   Puxa a gola e o alto da frente para baixo até formar o U (o peito comprime
   suavemente) e estica a própria peça da gola até a espessura da camisa real,
   convertida para a escala do modelo. O U termina onde acaba o vermelho dos ombros. */
const GOLA_PECA_VISIVEL = .0091;   // espessura de frente por unidade de esticamento da peça da gola (medida na tela)
export const GOLA_V = {
  meia: .088, base: .5, curva: 1.7                 // curva > 1 arredonda o fundo (1 = V reto)
};
const perfilGola = t => Math.pow(t, GOLA_V.curva);   // 0 no centro, 1 na lateral do decote
// fundoDe(bordaY): recebe a altura do recorte da gola com o ombro e devolve onde o U termina
function golaV(geo, escalaReal, fundoDe) {
  const p = geo.attributes.position, uv = geo.attributes.uv, { meia, base } = GOLA_V;
  const estica = DESIGN.gola.espessura * escalaReal / GOLA_PECA_VISIVEL;
  const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // decote original da frente: altura máxima da frente por faixa de 1 cm em x
  const passo = .01, n = Math.round(meia / passo) + 2, decote = new Array(2 * n + 1).fill(0);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    if (peca(uv.getX(i), uv.getY(i)) === 'frente' && Math.abs(x) <= (n - .5) * passo) { const b = Math.round(x / passo) + n; decote[b] = Math.max(decote[b], p.getY(i)); }
  }
  const N = x => { const f = x / passo + n, i = Math.max(0, Math.min(2 * n - 1, Math.floor(f))), t = f - i; return decote[i] * (1 - t) + decote[i + 1] * t; };
  const bordaY = (N(-meia) + N(meia)) / 2, fundo = fundoDe(bordaY);
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
   As listras são impressas no molde (UV), que é o molde de costura: cada vértice ganha a fração
   da manga em v, da dobra da barra (0) ao topo (1): atributo "dManga". O comprimento pelo eixo
   (compManga) é a base da escala real ÷ modelo.
   Para a manga esquerda guarda também onde fica o lado de fora no molde (u) e em que v
   cada fração da manga cai ali, para posicionar a logo da Unicamp no próprio molde. */
const MOLDE_M_POR_UV = 1.17;   // o molde (UV) do modelo é o molde de costura: ~1,17 m por unidade, igual em u e v (medido)
function distanciaManga(geo) {
  const p = geo.attributes.position, uv = geo.attributes.uv, d = new Float32Array(p.count);
  const passo = .005;
  for (const [nomeLado, lado] of [['direita', u => u < .38], ['esquerda', u => u >= .38 && u < .76]]) {
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
    // listras impressas no molde, como na fábrica: a fração cresce por igual em v, da dobra da
    // barra (onde a manga começa a aparecer; abaixo dela é a bainha dobrada para dentro) até o topo
    const bDobra = dist.findIndex(x => x > .005), vDobra = vMin + Math.max(0, bDobra - .5) * passo;
    const vDaFracao = fr => vDobra + fr * (vMax - vDobra);
    for (const i of idx) d[i] = Math.min(1, Math.max(0, (uv.getY(i) - vDobra) / (vMax - vDobra)));
    (geo.userData.compManga ||= []).push(dist[nb - 1]);
    if (nomeLado === 'esquerda') {
      // u do lado de fora (x máximo no meio da manga)
      let fora = null;
      for (const i of idx) if (d[i] > .45 && d[i] < .65 && (!fora || p.getX(i) > p.getX(fora))) fora = i;
      // sentido: visto de fora (+x), a direita da tela é -z; vê se u cresce para lá
      let suz = 0, suu = 0; const uc = uv.getX(fora), zc = p.getZ(fora);
      for (const i of idx) { const du = uv.getX(i) - uc; if (Math.abs(du) < .03 && Math.abs(d[i] - d[fora]) < .05) { suz += du * (p.getZ(i) - zc); suu += du * du; } }
      geo.userData.mangaEsq = { uc, vDaFracao, comprimentoMolde: (vMax - vDobra) * MOLDE_M_POR_UV, sentidoU: suz / (suu || 1) < 0 ? 1 : -1 };
    }
  }
  geo.setAttribute('dManga', new THREE.BufferAttribute(d, 1));
}
/* ---------- os dois modelos: masculino (FC Porto Shirt) e baby look (T-Shirt for Female) ----------
   Os dois ganham os mesmos atributos por ponto, usados pelo forno e pela física:
     aPeca    0 gola · 1 manga · 2 frente · 3 costas
     aGola    distância até o decote (m); a faixa preta vai onde ela é menor que ext.golaFaixa
     dManga   fração da manga, do punho (0) ao ombro (1)
     aMangaUV posição (m) na manga esquerda: em volta dela e ao longo dela, a partir da divisa
              vermelha/branca de cima (onde vai a Unicamp); 99 fora dela */
const PERFIS = {
  M: { url: URL_MODELO, altura: ALTURA, ref: [52, ALTURA * 100] },
  // baby look M de referência: 44 × 60 cm
  F: { url: new URL('../../assets/models/feminina/scene.gltf', import.meta.url).href, altura: .60, ref: [44, 60], giro: Math.PI / 2 },
  // teste (?masc=2): "Men Regular Apparel Fit Sporty T-Shirt" de BINARYCLOTH (CC BY 4.0), manga raglan
  M2: { url: new URL('../../assets/models/masculina2/camisa.glb', import.meta.url).href, altura: ALTURA, ref: [52, ALTURA * 100], giro: 0 }
};
const TESTE_MASC = typeof location !== 'undefined' && new URLSearchParams(location.search).get('masc') === '2';
export const referencia = g => PERFIS[g].ref;

export async function carregarModelo(g = 'M') {
  if (g === 'M' && TESTE_MASC) g = 'M2';
  const P = PERFIS[g];
  const gltf = await new GLTFLoader().loadAsync(P.url);
  gltf.scene.updateMatrixWorld(true);
  let malha = null;
  gltf.scene.traverse(o => { if (o.isMesh && (g !== 'M' || o.material.name === 'Louis_Vuitton_Original')) malha = o; });
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
  if (g === 'M') geo.rotateY(GIRO); else orientar(geo, P.giro);
  geo.computeBoundingBox();
  const b = geo.boundingBox, k = P.altura / (b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geo.scale(k, k, k);
  if (!geo.attributes.normal) geo.computeVertexNormals();
  geo.computeBoundingBox();
  const { max } = geo.boundingBox;
  const ext = { X: Math.max(max.x, -geo.boundingBox.min.x) + .005, Z: Math.max(max.z, -geo.boundingBox.min.z) + .005, L: P.altura };
  if (g === 'M') prepararMasculina(geo, ext); else prepararFeminina(geo, ext);

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

function prepararMasculina(geo, ext) {
  distanciaManga(geo);
  // camisa real → modelo: a manga real mede DESIGN.real.manga; a do modelo, o que foi medido acima
  const compManga = geo.userData.compManga.reduce((s, v) => s + v, 0) / geo.userData.compManga.length;
  ext.escalaReal = compManga / DESIGN.real.manga;
  // adesivo da manga esquerda: 20 × 20 cm no molde, centrado no lado de fora, na divisa vermelha/branca de cima
  const fr = listrasManga(), me = geo.userData.mangaEsq, vTopo = me.vDaFracao(fr.z), vBaixo = me.vDaFracao(fr.y);
  ext.manga = { W: .2, H: .2, vermAlt: (vTopo - vBaixo) * MOLDE_M_POR_UV };   // a estampa converte medidas reais com isso
  // listras do tronco: do recorte da gola com o ombro até a barra; o U da gola termina no fim da listra do ombro
  golaV(geo, ext.escalaReal, ombro => { ext.listras = limitesListras(ombro); return ext.listras[ext.listras.length - 1]; });
  // a gola é peça própria no molde
  const uv = geo.attributes.uv, n = uv.count, pc = new Float32Array(n), gl = new Float32Array(n), mu = new Float32Array(n * 2).fill(99);
  const cod = { gola: 0, manga: 1, frente: 2, costas: 3 };
  for (let i = 0; i < n; i++) {
    const u = uv.getX(i), v = uv.getY(i), q = peca(u, v);
    pc[i] = cod[q]; gl[i] = q === 'gola' ? 0 : 1;
    if (q === 'manga' && u > .38 && u < .76) { mu[i * 2] = me.sentidoU * (u - me.uc) * MOLDE_M_POR_UV; mu[i * 2 + 1] = (v - vTopo) * MOLDE_M_POR_UV; }
  }
  ext.golaFaixa = .5;
  geo.setAttribute('aPeca', new THREE.BufferAttribute(pc, 1));
  geo.setAttribute('aGola', new THREE.BufferAttribute(gl, 1));
  geo.setAttribute('aMangaUV', new THREE.BufferAttribute(mu, 2));
}

/* baby look: o arquivo vem com as mangas no eixo z. Gira para as mangas ficarem em x e a frente
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

/* baby look: sem peça de gola no molde. Classifica as peças pelas ilhas do molde e mede tudo pela geometria */
function prepararFeminina(geo, ext) {
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
    tipo.set(s.r, !gr ? (s.z / s.n > 0 ? 'frente' : 'costas') : mangas.includes(gr) ? (gr.cx > 0 ? 'mangaE' : 'mangaD') : gr.cz > 0 ? 'frente' : 'costas');
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

  // decote: borda do tronco no alto, perto do meio
  const decote = [];
  for (let i = 0; i < n; i++) {
    const t = tipoDe(i);
    if (naBorda[grupo[i]] && (t === 'frente' || t === 'costas') && p.getY(i) > ext.L * .75 && Math.abs(p.getX(i)) < ext.X * .5) decote.push(pos(i));
  }
  // listras do tronco: do recorte do decote com o ombro (o ponto mais alto dele) até a barra
  ext.listras = limitesListras(Math.max(...decote.map(q => q[1])));
  ext.escalaReal = ESCALA_REAL_F;
  ext.golaFaixa = DESIGN.gola.espessura * ext.escalaReal;

  const pc = new Float32Array(n), gl = new Float32Array(n).fill(9), dm = new Float32Array(n), mu = new Float32Array(n * 2).fill(99);
  for (let i = 0; i < n; i++) {
    const t = tipoDe(i);
    pc[i] = t === 'frente' ? 2 : t === 'costas' ? 3 : 1;
    if (pc[i] === 1) continue;
    const [x, y, z] = pos(i);
    if (y < ext.L * .6) continue;
    let d = 9; for (const q of decote) d = Math.min(d, (x - q[0]) ** 2 + (y - q[1]) ** 2 + (z - q[2]) ** 2);
    gl[i] = Math.sqrt(d);
  }

  // mangas: eixo do centro da boca (a borda aberta; a cava é costurada no tronco) ao centro da manga
  const fr = listrasManga(), compr = [];
  for (const lado of ['mangaE', 'mangaD']) {
    const ids = []; for (let i = 0; i < n; i++) if (tipoDe(i) === lado) ids.push(i);
    const sx = lado === 'mangaE' ? 1 : -1, borda = ids.filter(i => naBorda[grupo[i]]);
    const media = l => l.reduce((s, i) => [s[0] + p.getX(i) / l.length, s[1] + p.getY(i) / l.length, s[2] + p.getZ(i) / l.length], [0, 0, 0]);
    const A = media(borda), B = media(ids);
    const e = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = Math.hypot(...e), u = e.map(c => c / L);
    const proj = q => (q[0] - A[0]) * u[0] + (q[1] - A[1]) * u[1] + (q[2] - A[2]) * u[2];
    // a fração vai da boca (o ponto dela mais perto do corpo) ao ponto da cava mais alto no ombro
    let ini = -1e9, fim = -1e9;
    for (const i of borda) ini = Math.max(ini, proj(pos(i)));
    for (const i of ids) fim = Math.max(fim, proj(pos(i)));
    const comp = fim - ini;
    compr.push(comp);
    for (const i of ids) dm[i] = Math.min(1, Math.max(0, (proj(pos(i)) - ini) / comp));
    if (lado === 'mangaE') {
      // lado de fora: o ponto mais afastado do corpo no meio da manga; "em volta" é perpendicular ao eixo e à normal ali
      let fora = null; for (const i of ids) if (dm[i] > .4 && dm[i] < .7 && (fora === null || p.getX(i) > p.getX(fora))) fora = i;
      const F0 = pos(fora), nn = [1, 0, 0];
      let ea = [nn[1] * u[2] - nn[2] * u[1], nn[2] * u[0] - nn[0] * u[2], nn[0] * u[1] - nn[1] * u[0]];
      const la = Math.hypot(...ea); ea = ea.map(c => c / la);
      const topo = ini + fr.z * comp;
      for (const i of ids) {
        const q = pos(i);
        // em volta: arco a partir do lado de fora (ângulo × raio), para a logo não encolher na curva
        const r = [q[0] - A[0] - u[0] * proj(q), q[1] - A[1] - u[1] * proj(q), q[2] - A[2] - u[2] * proj(q)];
        const rf = [F0[0] - A[0] - u[0] * proj(F0), F0[1] - A[1] - u[1] * proj(F0), F0[2] - A[2] - u[2] * proj(F0)];
        const raio = Math.hypot(...rf), ang = Math.atan2(r[0] * ea[0] + r[1] * ea[1] + r[2] * ea[2], (r[0] * rf[0] + r[1] * rf[1] + r[2] * rf[2]) / raio);
        mu[i * 2] = ang * raio; mu[i * 2 + 1] = proj(q) - topo;
      }
      ext.manga = { W: .2, H: .2, vermAlt: (fr.z - fr.y) * comp };
    }
  }
  geo.userData.compManga = compr;
  geo.setAttribute('aPeca', new THREE.BufferAttribute(pc, 1));
  geo.setAttribute('aGola', new THREE.BufferAttribute(gl, 1));
  geo.setAttribute('dManga', new THREE.BufferAttribute(dm, 1));
  geo.setAttribute('aMangaUV', new THREE.BufferAttribute(mu, 2));
}
const ESCALA_REAL_F = .806;   // real → modelo; a baby look usa a mesma relação medida na masculina

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
attribute float dManga, aPeca, aGola;
attribute vec2 aMangaUV;
varying vec3 vP; varying vec2 vMu; varying float vDm, vPeca, vGola;
void main() {
  vP = position; vMu = aMangaUV; vDm = dManga; vPeca = aPeca; vGola = aGola;
  gl_Position = vec4(uv.x * 2. - 1. + uDesloc.x, uv.y * 2. - 1. + uDesloc.y, 0., 1.);
}`;
const FS = `
uniform sampler2D tFrente, tCostas, tManga, tRelevo, tBrilho;
uniform int uModo;   // 0 = cor; 1 = relevo (altura dos bordados); 2 = rugosidade (borracha mais lisa)
uniform vec3 uExt;
uniform float uGolaFaixa;   // espessura da faixa preta da gola (em aGola)
uniform vec2 uMangaWH;
uniform float uLim[10];   // limites entre as 11 listras do tronco, da barra para cima
uniform vec3 uManga;   // fim do punho, da branca e da vermelha (fração da manga, a partir do punho)
uniform vec3 cBranco, cVermelho, cPreto;
varying vec3 vP; varying vec2 vMu; varying float vDm, vPeca, vGola;
vec4 adesivo(sampler2D t, vec2 c) { return (c.x < 0. || c.x > 1. || c.y < 0. || c.y > 1.) ? vec4(0.) : texture2D(t, c); }
void main() {
  // tronco: listras horizontais (a da barra é vermelha), com borda suavizada
  // a da barra é vermelha; cada limite alterna a cor (borda suavizada)
  float w = max(fwidth(vP.y), 1e-5), verm = 1.;
  for (int i = 0; i < 10; i++) { float t = smoothstep(uLim[i] - w, uLim[i] + w, vP.y); verm += mod(float(i), 2.) < .5 ? -t : t; }
  vec3 c = mix(cBranco, cVermelho, verm);
  bool manga = vPeca > .5 && vPeca < 1.5, frente = vPeca > 1.5 && vPeca < 2.5;
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
      uGolaFaixa: { value: ext.golaFaixa }, uMangaWH: { value: new THREE.Vector2(ext.manga.W, ext.manga.H) },
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
  function assar(completo = true) {
    for (const [nome, t] of Object.entries(tex)) if (completo || nome === 'frente' || nome === 'costas') t.needsUpdate = true;
    const antes = renderer.getRenderTarget(), autoClear = renderer.autoClear;
    renderer.autoClear = false;
    const passadas = [[0, alvo, 0xffffff], [1, relevo, 0x000000], [2, rugosidade, 0xffffff]];
    for (const [modo, rt, fundo] of completo ? passadas : passadas.slice(0, 1)) {
      mat.uniforms.uModo.value = modo;
      renderer.setRenderTarget(rt); renderer.setClearColor(fundo, 1); renderer.clear();
      for (const [x, y] of passos) { mat.uniforms.uDesloc.value.set(x, y); renderer.render(cena, cam); }
    }
    renderer.autoClear = autoClear; renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(antes);
  }
  return { textura: alvo.texture, relevo: relevo.texture, rugosidade: rugosidade.texture, assar };
}

