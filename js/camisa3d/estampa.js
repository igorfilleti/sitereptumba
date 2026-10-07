/* =====================================================================
   ESTAMPA — design da camisa, conforme a arte aprovada da Icone Sports.
   Listras, gola e punhos são pintados direto no modelo (ver modelo.js).
   Aqui ficam os "adesivos": três canvas projetados de frente, de costas
   e de lado (manga esquerda), com logos, nome e número.
   Medidas em metros: y = 0 na barra, x > 0 = lado esquerdo de quem veste.
   ===================================================================== */
export const COR = { branco: '#f5f5f3', vermelho: '#e3141c', preto: '#111111' };
const FONTE_NUM = '"Saira Extra Condensed","Saira Condensed","Arial Narrow",sans-serif';
const FONTE_NOME = '"Saira Condensed","Saira Extra Condensed","Arial Narrow",sans-serif';

export const DESIGN = {
  faixa: .0525,                                    // altura de cada listra; a da barra é vermelha
  ombro: 12,                                       // da 12ª listra para cima é tudo vermelho (ombros e gola)
  punho: .03,                                      // largura do punho preto
  frente: {
    icone:  { x: -.098, y: .745, larg: .085 },
    escudo: { x: .098,  y: .75,  larg: .07 },
    numero: { y: .603, alt: .07, quadro: .095 }    // quadro branco: largura mínima; altura = 1 listra
  },
  costas: {
    nome:   { y: .85, alt: .046, largMax: .3 },
    numero: { y: .6,  alt: .23, largMax: .24, quadro: [.2, .24] },
    rep:    { y: .33, larg: .22 }
  },
  manga: { unicamp: { z: -.025, y: .555, larg: .085 } }  // só na manga esquerda de quem veste
};

export function criarEstampa(resolucao = 1024) {
  const tela = () => document.createElement('canvas');
  const telas = { frente: tela(), costas: tela(), manga: tela() };

  /* ext = { X, Z, L }: meia largura, meia profundidade e altura do modelo (m) */
  function desenhar(ext, img, texto) {
    const { X, Z, L } = ext, f = DESIGN.faixa;
    const k = resolucao / (2 * X), km = resolucao / 2 / (2 * Z);
    const preparar = (c, w, h) => { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext('2d'); g.clearRect(0, 0, w, h); return g; };
    const gF = preparar(telas.frente, resolucao, Math.round(L * k));
    const gC = preparar(telas.costas, resolucao, Math.round(L * k));
    const gM = preparar(telas.manga, resolucao / 2, Math.round(L * km));
    const pos = { frente: (x, y) => [(x + X) * k, (L - y) * k], costas: (x, y) => [(X - x) * k, (L - y) * k] };
    const ctxDe = { frente: gF, costas: gC };

    const imagem = (g, im, X0, Y0, w) => { if (im) g.drawImage(im, X0 - w / 2, Y0 - w * im.height / im.width / 2, w, w * im.height / im.width); };
    const quadro = (lado, cx, cy, w, h) => { const [x0, y0] = pos[lado](lado === 'frente' ? cx - w / 2 : cx + w / 2, cy + h / 2); ctxDe[lado].fillStyle = COR.branco; ctxDe[lado].fillRect(x0, y0, w * k, h * k); };
    const medir = (g, str, alt, fonte, peso) => { g.font = `${peso} ${alt * k / .72}px ${fonte}`; return g.measureText(str).width / k; };
    const txt = (lado, str, x, y, alt, largMax, fonte, peso) => {
      if (!str) return;
      const g = ctxDe[lado], [X0, Y0] = pos[lado](x, y);
      let fs = alt * k / .72;
      g.font = `${peso} ${fs}px ${fonte}`;
      const w = g.measureText(str).width;
      if (w > largMax * k) { fs *= largMax * k / w; g.font = `${peso} ${fs}px ${fonte}`; }
      const mt = g.measureText(str), off = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 || fs * .36;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = COR.preto;
      g.fillText(str, X0, Y0 + off);
    };

    const num = texto.numero || '10', nome = (texto.nome || 'JOGADOR').toUpperCase();
    const F = DESIGN.frente, B = DESIGN.costas;

    // frente: "icone" no peito direito, escudo no esquerdo, número num quadro branco sobre a listra vermelha
    imagem(gF, img.icone, ...pos.frente(F.icone.x, L * F.icone.y), F.icone.larg * k);
    imagem(gF, img.escudo, ...pos.frente(F.escudo.x, L * F.escudo.y), F.escudo.larg * k);
    let i = Math.floor(L * F.numero.y / f); if (i % 2) i--;   // listras pares são vermelhas
    const yN = (i + .5) * f;
    const wN = Math.max(F.numero.quadro, medir(gF, num, F.numero.alt, FONTE_NUM, 800) + .03);
    quadro('frente', 0, yN, wN, f);
    txt('frente', num, 0, yN, F.numero.alt, wN - .02, FONTE_NUM, 800);

    // costas: nome e "Rep. Tumba" centralizados numa listra branca (ímpar), número grande num quadro branco
    const naBranca = y => { let j = Math.floor(y / f); if (j % 2 === 0) j++; return (j + .5) * f; };
    txt('costas', nome, 0, naBranca(L * B.nome.y), B.nome.alt, B.nome.largMax, FONTE_NOME, 700);
    const wB = Math.min(.34, Math.max(B.numero.quadro[0], medir(gC, num, B.numero.alt, FONTE_NUM, 800) + .03));
    quadro('costas', 0, L * B.numero.y, wB, B.numero.quadro[1]);
    txt('costas', num, 0, L * B.numero.y, B.numero.alt, num.length > 2 ? wB - .03 : B.numero.largMax, FONTE_NUM, 800);
    imagem(gC, img.rep, ...pos.costas(0, naBranca(L * B.rep.y)), B.rep.larg * k);

    // manga esquerda (vista de fora, pelo lado +x): logo da Unicamp
    const U = DESIGN.manga.unicamp;
    imagem(gM, img.unicamp, (Z - U.z) * km, (L - U.y) * km, U.larg * km);
    return telas;
  }
  return { telas, desenhar };
}
