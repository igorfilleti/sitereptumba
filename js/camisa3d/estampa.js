/* =====================================================================
   ESTAMPA — o design da camisa desenhado num canvas que vira textura.
   Segue a arte aprovada da Icone Sports (gola V e punhos pretos,
   listras largas, quadros brancos atrás dos números).
   Metade esquerda = frente, metade direita = costas (vistas de fora).
   Posições em metros (y = 0 na barra; x > 0 = lado esquerdo de quem veste).
   ===================================================================== */
const COR = { branco: '#f5f5f3', vermelho: '#e3141c', preto: '#0d0d0d' };
const FONTE_NUM = '"Saira Extra Condensed","Saira Condensed","Arial Narrow",sans-serif';
const FONTE_NOME = '"Saira Condensed","Saira Extra Condensed","Arial Narrow",sans-serif';

/* proporções medidas na arte (fração do comprimento L ou metros × escala da modelagem) */
const DESIGN = {
  faixa: .064,                                            // altura de cada listra; a de baixo é vermelha
  golaV: { abertura: .085, profundidade: .11, largura: .02 },
  golaCostas: .02,
  punho: .03,
  frente: {
    icone:  { x: -.098, y: .745, larg: .085 },
    escudo: { x: .098,  y: .75,  larg: .07 },
    numero: { y: .56, alt: .075, quadro: [.11, 1] }        // quadro: largura (m) e altura (em listras)
  },
  costas: {
    nome:   { y: .85, alt: .046, largMax: .3 },
    numero: { y: .6,  alt: .23, largMax: .24, quadro: [.2, .24] },
    rep:    { y: .33, larg: .26 }
  },
  unicamp: { larg: .052 }                                 // só na manga esquerda de quem veste
};

