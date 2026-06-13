import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const SAVE_KEY = 'concordium-arena-profile-v1';

const ITEMS = [
  { id: 'rusty-dagger', name: 'Adaga de treino', classId: 'rogue', type: 'melee', damage: 18, range: 2.0, owned: true },
  { id: 'long-sword', name: 'Espada longa', classId: 'rogue', type: 'melee', damage: 26, range: 2.35, price: 120 },
  { id: 'short-bow', name: 'Arco simples', classId: 'archer', type: 'bow', damage: 20, range: 34, owned: true },
  { id: 'war-bow', name: 'Arco de guerra', classId: 'archer', type: 'bow', damage: 30, range: 40, price: 140 },
  { id: 'red-cloak', name: 'Manto rubro', type: 'skin', color: '#8d3027', owned: true },
  { id: 'blue-cloak', name: 'Manto azul', type: 'skin', color: '#2e5f91', price: 80 },
  { id: 'green-cloak', name: 'Manto verde', type: 'skin', color: '#3f6f3e', price: 80 }
];

const CLASSES = {
  rogue: { name: 'Ladino', speed: 7.2, hp: 105, color: '#8d3027' },
  archer: { name: 'Arqueiro', speed: 6.3, hp: 90, color: '#2e5f91' }
};

const state = {
  profile: loadProfile(),
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
  matchOver: false
};

let renderer;
let scene;
let camera;
let playerBody;
let enemyBody;
let enemyHead;
let weaponMesh;
let arenaGroup;

const menu = document.querySelector('#menu');
const game = document.querySelector('#game');
const viewport = document.querySelector('#viewport');
const message = document.querySelector('#match-message');

initMenu();

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    return {
      coins: Number.isFinite(saved.coins) ? saved.coins : 60,
      owned: Array.isArray(saved.owned) ? saved.owned : ITEMS.filter(item => item.owned).map(item => item.id),
      skin: saved.skin || 'red-cloak',
      loadout: saved.loadout || { rogue: 'rusty-dagger', archer: 'short-bow' }
    };
  } catch {
    return { coins: 60, owned: ['rusty-dagger', 'short-bow', 'red-cloak'], skin: 'red-cloak', loadout: { rogue: 'rusty-dagger', archer: 'short-bow' } };
  }
}

function saveProfile() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state.profile));
}

function initMenu() {
  document.querySelectorAll('.tab').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('.tab-page').forEach(page => page.classList.toggle('active', page.id === `tab-${button.dataset.tab}`));
    });
  });
  document.querySelectorAll('[data-class]').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedClass = card.dataset.class;
      document.querySelectorAll('[data-class]').forEach(item => item.classList.toggle('active', item === card));
      renderLoadout();
    });
  });
  document.querySelector('#start-match').addEventListener('click', startMatch);
  document.querySelector('#leave-match').addEventListener('click', leaveMatch);
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
  renderLoadout();
  renderShop();
}

