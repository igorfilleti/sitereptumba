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
const CABECALHO = ['Pedido', 'Data', 'Nome', 'Apelido', 'WhatsApp', 'Nome na camisa', 'Número', 'Modelagem', 'Tamanho', 'Comprovante', 'Status', 'Pagamento'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const p = JSON.parse(e.postData.contents);
    const faltando = ['nome', 'apelido', 'celular', 'camisaNome', 'camisaNumero', 'genero', 'tamanho'].filter(k => !String(p[k] || '').trim());
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
      arquivo.getUrl(), 'A conferir', limpo(p.pagamento)
    ]);
    SpreadsheetApp.flush();
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
function autorizar() { abaPedidos(); pastaComprovantes(); }
