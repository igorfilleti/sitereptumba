/* =====================================================================
   PEDIDOS DA CAMISA — Rep. Tumba (Google Apps Script)
   Recebe os pedidos do site, grava cada um como uma linha nesta planilha
   e salva o comprovante na subpasta "Comprovantes", criada ao lado da
   planilha (na mesma pasta do Drive).
   Como instalar: veja apps-script/LEIA-ME.md
   ===================================================================== */

const ABA = 'Pedidos';
const PASTA_COMPROVANTES = 'Comprovantes';
const MAX_BYTES = 5 * 1024 * 1024;   // o site já limita a 5 MB
const TIPOS_OK = /^(image\/|application\/pdf$)/;
const CABECALHO = ['Pedido', 'Data', 'Nome', 'Apelido', 'WhatsApp', 'Nome na camisa', 'Número', 'Modelagem', 'Tamanho', 'Comprovante', 'Status', 'Pagamento', 'E-mail', 'Confirmação por e-mail'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = JSON.parse(e.postData.contents);
    const faltando = ['nome', 'apelido', 'celular', 'email', 'camisaNome', 'camisaNumero', 'genero', 'tamanho'].filter(k => !String(p[k] || '').trim());
    if (faltando.length) return resposta({ ok: false, erro: 'Pedido incompleto (' + faltando.join(', ') + ').' });
    const a = p.arquivo || {};
    if (!a.base64 || !TIPOS_OK.test(a.tipo || '')) return resposta({ ok: false, erro: 'Comprovante ausente ou em formato inválido.' });
    const bytes = Utilities.base64Decode(a.base64);
    if (bytes.length > MAX_BYTES) return resposta({ ok: false, erro: 'Comprovante maior que 5 MB.' });

    lock.waitLock(20000);                                   // um pedido por vez: números sem repetir
    const aba = abaPedidos();
    const numero = String(aba.getLastRow()).padStart(4, '0');   // linha 1 = cabeçalho → 1º pedido = 0001
    const data = new Date();
    const ext = (String(a.nome || '').match(/\.[a-z0-9]{1,5}$/i) || [''])[0];
    const nomeArq = numero + ' - ' + limpo(p.nome) + ext;
    const arquivo = pastaComprovantes().createFile(Utilities.newBlob(bytes, a.tipo, nomeArq));
    aba.appendRow([
      "'" + numero, data, limpo(p.nome), limpo(p.apelido), limpo(p.celular),
      limpo(p.camisaNome), limpo(p.camisaNumero), limpo(p.genero), limpo(p.tamanho),
      arquivo.getUrl(), 'A conferir', limpo(p.pagamento), limpo(p.email)
    ]);
    const linha = aba.getLastRow();
    SpreadsheetApp.flush();
    lock.releaseLock();                                     // o e-mail sai fora da fila: não atrasa outros pedidos

    // confirmação por e-mail: se falhar, o pedido continua gravado (só fica anotado na planilha)
    let enviado = 'Não enviado';
    try { enviarConfirmacao(p, numero, data); enviado = 'Enviado'; }
    catch (err) { console.error('E-mail:', err); enviado = 'Falhou: ' + String(err && err.message || err).slice(0, 80); }
    aba.getRange(linha, CABECALHO.length).setValue(enviado);
    return resposta({ ok: true, pedido: numero });
  } catch (err) {
    console.error(err);
    return resposta({ ok: false, erro: 'Não foi possível registrar o pedido. Tente de novo.' });
  } finally {
    lock.releaseLock();
  }
}

// abrir o endereço no navegador só confirma que está no ar
function doGet() { return resposta({ ok: true, status: 'Recebendo pedidos.' }); }

function abaPedidos() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let aba = ss.getSheetByName(ABA);
  if (!aba) aba = ss.insertSheet(ABA);
  if (aba.getLastRow() === 0) {
    aba.appendRow(CABECALHO);
    aba.setFrozenRows(1);
  }
  // planilha criada antes de uma coluna nova (ex.: "Pagamento"): completa o cabeçalho
  aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setFontWeight('bold');
  return aba;
}

