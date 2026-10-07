/* =====================================================================
   MODELO PROVISÓRIO — silhueta de camisa "inflada" (frente + costas)
   Gerada por código só até chegar o modelo 3D definitivo (.glb).
   Medidas em metros, no tamanho de referência de cada modelagem.
   ===================================================================== */
import * as THREE from 'three';

export const MODELAGENS = {
  M: {
    ref: [52, 74],          // peitoral e comprimento (cm) do tamanho de referência
    meia: .26, L: .74, cava: .66, cintura: 1, ombro: .225,
    gola: .085, decote: .03,
    manga: { comp: .2, ang: 45, boca: .165 },
    raio: .065, listra: .106, escala: 1
  },
  F: {
    ref: [44, 60],
    meia: .22, L: .60, cava: .65, cintura: .88, ombro: .19,
    gola: .075, decote: .028,
    manga: { comp: .13, ang: 42, boca: .14 },
    raio: .055, listra: .088, escala: .88
  }
};

/* contorno fechado (anti-horário), suavizado com Chaikin */
function silhueta(m) {
  const { meia: w, L } = m, yA = L * m.cava, a = m.manga.ang * Math.PI / 180;
  const d = [Math.cos(a), -Math.sin(a)], n = [Math.sin(a), Math.cos(a)];
  const A = [w * 1.01, yA];
  const B = [A[0] + d[0] * m.manga.comp, A[1] + d[1] * m.manga.comp];
  const C = [B[0] + n[0] * m.manga.boca, B[1] + n[1] * m.manga.boca];
  const dir = [[0, 0], [w * .97, .004], [w * m.cintura, L * .4], [w, L * .55], A, B, C, [m.ombro, L - .018]];
  for (let i = 0; i <= 6; i++) {                       // decote das costas
    const t = i / 6 * Math.PI / 2;
    dir.push([m.gola * Math.cos(t), L - m.decote * Math.sin(t)]);
  }
  dir.pop();                                            // o ponto x=0 entra uma vez só
  const esq = dir.slice(1).reverse().map(([x, y]) => [-x, y]);
  let p = [...dir, [0, L - m.decote], ...esq];
  for (let k = 0; k < 3; k++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a0 = p[i], a1 = p[(i + 1) % p.length];
      q.push([a0[0] * .75 + a1[0] * .25, a0[1] * .75 + a1[1] * .25], [a0[0] * .25 + a1[0] * .75, a0[1] * .25 + a1[1] * .75]);
    }
    p = q;
  }
  return { poly: p, A, B, C, n, d };
}

/* distância até o contorno, ponto mais próximo e se está dentro */
function medir(poly, x, y) {
  let best = Infinity, qx = 0, qy = 0, dentro = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ax, ay] = poly[j], [bx, by] = poly[i];
    if ((by > y) !== (ay > y) && x < (ax - bx) * (y - by) / (ay - by) + bx) dentro = !dentro;
    const ex = bx - ax, ey = by - ay, l2 = ex * ex + ey * ey || 1e-12;
    const t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
    const px = ax + ex * t, py = ay + ey * t, dd = (x - px) ** 2 + (y - py) ** 2;
    if (dd < best) { best = dd; qx = px; qy = py; }
  }
  return { d: Math.sqrt(best), qx, qy, dentro };
}

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function construirCamisa(g, resolucao = 170) {
  const m = MODELAGENS[g];
  const sil = silhueta(m);
  const maxX = Math.max(...sil.poly.map(p => p[0])), L = m.L, R = m.raio;
  const e = .012, x0 = -maxX - e, x1 = maxX + e, y0 = -e, y1 = L + e;
  const cols = resolucao, rows = Math.round(resolucao * (y1 - y0) / (x1 - x0));

  // perfil: borda arredondada (quarto de círculo) + volume do tronco + leves dobras
  const altura = d => (d >= R ? R : Math.sqrt(R * R - (R - d) * (R - d)));
  const volume = (x, y, d, frente) => {
    const t = Math.max(0, 1 - (x / m.meia) ** 2);
    const peito = frente ? .048 * (.75 + .25 * suave(L * .2, L * .7, y)) : .036;
    return peito * Math.sqrt(t) * suave(0, R * 1.6, d);
  };
  const dobras = (x, y, d) => {
    const k = Math.min(1, d / R);
    const barra = .0045 * Math.sin(y * 38 + 2.5 * Math.sin(x * 7)) * (1 - suave(0, L * .32, y));
    const cava = .003 * Math.sin((Math.abs(x) * .8 - y) * 42) * Math.exp(-(((Math.abs(x) - m.meia) / .07) ** 2 + ((y - L * m.cava) / .1) ** 2));
    return (barra + cava) * k;
  };

  const nv = cols * rows, pos = new Float32Array(nv * 6), uv = new Float32Array(nv * 4), dentro = new Uint8Array(nv);
  const span = 2 * maxX;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    let x = x0 + (x1 - x0) * i / (cols - 1), y = y0 + (y1 - y0) * j / (rows - 1);
    const r = medir(sil.poly, x, y);
    let zf = 0, zb = 0;
    if (r.dentro) {
      dentro[k] = 1;
      const h = altura(r.d), w = dobras(x, y, r.d);
      zf = h + volume(x, y, r.d, true) + w;
      zb = h + volume(x, y, r.d, false) - w * .6;
    } else { x = r.qx; y = r.qy; }
    pos.set([x, y - L / 2, zf], k * 3);                      // frente
    pos.set([x, y - L / 2, -zb], (nv + k) * 3);             // costas
    const v = y / L;
    uv.set([(x + maxX) / span * .5, v], k * 2);              // frente: metade esquerda da textura
    uv.set([.5 + (maxX - x) / span * .5, v], (nv + k) * 2);  // costas: metade direita (espelhada)
  }

  const idx = [];
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
    const a = j * cols + i, b = a + 1, c = a + cols + 1, dd = a + cols;
    if (dentro[a] | dentro[b] | dentro[c]) idx.push(a, b, c, nv + a, nv + c, nv + b);
    if (dentro[a] | dentro[c] | dentro[dd]) idx.push(a, c, dd, nv + a, nv + dd, nv + c);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, m, sil, maxX, L };
}
