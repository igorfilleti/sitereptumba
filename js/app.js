(() => {
'use strict';

/* =====================================================================
   CONFIGURAÇÃO — é só preencher aqui
   ===================================================================== */
const CONFIG = {
  scriptUrl: '',          // URL do App da Web do Google Apps Script (termina em /exec)
  preco: 120,             // valor da camisa em reais, ex.: 120
  pix: {
    chave: 'f605963b-7532-47ee-95cd-1e67afe4041b',   // chave aleatória; chave Pix. Celular no formato +5519999999999
    nome: 'FELIPE DOS S MODESTO',   // nome de quem recebe (como aparece no banco)
    cidade: 'SAO PAULO',   // cidade de quem recebe
    // código do QR enviado (R$ 120,00), lido da imagem do banco
    copiaECola: '00020101021126580014br.gov.bcb.pix0136f605963b-7532-47ee-95cd-1e67afe4041b5204000053039865406120.005802BR5920FELIPE DOS S MODESTO6009SAO PAULO62070503***63042779'   // opcional: código "copia e cola" gerado pelo seu banco (tem prioridade)
  }
};

/* Tabelas de medidas (cm) */
const TAMANHOS = {
  M: [
    { t:'PP', a:48, b:49, c:70, kg:'60 a 63 kg' },
    { t:'P',  a:50, b:51, c:72, kg:'66 a 75 kg' },
    { t:'M',  a:52, b:53, c:74, kg:'76 a 84 kg' },
    { t:'G',  a:54, b:55, c:76, kg:'85 a 94 kg' },
    { t:'GG', a:56, b:57, c:78, kg:'95 a 104 kg' },
    { t:'XG', a:58, b:59, c:80, kg:'105 a 114 kg' }
  ],
  F: [
    { t:'PP BL', a:40, b:41, c:56 },
    { t:'P BL',  a:42, b:43, c:58 },
    { t:'M BL',  a:44, b:45, c:60 },
    { t:'G BL',  a:46, b:47, c:62 },
    { t:'GG BL', a:48, b:49, c:64 },
    { t:'XG BL', a:50, b:51, c:66 }
  ]
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const brl = v => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const state = { genero: '', idx: -1, nome: '', numero: '', file: null };
const gKey = () => (state.genero === 'Feminino' ? 'F' : 'M');
const sizeRow = () => TAMANHOS[gKey()][state.idx >= 0 ? state.idx : 2];


/* =====================================================================
   CAMISA 3D — carregada à parte (three.js, ver js/camisa3d/).
   Se não carregar, o pedido continua funcionando normalmente.
   ===================================================================== */
const Shirt = (() => {
  let real = null;
  const fila = {};
  const msg = $('#viewerMsg');
  const chamar = (k, a) => { if (real) real[k](...a); else fila[k] = a; };
  const falhou = err => {
    console.error('Camisa 3D:', err);
    msg.textContent = 'Não foi possível abrir a visualização 3D, mas você pode continuar o pedido normalmente.';
  };
  import('./camisa3d/viewer.js')
    .then(m => {
      real = m.createShirt($('#shirt3d'), { onPronto: () => { msg.hidden = true; }, onErro: falhou });
      for (const [k, a] of Object.entries(fila)) real[k](...a);
    })
    .catch(falhou);
  const api = {};
  for (const k of ['setModel', 'setText', 'showSide', 'stopSpin']) api[k] = (...a) => chamar(k, a);
  return api;
})();

/* =====================================================================
   PIX
   ===================================================================== */
function emv(id, v) { v = String(v); return id + String(v.length).padStart(2, '0') + v; }
function crc16(s) {
  let c = 0xFFFF;
  for (let i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (let j = 0; j < 8; j++) c = (c & 0x8000 ? (c << 1) ^ 0x1021 : c << 1) & 0xFFFF; }
  return c.toString(16).toUpperCase().padStart(4, '0');
}
function pixPayload({ chave, nome, cidade, valor }) {
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').toUpperCase().trim();
  let p = emv('00', '01') + emv('26', emv('00', 'br.gov.bcb.pix') + emv('01', chave.trim())) + emv('52', '0000') + emv('53', '986');
  if (valor > 0) p += emv('54', valor.toFixed(2));
  p += emv('58', 'BR') + emv('59', norm(nome).slice(0, 25) || 'RECEBEDOR') + emv('60', norm(cidade).slice(0, 15) || 'BRASIL') + emv('62', emv('05', '***')) + '6304';
  return p + crc16(p);
}
function qrSvg(text) {
  const q = new QRCodeLib.QRCode(-1, QRCodeLib.ECL.M); q.addData(text); q.make();
  const n = q.getModuleCount(); let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><path d="${d}" fill="#0b0b0b"/></svg>`;
}
(function setupPix() {
  const code = CONFIG.pix.copiaECola.trim() || (CONFIG.pix.chave.trim() ? pixPayload({ ...CONFIG.pix, valor: CONFIG.preco }) : '');
  $('#price').textContent = CONFIG.preco > 0 ? brl(CONFIG.preco) : 'R$ —';
  if (CONFIG.preco > 0) $('#heroPrice').innerHTML = `${brl(CONFIG.preco)}<small>no Pix</small>`;
  $('#pixKey').textContent = CONFIG.pix.chave || '—';
  $('#pixCode').textContent = code || '—';
  $('#qr').innerHTML = code ? qrSvg(code) : '<div class="empty">O QR Code aparece aqui quando a chave Pix for configurada.</div>';
})();
$$('[data-copy]').forEach(b => b.addEventListener('click', async () => {
  const t = $('#' + b.dataset.copy).textContent; if (!t || t === '—') return;
  try { await navigator.clipboard.writeText(t); }
  catch { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  const old = b.textContent; b.textContent = 'Copiado!'; b.classList.add('copied');
  setTimeout(() => { b.textContent = old; b.classList.remove('copied'); }, 1600);
}));

/* =====================================================================
   FORMULÁRIO
   ===================================================================== */
const el = {
  nome: $('#nome'), apelido: $('#apelido'), celular: $('#celular'),
  camisaNome: $('#camisaNome'), camisaNumero: $('#camisaNumero'),
  file: $('#comprovante')
};
/* número da camisa: algarismos, letras (com acento) e alguns símbolos, até 4 caracteres, sem espaço */
const NUMERO_FORA = /[^\p{L}\p{N}]/gu;
const NUMERO_OK = /^[\p{L}\p{N}]{1,4}$/u;
const RULES = {
  nome: v => (v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5) || 'Informe nome e sobrenome.',
  apelido: v => v.trim().length >= 2 || 'Informe seu apelido.',
  celular: v => v.replace(/\D/g, '').length === 11 || 'Informe o celular com DDD (11 dígitos).',
  camisaNome: v => v.trim().length >= 1 || 'Digite o nome que vai nas costas.',
  camisaNumero: v => NUMERO_OK.test(v) || 'Digite o número ou letras (1 a 4 caracteres).'
};
function setMsg(field, msg) {
  field.classList.toggle('invalid', !!msg);
  $('.msg', field).textContent = msg || '';
}
function checkInput(id) {
  const r = RULES[id](el[id].value);
  setMsg(el[id].closest('.field'), r === true ? '' : r);
  return r === true ? null : el[id];
}
function checkGenero() { const ok = !!state.genero; setMsg($('#fsGenero'), ok ? '' : 'Escolha a modelagem.'); return ok ? null : $('#gM'); }
function checkTamanho() { const ok = state.idx >= 0; setMsg($('#fsTamanho'), ok ? '' : 'Escolha o tamanho.'); return ok ? null : $('#sizes input'); }
function checkFile() { const ok = !!state.file; setMsg($('#fComp'), ok ? '' : 'Anexe o comprovante do Pix.'); return ok ? null : el.file; }
const SECTIONS = {
  dados: () => ['nome', 'apelido', 'celular'].map(checkInput),
  camisa: () => [checkInput('camisaNome'), checkInput('camisaNumero'), checkGenero(), checkTamanho()],
  pagamento: () => [checkFile()]
};
const firstBad = sec => SECTIONS[sec]().find(Boolean) || null;
function focusBad(node) {
  node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => node.focus({ preventScroll: true }), 350);
}
for (const id of Object.keys(RULES)) el[id].addEventListener('blur', () => { if (el[id].value) checkInput(id); });
for (const id of Object.keys(RULES)) el[id].addEventListener('input', () => { if (el[id].closest('.field').classList.contains('invalid')) checkInput(id); updateSummary(); });

$$('[data-next]').forEach(b => b.addEventListener('click', () => {
  const sec = b.dataset.next, bad = firstBad(sec);
  if (bad) return focusBad(bad);
  const next = { dados: '#camisa', camisa: '#pagamento' }[sec];
  $(next).scrollIntoView({ behavior: 'smooth' });
}));

/* celular com máscara */
el.celular.addEventListener('input', () => {
  const d = el.celular.value.replace(/\D/g, '').slice(0, 11);
  let v = d;
  if (d.length > 2) v = `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 7) v = `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  else if (d.length > 6 && d.length <= 10) v = `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  el.celular.value = v;
});

/* nome e número da camisa — atualizam o 3D em tempo real */
function syncShirtText() {
  // nome e número: só letras e números (o nome também aceita espaço)
  const n = el.camisaNome.value.toUpperCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 12);
  if (n !== el.camisaNome.value) el.camisaNome.value = n;
  const num = el.camisaNumero.value.toUpperCase().replace(NUMERO_FORA, '').slice(0, 4);
  if (num !== el.camisaNumero.value) el.camisaNumero.value = num;
  state.nome = n.trim(); state.numero = num;
  const cN = $('#cNome'), cU = $('#cNum');
  cN.textContent = `${n.length}/12`; cN.classList.toggle('full', n.length >= 12);
  cU.textContent = `${num.length}/4`; cU.classList.toggle('full', num.length >= 4);
  Shirt.setText(state.nome, state.numero);
  updateSummary();
}
['camisaNome', 'camisaNumero'].forEach(id => {
  el[id].addEventListener('input', syncShirtText);
  el[id].addEventListener('focus', () => Shirt.showSide('back'));
});