// subpasta "Comprovantes" dentro da pasta onde está esta planilha
function pastaComprovantes() {
  const pais = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
  const base = pais.hasNext() ? pais.next() : DriveApp.getRootFolder();
  const sub = base.getFoldersByName(PASTA_COMPROVANTES);
  return sub.hasNext() ? sub.next() : base.createFolder(PASTA_COMPROVANTES);
}

// texto vindo do site: sem fórmulas (evita "=..." virar fórmula na planilha) e com tamanho limitado
function limpo(v) { return String(v || '').replace(/^[=+\-@]+/, '').trim().slice(0, 120); }

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// rode uma vez pelo editor (botão "Executar") para autorizar o acesso à planilha e ao Drive
function autorizar() { abaPedidos(); pastaComprovantes(); MailApp.getRemainingDailyQuota(); }   // planilha, Drive e envio de e-mail

/* ---------- e-mail de confirmação ----------
   Sai da conta Google dona deste script, com o nome "Rep. Tumba"; respostas voltam para essa conta.
   Limite do Gmail comum: 100 e-mails por dia. A foto da camisa (costas, com nome e número) vem do site. */
const SITE = 'https://www.reptumba.com';

function enviarConfirmacao(p, numero, data) {
  const para = String(p.email || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(para)) throw new Error('e-mail inválido');
  const inline = {};
  let foto = '';
  if (p.foto && /^[A-Za-z0-9+/=]+$/.test(p.foto) && p.foto.length < 2e6) {
    inline.camisa = Utilities.newBlob(Utilities.base64Decode(p.foto), 'image/png', 'camisa-' + numero + '.png');
    foto = '<img src="cid:camisa" width="220" alt="Sua camisa" style="display:block;width:220px;max-width:100%;height:auto;margin:0 auto">';
  }
  MailApp.sendEmail({
    to: para,
    name: 'Rep. Tumba',
    subject: 'Pedido confirmado: sua listradinha já está em produção',
    htmlBody: htmlConfirmacao(p, numero, data, foto),
    body: textoConfirmacao(p, numero),
    inlineImages: inline
  });
}