function renderLoadout() {
  const weaponSelect = document.querySelector('#weapon-select');
  const skinSelect = document.querySelector('#skin-select');
  const ownedWeapons = ITEMS.filter(item => item.classId === state.selectedClass && state.profile.owned.includes(item.id));
  weaponSelect.innerHTML = ownedWeapons.map(item => `<option value="${item.id}">${item.name}</option>`).join('');
  weaponSelect.value = state.profile.loadout[state.selectedClass] || ownedWeapons[0]?.id;
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
    return `<button class="shop-item ${owned ? 'owned' : ''}" data-buy="${item.id}" ${owned ? 'disabled' : ''}>
      <b>${item.name}</b>
      <span>${owned ? 'Comprado' : `${item.price || 0} moedas`}</span>
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
      saveProfile();
      renderLoadout();
      renderShop();
    });
  });
}

function startMatch() {
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
  scene.background = new THREE.Color(0x8ca06c);
  scene.fog = new THREE.Fog(0x8ca06c, 28, 58);
  camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, 0.1, 120);
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  viewport.appendChild(renderer.domElement);
  window.addEventListener('resize', resizeRenderer);

  const hemi = new THREE.HemisphereLight(0xffedd0, 0x36442b, 1.4);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
  sun.position.set(-8, 14, 6);
  sun.castShadow = true;
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
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(44, 34), new THREE.MeshStandardMaterial({ color: 0x6f7f43, roughness: .9 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  arenaGroup.add(ground);
  const sand = new THREE.Mesh(new THREE.CircleGeometry(11, 64), new THREE.MeshStandardMaterial({ color: 0x9d7d4f, roughness: .85 }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.y = .015;
  sand.receiveShadow = true;
  arenaGroup.add(sand);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x7f6650, roughness: .82 });
  for (const [x, z, w, d] of [[0, -17, 44, 1], [0, 17, 44, 1], [-22, 0, 1, 34], [22, 0, 1, 34]]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 3, d), wallMat);
    wall.position.set(x, 1.5, z);
    wall.castShadow = true;
    wall.receiveShadow = true;
    arenaGroup.add(wall);
  }
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xb9a47d, roughness: .8 });
  for (const [x, z] of [[-13, -9], [13, -9], [-13, 9], [13, 9]]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.55, .7, 4, 14), pillarMat);
    pillar.position.set(x, 2, z);
    pillar.castShadow = true;
    arenaGroup.add(pillar);
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
  if (weapon.type === 'bow') {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(.42, .025, 6, 28, Math.PI), new THREE.MeshStandardMaterial({ color: 0x8a542f, roughness: .65 }));
    bow.rotation.set(0, 0, Math.PI / 2);
    bow.position.set(.55, -.32, -1.05);
    group.add(bow);
  } else {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(.08, .78, .035), new THREE.MeshStandardMaterial({ color: 0xd8e2e5, metalness: .45, roughness: .35 }));
    blade.position.set(.48, -.25, -.95);
    blade.rotation.z = -.42;
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(.36, .06, .06), new THREE.MeshStandardMaterial({ color: 0xb98732, roughness: .55 }));
    hilt.position.set(.34, -.56, -.86);
    hilt.rotation.z = -.42;
    group.add(blade, hilt);
  }
  return group;
}

function getWeapon() {
  const id = state.profile.loadout[state.selectedClass];
  return ITEMS.find(item => item.id === id) || ITEMS.find(item => item.classId === state.selectedClass);
}

function getSkinColor() {
  return ITEMS.find(item => item.id === state.profile.skin)?.color || CLASSES[state.selectedClass].color;
}

function onMouseMove(event) {
  if (!state.running || !state.pointerLocked) return;
  state.yaw -= event.movementX * 0.0024;
  state.pitch = Math.max(-1.05, Math.min(1.05, state.pitch - event.movementY * 0.002));
}

function loop(now) {
  if (!state.running) return;
  const dt = Math.min(.05, (now - (state.last || now)) / 1000);
  state.last = now;
  updatePlayer(dt);
  updateEnemy(dt);
  updateProjectiles(dt);
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
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation).normalize();
    const arrow = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, .9, 8), new THREE.MeshStandardMaterial({ color: 0xd8c08a }));
    arrow.rotation.z = Math.PI / 2;
    arrow.position.copy(camera.position).addScaledVector(dir, 1.2);
    scene.add(arrow);
    state.projectiles.push({ mesh: arrow, velocity: dir.multiplyScalar(26), damage: weapon.damage, life: 1.7 });
  } else {
    const dist = Math.hypot(state.enemy.x - state.player.x, state.enemy.z - state.player.z);
    const aim = new THREE.Vector3(0, 0, -1).applyEuler(camera.rotation);
    const toEnemy = new THREE.Vector3(state.enemy.x - state.player.x, 0, state.enemy.z - state.player.z).normalize();
    if (dist <= weapon.range && aim.dot(toEnemy) > .55) damageEnemy(weapon.damage);
    else flashMessage('Errou');
  }
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
    saveProfile();
    renderShop();
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