/* modelagem e tamanho (radios: só uma opção por vez) */
function renderSizes() {
  const g = gKey(), list = TAMANHOS[g];
  $('#sizes').innerHTML = list.map((s, i) => {
    const [main, sub] = s.t.split(' ');
    return `<input type="radio" name="tamanho" id="t${i}" value="${s.t}" ${i === state.idx ? 'checked' : ''}><label for="t${i}"><b>${main}</b>${sub ? `<small>${sub}</small>` : '<small>&nbsp;</small>'}</label>`;
  }).join('');
  $$('#sizes input').forEach(r => r.addEventListener('change', () => {
    state.idx = +r.id.slice(1); if ($('#fsTamanho').classList.contains('invalid')) checkTamanho(); refreshModel();
  }));
  const hasKg = g === 'M';
  $('#sizeTable').innerHTML =
    `<table><thead><tr><th>Tam.</th><th>Peitoral</th><th>Barra</th><th>Compr.</th>${hasKg ? '<th>Peso</th>' : ''}</tr></thead><tbody>` +
    list.map((s, i) => `<tr class="${i === state.idx ? 'sel' : ''}"><td>${s.t}</td><td>${s.a}</td><td>${s.b}</td><td>${s.c}</td>${hasKg ? `<td>${s.kg}</td>` : ''}</tr>`).join('') +
    `</tbody></table><p class="tbl-note">Medidas em centímetros, com a camisa esticada sobre uma mesa.${g === 'F' ? ' BL = baby look.' : ''}</p>`;
}
function refreshModel() {
  const g = gKey(), s = sizeRow();
  Shirt.setModel(g, s.a, s.c);
  $('#badge').innerHTML = `${g === 'F' ? 'Feminina' : 'Masculina'} · <b>${s.t.replace(' BL', '')}</b>`;   // o selo do 3D mostra só o tamanho
  const m = $('#measures'); m.classList.toggle('has-kg', !!s.kg);
  m.innerHTML = `<div><span>Peitoral</span><strong>${s.a}<small> cm</small></strong></div><div><span>Barra</span><strong>${s.b}<small> cm</small></strong></div><div><span>Compr.</span><strong>${s.c}<small> cm</small></strong></div>${s.kg ? `<div><span>Peso sugerido</span><strong style="font-size:17px">${s.kg}</strong></div>` : ''}`;
  $('#measuresNote').textContent = state.idx < 0 ? 'Prévia no tamanho M. Escolha o seu acima.' : '';
  $('#measuresNote').hidden = state.idx >= 0;
  $$('#sizeTable tbody tr').forEach((tr, i) => tr.classList.toggle('sel', i === state.idx));
  updateSummary();
}
$$('input[name=genero]').forEach(r => r.addEventListener('change', () => {
  state.genero = r.value; if ($('#fsGenero').classList.contains('invalid')) checkGenero();
  renderSizes(); refreshModel(); Shirt.stopSpin();
}));

