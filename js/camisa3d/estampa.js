/* =====================================================================
   ESTAMPA — design da camisa, conforme a arte aprovada da Icone Sports.
   Listras, gola e punhos são pintados direto no modelo (ver modelo.js).
   Aqui ficam os "adesivos": três canvas projetados de frente, de costas
   e de lado (manga esquerda), com logos, nome e número.
   Medidas em metros: y = 0 na barra, x > 0 = lado esquerdo de quem veste.
   ===================================================================== */
export const COR = { branco: '#f5f5f3', vermelho: '#e3141c', preto: '#111111' };
const FONTE_NUM = '"Saira Extra Condensed","Saira Condensed","Arial Narrow",sans-serif';
// nome: Rajdhani Bold, a mais próxima da camisa real (letras quadradas de cantos arredondados,
// G com barra reta, A de topo reto, R de perna reta); livre para uso comercial (OFL, Google Fonts)
const FONTE_NOME = '"Rajdhani","Saira Condensed","Arial Narrow",sans-serif';

export const DESIGN = {
  // medidas da camisa real (na mão do cliente); o modelo 3D é menor e tudo que vem daqui
  // é convertido pela proporção entre as mangas (real ÷ modelo)
  real: { manga: .282 },                           // do ombro ao punho, no ponto mais longo
  gola: { espessura: .02 },                        // faixa preta da gola, na camisa real
  faixa: .0525,                                    // altura de cada listra; a da barra é vermelha
  ombro: 12,                                       // da 12ª listra para cima é tudo vermelho (ombros e gola)
  frente: {
    icone:  { x: -.098, y: .745, larg: .085 },
    escudo: { x: .098,  y: .75,  larg: .07 },
    numero: { y: .603, alt: .07, quadro: .095 }    // quadro branco: largura mínima; altura = 1 listra
  },
  costas: {
    // nome: padrão fixo da camisa real (cada letra 4,4 × 2,7 cm, 0,7 cm entre letras)
    nome:   { y: .85, altReal: .044, largReal: .027, espacoReal: .007, largMax: .3 },
    numero: { y: .6,  alt: .23, largMax: .24, quadro: [.2, .24] },
    rep:    { brancaDeBaixo: 2, largReal: .277 }     // penúltima listra branca (1 = a mais baixa); 27,7 cm na camisa real
  },
  manga: {
    // do punho ao ombro, no ponto mais longo da manga (cm); ajustadas ao comprimento real do modelo
    listras: { punho: 3, branca1: 3.4, vermelha: 7.8, branca2: 14 },
    unicamp: { z: -.025, y: .535, larg: .085 }       // só na manga esquerda de quem veste
  }
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
    const medir = (g, str, alt, fonte, peso) => { g.letterSpacing = '0px'; g.font = `${peso} ${alt * k / .72}px ${fonte}`; return g.measureText(str).width / k; };
    const txt = (lado, str, x, y, alt, largMax, fonte, peso, espaco = 0) => {   // espaco: entre letras, em em
      if (!str) return;
      const g = ctxDe[lado], [X0, Y0] = pos[lado](x, y);
      let fs = alt * k / .72;
      g.letterSpacing = `0px`;
      g.font = `${peso} ${fs}px ${fonte}`;
      const w = g.measureText(str).width;
      if (w > largMax * k) { fs *= largMax * k / w; g.font = `${peso} ${fs}px ${fonte}`; }
      g.letterSpacing = `${espaco * fs}px`;
      const mt = g.measureText(str), off = (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2 || fs * .36;
      g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = COR.preto;
      g.fillText(str, X0, Y0 + off);
    };

    // nome letra por letra: altura e largura fixas por letra e espaço fixo entre elas (medidas reais → modelo)
    const nomeFixo = (str, y) => {
      const N = DESIGN.costas.nome, e = ext.escalaReal || 1, g = gC;
      const alt = N.altReal * e, larg = N.largReal * e, esp = N.espacoReal * e;
      g.letterSpacing = '0px'; g.font = `700 100px ${FONTE_NOME}`;
      const cap = g.measureText('H').actualBoundingBoxAscent, fs = 100 * alt / cap;      // fonte em m para a altura pedida
      const caixa = c => { const m = g.measureText(c); return { esq: m.actualBoundingBoxLeft * fs / 100, larg: (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * fs / 100 }; };
      const letras = [...str].map(c => (c === ' ' ? null : { c, ...caixa(c) }));
      // largura padrão: a de uma letra típica (mediana do alfabeto) passa a medir "larg"
      const ref = [...'ABCDEGHKNOPRSUVXYZ'].map(c => caixa(c).larg).sort((a, b) => a - b)[9];
      let sx = larg / ref, gap = esp;
      const total = () => letras.reduce((s, l) => s + (l ? l.larg * sx : larg * .5), 0) + gap * (letras.length - 1);
      if (total() > N.largMax) { const r = N.largMax / total(); sx *= r; gap *= r; }        // nomes longos: comprime por igual
      let x = total() / 2;                                                                 // costas: x diminui para a direita de quem olha
      g.textBaseline = 'alphabetic'; g.textAlign = 'left'; g.fillStyle = COR.preto;
      for (const l of letras) {
        const w = l ? l.larg * sx : larg * .5;
        if (l) {
          const [X0, Y0] = pos.costas(x, y - alt / 2);                                    // canto esquerdo (de quem olha), na linha de base
          g.save(); g.translate(X0, Y0); g.scale(sx, 1); g.font = `700 ${fs * k}px ${FONTE_NOME}`;
          g.fillText(l.c, l.esq * k, 0); g.restore();
        }
        x -= w + gap;
      }
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
    nomeFixo(nome, naBranca(L * B.nome.y));
    const wB = Math.min(.34, Math.max(B.numero.quadro[0], medir(gC, num, B.numero.alt, FONTE_NUM, 800) + .03));
    quadro('costas', 0, L * B.numero.y, wB, B.numero.quadro[1]);
    txt('costas', num, 0, L * B.numero.y, B.numero.alt, num.length > 2 ? wB - .03 : B.numero.largMax, FONTE_NUM, 800);
    const brancaN = n => (2 * n - 1 + .5) * f;        // centro da n-ésima listra branca contando da barra
    imagem(gC, img.rep, ...pos.costas(0, brancaN(B.rep.brancaDeBaixo)), B.rep.largReal * (ext.escalaReal || 1) * k);

    // manga esquerda (vista de fora, pelo lado +x): logo da Unicamp
    const U = DESIGN.manga.unicamp;
    imagem(gM, img.unicamp, (Z - U.z) * km, (L - U.y) * km, U.larg * km);
    return telas;
  }
  return { telas, desenhar };
}
