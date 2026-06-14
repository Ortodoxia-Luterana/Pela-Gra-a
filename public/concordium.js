import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const SAVE_KEY = 'concordium-arena-profile-v2';

const ITEMS = [
  { id: 'training-dagger', name: 'Adaga de treino', classId: 'rogue', type: 'melee', damage: 18, range: 2.0, owned: true, blurb: 'Curta, rapida e silenciosa.' },
  { id: 'long-sword', name: 'Espada longa', classId: 'rogue', type: 'melee', damage: 26, range: 2.35, price: 120, blurb: 'Mais alcance para duelo frontal.' },
  { id: 'simple-bow', name: 'Arco simples', classId: 'archer', type: 'bow', damage: 20, range: 34, owned: true, blurb: 'Confiavel para tiro medio.' },
  { id: 'war-bow', name: 'Arco de guerra', classId: 'archer', type: 'bow', damage: 30, range: 40, price: 140, blurb: 'Tiro pesado para arena aberta.' },
  { id: 'sellsword-cloak', name: 'Manto de mercenario', type: 'skin', color: '#8d3027', owned: true, blurb: 'Vermelho gasto de campo.' },
  { id: 'ash-cloak', name: 'Manto cinza', type: 'skin', color: '#60666d', price: 80, blurb: 'Discreto, frio e urbano.' },
  { id: 'forest-cloak', name: 'Manto verde', type: 'skin', color: '#3f6f3e', price: 80, blurb: 'Bom para emboscada.' }
];

const CLASSES = {
  rogue: {
    name: 'Ladino',
    mark: 'L',
    speed: 7.2,
    hp: 105,
    color: '#a94434',
    accent: '#c95a43',
    desc: 'Rapido, curto alcance, ideal para flanquear e punir erro de posicionamento.',
    role: 'Movimento e pressao'
  },
  archer: {
    name: 'Arqueiro',
    mark: 'A',
    speed: 6.3,
    hp: 90,
    color: '#355f86',
    accent: '#73a7c8',
    desc: 'Controle de distancia, tiro carregado e vantagem quando mantem espaco.',
    role: 'Precisao e distancia'
  }
};

const LOCKED_CLASSES = 4;

const defaultProfile = () => ({
  created: false,
  classId: 'rogue',
  coins: 60,
  owned: ITEMS.filter(item => item.owned).map(item => item.id),
  skin: 'sellsword-cloak',
  loadout: { rogue: 'training-dagger', archer: 'simple-bow' },
  options: { sensitivity: 50, music: 70, effects: 80 }
});

const state = {
  user: { name: 'Jogador' },
  profile: defaultProfile(),
  selectedClass: 'rogue',
  keys: new Set(),
  pointerLocked: false,
  running: false,
  last: 0,
  yaw: 0,
  pitch: 0,
  player: { x: -6, z: 0, hp: 100 },
  enemy: { x: 6, z: 0, hp: 100, cooldown: 0 },
  projectiles: [],
  matchOver: false,
  weaponAction: { active: false, type: '', t: 0, duration: .3 }
};

let renderer;
let scene;
let camera;
let playerBody;
let enemyBody;
let enemyHead;
let weaponMesh;
let arenaGroup;
let saveTimer = null;

const menu = document.querySelector('#menu');
const game = document.querySelector('#game');
const viewport = document.querySelector('#viewport');
const message = document.querySelector('#match-message');

init();

async function init() {
  await loadProfile();
  state.selectedClass = state.profile.classId || 'rogue';
  initMenuEvents();
  renderAll();
  if (!state.profile.created) showCreation(true);
}

async function loadProfile() {
  try {
    const response = await fetch('/api/concordium/profile', { cache: 'no-store' });
    if (!response.ok) throw new Error('profile api unavailable');
    const payload = await response.json();
    state.user = payload.user || state.user;
    state.profile = normalizeProfile(payload.profile);
    localStorage.setItem(SAVE_KEY, JSON.stringify({ user: state.user, profile: state.profile }));
  } catch {
    const cached = safeJson(localStorage.getItem(SAVE_KEY), {});
    state.user = cached.user || state.user;
    state.profile = normalizeProfile(cached.profile || cached);
  }
}

