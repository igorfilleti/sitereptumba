/* =====================================================================
   CAMISA 3D — visualizador com three.js
   Luz de estúdio (HDRI), modelo 3D real com o design assado na textura,
   giro com inércia e transição animada entre frente e costas.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { carregarModelo, criarForno, ALTURA } from './modelo.js';
import { criarEstampa } from './estampa.js';

const MOBILE = Math.min(screen.width, screen.height) < 600;
const RELEVO = 20;                                // força do alto-relevo dos bordados
const LUZ = { ambiente: .5, principal: 1.75 };   // calibrada: vermelho ≈ rgb(215,35,40), branco ≈ 230 de frente
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
  // luz de estúdio neutra e calibrada: o lado virado para a câmera mostra a cor da arte
  // sem estourar (sem tone mapping, que desbota o vermelho, e sem luzes coloridas)
  renderer.toneMapping = THREE.NoToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = LUZ.ambiente;

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 20);
  // a luz principal acompanha a câmera (de cima e um pouco à esquerda), como numa foto de produto
  const key = new THREE.DirectionalLight(0xffffff, LUZ.principal); key.position.set(-.45, .55, 1);
  camera.add(key); camera.add(key.target); key.target.position.set(0, 0, -1);
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

  function redesenhar() {
    if (!forno) return;
    estampa.desenhar(modelo.ext, img, texto);
    forno.assar();
  }
  let rq = 0;
  const pedirDesenho = () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; redesenhar(); }); };

  for (const [k, arq] of Object.entries(IMAGENS)) {
    const im = new Image();
    im.onload = () => { img[k] = im; pedirDesenho(); };
    im.src = new URL(`../../assets/img/${arq}`, import.meta.url).href;
  }
  if (document.fonts) for (const f of [`800 80px "Saira Extra Condensed"`, `700 80px "Rajdhani"`, `800 80px "Saira Condensed"`]) document.fonts.load(f).then(pedirDesenho, () => {});

  carregarModelo().then(m => {
    modelo = m;
    forno = criarForno(renderer, m.geo, m.ext, estampa.telas, MOBILE ? 1536 : 2048);
    m.material.map = forno.textura;
    m.material.bumpMap = forno.relevo;                // bordados em alto-relevo
    m.material.bumpScale = RELEVO;
    camisa = new THREE.Mesh(m.geo, m.material);
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
  }
  function setText(nome, numero) { texto = { nome, numero }; pedirDesenho(); }
  /* ---------- controles ---------- */
  const controls = new OrbitControls(camera, canvas);
  canvas.style.touchAction = 'pan-y';                          // deixa rolar a página no celular
  Object.assign(controls, {
    enableDamping: true, dampingFactor: .07, rotateSpeed: .85,
    enablePan: false, enableZoom: false, autoRotate: true, autoRotateSpeed: 1.6,
    minPolarAngle: Math.PI / 2 - .5, maxPolarAngle: Math.PI / 2 + .25
  });
  let alvoAz = null, zoom = 1, zoomAlvo = 1, distBase = 2.6;
  const hint = document.getElementById('hint');
  controls.addEventListener('start', () => { controls.autoRotate = false; alvoAz = null; if (hint) hint.style.opacity = 0; });

  function showSide(lado) {
    controls.autoRotate = false;
    const az = controls.getAzimuthalAngle();
    alvoAz = lado === 'back' ? (az >= 0 ? Math.PI : -Math.PI) : 0;
  }
  const stopSpin = () => { controls.autoRotate = false; };
  document.querySelectorAll('[data-side]').forEach(b => b.addEventListener('click', () => showSide(b.dataset.side)));
  document.querySelectorAll('[data-zoom]').forEach(b => b.addEventListener('click', () => {
    zoomAlvo = Math.max(.55, Math.min(1.3, zoomAlvo * (b.dataset.zoom > 0 ? .82 : 1.22)));
  }));

  /* ---------- tamanho do canvas e enquadramento ---------- */
  function ajustarCamera() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    if (!modelo) return;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const meiaAlt = modelo.ext.L / 2 * 1.22, meiaLarg = modelo.ext.X * 1.18;
    distBase = Math.max(meiaAlt / t, meiaLarg / (t * camera.aspect)) + .15;
  }
  new ResizeObserver(ajustarCamera).observe(canvas);

  /* ---------- loop ---------- */
  let visivel = true, ultimo = performance.now(), ultimaFace = '', pronto = false;
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; }).observe(canvas);
  const botoes = [...document.querySelectorAll('[data-side]')];
  const offset = new THREE.Vector3(), sph = new THREE.Spherical();

  renderer.setAnimationLoop(agora => {
    const dt = Math.min(.25, (agora - ultimo) / 1000); ultimo = agora;   // aceita quadros lentos sem travar as animações
    if (!visivel || !camisa) return;

    escala.lerp(escalaAlvo, Math.min(1, dt * 8));
    camisa.scale.copy(escala);
    const t = agora / 1000;
    grupo.position.y = Math.sin(t * 1.3) * .008;
    grupo.rotation.z = Math.sin(t * .8) * .01;
    chao.position.y = -modelo.ext.L / 2 * escala.y - .05;
    chao.scale.set(modelo.ext.X * 1.9 * escala.x, .3, 1);
    chao.material.opacity = .5 - grupo.position.y * 6;

    zoom += (zoomAlvo - zoom) * Math.min(1, dt * 8);
    offset.copy(camera.position).sub(controls.target);
    sph.setFromVector3(offset);
    sph.radius = distBase * zoom;
    if (alvoAz !== null) {
      const d = alvoAz - sph.theta;
      sph.theta += d * Math.min(1, dt * 6);
      sph.phi += (Math.PI / 2 - .08 - sph.phi) * Math.min(1, dt * 6);
      if (Math.abs(d) < .002) alvoAz = null;
    }
    camera.position.copy(controls.target).add(offset.setFromSpherical(sph));
    controls.update(dt);
    renderer.render(scene, camera);

    const az = controls.getAzimuthalAngle(), face = Math.abs(az) < Math.PI / 2 ? 'front' : 'back';
    if (face !== ultimaFace) { ultimaFace = face; botoes.forEach(b => b.classList.toggle('on', b.dataset.side === face)); }
    if (!pronto) { pronto = true; onPronto(); }
  });

  if (new URLSearchParams(location.search).has('debug')) window.__camisa = { camera, controls, scene, renderer };   // inspeção no console
  return { setModel, setText, showSide, stopSpin };
}
