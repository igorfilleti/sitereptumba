/* =====================================================================
   CAMISA 3D — visualizador com three.js
   Luz de estúdio (HDRI), modelo 3D real com o design assado na textura,
   giro com inércia, pano com balanço leve (mola) e transição animada entre frente e costas.
   Só desenha quando algo muda (girar, zoom, digitar, pano balançando): parada, não gasta nada.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.min.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.min.js';
import { carregarModelo, criarForno, referencia, BALANCO } from './modelo.js?v=20261008n';
import { criarEstampa } from './estampa.js?v=20261008n';

const MOBILE = Math.min(screen.width, screen.height) < 600;
const RELEVO = 20;                                // força do alto-relevo dos bordados
const LUZ = { ambiente: .5, principal: 1.25 };  // calibrada: vermelho ≈ rgb(220,10,20), branco ≈ 235 de frente, sem estourar
const IMAGENS = { escudo: 'escudo.webp', rep: 'rep.webp', unicamp: 'unicamp.webp', icone: 'icone.webp' };   // WebP sem perda

/* sombra suave no "chão" */
function sombra() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

export function createShirt(canvas, { onPronto = () => {}, onErro = () => {} } = {}) {
  /* ---------- renderer, cena e câmera ---------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { throw new Error('WebGL indisponível'); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // luz de estúdio neutra e calibrada: o lado virado para a câmera mostra a cor da arte. O Neutral
  // Tone Mapping só segura os realces (topo dos ombros e do peito, sob o holofote), sem estourar o branco
  // nem desbotar o vermelho; os tons médios ficam praticamente iguais
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = LUZ.ambiente;

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 20);
  // holofote preso à câmera (no alto e um pouco à esquerda), sempre apontado para a camisa: ilumina o
  // que está de frente para a tela e deixa sombras suaves onde ele não alcança (dobras, mangas, gola).
  // Sem queda com a distância (decay 0): a frente recebe a mesma luz de antes, com as cores calibradas.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const holofote = new THREE.SpotLight(0xffffff, LUZ.principal, 0, Math.PI / 5, .6, 0);
  holofote.position.set(-1, 1.25, 0);
  holofote.castShadow = true;
  holofote.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  holofote.shadow.camera.near = .3; holofote.shadow.camera.far = 8;
  holofote.shadow.bias = -.0004; holofote.shadow.normalBias = .012;
  camera.add(holofote); scene.add(holofote.target);
  scene.add(camera);
  camera.position.set(0, .12, 2.6);

  /* ---------- camisa ---------- */
  const grupo = new THREE.Group(); scene.add(grupo);
  const chao = sombra(); scene.add(chao);
  const img = {};
  // modelo, forno, estampa e camisa: os da modelagem escolhida (masculina ou baby look)
  let modelo = null, forno = null, estampa = null, camisa = null, texto = { nome: '', numero: '' };
  const escala = new THREE.Vector3(1, 1, 1), escalaAlvo = new THREE.Vector3(1, 1, 1);
  const modelos = {}, pedidos = {}; let gAtual = 'M', medidas = null;

  let sujo = true;                                              // pede um novo quadro
  // completo = false: só nome/número mudaram (a parte fixa da estampa e os mapas são reaproveitados)
  // cada modelagem guarda a arte já assada: "cheio" = a parte fixa está pronta; "versao" = a arte (nome,
  // número, imagens, fontes) que ela mostra. Trocar de modelagem só reassa se algo mudou desde então
  let versaoArte = 0;
  function assarModelo(x, completo, frente) {
    completo ||= !x.cheio;
    const refeito = x.estampa.desenhar(x.modelo.ext, img, texto, completo);
    x.forno.assar(refeito, frente || refeito);
    x.cheio = true; x.versao = versaoArte;
  }
  function redesenhar(completo = true) {
    if (!forno) return;
    // ao digitar só o nome, a frente não muda: não reenvia a arte dela para a placa de vídeo
    assarModelo(modelos[gAtual], completo, frenteMudou);
    frenteMudou = false;
    sujo = true;
  }
  let rq = 0, pedidoCompleto = false, frenteMudou = true;
  const pedirDesenho = (completo = true) => {
    pedidoCompleto ||= completo;
    if (!rq) rq = requestAnimationFrame(() => { rq = 0; const c = pedidoCompleto; pedidoCompleto = false; redesenhar(c); });
  };

  for (const [k, arq] of Object.entries(IMAGENS)) {
    const im = new Image();
    im.onload = () => { img[k] = im; for (const x of Object.values(modelos)) x.cheio = false; pedirDesenho(); };
    im.src = new URL(`../../assets/img/${arq}`, import.meta.url).href;
  }
  // Rajdhani: a única fonte desenhada na camisa (nome e números)
  if (document.fonts) document.fonts.load(`700 80px "Rajdhani"`).then(() => { versaoArte++; pedirDesenho(false); }, () => {});

  // carrega cada modelagem só quando ela é escolhida pela primeira vez
  function carregar(g) {
    return pedidos[g] ||= carregarModelo(g).then(m => {
    const est = criarEstampa(MOBILE ? 768 : 1024);
    const fr = criarForno(renderer, m.geo, m.ext, est.telas, MOBILE ? 1536 : 2048);
    m.material.map = fr.textura;
    m.material.bumpMap = fr.relevo;                   // bordados em alto-relevo
    m.material.bumpScale = RELEVO;
    m.material.roughnessMap = fr.rugosidade;       // a borracha do "icone" é mais lisa que o tecido
    const malha = new THREE.Mesh(m.geo, m.material);
    malha.castShadow = malha.receiveShadow = true;    // a camisa faz sombra nela mesma (mangas, dobras)
    malha.customDepthMaterial = m.profundidade;       // a sombra acompanha o balanço do pano
    malha.position.y = -m.ext.L / 2;
    const pivo = new THREE.Group(); pivo.add(malha); pivo.visible = false; grupo.add(pivo);
    const x = modelos[g] = { modelo: m, forno: fr, estampa: est, camisa: pivo, cheio: false, versao: -1 };
    if (g === gAtual) { mostrar(g); preCarregarOutra(g); }
    else {
      // carregada em segundo plano: já assa a arte e compila os shaders, para a troca ser imediata
      assarModelo(x, true, true);
      pivo.visible = true;
      return renderer.compileAsync(pivo, camera, scene).catch(() => {}).then(() => { pivo.visible = modelos[gAtual] === x; });
    }
    });
  }
  // depois que a primeira camisa aparece, a outra modelagem é preparada sem pressa
  function preCarregarOutra(g) {
    const outra = g === 'M' ? 'F' : 'M', ir = () => carregar(outra).catch(() => {});
    if (window.requestIdleCallback) requestIdleCallback(ir, { timeout: 2500 }); else setTimeout(ir, 1200);
  }
  function mostrar(g) {
    const x = modelos[g]; if (!x) return;
    if (camisa) camisa.visible = false;
    ({ modelo, forno, estampa, camisa } = x);
    camisa.visible = true;
    if (medidas) escalaAlvo.copy(escalaDe(g, ...medidas));
    escala.copy(escalaAlvo).multiplyScalar(.95);                 // pequeno "respiro" ao trocar a modelagem
    if (!x.cheio || x.versao !== versaoArte) { frenteMudou = true; redesenhar(false); }   // só se algo mudou desde a última vez
    sujo = true;
    ajustarCamera();
  }
  const escalaDe = (g, a, c) => { const R = referencia(g); return new THREE.Vector3(a / R[0], c / R[1], a / R[0]); };
  carregar('M').catch(err => { console.error('Camisa 3D:', err); onErro(err); });

  function setModel(g, a, c) {
    if (medidas) atencao();                                      // a 1ª chamada é a do carregamento da página, não da pessoa
    g = g === 'F' ? 'F' : 'M'; medidas = [a, c];
    escalaAlvo.copy(escalaDe(g, a, c));
    if (g !== gAtual) {
      gAtual = g;
      if (modelos[g]) mostrar(g);
      else carregar(g).catch(err => { console.error('Camisa 3D:', err); onErro(err); });
    }
    sujo = true;
  }
  function setText(nome, numero) { if (nome !== texto.nome || numero !== texto.numero) atencao(); versaoArte++; frenteMudou ||= numero !== texto.numero; texto = { nome, numero }; pedirDesenho(false); }
  /* ---------- controles ---------- */
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';                          // deixa rolar a página no celular
  Object.assign(controls, {
    enableDamping: true, dampingFactor: .07, rotateSpeed: .85,
    enablePan: false, enableZoom: false, autoRotate: false, autoRotateSpeed: 0,
    minPolarAngle: Math.PI / 2 - .5, maxPolarAngle: Math.PI / 2 + .25
  });
  let alvoAz = null, zoom = 1, zoomAlvo = 1, distBase = 2.6;
  const ZOOM = { min: .35, max: 1.4 }, PHI0 = Math.PI / 2 - .08, centro = new THREE.Vector3();   // visão inicial: de frente, levemente de cima
  const alvoFoco = new THREE.Vector3();                          // para onde a câmera olha (o centro, ou o ponto do zoom)
  const hint = document.getElementById('hint');
  if (hint && matchMedia('(pointer:coarse)').matches) hint.textContent = 'Arraste para girar';   // celular: curta (o zoom é na pinça) e sem encostar no selo
  const esconderDica = () => { if (hint) hint.style.opacity = 0; };
  /* giro de descanso: a camisa gira sozinha, devagar. Para quando a pessoa clica/arrasta a camisa ou mexe
     numa opção de alteração (modelagem, nome, número, tamanho, frente/costas, zoom); volta depois de alguns
     segundos sem mexer. O mouse só passar por cima não para */
  const GIRO = { ocioso: 4, velocidade: 1.5 };                   // segundos parado antes de girar; velocidade (1 volta a cada 60 ÷ 1,5 = 40 s)
  let ultimaAtencao = -Infinity, arrastando = false, rampaGiro = 0;
  const atencao = () => { ultimaAtencao = performance.now(); };
  const reduzirMovimento = matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.addEventListener('start', () => { arrastando = true; atencao(); alvoAz = null; esconderDica(); });
  controls.addEventListener('end', () => { arrastando = false; atencao(); });
  const zoomPara = z => { zoomAlvo = Math.max(ZOOM.min, Math.min(ZOOM.max, z)); atencao(); esconderDica(); };

  function showSide(lado) {
    atencao();
    const az = controls.getAzimuthalAngle();
    alvoAz = lado === 'back' ? (az >= 0 ? Math.PI : -Math.PI) : 0;
  }
  const stopSpin = () => { atencao(); };
  document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => showSide(b.dataset.side)));
  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const antes = zoomAlvo;
    zoomPara(zoomAlvo * (b.dataset.zoom > 0 ? .82 : 1.22));
    if (zoomAlvo > antes) alvoFoco.sub(centro).multiplyScalar(antes < 1 ? Math.max(0, (1 - zoomAlvo) / (1 - antes)) : 0).add(centro);   // afastando, recentraliza
  }));
  // roda do mouse (e pinça do touchpad) sobre a camisa: zoom, sem rolar a página
  // aproximando, o ponto embaixo do cursor fica parado; afastando, volta a centralizar (centrada no zoom inicial)
  const raio = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(), ponto = new THREE.Vector3();
  // fator < 1 aproxima, mirando o ponto da tela (x, y); > 1 afasta (roda do mouse e pinça no celular)
  function zoomEm(fator, x, y) {
    const antes = zoomAlvo;
    zoomPara(zoomAlvo * fator);
    if (zoomAlvo === antes) return;
    const e = { clientX: x, clientY: y };
    if (zoomAlvo < antes) {
      const r = canvas.getBoundingClientRect();
      ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      raio.setFromCamera(ndc, camera);
      const hit = camisa && raio.intersectObject(camisa, true)[0];
      if (hit) ponto.copy(hit.point);
      else { plano.setFromNormalAndCoplanarPoint(camera.getWorldDirection(ponto).negate(), alvoFoco); if (!raio.ray.intersectPlane(plano, ponto)) return; }
      alvoFoco.sub(ponto).multiplyScalar(zoomAlvo / antes).add(ponto);
    } else {
      // afastando: o deslocamento do foco encolhe na mesma proporção e some no zoom inicial
      alvoFoco.sub(centro).multiplyScalar(antes < 1 ? Math.max(0, (1 - zoomAlvo) / (1 - antes)) : 0).add(centro);
    }
    if (modelo) alvoFoco.set(Math.max(-modelo.ext.X, Math.min(modelo.ext.X, alvoFoco.x)), Math.max(-modelo.ext.L / 2, Math.min(modelo.ext.L / 2, alvoFoco.y)), Math.max(-modelo.ext.Z, Math.min(modelo.ext.Z, alvoFoco.z)));
  }
  canvas.addEventListener('wheel', e => {
    if (e.deltaY > 0 && zoomAlvo >= ZOOM.max - 1e-6) return;     // já toda afastada: a roda volta a rolar a página
    e.preventDefault();
    zoomEm(Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0015)), e.clientX, e.clientY);
  }, { passive: false });
  // pinça com dois dedos (celular): zoom no ponto entre os dedos. Um dedo continua girando a camisa,
  // e arrastar na vertical continua rolando a página
  let pinca = 0;
  const distDedos = t => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  canvas.addEventListener('touchstart', e => { if (e.touches.length === 2) { pinca = distDedos(e.touches); atencao(); esconderDica(); } }, { passive: true });
  canvas.addEventListener('touchmove', e => {
    if (e.touches.length !== 2 || !pinca) return;
    e.preventDefault();                                          // a pinça é da camisa, não da página
    const d = distDedos(e.touches);
    if (d > 0) zoomEm(pinca / d, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
    pinca = d;
  }, { passive: false });
  canvas.addEventListener('touchend', e => { if (e.touches.length < 2) pinca = 0; });
  // voltar à visão inicial (botão discreto que só aparece quando a visão mudou)
  const botaoInicio = document.querySelector('[data-reset]');
  function visaoInicial() { atencao(); alvoAz = 0; zoomAlvo = 1; alvoFoco.copy(centro); }
  if (botaoInicio) botaoInicio.addEventListener('click', visaoInicial);
  canvas.addEventListener('dblclick', visaoInicial);             // duplo clique na camisa também volta
  let alterada = false;

  /* ---------- tamanho do canvas e enquadramento ---------- */
  function ajustarCamera() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!modelo) return;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const meiaAlt = modelo.ext.L / 2 * 1.22, meiaLarg = modelo.ext.X * 1.18;
    distBase = Math.max(meiaAlt / t, meiaLarg / (t * camera.aspect)) + .15;
    sujo = true;
  }
  new ResizeObserver(ajustarCamera).observe(canvas);

  /* ---------- loop ---------- */
  let visivel = true, ultimoQuadro = 0, ultimo = performance.now(), ultimaFace = '', pronto = false;
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; sujo = true; }).observe(canvas);
  const botoes = [...document.querySelectorAll('[data-side]')];
  const offset = new THREE.Vector3(), sph = new THREE.Spherical();
  // molas do pano: a barra e as mangas ficam para trás quando a camisa gira, a barra se abre girando
  // rápido e balança para a frente/trás ao inclinar; tudo assenta oscilando quando para
  // (rigidez: quão rápido volta; amortecimento: quanto oscila; ganho: quanto reage; max: limite)
  const MOLAS = {
    torcao:   { rigidez: 28, amortecimento: 3.2, ganho: .03,  max: .105 },  // rad
    abertura: { rigidez: 24, amortecimento: 3.6, ganho: .0047, max: .015 }, // m
    pendulo:  { rigidez: 22, amortecimento: 2.8, ganho: .03,  max: .02 }    // m
  };
  const estadoMola = { torcao: [0, 0], abertura: [0, 0], pendulo: [0, 0] };   // [posição, velocidade]
  const passoMola = (nome, alvo, dt) => {
    const m = MOLAS[nome], s = estadoMola[nome];
    alvo = Math.max(-m.max, Math.min(m.max, alvo));
    const n = Math.ceil(dt * 60), h = dt / n;                       // passos de até 1/60 s: estável mesmo com quadros lentos
    for (let i = 0; i < n; i++) { s[1] += ((alvo - s[0]) * m.rigidez - s[1] * m.amortecimento) * h; s[0] += s[1] * h; }
    const ativa = Math.abs(s[0]) > m.max * 2e-3 || Math.abs(s[1]) > m.max * 2e-2 || Math.abs(alvo) > m.max * 2e-3;
    if (!ativa) s[0] = s[1] = 0;
    return ativa;
  };
  let azAnterior = null, phiAnterior = null;
  chao.material.opacity = .5;

  renderer.setAnimationLoop(agora => {
    const dt = Math.min(.25, (agora - ultimo) / 1000); ultimo = agora;   // aceita quadros lentos sem travar as animações
    if (!visivel || !camisa) return;

    // giro de descanso: entra e sai suave (a velocidade sobe e desce em ~1 s)
    const digitando = document.activeElement && document.activeElement.matches && document.activeElement.matches('#camisaNome,#camisaNumero');
    const descansando = !reduzirMovimento && !arrastando && !digitando && alvoAz === null && zoomAlvo >= .98 && agora - ultimaAtencao > GIRO.ocioso * 1000;
    rampaGiro += ((descansando ? 1 : 0) - rampaGiro) * Math.min(1, dt * 1.5);
    if (!descansando && rampaGiro < .01) rampaGiro = 0;
    controls.autoRotate = rampaGiro > 0;
    controls.autoRotateSpeed = GIRO.velocidade * rampaGiro;
    const az = controls.getAzimuthalAngle();
    let dAz = azAnterior === null ? 0 : az - azAnterior;
    if (dAz > Math.PI) dAz -= 2 * Math.PI; else if (dAz < -Math.PI) dAz += 2 * Math.PI;
    azAnterior = az;

    // molas: alvo proporcional à velocidade do giro / da inclinação; o pano persegue o alvo e oscila até assentar
    // (a câmera girando equivale à camisa girando ao contrário: a barra fica para trás no sentido da câmera)
    const phi = controls.getPolarAngle(), dPhi = phiAnterior === null ? 0 : phi - phiAnterior; phiAnterior = phi;
    const w = dAz / Math.max(dt, 1e-3), wPhi = dPhi / Math.max(dt, 1e-3);
    const molaAtiva = [
      passoMola('torcao', w * MOLAS.torcao.ganho, dt),
      passoMola('abertura', Math.abs(w) * MOLAS.abertura.ganho, dt),
      passoMola('pendulo', -wPhi * MOLAS.pendulo.ganho, dt)
    ].some(Boolean);
    BALANCO.uTorcao.value = estadoMola.torcao[0];
    BALANCO.uAbertura.value = estadoMola.abertura[0];
    BALANCO.uPendulo.value = estadoMola.pendulo[0];
    BALANCO.uTempo.value = agora / 1000;

    const escalaMudando = escala.distanceToSquared(escalaAlvo) > 1e-8;
    escala.lerp(escalaAlvo, Math.min(1, dt * 8));
    camisa.scale.copy(escala);
    chao.position.y = -modelo.ext.L / 2 * escala.y - .05;
    chao.scale.set(modelo.ext.X * 1.9 * escala.x, .3, 1);

    const zoomMudando = Math.abs(zoomAlvo - zoom) > 1e-4;
    zoom += (zoomAlvo - zoom) * Math.min(1, dt * 8);
    if (zoomAlvo >= .98) alvoFoco.lerp(centro, Math.min(1, dt * 6));   // no zoom inicial (ou mais longe) sempre centralizada
    const focoMudando = controls.target.distanceToSquared(alvoFoco) > 1e-9;
    controls.target.lerp(alvoFoco, Math.min(1, dt * 8));              // centro da camisa, ou o ponto do zoom
    holofote.target.position.copy(controls.target);
    offset.copy(camera.position).sub(controls.target);
    sph.setFromVector3(offset);
    sph.radius = distBase * zoom;
    const virando = alvoAz !== null;
    if (virando) {
      const d = alvoAz - sph.theta;
      sph.theta += d * Math.min(1, dt * 6);
      sph.phi += (PHI0 - sph.phi) * Math.min(1, dt * 6);
      if (Math.abs(d) < .002) alvoAz = null;
    }
    camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
    const controlesMudaram = controls.update(dt);

    // só desenha quando algo mudou; parada, a cena não gasta nada
    if (!(sujo || controlesMudaram || molaAtiva || escalaMudando || zoomMudando || focoMudando || virando || controls.autoRotate)) return;
    // só o giro de descanso (lento) mexendo: 30 quadros/s bastam e gastam metade da bateria
    // (no giro o pano fica numa torção leve e constante; conta como mexendo só se estiver balançando)
    const panoBalancando = Object.keys(MOLAS).some(k => Math.abs(estadoMola[k][1]) > MOLAS[k].max * 2e-2);
    const soGirando = !arrastando && !(sujo || panoBalancando || escalaMudando || zoomMudando || focoMudando || virando);
    if (soGirando && agora - ultimoQuadro < 1000 / 30 - 2) return;
    ultimoQuadro = agora;
    sujo = false;
    renderer.render(scene, camera);

    const face = Math.abs(az) < Math.PI / 2 ? 'front' : 'back';
    if (face !== ultimaFace) { ultimaFace = face; botoes.forEach(b => b.classList.toggle('on', b.dataset.side === face)); }
    const mudou = Math.abs(zoomAlvo - 1) > .03 || alvoFoco.lengthSq() > 1e-4 || (alvoAz === null && !controls.autoRotate && (Math.abs(az) > .06 || Math.abs(sph.phi - PHI0) > .06));
    if (mudou !== alterada && botaoInicio) { alterada = mudou; botaoInicio.classList.toggle('visivel', mudou); botaoInicio.tabIndex = mudou ? 0 : -1; }
    if (!pronto) { pronto = true; onPronto(); }
  });
  if (new URLSearchParams(location.search).has('debug')) window.__camisa = { camera, controls, scene, renderer, quadros: () => renderer.info.render.frame, redesenhar, atual: () => ({ estampa, forno, modelo, img, texto }), MOLAS, estadoMola };   // inspeção no console
  // foto da camisa vista de trás (nome e número), para a tela de pedido confirmado: gira só a camisa
  // de costas para a câmera, desenha um quadro, guarda a imagem e volta como estava
  function foto() {
    if (!camisa) return null;
    const antes = grupo.rotation.y;
    grupo.rotation.y = Math.PI + controls.getAzimuthalAngle();
    chao.visible = false;                                         // só a camisa, sem a sombra do chão
    renderer.render(scene, camera);
    // recorta no contorno da camisa (o resto da tela é transparente), com uma folga
    const src = renderer.domElement, W = src.width, H = src.height;
    const t = document.createElement('canvas'); t.width = W; t.height = H;
    const g = t.getContext('2d'); g.drawImage(src, 0, 0);
    grupo.rotation.y = antes; chao.visible = true; sujo = true;
    const a = g.getImageData(0, 0, W, H).data;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) if (a[(y * W + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < 0) return null;
    const lado = Math.max(x1 - x0, y1 - y0) * 1.08, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const out = document.createElement('canvas'); out.width = out.height = Math.min(720, Math.round(lado));
    out.getContext('2d').drawImage(t, cx - lado / 2, cy - lado / 2, lado, lado, 0, 0, out.width, out.height);
    return out.toDataURL('image/png');
  }
  return { setModel, setText, showSide, stopSpin, foto };
}