function normalizeProfile(value) {
  const defaults = defaultProfile();
  const profile = value && typeof value === 'object' ? value : {};
  const owned = Array.isArray(profile.owned) ? [...new Set(profile.owned.filter(id => ITEMS.some(item => item.id === id)))] : defaults.owned;
  defaults.owned.forEach(id => { if (!owned.includes(id)) owned.push(id); });
  return {
    created: Boolean(profile.created),
    classId: CLASSES[profile.classId] ? profile.classId : defaults.classId,
    coins: Number.isFinite(profile.coins) ? profile.coins : defaults.coins,
    owned,
    skin: owned.includes(profile.skin) ? profile.skin : defaults.skin,
    loadout: {
      rogue: owned.includes(profile.loadout?.rogue) ? profile.loadout.rogue : defaults.loadout.rogue,
      archer: owned.includes(profile.loadout?.archer) ? profile.loadout.archer : defaults.loadout.archer
    },
    options: {
      sensitivity: clamp(profile.options?.sensitivity ?? defaults.options.sensitivity, 1, 100),
      music: clamp(profile.options?.music ?? defaults.options.music, 0, 100),
      effects: clamp(profile.options?.effects ?? defaults.options.effects, 0, 100)
    }
  };
}

function saveProfile(immediate = false) {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ user: state.user, profile: state.profile }));
  const persist = async () => {
    try {
      await fetch('/api/concordium/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: state.profile })
      });
    } catch {}
  };
  if (immediate) {
    clearTimeout(saveTimer);
    persist();
    return;
  }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(persist, 250);
}

function initMenuEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
  });
  document.querySelector('#finish-creation').addEventListener('click', () => {
    state.profile.created = true;
    state.profile.classId = state.selectedClass;
    saveProfile(true);
    showCreation(false);
    selectTab('play');
    renderAll();
  });
  document.querySelector('#start-match').addEventListener('click', startMatch);
  document.querySelector('#leave-match').addEventListener('click', leaveMatch);
  ['sensitivity', 'music', 'effects'].forEach(key => {
    const input = document.querySelector(`#opt-${key}`);
    input.addEventListener('input', () => {
      state.profile.options[key] = Number(input.value);
      saveProfile();
    });
  });
  window.addEventListener('keydown', event => state.keys.add(event.key.toLowerCase()));
  window.addEventListener('keyup', event => state.keys.delete(event.key.toLowerCase()));
  document.addEventListener('pointerlockchange', () => {
    state.pointerLocked = document.pointerLockElement === viewport;
    message.textContent = state.pointerLocked ? '' : 'Clique para capturar o mouse';
  });
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mousedown', event => {
    if (!state.running) return;
    if (!state.pointerLocked) {
      viewport.requestPointerLock();
      return;
    }
    if (event.button === 0) attack();
  });
}

function selectTab(tab) {
  document.querySelectorAll('.rail-button').forEach(item => item.classList.toggle('active', item.dataset.tab === tab));
  document.querySelectorAll('.tab-page').forEach(page => page.classList.toggle('active', page.id === `tab-${tab}`));
  const copy = {
    play: ['Fila 1x1', 'Arena Medieval', 'Escolha classe, arma e entre direto.'],
    profile: ['Conta', 'Perfil do jogador', 'Seu nick vem do login e o progresso fica salvo na conta.'],
    classes: ['Classes', 'Caminhos de combate', 'Ficam aqui as classes liberadas e futuras.'],
    shop: ['Mercado', 'Loja de equipamentos', 'Compre armas e visuais para usar antes de entrar na arena.'],
    options: ['Sistema', 'Opcoes', 'Ajustes iniciais para deixar o jogo confortavel.']
  }[tab] || ['Concordium', 'Arena Medieval', ''];
  document.querySelector('#stage-label').textContent = copy[0];
  document.querySelector('#stage-title').textContent = copy[1];
  document.querySelector('#stage-text').textContent = copy[2];
}

function showCreation(visible) {
  document.querySelector('#onboarding').classList.toggle('hidden', !visible);
}

function renderAll() {
  renderHeader();
  renderClassCards();
  renderLoadout();
  renderShop();
  renderProfile();
  renderOptions();
}