export function criarEstampa(meia = 1600) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  function desenhar(info, img, texto) {
    const { m, sil, maxX, L } = info, k = meia / (2 * maxX), s = m.escala;
    const W = meia * 2, H = Math.round(L * k);
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    const px = (lado, x, y) => [lado === 'frente' ? (x + maxX) * k : meia + (maxX - x) * k, (L - y) * k];
    const caminho = (lado, pts) => { ctx.beginPath(); pts.forEach(([x, y], i) => { const [X, Y] = px(lado, x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); };
    const ret = (lado, cx, cy, w, h) => { const [X, Y] = px(lado, cx - w / 2 * (lado === 'frente' ? 1 : -1), cy + h / 2); ctx.fillRect(X, Y, w * k, h * k); };

    // tecido: listras horizontais (a da barra é vermelha)
    const f = DESIGN.faixa * s;
    ctx.fillStyle = COR.branco; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = COR.vermelho;
    for (let y = 0; y < L + f; y += 2 * f) ctx.fillRect(0, (L - y - f) * k, W, f * k);
    const faixaDe = y => Math.floor(y / f);                 // índice da listra (par = vermelha)

    // punhos pretos nas duas mangas (faixa paralela à boca da manga)
    ctx.fillStyle = COR.preto;
    const p = DESIGN.punho * s, { A, d, n } = sil, cm = m.manga.comp;
    for (const lado of ['frente', 'costas']) for (const sx of [1, -1]) {
      const B = [A[0] + d[0] * cm, A[1] + d[1] * cm], C = [B[0] + n[0] * m.manga.boca, B[1] + n[1] * m.manga.boca];
      const ext = .03;                                    // passa um pouco da borda para cobrir o arredondado
      const pts = [
        [B[0] - d[0] * p - n[0] * ext, B[1] - d[1] * p - n[1] * ext], [B[0] + d[0] * ext - n[0] * ext, B[1] + d[1] * ext - n[1] * ext],
        [C[0] + d[0] * ext + n[0] * ext, C[1] + d[1] * ext + n[1] * ext], [C[0] - d[0] * p + n[0] * ext, C[1] - d[1] * p + n[1] * ext]
      ].map(([x, y]) => [x * sx, y]);
      caminho(lado, pts); ctx.closePath(); ctx.fill();
    }

    // gola: V preta na frente, faixa arredondada nas costas
    const gv = DESIGN.golaV, ab = gv.abertura * s, pr = gv.profundidade * s;
    ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.strokeStyle = COR.preto;
    ctx.lineWidth = gv.largura * s * 2 * k;
    caminho('frente', [[-ab - .01, L + .01], [0, L - pr], [ab + .01, L + .01]]); ctx.stroke();
    const costas = [];
    for (let i = -12; i <= 12; i++) { const t = i / 12 * Math.PI / 2; costas.push([m.gola * Math.sin(t), L - m.decote * Math.cos(t)]); }
    ctx.lineWidth = DESIGN.golaCostas * s * 2 * k; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    caminho('costas', costas); ctx.stroke();
    // dentro do V: o avesso das costas, na sombra
    const [gx, gy] = px('frente', 0, L);
    const grad = ctx.createLinearGradient(gx, gy, gx, gy + pr * k);
    grad.addColorStop(0, '#d8d8d6'); grad.addColorStop(1, '#8c8c8e');
    caminho('frente', [[-ab, L + .01], [0, L - pr], [ab, L + .01]]); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    const imagem = (lado, im, x, y, larg, rot = 0) => {
      if (!im) return;
      const [X, Y] = px(lado, x, y), w = larg * k, h = w * im.height / im.width;
      ctx.save(); ctx.translate(X, Y); ctx.rotate(rot); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
    };
    const txt = (lado, str, x, y, alt, largMax, fonte, peso) => {
      if (!str) return;
      const [X, Y] = px(lado, x, y);
      let fs = alt * k / .72;
      ctx.font = `${peso} ${fs}px ${fonte}`;
      const w = ctx.measureText(str).width;
      if (w > largMax * k) { fs *= largMax * k / w; ctx.font = `${peso} ${fs}px ${fonte}`; }
      const mt = ctx.measureText(str);
      const off = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 || fs * .36;
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = COR.preto;
      ctx.fillText(str, X, Y + off);
    };
    const larguraNum = (str, alt) => { ctx.font = `800 ${alt * k / .72}px ${FONTE_NUM}`; return ctx.measureText(str).width / k; };

    const num = texto.numero || '10', nome = (texto.nome || 'JOGADOR').toUpperCase();
    const F = DESIGN.frente, B = DESIGN.costas;

    // frente
    imagem('frente', img.icone, F.icone.x * s, L * F.icone.y, F.icone.larg * s);
    imagem('frente', img.escudo, F.escudo.x * s, L * F.escudo.y, F.escudo.larg * s);
    {
      const yc = (faixaDe(L * F.numero.y) + .5) * f;          // centraliza na listra vermelha mais próxima
      const yN = faixaDe(yc) % 2 ? yc - f : yc;
      const w = Math.max(F.numero.quadro[0] * s, larguraNum(num, F.numero.alt * s) + .03 * s);
      ctx.fillStyle = COR.branco; ret('frente', 0, yN, w, f * F.numero.quadro[1]);
      txt('frente', num, 0, yN, F.numero.alt * s, w - .02 * s, FONTE_NUM, 800);
    }

    // costas
    txt('costas', nome, 0, L * B.nome.y, B.nome.alt * s, B.nome.largMax * s, FONTE_NOME, 700);
    {
      const alt = B.numero.alt * s, w = Math.max(B.numero.quadro[0] * s, larguraNum(num, alt) + .03 * s);
      ctx.fillStyle = COR.branco; ret('costas', 0, L * B.numero.y, Math.min(w, .34 * s), B.numero.quadro[1] * s);
      txt('costas', num, 0, L * B.numero.y, alt, B.numero.largMax * s * (num.length > 2 ? 1.35 : 1), FONTE_NUM, 800);
    }
    imagem('costas', img.rep, 0, L * B.rep.y, B.rep.larg * s);

    // Unicamp na manga esquerda de quem veste (x > 0), visível pela frente e pelas costas
    const a = m.manga.ang * Math.PI / 180;
    const ux = A[0] + d[0] * cm * .42 + n[0] * m.manga.boca * .5, uy = A[1] + d[1] * cm * .42 + n[1] * m.manga.boca * .5;
    imagem('frente', img.unicamp, ux, uy, DESIGN.unicamp.larg * s, a);
    imagem('costas', img.unicamp, ux, uy, DESIGN.unicamp.larg * s, -a);
    return canvas;
  }
  return { canvas, desenhar };
}
