/* =====================================================================
   ESTAMPA — o design da camisa desenhado num canvas que vira textura.
   Metade esquerda = frente, metade direita = costas (vistas de fora).
   Posições em metros (y = 0 na barra), convertidas para pixels aqui.
   ===================================================================== */
const COR = { branco: '#f4f4f2', vermelho: '#cc0f1a', preto: '#0d0d0d', golaPreta: '#111113' };
const FONTE = '"Saira","Saira Condensed","Arial Narrow",sans-serif';
const escalaNumero = s => (s.length <= 2 ? 1 : s.length === 3 ? .8 : .66);

export function criarEstampa(meia = 1600) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function desenhar(info, img, texto) {
    const { m, sil, maxX, L } = info, k = meia / (2 * maxX), s = m.escala;
    const W = meia * 2, H = Math.round(L * k);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const px = (lado, x, y) => [lado === 'frente' ? (x + maxX) * k : meia + (maxX - x) * k, (L - y) * k];

    // tecido: listras horizontais vermelhas e brancas
    ctx.fillStyle = COR.branco; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COR.vermelho;
    for (let y = 0; y < L; y += m.listra) ctx.fillRect(0, (L - y - m.listra / 2) * k, W, m.listra / 2 * k);

    // gola
    const curva = (lado, prof) => {
      const pts = [];
      for (let i = -12; i <= 12; i++) { const t = i / 12 * Math.PI / 2; pts.push(px(lado, m.gola * Math.sin(t), L - prof * Math.cos(t))); }
      return pts;
    };
    const tracar = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
    ctx.lineJoin = ctx.lineCap = 'round'; ctx.strokeStyle = COR.golaPreta;
    ctx.lineWidth = .052 * k; tracar(curva('costas', m.decote)); ctx.stroke();
    ctx.lineWidth = .044 * k; tracar(curva('frente', m.decoteFrente)); ctx.stroke();
    // abertura da gola na frente: o avesso das costas, na sombra
    const abertura = [...curva('frente', m.decoteFrente), ...curva('frente', m.decote).reverse()];
    const [gx, gy] = px('frente', 0, L);
    const grad = ctx.createLinearGradient(gx, gy, gx, gy + m.decoteFrente * k);
    grad.addColorStop(0, '#3a3a3e'); grad.addColorStop(1, '#141416');
    tracar(abertura); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    const imagem = (lado, im, x, y, larg, rot = 0) => {
      if (!im) return;
      const [X, Y] = px(lado, x, y), w = larg * k, h = w * im.height / im.width;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    };
    const txt = (lado, str, x, y, alt, largMax) => {
      if (!str) return;
      const [X, Y] = px(lado, x, y);
      let f = alt * k / .72;
      ctx.font = `700 ${f}px ${FONTE}`;
      const w = ctx.measureText(str).width;
      if (w > largMax * k) { f *= largMax * k / w; ctx.font = `700 ${f}px ${FONTE}`; }
      const mt = ctx.measureText(str);
      const off = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 || f * .36;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = COR.preto;
      ctx.fillText(str, X, Y + off);
    };

    const num = texto.numero || '10', nome = (texto.nome || 'JOGADOR').toUpperCase();
    // frente: escudo no peito esquerdo de quem veste + número pequeno no centro
    imagem('frente', img.escudo, .098 * s, L * .79, .095 * s);
    txt('frente', num, 0, L * .63, .07 * s * escalaNumero(num), .16 * s);
    // costas: nome, número e "Rep. Tumba"
    txt('costas', nome, 0, L * .8, .044 * s, .27 * s);
    txt('costas', num, 0, L * .585, .19 * s * escalaNumero(num), .28 * s);
    imagem('costas', img.rep, 0, L * .36, .2 * s);
    // mangas: logo da Unicamp, alinhado com a manga
    const a = m.manga.ang * Math.PI / 180;
    for (const lado of [1, -1]) {
      const cx = sil.A[0] + sil.d[0] * m.manga.comp * .5 + sil.n[0] * m.manga.boca * .5;
      const cy = sil.A[1] + sil.d[1] * m.manga.comp * .5 + sil.n[1] * m.manga.boca * .5;
      imagem('frente', img.unicamp, cx * lado, cy, .066 * s, a * lado);
    }
    return canvas;
  }
  return { canvas, desenhar };
}