function renderHeader() {
  const initials = initialsFor(state.user.name);
  const classDef = CLASSES[state.profile.classId] || CLASSES.rogue;
  document.querySelector('#top-initials').textContent = initials;
  document.querySelector('#top-name').textContent = state.user.name || 'Jogador';
  document.querySelector('#top-class').textContent = state.profile.created ? classDef.name : 'Criar perfil';
  document.querySelector('#creation-name').textContent = state.user.name || 'Jogador';
}

function renderClassCards() {
  const playRoot = document.querySelector('#play-class-row');
  const creationRoot = document.querySelector('#creation-grid');
  const treeRoot = document.querySelector('#class-tree');
  const classButtons = Object.entries(CLASSES).map(([id, classDef]) => classCard(id, classDef)).join('');
  const locks = Array.from({ length: LOCKED_CLASSES }, () => lockedCard()).join('');
  playRoot.innerHTML = classButtons;
  creationRoot.innerHTML = classButtons + locks;
  treeRoot.innerHTML = classButtons + locks;
  document.querySelectorAll('[data-class]').forEach(card => {
    card.classList.toggle('active', card.dataset.class === state.selectedClass);
    card.addEventListener('click', () => {
      state.selectedClass = card.dataset.class;
      state.profile.classId = state.selectedClass;
      saveProfile();
      renderAll();
    });
  });
}

function classCard(id, classDef) {
  const active = id === state.selectedClass ? ' active' : '';
  return `<button class="class-card${active}" data-class="${id}" style="--accent:${classDef.accent}">
    <span class="class-icon">${classDef.mark}</span>
    <h3>${classDef.name}</h3>
    <p>${classDef.role}</p>
  </button>`;
}

function lockedCard() {
  return `<article class="locked-class">
    <span class="class-icon">?</span>
    <h3>???</h3>
    <p>Bloqueado</p>
  </article>`;
}

function renderLoadout() {
  const weaponSelect = document.querySelector('#weapon-select');
  const skinSelect = document.querySelector('#skin-select');
  const ownedWeapons = ITEMS.filter(item => item.classId === state.selectedClass && state.profile.owned.includes(item.id));
  weaponSelect.innerHTML = ownedWeapons.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
  weaponSelect.value = state.profile.loadout[state.selectedClass] || ownedWeapons[0]?.id || '';
  weaponSelect.onchange = () => {
    state.profile.loadout[state.selectedClass] = weaponSelect.value;
    saveProfile();
  };
  const skins = ITEMS.filter(item => item.type === 'skin' && state.profile.owned.includes(item.id));
  skinSelect.innerHTML = skins.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
  skinSelect.value = state.profile.skin;
  skinSelect.onchange = () => {
    state.profile.skin = skinSelect.value;
    saveProfile();
  };
}

function renderShop() {
  document.querySelector('#coins').textContent = state.profile.coins;
  const root = document.querySelector('#shop-grid');
  root.innerHTML = ITEMS.filter(item => !item.owned).map(item => {
    const owned = state.profile.owned.includes(item.id);
    const locked = !owned && state.profile.coins < (item.price || 0);
    return `<button class="shop-item ${owned ? 'owned' : ''}" data-buy="${item.id}" ${owned ? 'disabled' : ''}>
      <b>${item.name}</b>
      <span>${item.blurb}</span>
      <span>${owned ? 'Comprado' : locked ? `${item.price} moedas - faltam ${item.price - state.profile.coins}` : `${item.price} moedas`}</span>
    </button>`;
  }).join('');
  root.querySelectorAll('[data-buy]').forEach(button => {
    button.addEventListener('click', () => {
      const item = ITEMS.find(entry => entry.id === button.dataset.buy);
      if (!item || state.profile.owned.includes(item.id) || state.profile.coins < item.price) return;
      state.profile.coins -= item.price;
      state.profile.owned.push(item.id);
      if (item.type === 'skin') state.profile.skin = item.id;
      if (item.classId) state.profile.loadout[item.classId] = item.id;
      saveProfile(true);
      renderAll();
    });
  });
}

function renderProfile() {
  const classDef = CLASSES[state.profile.classId] || CLASSES.rogue;
  const portrait = document.querySelector('#profile-portrait');
  portrait.style.background = `linear-gradient(145deg, ${classDef.accent}66, rgba(12,13,16,.86))`;
  document.querySelector('#profile-name').textContent = state.user.name || 'Jogador';
  document.querySelector('#profile-summary').textContent = state.profile.created ? `${classDef.name}: ${classDef.desc}` : 'Escolha uma classe para liberar o lobby.';
  document.querySelector('#profile-coins').textContent = state.profile.coins;
  document.querySelector('#profile-items').textContent = state.profile.owned.length;
  document.querySelector('#profile-status').textContent = state.profile.created ? 'Pronto' : 'Novo';
}

