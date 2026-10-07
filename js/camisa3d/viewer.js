/* =====================================================================
   CAMISA 3D — visualizador com three.js
   Luz de estúdio (HDRI), modelo 3D real com o design assado na textura,
   giro com inércia, pano com balanço leve (mola) e transição animada entre frente e costas.
   Só desenha quando algo muda (girar, zoom, digitar, pano balançando): parada, não gasta nada.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { carregarModelo, criarForno, ALTURA, BALANCO } from './modelo.js';
import { criarEstampa } from './estampa.js';

const MOBILE = Math.min(screen.width, screen.height) < 600;
const RELEVO = 20;                                // força do alto-relevo dos bordados
const LUZ = { ambiente: .5, principal: 1.25 };  // calibrada: vermelho ≈ rgb(220,10,20), branco ≈ 235 de frente, sem estourar
const IMAGENS = { escudo: 'escudo.png', rep: 'rep.png', unicamp: 'unicamp.png', icone: 'icone.png' };

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
  const estampa = criarEstampa(MOBILE ? 768 : 1024);
  const grupo = new THREE.Group(); scene.add(grupo);
  const chao = sombra(); scene.add(chao);
  const img = {};
  let modelo = null, forno = null, camisa = null, texto = { nome: '', numero: '' };
  const escala = new THREE.Vector3(1, 1, 1), escalaAlvo = new THREE.Vector3(1, 1, 1);
  const REF = [52, ALTURA * 100];                               // o modelo é um M masculino (52 × 74 cm)

  let sujo = true;                                              // pede um novo quadro
  // completo = false: só nome/número mudaram (a parte fixa da estampa e os mapas são reaproveitados)
  function redesenhar(completo = true) {
    if (!forno) return;
    forno.assar(estampa.desenhar(modelo.ext, img, texto, completo));
    sujo = true;
  }
  let rq = 0, pedidoCompleto = false;
  const pedirDesenho = (completo = true) => {
    pedidoCompleto ||= completo;
    if (!rq) rq = requestAnimationFrame(() => { rq = 0; const c = pedidoCompleto; pedidoCompleto = false; redesenhar(c); });
  };

  for (const [k, arq] of Object.entries(IMAGENS)) {
    const im = new Image();
    im.onload = () => { img[k] = im; pedirDesenho(); };
    im.src = new URL(`../../assets/img/${arq}`, import.meta.url).href;
  }
  if (document.fonts) for (const f of [`800 80px "Saira Extra Condensed"`, `700 80px "Rajdhani"`, `800 80px "Saira Condensed"`]) document.fonts.load(f).then(() => pedirDesenho(false), () => {});

  carregarModelo().then(m => {
    modelo = m;
    forno = criarForno(renderer, m.geo, m.ext, estampa.telas, MOBILE ? 1536 : 2048);
    m.material.map = forno.textura;
    m.material.bumpMap = forno.relevo;                // bordados em alto-relevo
    m.material.bumpScale = RELEVO;
    m.material.roughnessMap = forno.rugosidade;       // a borracha do "icone" é mais lisa que o tecido
    camisa = new THREE.Mesh(m.geo, m.material);
    camisa.castShadow = camisa.receiveShadow = true;    // a camisa faz sombra nela mesma (mangas, dobras)
    camisa.customDepthMaterial = m.profundidade;        // a sombra acompanha o balanço do pano
    camisa.position.y = -m.ext.L / 2;
    const pivo = new THREE.Group(); pivo.add(camisa); grupo.add(pivo);
    camisa = pivo;
    redesenhar();
    ajustarCamera();
  }).catch(err => { console.error('Camisa 3D:', err); onErro(err); });

  function setModel(g, a, c) {
    const novo = new THREE.Vector3(a / REF[0], c / REF[1], a / REF[0]);
    if (camisa && g !== setModel.g) escala.multiplyScalar(.95);  // pequeno "respiro" ao trocar a modelagem
    setModel.g = g;
    escalaAlvo.copy(novo);
    sujo = true;
  }
  function setText(nome, numero) { texto = { nome, numero }; pedirDesenho(false); }
  /* ---------- controles ---------- */
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';                          // deixa rolar a página no celular
  Object.assign(controls, {
    enableDamping: true, dampingFactor: .07, rotateSpeed: .85,
    enablePan: false, enableZoom: false, autoRotate: true, autoRotateSpeed: 1.6,
    minPolarAngle: Math.PI / 2 - .5, maxPolarAngle: Math.PI / 2 + .25
  });
  let alvoAz = null, zoom = 1, zoomAlvo = 1, distBase = 2.6;
  const ZOOM = { min: .35, max: 1.4 }, PHI0 = Math.PI / 2 - .08, centro = new THREE.Vector3();   // visão inicial: de frente, levemente de cima
  const alvoFoco = new THREE.Vector3();                          // para onde a câmera olha (o centro, ou o ponto do zoom)
  const hint = document.getElementById('hint');
  const esconderDica = () => { if (hint) hint.style.opacity = 0; };
  controls.addEventListener('start', () => { controls.autoRotate = false; alvoAz = null; esconderDica(); });
  const zoomPara = z => { zoomAlvo = Math.max(ZOOM.min, Math.min(ZOOM.max, z)); controls.autoRotate = false; esconderDica(); };

  function showSide(lado) {
    controls.autoRotate = false;
    const az = controls.getAzimuthalAngle();
    alvoAz = lado === 'back' ? (az >= 0 ? Math.PI : -Math.PI) : 0;
  }
  const stopSpin = () => { controls.autoRotate = false; };
  document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => showSide(b.dataset.side)));
  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    const antes = zoomAlvo;
    zoomPara(zoomAlvo * (b.dataset.zoom > 0 ? .82 : 1.22));
    if (zoomAlvo > antes) alvoFoco.sub(centro).multiplyScalar(antes < 1 ? Math.max(0, (1 - zoomAlvo) / (1 - antes)) : 0).add(centro);   // afastando, recentraliza
  }));
  // roda do mouse (e pinça do touchpad) sobre a camisa: zoom, sem rolar a página
  // aproximando, o ponto embaixo do cursor fica parado; afastando, volta a centralizar (centrada no zoom inicial)
  const raio = new THREE.Raycaster(), ndc = new THREE.Vector2(), plano = new THREE.Plane(), ponto = new THREE.Vector3();
  canvas.addEventListener('wheel', e => {
    if (e.deltaY > 0 && zoomAlvo >= ZOOM.max - 1e-6) return;     // já toda afastada: a roda volta a rolar a página
    e.preventDefault();
    const antes = zoomAlvo;
    zoomPara(zoomAlvo * Math.exp(e.deltaY * (e.ctrlKey ? .01 : .0015)));
    if (zoomAlvo === antes) return;
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
  }, { passive: false });
  // voltar à visão inicial (botão discreto que só aparece quando a visão mudou)
  const botaoInicio = document.querySelector('[data-reset]');
  function visaoInicial() { controls.autoRotate = false; alvoAz = 0; zoomAlvo = 1; alvoFoco.copy(centro); }
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
  let visivel = true, ultimo = performance.now(), ultimaFace = '', pronto = false;
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; sujo = true; }).observe(canvas);
  const botoes = [...document.querySelectorAll('[data-side]')];
  const offset = new THREE.Vector3(), sph = new THREE.Spherical();
  // mola do pano: a barra e as mangas ficam para trás quando a camisa gira e assentam ao parar
  const MOLA = { rigidez: 55, amortecimento: 5.5, arrasto: .035, max: .08 };
  let torcao = 0, velTorcao = 0, azAnterior = null, giroAuto = 0;
  chao.material.opacity = .5;

  renderer.setAnimationLoop(agora => {
    const dt = Math.min(.25, (agora - ultimo) / 1000); ultimo = agora;   // aceita quadros lentos sem travar as animações
    if (!visivel || !camisa) return;

    // giro automático só na primeira volta; depois para de frente
    const az = controls.getAzimuthalAngle();
    let dAz = azAnterior === null ? 0 : az - azAnterior;
    if (dAz > Math.PI) dAz -= 2 * Math.PI; else if (dAz < -Math.PI) dAz += 2 * Math.PI;
    azAnterior = az;
    if (controls.autoRotate && (giroAuto += Math.abs(dAz)) > 2 * Math.PI) { controls.autoRotate = false; alvoAz = 0; }

    // mola: alvo proporcional à velocidade do giro; a torção persegue o alvo e oscila até assentar
    // (a câmera girando equivale à camisa girando ao contrário: a barra fica para trás no sentido da câmera)
    const alvo = Math.max(-MOLA.max, Math.min(MOLA.max, dAz / Math.max(dt, 1e-3) * MOLA.arrasto));
    velTorcao += ((alvo - torcao) * MOLA.rigidez - velTorcao * MOLA.amortecimento) * dt;
    torcao += velTorcao * dt;
    const molaAtiva = Math.abs(torcao) > 2e-4 || Math.abs(velTorcao) > 2e-3;
    if (!molaAtiva) { torcao = 0; velTorcao = 0; }
    BALANCO.uTorcao.value = torcao;
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
    sujo = false;
    renderer.render(scene, camera);

    const face = Math.abs(az) < Math.PI / 2 ? 'front' : 'back';
    if (face !== ultimaFace) { ultimaFace = face; botoes.forEach(b => b.classList.toggle('on', b.dataset.side === face)); }
    const mudou = Math.abs(zoomAlvo - 1) > .03 || alvoFoco.lengthSq() > 1e-4 || (alvoAz === null && !controls.autoRotate && (Math.abs(az) > .06 || Math.abs(sph.phi - PHI0) > .06));
    if (mudou !== alterada && botaoInicio) { alterada = mudou; botaoInicio.classList.toggle('visivel', mudou); botaoInicio.tabIndex = mudou ? 0 : -1; }
    if (!pronto) { pronto = true; onPronto(); }
  });
  if (new URLSearchParams(location.search).has('debug')) window.__camisa = { camera, controls, scene, renderer, quadros: () => renderer.info.render.frame, redesenhar };   // inspeção no console
  return { setModel, setText, showSide, stopSpin };
}
