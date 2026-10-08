/* =====================================================================
   ESTAMPA — design da camisa, conforme a arte aprovada da Icone Sports.
   Listras, gola e punhos são pintados direto no modelo (ver modelo.js).
   Aqui ficam os "adesivos": três canvas projetados de frente, de costas
   e de lado (manga esquerda), com logos, nome e número.
   Medidas em metros: y = 0 na barra, x > 0 = lado esquerdo de quem veste.
   ===================================================================== */
export const COR = { branco: '#f5f5f3', vermelho: '#e3141c', preto: '#111111' };
// nome e número: a fonte da fabricante (amostra enviada pelo cliente) é a mesma nos dois; a gratuita
// mais próxima é a Rajdhani Bold (letras quadradas de cantos arredondados, 0 em formato de estádio; OFL)
const FONTE_NUM_COSTAS = '"Rajdhani","Saira Condensed","Arial Narrow",sans-serif';
const FONTE_NUM = FONTE_NUM_COSTAS;
// nome: Rajdhani Bold, a mais próxima da camisa real (letras quadradas de cantos arredondados,
// G com barra reta, A de topo reto, R de perna reta); livre para uso comercial (OFL, Google Fonts)
const FONTE_NOME = '"Rajdhani","Saira Condensed","Arial Narrow",sans-serif';

export const DESIGN = {
  // medidas da camisa real (na mão do cliente); o modelo 3D é menor e tudo que vem daqui
  // é convertido pela proporção entre as mangas (real ÷ modelo)
  real: { manga: .282 },                           // do ombro ao punho, no ponto mais longo
  gola: { espessura: .02 },                        // faixa preta da gola, na camisa real
  // tronco: 11 listras horizontais, de cima para baixo: vermelha dos ombros (do recorte da gola com a
  // costura do ombro até a 1ª branca), 5 brancas intercaladas com 4 vermelhas, e a vermelha estreita da
  // barra. Medidas reais; no modelo são esticadas para caber do mesmo ponto do ombro até a barra.
  listras: { ombro: .055, vermelha: .072, branca: .066, barra: .028, brancas: 5 },
  frente: {
    // listras contadas de cima (a 1ª vermelha é a dos ombros)
    icone:  { x: -.098, listra: 2, larg: .085 },     // na 2ª vermelha
    // escudo bordado: corpo com contorno branco (0,45 cm real) e 3 estrelas vermelhas, tudo em alto-relevo
    // o círculo do escudo ocupa 90% da altura da 2ª vermelha, centralizado nela; as estrelas sobem para a branca de cima
    escudo: { x: .098,  listra: 2, circulo: .9, bordaReal: .0045 },
    // na 3ª vermelha, num quadro branco da altura da listra que vai até 1 cm (real) de cada ponta do número
    numero: { listra: 3, alt: .07, margemReal: .01 }
  },
  costas: {
    // nome: padrão fixo da camisa real (cada letra 4,4 × 2,7 cm, 0,7 cm entre letras), na 1ª branca
    nome:   { listra: 1, altReal: .044, largReal: .027, espacoReal: .007, largMax: .3 },
    // número: padrão da camisa real (dígito 24,85 × 9,4 cm sem a borda, borda branca 0,3 cm, 2,4 cm entre dígitos),
    // direto sobre as listras. Se não couber, tudo encolhe junto.
    numero: {
      altReal: .2485, largReal: .094, bordaReal: .003, espacoReal: .024, largMax: .4,
      // alinhamento com as listras, contadas de cima para baixo nas costas (a 1ª vermelha é a dos ombros);
      // pos = fração da listra a partir do topo dela. A altura sai daqui; largura, borda e espaço
      // acompanham na proporção da camisa real.
      inicio: { cor: 'vermelha', n: 2, pos: .55 },
      fim:    { cor: 'branca',   n: 3, pos: .85 }
    },
    // "Rep. Tumba": na penúltima listra branca (1 = a mais baixa), com 1,1 cm (real) de folga do topo do R/T
    // até a vermelha de cima e da perninha do p até a vermelha de baixo; a largura acompanha
    rep:    { brancaDeBaixo: 2, margemReal: .011 }
  },
  manga: {
    // do punho ao ombro, no ponto mais longo da manga (cm); ajustadas ao comprimento real do modelo
    listras: { punho: 3, branca1: 3.4, vermelha: 7.8, branca2: 14 },
    // só na manga esquerda de quem veste, centralizado no lado de fora e seguindo as listras da manga.
    // Medidas reais, convertidas pela listra vermelha da manga (7,8 cm na camisa real):
    // símbolo 8,5 × 7 cm com o centro bem na divisa com a branca de cima (metade em cada listra);
    // texto "UNICAMP" da largura do símbolo, centrado a 85% da altura da vermelha, de cima para baixo.
    unicamp: { simbolo: { largReal: .085 * 1.1, acimaDaDivisa: .5 }, texto: { largReal: .085 * 1.1, centro: -.85 },   // +10% a pedido (visual)
                contornoReal: .0015 }
  }
};