function renderOptions() {
  document.querySelector('#opt-sensitivity').value = state.profile.options.sensitivity;
  document.querySelector('#opt-music').value = state.profile.options.music;
  document.querySelector('#opt-effects').value = state.profile.options.effects;
}

function startMatch() {
  state.profile.created = true;
  state.profile.classId = state.selectedClass;
  saveProfile(true);
  menu.classList.add('hidden');
  game.classList.remove('hidden');
  state.running = true;
  state.matchOver = false;
  const classDef = CLASSES[state.selectedClass];
  state.player = { x: -7, z: 0, hp: classDef.hp };
  state.enemy = { x: 8.5, z: 0, hp: 100, cooldown: 1.4 };
  state.projectiles = [];
  state.yaw = -Math.PI / 2;
  state.pitch = 0;
  setupScene();
  updateHud();
  message.textContent = 'Clique para capturar o mouse';
  requestAnimationFrame(loop);
}

function leaveMatch() {
  state.running = false;
  document.exitPointerLock?.();
  game.classList.add('hidden');
  menu.classList.remove('hidden');
  viewport.innerHTML = '';
  renderer?.dispose();
}

function setupScene() {
  viewport.innerHTML = '';
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x5f6a66);
  scene.fog = new THREE.Fog(0x5f6a66, 24, 62);
  camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 120);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  viewport.appendChild(renderer.domElement);
  window.addEventListener('resize', resizeRenderer);

  const hemi = new THREE.HemisphereLight(0xffedd0, 0x2d332f, 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 2.1);
  sun.position.set(-11, 18, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  arenaGroup = new THREE.Group();
  scene.add(arenaGroup);
  buildArena();
  playerBody = makeFighter(getSkinColor(), true);
  scene.add(playerBody);
  enemyBody = makeFighter('#3b3f44', false);
  enemyHead = enemyBody.getObjectByName('head');
  scene.add(enemyBody);
  weaponMesh = makeWeapon();
  camera.add(weaponMesh);
  scene.add(camera);
}

function buildArena() {
  const stoneTexture = makeStoneTexture();
  const dirtTexture = makeDirtTexture();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), new THREE.MeshStandardMaterial({ map: dirtTexture, color: 0x9b8060, roughness: .95 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  arenaGroup.add(ground);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(11, 80), new THREE.MeshStandardMaterial({ map: dirtTexture, color: 0xb99562, roughness: .9 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = .015;
  sand.receiveShadow = true;
  arenaGroup.add(sand);
  const wallMat = new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0x9a8a73, roughness: .86 });
  for (const [x, z, w, d] of [[0, -17, 44, 1], [0, 17, 44, 1], [-22, 0, 1, 34], [22, 0, 1, 34]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 5.2, d), wallMat);
    wall.position.set(x, 2.6, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    arenaGroup.add(wall);
  }
  const capMat = new THREE.MeshStandardMaterial({ color: 0x6f5a45, roughness: .82 });
  for (const [x, z, w, d] of [[0, -17.65, 44, .35], [0, 17.65, 44, .35], [-22.65, 0, .35, 34], [22.65, 0, .35, 34]]) {
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w, .35, d), capMat);
    cap.position.set(x, 5.35, z);
    cap.castShadow = true;
    arenaGroup.add(cap);
  }
  const pillarMat = new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xb9a47d, roughness: .8 });
  for (const [x, z] of [[-13, -9], [13, -9], [-13, 9], [13, 9]]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.65, .82, 5.2, 18), pillarMat);
    pillar.position.set(x, 2.6, z);
    pillar.castShadow = true;
    arenaGroup.add(pillar);
  }
  const bannerMatBlue = new THREE.MeshStandardMaterial({ color: 0x18395f, roughness: .75, side: THREE.DoubleSide });
  const bannerMatRed = new THREE.MeshStandardMaterial({ color: 0x6d2020, roughness: .75, side: THREE.DoubleSide });
  for (const [x, z, rot, mat] of [[-8, -16.42, 0, bannerMatBlue], [8, -16.42, 0, bannerMatRed], [-21.42, -5, Math.PI / 2, bannerMatBlue], [21.42, 5, Math.PI / 2, bannerMatRed]]) {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.2), mat);
    banner.position.set(x, 3.05, z);
    banner.rotation.y = rot;
    arenaGroup.add(banner);
  }
  for (const [x, z] of [[-18, -13], [18, -13], [-18, 13], [18, 13]]) {
    const crate = new THREE.Mesh(new THREE.BoxGeometry(2, 1.4, 2), new THREE.MeshStandardMaterial({ color: 0x5b3a22, roughness: .8 }));
    crate.position.set(x, .7, z);
    crate.castShadow = true;
    crate.receiveShadow = true;
    arenaGroup.add(crate);
  }
}

