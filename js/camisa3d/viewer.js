/* =====================================================================
   CAMISA 3D — visualizador com three.js
   Luz de estúdio (HDRI), tecido com trama e brilho suave, giro com
   inércia e transição animada entre frente e costas.
   ===================================================================== */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { construirCamisa, MODELAGENS } from './geometria.js';
import { criarEstampa } from './estampa.js';

const MOBILE = Math.min(screen.width, screen.height) < 600;
const IMAGENS = { escudo: 'escudo.png', rep: 'rep.png', unicamp: 'unicamp.png', icone: 'icone.png' };

/* trama do tecido dry-fit (mapa de normais gerado por código) */
function trama() {
  const N = 128, cel = 8, alt = new Float32Array(N * N), data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ox = (Math.floor(y / cel) % 2) * cel / 2;
    const u = ((x + ox) % cel) / cel - .5, v = (y % cel) / cel - .5;
    alt[y * N + x] = Math.min(1, Math.hypot(u * 1.25, v) * 2.4);   // furinhos da malha
  }
  const h = (x, y) => alt[((y + N) % N) * N + ((x + N) % N)];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (h(x + 1, y) - h(x - 1, y)) * 1.2, dy = (h(x, y + 1) - h(x, y - 1)) * 1.2, l = Math.hypot(dx, dy, 1);
    data.set([(-dx / l * .5 + .5) * 255, (dy / l * .5 + .5) * 255, (1 / l * .5 + .5) * 255, 255], (y * N + x) * 4);
  }
  const t = new THREE.DataTexture(data, N, N);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

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

export function createShirt(canvas, { onPronto = () => {} } = {}) {
  /* ---------- renderer, cena e câmera ---------- */
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { throw new Error('WebGL indisponível'); }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MOBILE ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .85;
  const key = new THREE.DirectionalLight(0xfff4ea, 1.6); key.position.set(-1.2, 1.6, 2); scene.add(key);
  const rim = new THREE.DirectionalLight(0xff2a36, 1.1); rim.position.set(2.2, .5, -.6); scene.add(rim);
  const rim2 = rim.clone(); rim2.position.set(-2.2, .5, .6); scene.add(rim2);
  const fundo = new THREE.DirectionalLight(0xffffff, .9); fundo.position.set(.8, 1.4, -2); scene.add(fundo);

  const camera = new THREE.PerspectiveCamera(30, 1, .05, 20);
  camera.position.set(0, .12, 2.6);

  /* ---------- camisa ---------- */
  const estampa = criarEstampa(MOBILE ? 1024 : 1600);
  const mapa = new THREE.CanvasTexture(estampa.canvas);
  mapa.colorSpace = THREE.SRGBColorSpace;
  mapa.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const normal = trama();
  const material = new THREE.MeshPhysicalMaterial({
    map: mapa, normalMap: normal, normalScale: new THREE.Vector2(.22, .22),
    roughness: .74, metalness: 0, sheen: .6, sheenRoughness: .45, sheenColor: new THREE.Color(0xffffff)
  });
  const grupo = new THREE.Group(); scene.add(grupo);
  const camisa = new THREE.Mesh(new THREE.BufferGeometry(), material); grupo.add(camisa);
  const chao = sombra(); scene.add(chao);

  const cache = {}, img = {};
  let info = null, texto = { nome: '', numero: '' };
  const escala = new THREE.Vector3(1, 1, 1), escalaAlvo = new THREE.Vector3(1, 1, 1);

  function redesenhar() {
    if (!info) return;
    const { width, height } = estampa.canvas;
    estampa.desenhar(info, img, texto);
    if (estampa.canvas.width !== width || estampa.canvas.height !== height) mapa.dispose();   // realoca no novo tamanho
    normal.repeat.set(4 * info.maxX * 16, info.L * 16);        // 16 blocos por metro ≈ 4 mm por ponto da malha
    mapa.needsUpdate = true;
  }
  let rq = 0;
  const pedirDesenho = () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; redesenhar(); }); };

  for (const [k, arq] of Object.entries(IMAGENS)) {
    const im = new Image();
    im.onload = () => { img[k] = im; pedirDesenho(); };
    im.src = new URL(`../../assets/img/${arq}`, import.meta.url).href;
  }
  if (document.fonts) document.fonts.load(`700 80px "Saira"`).then(pedirDesenho, () => {});

  let atual = { g: '', a: 0, c: 0 };
  function setModel(g, a, c) {
    if (atual.g === g && atual.a === a && atual.c === c) return;
    const trocou = atual.g !== g;
    atual = { g, a, c };
    if (trocou) {
      const primeira = !info;
      info = cache[g] || (cache[g] = construirCamisa(g, MOBILE ? 120 : 170));
      camisa.geometry = info.geo;
      if (!primeira) escala.multiplyScalar(.94);               // pequeno "respiro" ao trocar a modelagem
      redesenhar();
      ajustarCamera();
    }
    const ref = MODELAGENS[g].ref;
    escalaAlvo.set(a / ref[0], c / ref[1], a / ref[0]);
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
    if (!info) return;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const meiaAlt = info.L / 2 * 1.12, meiaLarg = info.maxX * 1.08;
    distBase = Math.max(meiaAlt / t, meiaLarg / (t * camera.aspect)) + .15;
  }
  new ResizeObserver(ajustarCamera).observe(canvas);

  /* ---------- loop ---------- */
  let visivel = true, ultimo = performance.now(), ultimaFace = '', pronto = false;
  new IntersectionObserver(es => { visivel = es[0].isIntersecting; }).observe(canvas);
  const botoes = [...document.querySelectorAll('[data-side]')];
  const offset = new THREE.Vector3(), sph = new THREE.Spherical();

  renderer.setAnimationLoop(agora => {
    const dt = Math.min(.05, (agora - ultimo) / 1000); ultimo = agora;
    if (!visivel || !info) return;

    escala.lerp(escalaAlvo, Math.min(1, dt * 8));
    camisa.scale.copy(escala);
    const t = agora / 1000;
    grupo.position.y = Math.sin(t * 1.3) * .008;
    grupo.rotation.z = Math.sin(t * .8) * .01;
    chao.position.y = -info.L / 2 * escala.y - .07;
    chao.scale.set(info.maxX * 2.1 * escala.x, .32, 1);
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

  return { setModel, setText, showSide, stopSpin };
}