/* Limites entre as 11 listras do tronco (y a partir da barra, em m no modelo), de baixo para cima.
   alturaOmbro = altura, no modelo, do recorte da gola com a costura do ombro (topo da listra do ombro). */
export function limitesListras(alturaOmbro) {
  const R = DESIGN.listras, alturas = [R.barra];
  for (let i = 0; i < R.brancas; i++) alturas.push(R.branca, i < R.brancas - 1 ? R.vermelha : R.ombro);
  const k = alturaOmbro / alturas.reduce((s, a) => s + a, 0);
  const lim = []; let y = 0;
  for (const a of alturas.slice(0, -1)) lim.push(y += a * k);      // 10 limites; acima do último, a vermelha dos ombros
  return lim;
}

/* Listra n contada de cima (a 1ª vermelha é a dos ombros): { baixo, topo, meio } em m. */
export function listraDeCima(lim, L, cor, n) {
  const i = cor === 'vermelha' ? 2 * (lim.length / 2 + 1) - 2 * n : 2 * (lim.length / 2 + 1) - 1 - 2 * n;   // índice a partir da barra
  const baixo = i > 0 ? lim[i - 1] : 0, topo = i < lim.length ? lim[i] : L;
  return { baixo, topo, meio: (baixo + topo) / 2 };
}

// rugosidade da borracha em relação ao tecido (no mapa de brilho: #ffffff = tecido, mais escuro = mais liso)
const BRILHO_BORRACHA = '#7a7a7a';

// assets/img/rep.png: a tinta vai do topo do R/T (linha 1) à perninha do p (linha 114) de 116
const REP_TINTA = { inicio: 1 / 116, fim: 115 / 116 };

// assets/img/unicamp.png: o símbolo vai do topo até 79,5% da altura; o texto, de 90% até a base
const UNICAMP_SIMBOLO_FIM = .795, UNICAMP_TEXTO_INICIO = .9;

// círculo preto dentro de assets/img/escudo.png (frações da largura/altura da imagem), medido na imagem
const CIRCULO_ESCUDO = { cx: .49, cy: .508, diam: .776 };

/* separa as estrelas (peças soltas e pequenas) do corpo do escudo; o resultado fica guardado na imagem */
function partesEscudo(im) {
  if (im._partes) return im._partes;
  const w = im.naturalWidth, h = im.naturalHeight, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(im, 0, 0);
  const dados = g.getImageData(0, 0, w, h), d = dados.data, rot = new Int32Array(w * h).fill(-1), tamanhos = [];
  for (let i = 0; i < w * h; i++) {
    if (rot[i] >= 0 || d[i * 4 + 3] < 40) continue;
    const id = tamanhos.length, pilha = [i]; rot[i] = id; let n = 0;
    while (pilha.length) {
      const j = pilha.pop(), x = j % w, y = (j / w) | 0; n++;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, q = ny * w + nx;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && rot[q] < 0 && d[q * 4 + 3] >= 40) { rot[q] = id; pilha.push(q); }
      }
    }
    tamanhos.push(n);
  }
  const maior = tamanhos.indexOf(Math.max(...tamanhos));
  // estrela = qualquer pixel (inclusive a borda suave) a até 2 px de uma peça que não é a maior
  const ehEstrela = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (rot[i] >= 0 && rot[i] !== maior) {
    const x = i % w, y = (i / w) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const nx = x + dx, ny = y + dy; if (nx >= 0 && ny >= 0 && nx < w && ny < h && rot[ny * w + nx] !== maior) ehEstrela[ny * w + nx] = 1; }
  }
  let baseEstrelas = 0;                                     // linha mais baixa das estrelas (fração da altura)
  for (let i = 0; i < w * h; i++) if (ehEstrela[i] && d[i * 4 + 3] > 128) baseEstrelas = Math.max(baseEstrelas, ((i / w) | 0) / h);
  const parte = sim => {
    const out = document.createElement('canvas'); out.width = w; out.height = h;
    const o = out.getContext('2d'), img = o.createImageData(w, h);
    for (let i = 0; i < w * h; i++) if (!!ehEstrela[i] === sim) for (let k = 0; k < 4; k++) img.data[i * 4 + k] = d[i * 4 + k];
    o.putImageData(img, 0, 0); return out;
  };
  return (im._partes = { corpo: parte(false), estrelas: parte(true), baseEstrelas });
}