function makeFighter(color, player) {
  const group = new THREE.Group();
  const cloak = new THREE.MeshStandardMaterial({ color, roughness: .72 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x4a2d1d, roughness: .8 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc58b63, roughness: .8 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .9, 5, 10), cloak);
  body.position.y = 1.1;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.26, 16, 12), skin);
  head.name = 'head';
  head.position.y = 1.9;
  head.castShadow = true;
  group.add(head);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(.82, .12, .12), leather);
  belt.position.set(0, 1.05, -.33);
  group.add(belt);
  if (!player) {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.42, .025, 6, 28, Math.PI), new THREE.MeshStandardMaterial({ color: 0x7a4b2a }));
    bow.rotation.z = Math.PI / 2;
    bow.position.set(.55, 1.15, 0);
    group.add(bow);
  }
  return group;
}

function makeWeapon() {
  const weapon = getWeapon();
  const group = new THREE.Group();
  group.name = 'viewWeapon';
  if (weapon.type === 'bow') {
    const bowMat = new THREE.MeshStandardMaterial({ color: 0x8a542f, roughness: .65 });
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.62, .028, 8, 34, Math.PI), bowMat);
    bow.name = 'bow';
    bow.rotation.set(0, .18, Math.PI / 2);
    bow.position.set(.52, -.26, -1.04);
    const string = new THREE.Mesh(new THREE.CylinderGeometry(.01, .01, 1.18, 6), new THREE.MeshBasicMaterial({ color: 0xe7d7b0 }));
    string.name = 'bowString';
    string.rotation.z = Math.PI / 2;
    string.position.set(.52, -.26, -1.04);
    const arrow = makeArrowMesh();
    arrow.name = 'heldArrow';
    arrow.scale.setScalar(.82);
    arrow.position.set(.18, -.31, -1.12);
    arrow.rotation.x = Math.PI / 2;
    group.add(bow, string, arrow);
  } else {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.09, 1.05, .035), new THREE.MeshStandardMaterial({ color: 0xd8e2e5, metalness: .55, roughness: .28 }));
    blade.position.set(.48, -.22, -.92);
    blade.rotation.z = -.54;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(.42, .07, .07), new THREE.MeshStandardMaterial({ color: 0xb98732, roughness: .55 }));
    hilt.position.set(.31, -.62, -.82);
    hilt.rotation.z = -.54;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.045, .045, .35, 10), new THREE.MeshStandardMaterial({ color: 0x3d2415, roughness: .72 }));
    grip.position.set(.23, -.76, -.79);
    grip.rotation.z = -.54;
    group.add(blade, hilt, grip);
  }
  group.userData.rest = { position: group.position.clone(), rotation: group.rotation.clone() };
  return group;
}

function getWeapon() {
  const id = state.profile.loadout[state.selectedClass];
  return ITEMS.find(item => item.id === id) || ITEMS.find(item => item.classId === state.selectedClass);
}

function makeArrowMesh() {
  const group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, 1.15, 8), new THREE.MeshStandardMaterial({ color: 0xc7a267, roughness: .65 }));
  shaft.rotation.x = Math.PI / 2;
  const head = new THREE.Mesh(new THREE.ConeGeometry(.06, .18, 8), new THREE.MeshStandardMaterial({ color: 0xd8d2c1, metalness: .25, roughness: .34 }));
  head.position.z = -.66;
  head.rotation.x = -Math.PI / 2;
  const featherMat = new THREE.MeshStandardMaterial({ color: 0xeee5ca, roughness: .8, side: THREE.DoubleSide });
  for (const angle of [0, Math.PI * 2 / 3, Math.PI * 4 / 3]) {
    const feather = new THREE.Mesh(new THREE.PlaneGeometry(.08, .22), featherMat);
    feather.position.z = .56;
    feather.rotation.set(Math.PI / 2, 0, angle);
    group.add(feather);
  }
  group.add(shaft, head);
  return group;
}

function makeStoneTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#887865';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < 512; y += 42) {
    const offset = (y / 42) % 2 ? 48 : 0;
    for (let x = -offset; x < 512; x += 96) {
      const shade = 105 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${shade},${shade - 12},${shade - 24})`;
      ctx.fillRect(x + 2, y + 2, 92, 38);
      ctx.strokeStyle = 'rgba(33,25,18,.42)';
      ctx.strokeRect(x + 2, y + 2, 92, 38);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 2);
  return texture;
}

function makeDirtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#9c8060';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 4500; i++) {
    const v = 95 + Math.floor(Math.random() * 72);
    ctx.fillStyle = `rgba(${v},${Math.floor(v * .78)},${Math.floor(v * .5)},.34)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 5);
  return texture;
}

function getSkinColor() {
  return ITEMS.find(item => item.id === state.profile.skin)?.color || CLASSES[state.selectedClass].color;
}

function onMouseMove(event) {
  if (!state.running || !state.pointerLocked) return;
  const sensitivity = (state.profile.options.sensitivity || 50) / 50;
  state.yaw -= event.movementX * 0.0024 * sensitivity;
  state.pitch = Math.max(-1.05, Math.min(1.05, state.pitch - event.movementY * 0.002 * sensitivity));
}

function loop(now) {
  if (!state.running) return;
  const dt = Math.min(.05, (now - (state.last || now)) / 1000);
  state.last = now;
  updatePlayer(dt);
  updateEnemy(dt);
  updateProjectiles(dt);
  updateWeaponAnimation(dt);
  renderFrame();
  requestAnimationFrame(loop);
}

function updatePlayer(dt) {
  const classDef = CLASSES[state.selectedClass];
  const forward = Number(state.keys.has('w')) - Number(state.keys.has('s'));
  const strafe = Number(state.keys.has('d')) - Number(state.keys.has('a'));
  const move = new THREE.Vector3(strafe, 0, -forward);
  if (move.lengthSq()) {
    move.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), state.yaw);
    state.player.x = clamp(state.player.x + move.x * classDef.speed * dt, -19.5, 19.5);
    state.player.z = clamp(state.player.z + move.z * classDef.speed * dt, -14.5, 14.5);
  }
  camera.position.set(state.player.x, 1.68, state.player.z);
  camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  playerBody.position.set(state.player.x, 0, state.player.z);
}

function updateEnemy(dt) {
  if (state.matchOver) return;
  const dx = state.player.x - state.enemy.x;
  const dz = state.player.z - state.enemy.z;
  const dist = Math.hypot(dx, dz);
  if (dist > 2.1) {
    state.enemy.x += (dx / dist) * 2.25 * dt;
    state.enemy.z += (dz / dist) * 2.25 * dt;
  }
  state.enemy.cooldown -= dt;
  if (dist < 2.35 && state.enemy.cooldown <= 0) {
    state.enemy.cooldown = 1.45;
    state.player.hp = Math.max(0, state.player.hp - 8);
    flashMessage('-8 vida');
    if (state.player.hp <= 0) endMatch(false);
  }
  enemyBody.position.set(state.enemy.x, 0, state.enemy.z);
  enemyBody.lookAt(state.player.x, 1, state.player.z);
  updateHud();
}

function updateProjectiles(dt) {
  state.projectiles = state.projectiles.filter(projectile => {
    projectile.mesh.position.addScaledVector(projectile.velocity, dt);
    projectile.life -= dt;
    const dist = Math.hypot(projectile.mesh.position.x - state.enemy.x, projectile.mesh.position.z - state.enemy.z);
    if (dist < .8) {
      scene.remove(projectile.mesh);
      damageEnemy(projectile.damage);
      return false;
    }
    if (projectile.life <= 0) {
      scene.remove(projectile.mesh);
      return false;
    }
    return true;
  });
}