/* comprovante */
const MAX = 5 * 1024 * 1024;
function setFile(f) {
  const field = $('#fComp');
  if (!f) { state.file = null; $('#dropEmpty').hidden = false; $('#dropFile').hidden = true; el.file.value = ''; updateSummary(); return; }
  if (!/^(image\/|application\/pdf)/.test(f.type)) { setMsg(field, 'Envie uma imagem ou PDF.'); el.file.value = ''; return; }
  if (f.size > MAX) { setMsg(field, 'Arquivo maior que 5 MB. Envie um print do comprovante.'); el.file.value = ''; return; }
  state.file = f; setMsg(field, '');
  $('#fileName').textContent = f.name;
  const th = $('#thumb');
  if (f.type.startsWith('image/')) { th.innerHTML = ''; const im = new Image(); im.alt = ''; im.src = URL.createObjectURL(f); th.appendChild(im); }
  else th.textContent = 'PDF';
  $('#dropEmpty').hidden = true; $('#dropFile').hidden = false;
  updateSummary();
}
el.file.addEventListener('change', () => setFile(el.file.files[0]));
$('#fileSwap').addEventListener('click', e => { e.preventDefault(); el.file.click(); });
const drop = $('#drop');
['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) setFile(f); });

/* resumo */
function updateSummary() {
  const row = (k, v, cls = '') => `<dt>${k}</dt><dd class="${v ? cls : 'miss'}">${v ? esc(v) : 'pendente'}</dd>`;
  const s = state.idx >= 0 ? TAMANHOS[gKey()][state.idx].t : '';
  $('#summary').innerHTML =
    row('Nome', el.nome.value.trim()) +
    row('Apelido', el.apelido.value.trim()) +
    row('Celular', el.celular.value) +
    row('Nas costas', state.nome && state.numero ? `${state.nome} · ${state.numero}` : '') +
    row('Modelagem', state.genero && s ? `${state.genero === 'Feminino' ? 'Feminina' : 'Masculina'} · ${s}` : '') +
    row('Comprovante', state.file ? 'anexado' : '') +
    (CONFIG.preco > 0 ? `<dt>Total</dt><dd class="total">${brl(CONFIG.preco)}</dd>` : '');
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* etapas no topo: as estrelas acendem até a etapa em que o usuário está (a do meio da tela);
   ao voltar, as das etapas seguintes apagam; no início da página ficam todas apagadas */
const etapas = $$('.steps a'), secoesEtapa = etapas.map(a => $('#' + a.dataset.step));
const numerosSecao = secoesEtapa.map(s => $('.sec-num', s));   // as estrelas de cada etapa acendem junto
let etapaAtual = null;
function atualizarEtapas() {
  let atual = -1;
  secoesEtapa.forEach((s, i) => { if (s.getBoundingClientRect().top <= innerHeight * .5) atual = i; });
  if (atual === etapaAtual) return;
  etapaAtual = atual;
  etapas.forEach((a, i) => {
    a.classList.toggle('acesa', i <= atual);
    if (numerosSecao[i]) numerosSecao[i].classList.toggle('acesa', i <= atual);
    a.classList.toggle('on', i === atual);
    if (i === atual) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
  });
}
let rqEtapas = 0;
addEventListener('scroll', () => { if (!rqEtapas) rqEtapas = requestAnimationFrame(() => { rqEtapas = 0; atualizarEtapas(); }); }, { passive: true });
addEventListener('resize', atualizarEtapas);
atualizarEtapas();
// toque numa estrela (do topo ou da etapa): um giro de 360°
$$('.steps a, .sec-num').forEach(el => {
  el.addEventListener('click', () => { el.classList.remove('gira'); void el.offsetWidth; el.classList.add('gira'); });
  el.addEventListener('animationend', () => el.classList.remove('gira'));
});

/* envio */
const readB64 = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = () => no(r.error); r.readAsDataURL(f); });
const form = $('#pedido'), btn = $('#submitBtn'), errBox = $('#formError');
form.addEventListener('submit', async e => {
  e.preventDefault(); errBox.hidden = true;
  const bad = ['dados', 'camisa', 'pagamento'].map(firstBad).find(Boolean);
  if (bad) return focusBad(bad);
  const payload = {
    nome: el.nome.value.trim(), apelido: el.apelido.value.trim(), celular: el.celular.value,
    camisaNome: state.nome, camisaNumero: state.numero,
    genero: state.genero, tamanho: TAMANHOS[gKey()][state.idx].t
  };
  btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Enviando…';
  try {
    payload.arquivo = { nome: state.file.name, tipo: state.file.type, base64: await readB64(state.file) };
    // só confirma o pedido quando a planilha responde que gravou; qualquer falha vira erro na tela
    if (!CONFIG.scriptUrl) throw new Error('Os pedidos ainda não estão sendo recebidos. Fale com a Rep. Tumba antes de pagar.');
    const espera = new AbortController(), limite = setTimeout(() => espera.abort(), 45000);
    let data;
    try {
      // corpo em texto simples: o Google aceita sem pedir permissão prévia ao navegador (CORS)
      const res = await fetch(CONFIG.scriptUrl, { method: 'POST', body: JSON.stringify(payload), signal: espera.signal });
      data = await res.json();
    } catch (falha) {
      throw new Error(falha.name === 'AbortError' ? 'O envio demorou demais. Verifique sua internet e tente de novo.' : 'Falha de conexão. Verifique sua internet e tente de novo.');
    } finally { clearTimeout(limite); }
    if (!data || !data.ok || !data.pedido) throw new Error((data && data.erro) || 'Não foi possível registrar o pedido. Tente de novo.');
    const pedido = data.pedido;
    $('#doneId').textContent = '#' + pedido;
    $('#doneText').textContent = `Valeu, ${payload.apelido}! Vamos conferir o pagamento e chamar você no WhatsApp ${payload.celular}. Guarde o número do pedido.`;
    $('#done').showModal();
  } catch (err) {
    errBox.textContent = (err && err.message) || 'Não foi possível registrar o pedido. Tente de novo.';
    errBox.hidden = false;
  } finally {
    btn.disabled = false; btn.textContent = 'Finalizar pedido';
  }
});
$('#doneBtn').addEventListener('click', () => {
  $('#done').close(); form.reset(); location.hash = ''; location.reload();
});

/* início */
renderSizes(); refreshModel(); syncShirtText();
})();