export function criarEstampa(resolucao = 1024) {
  const tela = () => document.createElement('canvas');
  // relevo: mapa de altura da frente (bordados), em tons de cinza; brilho: rugosidade da frente
  // (branco = tecido normal; mais escuro = mais liso, como a borracha do "icone")
  const telas = { frente: tela(), costas: tela(), manga: tela(), relevo: tela(), brilho: tela() };
  // parte fixa da frente e das costas (logos, escudo): desenhada uma vez e reaproveitada a cada tecla
  const fixas = { frente: tela(), costas: tela() };
  let fixasProntas = false;

  /* ext = { X, Z, L }: meia largura, meia profundidade e altura do modelo (m).
     completo = true refaz também a parte fixa (imagens, mapas de relevo e brilho); devolve se refez. */
  function desenhar(ext, img, texto, completo = true) {
    const { X, Z, L } = ext, lim = ext.listras;
    const listra = (cor, n) => listraDeCima(lim, L, cor, n);
    const k = resolucao / (2 * X), MW = ext.manga ? ext.manga.W : .2, MH = ext.manga ? ext.manga.H : .2, km = resolucao / 2 / MW;
    const preparar = (c, w, h) => { if (c.width !== w || c.height !== h) { c.width = w; c.height = h; } const g = c.getContext('2d'); g.clearRect(0, 0, w, h); return g; };
    const H = Math.round(L * k), refazer = completo || !fixasProntas || fixas.frente.height !== H;
    const gF = preparar(telas.frente, resolucao, H);
    const gC = preparar(telas.costas, resolucao, H);
    let gFx, gCx, gM, gR, gB;                                   // só existem quando a parte fixa é refeita
    if (refazer) {
      gFx = preparar(fixas.frente, resolucao, H);
      gCx = preparar(fixas.costas, resolucao, H);
      gM = preparar(telas.manga, resolucao / 2, Math.round(MH * km));   // no molde da manga; centro = lado de fora, na divisa vermelha/branca
      gR = preparar(telas.relevo, resolucao, H);
      gR.fillStyle = '#000'; gR.fillRect(0, 0, telas.relevo.width, telas.relevo.height);
      gB = preparar(telas.brilho, resolucao, H);
      gB.fillStyle = '#fff'; gB.fillRect(0, 0, telas.brilho.width, telas.brilho.height);
    }
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

    // número das costas: cada dígito com altura e largura fixas (a do 0 vira a largura padrão; o 1
    // fica mais estreito), espaço fixo entre os dígitos e borda branca por fora (medidas reais → modelo)
    // âncora: fração "pos" da listra, medida a partir do topo dela
    const naListra = a => { const l = listra(a.cor, a.n); return l.topo - a.pos * (l.topo - l.baixo); };
    const numeroCostas = (str, topo, fundo) => {
      const N = DESIGN.costas.numero, e = ext.escalaReal || 1, g = gC;
      const alt = fundo !== undefined ? topo - fundo : N.altReal * e, prop = alt / N.altReal;   // prop: real → modelo
      const borda = N.bordaReal * prop;
      g.letterSpacing = '0px'; g.font = `700 100px ${FONTE_NUM_COSTAS}`;
      const m0 = g.measureText('0'), sy = alt / (m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent);
      let sx = N.largReal * prop / (m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight), gap = N.espacoReal * prop;
      const dig = [...str].map(c => { const m = g.measureText(c); return { c, esq: m.actualBoundingBoxLeft, larg: m.actualBoundingBoxLeft + m.actualBoundingBoxRight, sobe: m.actualBoundingBoxAscent }; });
      const total = () => dig.reduce((s, d) => s + d.larg * sx, 0) + gap * (dig.length - 1);
      if (total() > N.largMax) { const r = N.largMax / total(); sx *= r; gap *= r; }
      const pintar = (cor, raio) => {                        // raio > 0: borda (o dígito repetido em volta, em branco)
        let x = total() / 2;
        g.fillStyle = cor; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        for (const d of dig) {
          const [X0, Y0] = pos.costas(x, topo);                   // canto de cima à esquerda de quem olha
          const passos = raio ? 24 : 1;
          for (let a = 0; a < passos; a++) for (const r of raio ? [raio, raio * .5] : [0]) {
            g.save(); g.translate(X0 + Math.cos(a / passos * 2 * Math.PI) * r, Y0 + Math.sin(a / passos * 2 * Math.PI) * r);
            g.scale(sx * k, sy * k); g.font = `700 100px ${FONTE_NUM_COSTAS}`; g.fillText(d.c, d.esq, m0.actualBoundingBoxAscent); g.restore();   // todos na linha de base do 0 (letras e símbolos alinham com os números)
          }
          x -= d.larg * sx + gap;
        }
      };
      pintar(COR.branco, borda * k);
      pintar(COR.preto, 0);
    };

    // escudo bordado: contorno branco em volta do corpo (as estrelas ficam sem contorno) e relevo
    // do bordado no mapa de altura (pontos de linha em diagonal, como bordado em cetim)
    // subir: quanto (px) as estrelas sobem em relação ao desenho original
    const escudoBordado = (g, gRel, im, cx, cy, larg, borda, subir = 0) => {
      if (!im) return;
      const { corpo, estrelas } = partesEscudo(im), s = larg / im.naturalWidth, alt = im.naturalHeight * s;
      const x0 = cx - larg * CIRCULO_ESCUDO.cx, y0 = cy - alt * CIRCULO_ESCUDO.cy;   // (cx, cy) = centro do círculo
      const silhueta = cor => { const c = document.createElement('canvas'); c.width = corpo.width; c.height = corpo.height; const t = c.getContext('2d'); t.drawImage(corpo, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = cor; t.fillRect(0, 0, c.width, c.height); return c; };
      const contorno = (ctx, sil) => { for (let a = 0; a < 32; a++) for (const r of [borda, borda * .66, borda * .33]) ctx.drawImage(sil, x0 + Math.cos(a / 32 * 2 * Math.PI) * r, y0 + Math.sin(a / 32 * 2 * Math.PI) * r, larg, alt); };
      contorno(g, silhueta(COR.branco));
      g.drawImage(corpo, x0, y0, larg, alt);
      g.drawImage(estrelas, x0, y0 - subir, larg, alt);
      // relevo: bordado inteiro alto; o contorno, mais alto e com pontos marcados
      const camada = document.createElement('canvas'); camada.width = gRel.canvas.width; camada.height = gRel.canvas.height;
      const r = camada.getContext('2d');
      contorno(r, silhueta('#e6e6e6'));
      r.drawImage(silhueta('#b4b4b4'), x0, y0, larg, alt);
      // o desenho interno também tem relevo (cada área bordada sobe um pouco diferente)
      r.save(); r.globalCompositeOperation = 'source-atop'; r.globalAlpha = .45; r.filter = 'grayscale(1) contrast(1.6)'; r.drawImage(corpo, x0, y0, larg, alt); r.restore();
      const est = document.createElement('canvas'); est.width = estrelas.width; est.height = estrelas.height;
      const te = est.getContext('2d'); te.drawImage(estrelas, 0, 0); te.globalCompositeOperation = 'source-in'; te.fillStyle = '#d2d2d2'; te.fillRect(0, 0, est.width, est.height);
      r.drawImage(est, x0, y0 - subir, larg, alt);
      r.globalCompositeOperation = 'source-atop'; r.globalAlpha = .55; r.strokeStyle = '#000'; r.lineWidth = Math.max(1, borda * .22);
      const passo = Math.max(2, borda * .4);
      r.beginPath(); for (let d = -alt; d < larg + alt; d += passo) { r.moveTo(x0 + d - borda * 2, y0 - borda * 2); r.lineTo(x0 + d - alt - borda * 4, y0 + alt + borda * 2); } r.stroke();
      gRel.save(); gRel.filter = `blur(${Math.max(.4, borda * .06)}px)`; gRel.drawImage(camada, 0, 0); gRel.restore();
    };

    const num = texto.numero || '10', nome = (texto.nome || 'JOGADOR').toUpperCase();
    const F = DESIGN.frente, B = DESIGN.costas;

    // ----- parte fixa (só quando refazer) -----
    if (refazer) {
    // frente: "icone" no peito direito, escudo no esquerdo
    imagem(gFx, img.icone, ...pos.frente(F.icone.x, listra('vermelha', F.icone.listra).meio), F.icone.larg * k);
    // "icone" é emborrachado: sobe do tecido um pouco mais que o bordado do escudo, com bordas
    // bem definidas, e é mais liso que o tecido (leve brilho de borracha)
    if (img.icone) {
      const im = img.icone, [X0, Y0] = pos.frente(F.icone.x, listra('vermelha', F.icone.listra).meio), w = F.icone.larg * k;
      const silhueta = cor => { const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const t2 = c.getContext('2d'); t2.drawImage(im, 0, 0); t2.globalCompositeOperation = 'source-in'; t2.fillStyle = cor; t2.fillRect(0, 0, c.width, c.height); return c; };
      gR.save(); gR.filter = 'blur(.35px)'; imagem(gR, silhueta('#ffffff'), X0, Y0, w); gR.restore();
      imagem(gB, silhueta(BRILHO_BORRACHA), X0, Y0, w);
    }
    const lE = listra('vermelha', F.escudo.listra), largEscudo = F.escudo.circulo * (lE.topo - lE.baixo) / CIRCULO_ESCUDO.diam;
    // estrelas inteiras na listra branca de cima, com a base 0,4 cm acima da vermelha
    let subir = 0;
    if (img.escudo) {
      const { baseEstrelas } = partesEscudo(img.escudo), altEscudo = largEscudo * img.escudo.naturalHeight / img.escudo.naturalWidth;
      subir = Math.max(0, lE.topo + .004 - (lE.meio + (CIRCULO_ESCUDO.cy - baseEstrelas) * altEscudo)) * k;
    }
    escudoBordado(gFx, gR, img.escudo, ...pos.frente(F.escudo.x, lE.meio), largEscudo * k, F.escudo.bordaReal * (ext.escalaReal || 1) * k, subir);
    if (img.rep) {
      const lR = listra('branca', DESIGN.listras.brancas + 1 - B.rep.brancaDeBaixo), hB = lR.topo - lR.baixo;
      const tinta = hB * (1 - 2 * B.rep.margemReal / DESIGN.listras.branca);         // do topo do R/T à perninha do p
      const hImg = tinta / (REP_TINTA.fim - REP_TINTA.inicio), wImg = hImg * img.rep.naturalWidth / img.rep.naturalHeight;
      const meioImg = lR.meio + ((REP_TINTA.inicio + REP_TINTA.fim) / 2 - .5) * hImg;    // centro da tinta no meio da listra
      imagem(gCx, img.rep, ...pos.costas(0, meioImg), wImg * k);
    }
    // manga esquerda: símbolo e texto da Unicamp separados, com contorno branco fino, alinhados às listras
    if (img.unicamp) {
      const im0 = () => ({ w: img.unicamp.naturalWidth, h: img.unicamp.naturalHeight });
      const U = DESIGN.manga.unicamp, vermAlt = ext.manga ? ext.manga.vermAlt : .063;   // altura da vermelha no lado de fora
      const vermReal = DESIGN.manga.listras.vermelha / 100;                      // 7,8 cm na camisa real
      const altSimbolo = U.simbolo.largReal / vermReal * (UNICAMP_SIMBOLO_FIM * im0().h / im0().w);   // em alturas da vermelha
      const im = img.unicamp, W = im.naturalWidth, H = im.naturalHeight, borda = U.contornoReal * (ext.escalaReal || 1) * km;
      const peca = (y0, y1, larg, centro) => {                 // recorte da imagem (frações da altura) desenhado na manga
        const sw = W, sh = (y1 - y0) * H, w = larg * vermAlt * km, h = w * sh / sw;
        const cx = MW / 2 * km, cy = (MH / 2 - centro * vermAlt) * km;   // centro = divisa (topo da vermelha)
        const c = document.createElement('canvas'); c.width = sw; c.height = Math.ceil(sh);
        const t2 = c.getContext('2d'); t2.drawImage(im, 0, y0 * H, sw, sh, 0, 0, sw, sh);
        const branco = document.createElement('canvas'); branco.width = c.width; branco.height = c.height;
        const tb = branco.getContext('2d'); tb.drawImage(c, 0, 0); tb.globalCompositeOperation = 'source-in'; tb.fillStyle = COR.branco; tb.fillRect(0, 0, c.width, c.height);
        for (let a = 0; a < 16; a++) gM.drawImage(branco, cx - w / 2 + Math.cos(a / 8 * Math.PI) * borda, cy - h / 2 + Math.sin(a / 8 * Math.PI) * borda, w, h);
        gM.drawImage(c, cx - w / 2, cy - h / 2, w, h);
      };
      peca(0, UNICAMP_SIMBOLO_FIM, U.simbolo.largReal / vermReal, (U.simbolo.acimaDaDivisa - .5) * altSimbolo);
      peca(UNICAMP_TEXTO_INICIO, 1, U.texto.largReal / vermReal, U.texto.centro);
    }
    fixasProntas = true;
    }

    // ----- a cada tecla: parte fixa pronta + nome e número -----
    gF.drawImage(fixas.frente, 0, 0);
    gC.drawImage(fixas.costas, 0, 0);
    // frente: número num quadro branco sobre a listra vermelha
    const lN = listra('vermelha', F.numero.listra), yN = lN.meio;
    {
      // largura pela tinta do número (não pelo espaço da fonte), centralizado por ela
      gF.letterSpacing = '0px'; gF.font = `700 ${F.numero.alt * k / .72}px ${FONTE_NUM}`;
      // dígitos estreitos na mesma proporção do número das costas (9,4 × 24,85 cm reais)
      const m0 = gF.measureText('0'), N = DESIGN.costas.numero;
      const sx = (N.largReal / N.altReal) / ((m0.actualBoundingBoxLeft + m0.actualBoundingBoxRight) / (m0.actualBoundingBoxAscent + m0.actualBoundingBoxDescent));
      const m = gF.measureText(num), tinta = (m.actualBoundingBoxLeft + m.actualBoundingBoxRight) * sx / k;
      // o quadro passa 2 mm para dentro das brancas de cima e de baixo: cobre a transição suavizada das
      // listras e funde com o tecido (sem a linha fina fechando o quadrado)
      quadro('frente', 0, yN, tinta + 2 * F.numero.margemReal * (ext.escalaReal || 1), lN.topo - lN.baixo + .004);
      const [Xc, Yc] = pos.frente(0, yN);
      gF.textAlign = 'left'; gF.textBaseline = 'alphabetic'; gF.fillStyle = COR.preto;
      gF.save(); gF.translate(Xc - tinta * k / 2, Yc + (m.actualBoundingBoxAscent - m.actualBoundingBoxDescent) / 2); gF.scale(sx, 1);
      gF.fillText(num, m.actualBoundingBoxLeft, 0); gF.restore();
    }

    // costas: nome e "Rep. Tumba" centralizados em listras brancas, número grande com borda branca
    nomeFixo(nome, listra('branca', B.nome.listra).meio);
    numeroCostas(num, naListra(B.numero.inicio), naListra(B.numero.fim));
    return refazer;
  }
  return { telas, desenhar };
}