function esc(v) {
  return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// versão só texto, para quem não abre HTML
function textoConfirmacao(p, numero) {
  return 'Valeu, ' + p.apelido + '!\n\nPedido confirmado. Sua listradinha já está em produção.\n\n' +
    'Nome: ' + p.camisaNome + '\nNúmero: ' + p.camisaNumero + '\nModelo: ' + (p.genero === 'Feminino' ? 'Feminina' : 'Masculina') +
    '\nTamanho: ' + p.tamanho + '\nValor: ' + (p.pagamento || '') +
    '\n\nVamos conferir o pagamento e chamar você no WhatsApp ' + p.celular + '.\n\nRep. Tumba\n' + SITE;
}

// HTML de e-mail: tabelas e estilos em cada elemento (é o que Gmail, Outlook e o app do iPhone entendem)
function htmlConfirmacao(p, numero, data, foto) {
  const parcelado = /2x/.test(p.pagamento || '');
  const fonte = 'Arial,Helvetica,sans-serif';
  const linha = (rotulo, valor, ultimo) => {
    const borda = ultimo ? '' : 'border-bottom:1px dashed #2c2c33;';
    return '<tr><td style="padding:10px 0;' + borda + 'font:bold 11px ' + fonte + ';letter-spacing:2px;text-transform:uppercase;color:#8a8a94">' + rotulo + '</td>' +
      '<td align="right" style="padding:10px 0;' + borda + 'font:bold 16px ' + fonte + ';color:#f5f5f6">' + esc(valor) + '</td></tr>';
  };
  const listras = ['#e30613', '#f4f4f4', '#e30613', '#f4f4f4', '#e30613']
    .map(c => '<tr><td height="7" style="height:7px;line-height:7px;font-size:0;background:' + c + '">&nbsp;</td></tr>').join('');
  const faixa = '<tr><td><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + listras + '</table></td></tr>';
  const estrela = t => '<span style="font-size:' + t + 'px;line-height:1;color:#f2c230">&#9733;</span>';
  const quando = Utilities.formatDate(data, 'America/Sao_Paulo', "dd/MM/yyyy 'às' HH:mm");
  const modelo = p.genero === 'Feminino' ? 'Feminina' : 'Masculina';

  return '<!doctype html><html><body style="margin:0;padding:0;background:#050506">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050506"><tr><td align="center" style="padding:24px 12px">' +
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#111115;border:1px solid #4a3d18;border-radius:18px;overflow:hidden">' +
    faixa +
    '<tr><td align="center" style="padding:26px 24px 6px">' +
      '<img src="' + SITE + '/assets/img/favicon.png" width="48" height="48" alt="Rep. Tumba" style="display:block;margin:0 auto 10px">' +
      estrela(26) + '&nbsp;' + estrela(34) + '&nbsp;' + estrela(26) +
      '<div style="margin-top:12px;font:bold 12px ' + fonte + ';letter-spacing:5px;color:#8a8a94">REP. TUMBA</div>' +
      '<div style="margin-top:6px;font:900 34px/1.05 \'Arial Black\',' + fonte + ';color:#ffffff;text-transform:uppercase">Pedido<br><span style="color:#ff2a36">confirmado</span></div>' +
      '<p style="margin:16px 0 0;font:16px/1.5 ' + fonte + ';color:#f5f5f6">Valeu, <b>' + esc(p.apelido) + '</b>! Sua listradinha já está em produção.</p>' +
    '</td></tr>' +
    '<tr><td style="padding:18px 24px 0">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17171c;border:1px solid #26262d;border-radius:14px"><tr><td style="padding:16px 18px">' +
        (foto ? '<div style="text-align:center;padding:4px 0 10px">' + foto + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' +
          linha('Nome', p.camisaNome) + linha('Número', p.camisaNumero) + linha('Modelo', modelo) +
          linha('Tamanho', p.tamanho) + linha('Valor', p.pagamento || '', true) +
        '</table>' +
      '</td></tr></table>' +
    '</td></tr>' +
    (parcelado ? '<tr><td style="padding:14px 24px 0"><div style="padding:12px 14px;border:1px solid #5c4c1c;border-radius:10px;background:#1c1810;font:14px/1.5 ' + fonte + ';color:#f5f5f6">Você pagou a <b>1ª parcela</b>. A 2ª a gente combina com você pelo WhatsApp.</div></td></tr>' : '') +
    '<tr><td style="padding:18px 24px 0;font:14px/1.6 ' + fonte + ';color:#c9c9d1">' +
      'Agora vamos conferir o pagamento e chamar você no WhatsApp <b style="color:#f5f5f6">' + esc(p.celular) + '</b>. ' +
      'Se precisar falar com a gente, é só responder este e-mail.' +
    '</td></tr>' +
    '<tr><td align="center" style="padding:22px 24px 26px">' +
      '<a href="' + SITE + '" style="display:inline-block;padding:14px 26px;background:#e30613;border-radius:6px;font:bold 14px ' + fonte + ';letter-spacing:2px;color:#ffffff;text-decoration:none;text-transform:uppercase">Ver o site</a>' +
      '<div style="margin-top:18px;font:12px ' + fonte + ';color:#6f6f7a">Pedido feito em ' + quando + ' · ' + esc(p.nome) + '</div>' +
    '</td></tr>' +
    faixa +
  '</table>' +
  '<div style="margin-top:14px;font:11px ' + fonte + ';color:#55555f">Rep. Tumba · A listradinha mais querida do interior</div>' +
  '</td></tr></table></body></html>';
}

// rode pelo editor (botão "Executar") para receber um e-mail de exemplo na sua própria caixa; não grava nada na planilha
function testarEmail() {
  const eu = Session.getEffectiveUser().getEmail();
  enviarConfirmacao({
    apelido: 'Guera', nome: 'Guilherme Exemplo', celular: '(19) 99999-9999', email: eu,
    camisaNome: 'GUERA', camisaNumero: '600', genero: 'Masculino', tamanho: 'M', pagamento: '2x de R$ 60,00'
  }, '0007', new Date());
}