function attack() {
  if (state.matchOver) return;
  const weapon = getWeapon();
  if (weapon.type === 'bow') {
    beginWeaponAction('bow', .42);
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
    const arrow = makeArrowMesh();
    arrow.position.copy(camera.position).addScaledVector(dir, 1.25);
    arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    scene.add(arrow);
    state.projectiles.push({ mesh: arrow, velocity: dir.clone().multiplyScalar(34), damage: weapon.damage, life: 2.2 });
  } else {
    beginWeaponAction('slash', .34);
    const dist = Math.hypot(state.enemy.x - state.player.x, state.enemy.z - state.player.z);
    const aim = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const toEnemy = new THREE.Vector3(state.enemy.x - state.player.x, 0, state.enemy.z - state.player.z).normalize();
    if (dist <= weapon.range && aim.dot(toEnemy) > .55) damageEnemy(weapon.damage);
    else flashMessage('Errou');
  }
}

function beginWeaponAction(type, duration) {
  state.weaponAction = { active: true, type, t: 0, duration };
}

function updateWeaponAnimation(dt) {
  if (!weaponMesh) return;
  const bob = Math.sin(performance.now() * .006) * .015;
  weaponMesh.position.set(0, bob, 0);
  weaponMesh.rotation.set(0, 0, 0);
  const heldArrow = weaponMesh.getObjectByName('heldArrow');
  const bowString = weaponMesh.getObjectByName('bowString');
  if (heldArrow) heldArrow.visible = true;
  if (bowString) bowString.position.x = .52;
  if (!state.weaponAction.active) return;
  state.weaponAction.t += dt;
  const p = Math.min(1, state.weaponAction.t / state.weaponAction.duration);
  const e = Math.sin(p * Math.PI);
  if (state.weaponAction.type === 'slash') {
    weaponMesh.rotation.z = -1.15 * e;
    weaponMesh.rotation.x = .32 * e;
    weaponMesh.position.x = -.18 * e;
    weaponMesh.position.y = -.08 * e;
  } else if (state.weaponAction.type === 'bow') {
    weaponMesh.position.z = .12 * e;
    if (heldArrow) {
      heldArrow.position.z = -1.12 + .34 * e;
      heldArrow.visible = p < .68;
    }
    if (bowString) bowString.position.x = .52 - .22 * e;
  }
  if (p >= 1) state.weaponAction.active = false;
}

function damageEnemy(amount) {
  state.enemy.hp = Math.max(0, state.enemy.hp - amount);
  flashMessage(`-${amount}`);
  if (state.enemy.hp <= 0) endMatch(true);
  updateHud();
}

function endMatch(won) {
  state.matchOver = true;
  if (won) {
    state.profile.coins += 35;
    saveProfile(true);
    renderAll();
    message.textContent = 'Vitoria! +35 moedas';
  } else {
    message.textContent = 'Derrota. Tente outra classe ou arma.';
  }
  document.exitPointerLock?.();
}

function flashMessage(text) {
  message.textContent = text;
  setTimeout(() => {
    if (!state.matchOver && state.pointerLocked) message.textContent = '';
  }, 650);
}

function updateHud() {
  document.querySelector('#hud-class').textContent = CLASSES[state.selectedClass].name;
  document.querySelector('#hud-weapon').textContent = getWeapon().name;
  document.querySelector('#player-hp').textContent = Math.ceil(state.player.hp);
  document.querySelector('#enemy-hp').textContent = Math.ceil(state.enemy.hp);
  document.querySelector('#player-hp-bar').style.width = `${clamp((state.player.hp / CLASSES[state.selectedClass].hp) * 100, 0, 100)}%`;
  document.querySelector('#enemy-hp-bar').style.width = `${clamp(state.enemy.hp, 0, 100)}%`;
  document.querySelector('#hud-skills').innerHTML = state.selectedClass === 'archer'
    ? '<li>Disparo preciso</li><li>Chuva de flechas</li><li>Visao agucada</li>'
    : '<li>Passo sombrio</li><li>Golpe nas costas</li><li>Fumaca</li>';
}

function renderFrame() {
  renderer.render(scene, camera);
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function initialsFor(name) {
  return String(name || 'J').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase() || 'J';
}

function safeJson(raw, fallback) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}
