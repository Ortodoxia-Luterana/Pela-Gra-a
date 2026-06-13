(() => {
  const DRAFT_KEY = 'concordium-character-draft-v2';
  const ORIGINS = [
    ['Roma', 'flag_roma', { resistencia: 1, forca: 1 }],
    ['Alexandria', 'flag_alexandria', { inteligencia: 2 }],
    ['Antioquia', 'flag_antioquia', { agilidade: 1, inteligencia: 1 }],
    ['Jerusalem', 'flag_jerusalem', { resistencia: 1, inteligencia: 1 }],
    ['Constantinopla', 'flag_constantinopla', { inteligencia: 1, resistencia: 1 }],
    ['Cartago', 'flag_cartago', { resistencia: 2 }],
    ['Capadocia', 'flag_capadocia', { inteligencia: 1, agilidade: 1 }],
    ['India de Sao Tome', 'flag_india', { agilidade: 2 }],
    ['Etiopia/Axum', 'flag_axum', { forca: 1, resistencia: 1 }],
    ['Ilhas Britanicas', 'flag_britanicas', { agilidade: 1, resistencia: 1 }],
    ['Hispania', 'flag_hispania', { forca: 1, resistencia: 1 }],
    ['Galia', 'flag_galia', { forca: 1, agilidade: 1 }]
  ].map(([name, flag, bonus]) => ({ name, flag, bonus }));

  const WEAPONS = [
    ['Espada longa', 'weapon_long_sword', 11, 'forca'],
    ['Machado', 'weapon_axe', 12, 'forca'],
    ['Arco e flecha', 'weapon_bow', 9, 'agilidade']
  ].map(([name, icon, damage, stat]) => ({ name, icon, damage, stat }));

  const SKIN_COLORS = ['#c58b63', '#8d5a3a', '#e0b48a', '#6a3d2a'];
  const HAIR_COLORS = ['#2c1a12', '#6b4428', '#d8c69a', '#1b1b1d'];
  const TUNIC_COLORS = ['#9a4b33', '#3c638f', '#4f7b45', '#8b5bc9'];
  const SPRITE_PATHS = {
    tileGrass: '/assets/concordium/sprites/tile_grass.png',
    tileStone: '/assets/concordium/sprites/tile_stone.png',
    tileDirt: '/assets/concordium/sprites/tile_dirt.png',
    buildingHouse: '/assets/concordium/sprites/building_house.png',
    buildingBasilica: '/assets/concordium/sprites/building_basilica.png',
    stallRed: '/assets/concordium/sprites/stall_red.png',
    stallBlue: '/assets/concordium/sprites/stall_blue.png',
    stallGold: '/assets/concordium/sprites/stall_gold.png',
    tree: '/assets/concordium/sprites/tree.png',
    playerRed: '/assets/concordium/sprites/player_red.png',
    playerBlue: '/assets/concordium/sprites/player_blue.png',
    playerGreen: '/assets/concordium/sprites/player_green.png',
    npcElder: '/assets/concordium/sprites/npc_elder.png',
    npcMerchant: '/assets/concordium/sprites/npc_merchant.png',
    npcScribe: '/assets/concordium/sprites/npc_scribe.png',
    npcGuard: '/assets/concordium/sprites/npc_guard.png',
    npcTraveler: '/assets/concordium/sprites/npc_traveler.png',
    trainingDummy: '/assets/concordium/sprites/training_dummy.png',
    weaponLongSword: '/assets/concordium/sprites/weapon_long_sword.png',
    weaponAxe: '/assets/concordium/sprites/weapon_axe.png',
    weaponBow: '/assets/concordium/sprites/weapon_bow.png',
    flagRoma: '/assets/concordium/sprites/flag_roma.png',
    flagAlexandria: '/assets/concordium/sprites/flag_alexandria.png',
    flagAntioquia: '/assets/concordium/sprites/flag_antioquia.png',
    flagJerusalem: '/assets/concordium/sprites/flag_jerusalem.png',
    flagConstantinopla: '/assets/concordium/sprites/flag_constantinopla.png',
    flagCartago: '/assets/concordium/sprites/flag_cartago.png',
    flagCapadocia: '/assets/concordium/sprites/flag_capadocia.png',
    flagIndia: '/assets/concordium/sprites/flag_india.png',
    flagAxum: '/assets/concordium/sprites/flag_axum.png',
    flagBritanicas: '/assets/concordium/sprites/flag_britanicas.png',
    flagHispania: '/assets/concordium/sprites/flag_hispania.png',
    flagGalia: '/assets/concordium/sprites/flag_galia.png'
  };
  const ATTRS = [
    ['forca', 'Forca'],
    ['resistencia', 'Resistencia'],
    ['agilidade', 'Agilidade'],
    ['inteligencia', 'Inteligencia']
  ];

  const state = {
    socket: null,
    myId: null,
    players: new Map(),
    dummy: { x: 760, y: 500, hp: 120, maxHp: 120 },
    character: null,
    selectedOrigin: 0,
    selectedWeapon: 0,
    avatar: { gender: 'male', skin: SKIN_COLORS[0], hair: HAIR_COLORS[0], tunic: TUNIC_COLORS[0] },
    baseAttrs: Object.fromEntries(ATTRS.map(([key]) => [key, 1])),
    freePoints: 6,
    keys: new Set(),
    target: null,
    bubbles: new Map(),
    camera: { x: 0, y: 0 },
    quest: { elder: false, market: false, training: false, done: false },
    panel: null,
    lastMoveSent: 0,
    joystick: { active: false, dx: 0, dy: 0 },
    sprites: loadSprites()
  };

  const canvas = document.querySelector('#world');
  const ctx = canvas.getContext('2d');
  const mini = document.querySelector('#minimap');
  const miniCtx = mini.getContext('2d');
  const creator = document.querySelector('#creator');
  const game = document.querySelector('#game');
  state.panel = document.querySelector('#panel');

  const world = { w: 1500, h: 1000 };
  const npcs = [
    { name: 'Anciao da Praca', role: 'elder', x: 690, y: 410, color: '#d7b46a', sprite: 'npcElder' },
    { name: 'Mercador do Oriente', role: 'market', x: 930, y: 365, color: '#8ec5d9', sprite: 'npcMerchant' },
    { name: 'Escriba', role: 'scribe', x: 540, y: 310, color: '#d9d0b6', sprite: 'npcScribe' },
    { name: 'Guarda da Cidade', role: 'guard', x: 450, y: 575, color: '#9aa3b1', sprite: 'npcGuard' },
    { name: 'Viajante de Antioquia', role: 'traveler', x: 1030, y: 610, color: '#b88963', sprite: 'npcTraveler' }
  ];

  const buildings = [
    { x: 765, y: 315, w: 220, h: 184, color: '#896341', roof: '#5f2e26', label: 'Igreja antiga', sprite: 'buildingBasilica' },
    { x: 315, y: 390, w: 122, h: 122, color: '#76573d', roof: '#493029', sprite: 'buildingHouse' },
    { x: 1190, y: 405, w: 128, h: 128, color: '#7e6144', roof: '#513326', sprite: 'buildingHouse' },
    { x: 310, y: 810, w: 122, h: 122, color: '#6f563e', roof: '#442f27', sprite: 'buildingHouse' },
    { x: 1170, y: 825, w: 122, h: 122, color: '#806044', roof: '#513327', sprite: 'buildingHouse' },
    { x: 955, y: 345, w: 116, h: 116, color: '#8f6840', roof: '#674025', sprite: 'buildingHouse' }
  ];

  const marketStalls = [
    { x: 960, y: 430, color: '#9d4139', sprite: 'stallRed' },
    { x: 1040, y: 470, color: '#2f7382', sprite: 'stallBlue' },
    { x: 880, y: 470, color: '#a88432', sprite: 'stallGold' }
  ];

  initCreator();
  bindUi();
  resize();
  requestAnimationFrame(loop);

  function loadSprites() {
    return Object.fromEntries(Object.entries(SPRITE_PATHS).map(([key, src]) => {
      const image = new Image();
      image.src = src;
      return [key, image];
    }));
  }

  function initCreator() {
    restoreDraft();
    renderOrigins();
    renderAvatarEditor();
    renderWeapons();
    renderAttrs();
    document.querySelector('#char-name').addEventListener('input', saveDraft);
    document.querySelector('#creator-form').addEventListener('submit', event => {
      event.preventDefault();
      const name = document.querySelector('#char-name').value.trim().slice(0, 28) || 'Viajante';
      const origin = ORIGINS[state.selectedOrigin];
      const weapon = WEAPONS[state.selectedWeapon];
      const attrs = { ...state.baseAttrs };
      Object.entries(origin.bonus).forEach(([key, value]) => {
        attrs[key] = (attrs[key] || 0) + value;
      });
      state.character = {
        name,
        origin: origin.name,
        appearance: state.avatar.tunic,
        avatar: { ...state.avatar },
        weapon: weapon.name,
        weaponDamage: weapon.damage,
        weaponStat: weapon.stat,
        attrs
      };
      creator.classList.add('hidden');
      game.classList.remove('hidden');
      document.querySelector('#hud-name').textContent = name;
      document.querySelector('#hud-origin').textContent = origin.name;
      connect();
      addChat('Sistema', 'Voce chegou a Praca de Niceia.');
    });
  }

  function restoreDraft() {
    try {
      const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      if (typeof draft.name === 'string') document.querySelector('#char-name').value = draft.name.slice(0, 28);
      if (Number.isInteger(draft.selectedOrigin)) state.selectedOrigin = clamp(draft.selectedOrigin, 0, ORIGINS.length - 1);
      if (Number.isInteger(draft.selectedWeapon)) state.selectedWeapon = clamp(draft.selectedWeapon, 0, WEAPONS.length - 1);
      if (draft.avatar && typeof draft.avatar === 'object') {
        state.avatar = {
          gender: draft.avatar.gender === 'female' ? 'female' : 'male',
          skin: SKIN_COLORS.includes(draft.avatar.skin) ? draft.avatar.skin : state.avatar.skin,
          hair: HAIR_COLORS.includes(draft.avatar.hair) ? draft.avatar.hair : state.avatar.hair,
          tunic: TUNIC_COLORS.includes(draft.avatar.tunic) ? draft.avatar.tunic : state.avatar.tunic
        };
      }
      if (draft.baseAttrs && typeof draft.baseAttrs === 'object') {
        ATTRS.forEach(([key]) => {
          const value = Number(draft.baseAttrs[key]);
          if (Number.isFinite(value)) state.baseAttrs[key] = clamp(value, 1, 8);
        });
        state.freePoints = Math.max(0, 6 - ATTRS.reduce((sum, [key]) => sum + Math.max(0, state.baseAttrs[key] - 1), 0));
      }
    } catch {}
  }

  function saveDraft() {
    const draft = {
      name: document.querySelector('#char-name')?.value || '',
      selectedOrigin: state.selectedOrigin,
      selectedWeapon: state.selectedWeapon,
      avatar: state.avatar,
      baseAttrs: state.baseAttrs
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }

  function renderOrigins() {
    const root = document.querySelector('#origins');
    root.innerHTML = ORIGINS.map((origin, i) => `
      <button type="button" class="choice origin-card ${i === state.selectedOrigin ? 'active' : ''}" data-origin="${i}">
        <img src="/assets/concordium/sprites/${origin.flag}.png" alt="">
        <b>${origin.name}</b>
      </button>`).join('');
    root.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedOrigin = Number(button.dataset.origin);
        renderOrigins();
        saveDraft();
      });
    });
  }

  function renderAvatarEditor() {
    const root = document.querySelector('#looks');
    root.className = 'avatar-editor';
    root.innerHTML = `
      <div class="avatar-preview" aria-label="Previa do avatar"></div>
      <div class="avatar-controls">
        <div class="segmented">
          <button type="button" data-gender="male" class="${state.avatar.gender === 'male' ? 'active' : ''}">Homem</button>
          <button type="button" data-gender="female" class="${state.avatar.gender === 'female' ? 'active' : ''}">Mulher</button>
        </div>
        ${avatarSwatches('skin', 'Pele', SKIN_COLORS)}
        ${avatarSwatches('hair', 'Cabelo', HAIR_COLORS)}
        ${avatarSwatches('tunic', 'Tunica', TUNIC_COLORS)}
      </div>`;
    paintAvatarPreview(root.querySelector('.avatar-preview'), state.avatar);
    root.querySelectorAll('button[data-gender]').forEach(button => {
      button.addEventListener('click', () => {
        state.avatar.gender = button.dataset.gender;
        renderAvatarEditor();
        saveDraft();
      });
    });
    root.querySelectorAll('button[data-avatar-field]').forEach(button => {
      button.addEventListener('click', () => {
        state.avatar[button.dataset.avatarField] = button.dataset.color;
        renderAvatarEditor();
        saveDraft();
      });
    });
  }

  function avatarSwatches(field, label, colors) {
    return `<div class="avatar-row"><span>${label}</span><div>${colors.map(color => `
      <button type="button" class="mini-swatch ${state.avatar[field] === color ? 'active' : ''}" data-avatar-field="${field}" data-color="${color}" style="background:${color}" title="${label}"></button>`).join('')}</div></div>`;
  }

  function paintAvatarPreview(root, avatar) {
    const canvas = document.createElement('canvas');
    canvas.width = 80;
    canvas.height = 96;
    root.innerHTML = '';
    root.appendChild(canvas);
    const avatarCtx = canvas.getContext('2d');
    avatarCtx.imageSmoothingEnabled = false;
    drawAvatarPixel(avatarCtx, 40, 82, 3, avatar);
  }

  function drawAvatarPixel(context, x, y, scale, avatar = {}) {
    const skin = avatar.skin || '#c58b63';
    const hair = avatar.hair || '#2c1a12';
    const tunic = avatar.tunic || '#9a4b33';
    const female = avatar.gender === 'female';
    const px = (rx, ry, w, h, color) => {
      context.fillStyle = color;
      context.fillRect(Math.round(x + rx * scale), Math.round(y + ry * scale), Math.round(w * scale), Math.round(h * scale));
    };
    context.fillStyle = 'rgba(0,0,0,.32)';
    context.beginPath();
    context.ellipse(x, y + 2 * scale, 9 * scale, 3 * scale, 0, 0, Math.PI * 2);
    context.fill();
    px(-5, -22, 10, 6, hair);
    px(-6, -18, 12, 7, skin);
    px(-4, -19, 8, 2, hair);
    if (female) {
      px(-7, -16, 2, 6, hair);
      px(5, -16, 2, 6, hair);
    }
    px(-5, -10, 10, 13, tunic);
    px(-4, -8, 8, 2, lightenColor(tunic, 24));
    px(-7, -8, 2, 8, skin);
    px(5, -8, 2, 8, skin);
    px(-5, 3, 3, 6, '#3b2619');
    px(2, 3, 3, 6, '#3b2619');
    px(-2, -17, 1, 1, '#20120d');
    px(3, -17, 1, 1, '#20120d');
  }

  function lightenColor(color, amount) {
    const hex = color.replace('#', '');
    const parts = [0, 2, 4].map(index => Math.min(255, parseInt(hex.slice(index, index + 2), 16) + amount));
    return `rgb(${parts[0]},${parts[1]},${parts[2]})`;
  }

  function renderWeapons() {
    const root = document.querySelector('#weapons');
    root.innerHTML = WEAPONS.map((weapon, i) => `
      <button type="button" class="choice weapon-card ${i === state.selectedWeapon ? 'active' : ''}" data-weapon="${i}">
        <img src="/assets/concordium/sprites/${weapon.icon}.png" alt="">
        <b>${weapon.name}</b>
      </button>`).join('');
    root.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        state.selectedWeapon = Number(button.dataset.weapon);
        renderWeapons();
        saveDraft();
      });
    });
  }

  function renderAttrs() {
    document.querySelector('#points-left').textContent = `${state.freePoints} pontos`;
    const root = document.querySelector('#attrs');
    root.innerHTML = ATTRS.map(([key, label]) => `
      <div class="attr"><span>${label}</span><strong>${state.baseAttrs[key]}</strong><button type="button" data-attr="${key}">+</button></div>`).join('');
    root.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', () => {
        if (state.freePoints <= 0) return;
        state.baseAttrs[button.dataset.attr] += 1;
        state.freePoints -= 1;
        renderAttrs();
        saveDraft();
      });
    });
  }

  function bindUi() {
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', event => {
      if (event.target.matches('input, textarea')) return;
      if (event.key === 'Enter') {
        document.querySelector('#chat-input').focus();
        return;
      }
      if (event.key.toLowerCase() === 'i') showInventory();
      if (event.key.toLowerCase() === 'c') showSheet();
      if (event.key.toLowerCase() === 'e') interact();
      if (event.code === 'Space') {
        event.preventDefault();
        attack();
      }
      state.keys.add(event.key.toLowerCase());
    });
    window.addEventListener('keyup', event => state.keys.delete(event.key.toLowerCase()));
    canvas.addEventListener('click', event => {
      const rect = canvas.getBoundingClientRect();
      state.target = {
        x: event.clientX - rect.left + state.camera.x,
        y: event.clientY - rect.top + state.camera.y
      };
    });
    document.querySelector('#inventory-btn').addEventListener('click', showInventory);
    document.querySelector('#sheet-btn').addEventListener('click', showSheet);
    document.querySelector('#settings-btn').addEventListener('click', () => showPanel('<h3>Configuracoes</h3><p>Som, missoes e atalhos entram aqui nas proximas versoes.</p><button onclick="document.querySelector(\'#panel\').classList.add(\'hidden\')">Fechar</button>'));
    document.querySelector('#chat-form').addEventListener('submit', event => {
      event.preventDefault();
      const input = document.querySelector('#chat-input');
      const text = input.value.trim();
      if (!text || !state.socket) return;
      state.socket.emit('concordium:chat', text);
      input.value = '';
      input.blur();
    });
    document.querySelector('#mobile-action').addEventListener('click', attack);
    document.querySelector('#mobile-interact').addEventListener('click', interact);
    bindJoystick();
  }

  function bindJoystick() {
    const stick = document.querySelector('#stick');
    const knob = stick.querySelector('span');
    const end = () => {
      state.joystick = { active: false, dx: 0, dy: 0 };
      knob.style.left = '35px';
      knob.style.top = '35px';
    };
    stick.addEventListener('pointerdown', event => {
      state.joystick.active = true;
      stick.setPointerCapture(event.pointerId);
    });
    stick.addEventListener('pointermove', event => {
      if (!state.joystick.active) return;
      const rect = stick.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = Math.max(-36, Math.min(36, event.clientX - cx));
      const dy = Math.max(-36, Math.min(36, event.clientY - cy));
      state.joystick.dx = dx / 36;
      state.joystick.dy = dy / 36;
      knob.style.left = `${35 + dx}px`;
      knob.style.top = `${35 + dy}px`;
    });
    stick.addEventListener('pointerup', end);
    stick.addEventListener('pointercancel', end);
  }

  function connect() {
    state.socket = io();
    state.socket.on('connect', () => {
      state.socket.emit('concordium:join', state.character);
    });
    state.socket.on('concordium:init', payload => {
      state.myId = payload.id;
      state.players = new Map(payload.players.map(player => [player.id, player]));
      state.dummy = payload.dummy;
      syncHud();
    });
    state.socket.on('concordium:player-joined', player => {
      state.players.set(player.id, player);
      addChat('Sistema', `${player.name} entrou na praca.`);
    });
    state.socket.on('concordium:player-update', player => {
      state.players.set(player.id, player);
      syncHud();
    });
    state.socket.on('concordium:player-left', id => state.players.delete(id));
    state.socket.on('concordium:dummy-update', dummy => state.dummy = dummy);
    state.socket.on('concordium:chat', msg => addChat(msg.name, msg.text || msg.message || ''));
    state.socket.on('concordium:player-bubble', msg => {
      state.bubbles.set(msg.id, { text: msg.message, until: performance.now() + 3600 });
    });
    state.socket.on('concordium:notice', text => addChat('Sistema', text));
    state.socket.on('concordium:combat', payload => {
      state.quest.training = true;
      if (payload.leveled) addChat('Sistema', `Nivel ${payload.level}! Voce recebeu pontos de atributo.`);
      updateQuest();
      syncHud();
    });
    state.socket.on('concordium:progress', payload => {
      const me = getMe();
      if (!me) return;
      Object.assign(me, payload);
      syncHud();
      showSheet();
    });
  }

  function getMe() {
    return state.players.get(state.myId);
  }

  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    miniCtx.imageSmoothingEnabled = false;
  }

  function loop(now) {
    updateMovement(now);
    draw();
    requestAnimationFrame(loop);
  }

  function updateMovement(now) {
    const me = getMe();
    if (!me || !state.socket) return;
    let dx = 0;
    let dy = 0;
    if (state.keys.has('w') || state.keys.has('arrowup')) dy -= 1;
    if (state.keys.has('s') || state.keys.has('arrowdown')) dy += 1;
    if (state.keys.has('a') || state.keys.has('arrowleft')) dx -= 1;
    if (state.keys.has('d') || state.keys.has('arrowright')) dx += 1;
    dx += state.joystick.dx;
    dy += state.joystick.dy;
    if (state.target) {
      const tx = state.target.x - me.x;
      const ty = state.target.y - me.y;
      const dist = Math.hypot(tx, ty);
      if (dist < 8) state.target = null;
      else {
        dx += tx / dist;
        dy += ty / dist;
      }
    }
    if (!dx && !dy) return;
    const len = Math.max(1, Math.hypot(dx, dy));
    const speed = 2.7 + (me.attrs?.agilidade || 1) * 0.1;
    me.x = clamp(me.x + (dx / len) * speed, 70, world.w - 70);
    me.y = clamp(me.y + (dy / len) * speed, 80, world.h - 80);
    if (now - state.lastMoveSent > 45) {
      state.lastMoveSent = now;
      state.socket.emit('concordium:move', { x: me.x, y: me.y });
    }
  }

  function draw() {
    const me = getMe();
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    if (me) {
      state.camera.x = clamp(me.x - viewW / 2, 0, Math.max(0, world.w - viewW));
      state.camera.y = clamp(me.y - viewH / 2, 0, Math.max(0, world.h - viewH));
    }
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.save();
    ctx.translate(-state.camera.x, -state.camera.y);
    drawWorld();
    const actors = [...npcs, ...state.players.values(), { ...state.dummy, dummy: true, name: 'Alvo de treino' }]
      .sort((a, b) => a.y - b.y);
    actors.forEach(actor => {
      if (actor.dummy) drawDummy(actor);
      else if (actor.id) drawPlayer(actor);
      else drawNpc(actor);
    });
    ctx.restore();
    drawMinimap();
  }

  function drawWorld() {
    drawTiled(state.sprites.tileGrass, 0, 0, world.w, world.h, 128, '#5f8c3a');
    ctx.fillStyle = 'rgba(35, 45, 26, .22)';
    ctx.fillRect(0, 0, world.w, world.h);
    drawStonePath(720, 500, 980, 360, 28);
    drawStonePath(720, 500, 260, 720, 24);
    drawStonePath(720, 500, 1160, 760, 24);
    drawStonePath(720, 500, 705, 220, 26);
    drawPlaza();
    buildings.forEach(drawBuilding);
    marketStalls.forEach(drawStall);
    drawTrainingArea();
    drawTrees();
  }

  function spriteKey(name) {
    return String(name || '').replace(/_([a-z])/g, (_, char) => char.toUpperCase());
  }

  function ready(image) {
    return image && image.complete && image.naturalWidth > 0;
  }

  function drawTiled(image, x, y, w, h, size, fallback) {
    if (!ready(image)) {
      ctx.fillStyle = fallback;
      ctx.fillRect(x, y, w, h);
      return;
    }
    ctx.imageSmoothingEnabled = false;
    for (let yy = y; yy < y + h; yy += size) {
      for (let xx = x; xx < x + w; xx += size) {
        ctx.drawImage(image, xx, yy, size, size);
      }
    }
  }

  function drawSpriteBottom(image, x, y, w, h) {
    if (!ready(image)) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x - w / 2), Math.round(y - h), Math.round(w), Math.round(h));
    return true;
  }

  function drawSpriteBox(image, x, y, w, h) {
    if (!ready(image)) return false;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
    return true;
  }

  function drawPlaza() {
    ctx.save();
    ctx.translate(720, 500);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#756b58';
    ctx.strokeStyle = '#b59860';
    ctx.lineWidth = 4;
    ctx.fillRect(-165, -165, 330, 330);
    ctx.strokeRect(-165, -165, 330, 330);
    ctx.restore();
    ctx.fillStyle = '#4f4637';
    for (let i = -140; i <= 140; i += 34) {
      drawIsoTile(720 + i, 500, 34, 18, '#746b58', 'rgba(0,0,0,.12)');
      drawIsoTile(720, 500 + i, 34, 18, '#6c6252', 'rgba(0,0,0,.12)');
    }
  }

  function drawStonePath(x1, y1, x2, y2, width) {
    ctx.strokeStyle = '#6e6555';
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i += 1) {
      const t = i / 17;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      ctx.beginPath();
      ctx.moveTo(x - 16, y + 8);
      ctx.lineTo(x + 16, y - 8);
      ctx.stroke();
    }
  }

  function drawBuilding(b) {
    const image = state.sprites[b.sprite];
    if (drawSpriteBottom(image, b.x, b.y, b.w, b.h)) {
      if (b.label) label(b.label, b.x, b.y - b.h - 8, '#f0d089');
      return;
    }
    ctx.fillStyle = b.color;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.beginPath();
    ctx.moveTo(b.x - 18, b.y + 18);
    ctx.lineTo(b.x + b.w / 2, b.y - 44);
    ctx.lineTo(b.x + b.w + 18, b.y + 18);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2d211a';
    ctx.fillRect(b.x + b.w / 2 - 18, b.y + b.h - 46, 36, 46);
    ctx.strokeStyle = 'rgba(255,222,142,.32)';
    ctx.strokeRect(b.x, b.y, b.w, b.h);
    if (b.label) label(b.label, b.x + b.w / 2, b.y - 58, '#f0d089');
  }

  function drawStall(stall) {
    if (drawSpriteBottom(state.sprites[stall.sprite], stall.x, stall.y, 96, 96)) return;
    ctx.fillStyle = '#594130';
    ctx.fillRect(stall.x - 48, stall.y, 96, 44);
    ctx.fillStyle = stall.color;
    ctx.fillRect(stall.x - 56, stall.y - 24, 112, 28);
    ctx.strokeStyle = '#f0c76a';
    ctx.strokeRect(stall.x - 56, stall.y - 24, 112, 28);
  }

  function drawTrainingArea() {
    ctx.strokeStyle = 'rgba(240,199,106,.5)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(690, 438, 190, 170);
    ctx.setLineDash([]);
    label('Area de treino', 785, 430, '#f0c76a');
  }

  function drawTrees() {
    const trees = [[120, 180], [170, 225], [1300, 180], [1350, 230], [118, 820], [1310, 830], [980, 820], [420, 160], [530, 760], [1010, 165]];
    trees.forEach(([x, y]) => {
      if (drawSpriteBottom(state.sprites.tree, x, y, 96, 128)) return;
      ctx.fillStyle = '#4b3822';
      ctx.fillRect(x - 5, y + 18, 10, 24);
      ctx.fillStyle = '#315b3a';
      ctx.beginPath();
      ctx.arc(x, y, 31, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#477348';
      ctx.beginPath();
      ctx.arc(x + 14, y - 6, 20, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawIsoTile(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x - w, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawPlayer(player) {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 22, 23, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (player.avatar) {
      drawAvatarPixel(ctx, 0, 17, 2.1, player.avatar);
    } else {
      const sprite = state.sprites[spriteKey(player.sprite)] || state.sprites.playerRed;
      if (!drawSpriteBottom(sprite, 0, 19, 56, 68)) {
      ctx.fillStyle = player.appearance || '#b94a3c';
      ctx.fillRect(-13, -15, 26, 34);
      ctx.fillStyle = '#e0bb83';
      ctx.beginPath();
      ctx.arc(0, -28, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a1710';
      ctx.lineWidth = 3;
      ctx.strokeRect(-13, -15, 26, 34);
      }
    }
    if (player.id === state.myId) {
      ctx.strokeStyle = '#f0c76a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 23, 29, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    label(player.name, player.x, player.y - 52, '#fff3d8');
    const bubble = state.bubbles.get(player.id);
    if (bubble && bubble.text && bubble.until > performance.now()) bubbleText(bubble.text, player.x, player.y - 84);
  }

  function drawNpc(npc) {
    ctx.save();
    ctx.translate(npc.x, npc.y);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 18, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawSpriteBottom(state.sprites[npc.sprite], 0, 16, 56, 68)) {
      ctx.fillStyle = npc.color;
      ctx.fillRect(-12, -12, 24, 30);
      ctx.fillStyle = '#d7b58a';
      ctx.beginPath();
      ctx.arc(0, -24, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    label(npc.name, npc.x, npc.y - 48, '#f0c76a');
  }

  function drawDummy(dummy) {
    ctx.save();
    ctx.translate(dummy.x, dummy.y);
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 25, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!drawSpriteBottom(state.sprites.trainingDummy, 0, 25, 56, 76)) {
      ctx.strokeStyle = '#7b4b25';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(0, -45);
      ctx.lineTo(0, 24);
      ctx.moveTo(-24, -20);
      ctx.lineTo(24, -20);
      ctx.stroke();
      ctx.fillStyle = '#a47039';
      ctx.beginPath();
      ctx.arc(0, -54, 15, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    healthBar(dummy.x - 38, dummy.y - 84, 76, dummy.hp / dummy.maxHp);
    label('Alvo de treino', dummy.x, dummy.y - 92, '#ffe8a8');
  }

  function label(text, x, y, color) {
    ctx.font = '700 13px Segoe UI, Arial';
    ctx.textAlign = 'center';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function bubbleText(text, x, y) {
    ctx.font = '13px Segoe UI, Arial';
    const width = Math.min(220, ctx.measureText(text).width + 24);
    ctx.fillStyle = 'rgba(8,10,13,.86)';
    roundRect(ctx, x - width / 2, y - 22, width, 28, 9);
    ctx.fill();
    ctx.strokeStyle = 'rgba(240,199,106,.45)';
    ctx.stroke();
    ctx.fillStyle = '#fff3d8';
    ctx.textAlign = 'center';
    ctx.fillText(text.slice(0, 42), x, y - 4);
  }

  function healthBar(x, y, w, ratio) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x, y, w, 8);
    ctx.fillStyle = '#c95845';
    ctx.fillRect(x, y, Math.max(0, w * ratio), 8);
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + w - r, y);
    context.quadraticCurveTo(x + w, y, x + w, y + r);
    context.lineTo(x + w, y + h - r);
    context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    context.lineTo(x + r, y + h);
    context.quadraticCurveTo(x, y + h, x, y + h - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawMinimap() {
    miniCtx.clearRect(0, 0, mini.width, mini.height);
    miniCtx.fillStyle = '#191713';
    miniCtx.fillRect(0, 0, mini.width, mini.height);
    miniCtx.fillStyle = '#8b7650';
    miniCtx.fillRect(60, 42, 30, 24);
    state.players.forEach(player => {
      miniCtx.fillStyle = player.id === state.myId ? '#f0c76a' : '#80c5ff';
      miniCtx.beginPath();
      miniCtx.arc(player.x / world.w * mini.width, player.y / world.h * mini.height, 3, 0, Math.PI * 2);
      miniCtx.fill();
    });
  }

  function interact() {
    const me = getMe();
    if (!me) return;
    const nearest = npcs
      .map(npc => ({ npc, dist: Math.hypot(npc.x - me.x, npc.y - me.y) }))
      .sort((a, b) => a.dist - b.dist)[0];
    if (!nearest || nearest.dist > 86) {
      addChat('Sistema', 'Aproxime-se de um NPC para interagir.');
      return;
    }
    if (nearest.npc.role === 'elder') {
      state.quest.elder = true;
      if (state.quest.market && state.quest.training && !state.quest.done) {
        state.quest.done = true;
        addChat('Anciao da Praca', 'Voce ja conhece a praca, o mercado e o treino. Niceia esta aberta para voce.');
      } else {
        addChat('Anciao da Praca', 'Bem-vindo. Visite o mercado, teste sua arma e volte ate mim.');
      }
    }
    if (nearest.npc.role === 'market') {
      state.quest.market = true;
      showMarket();
    }
    if (nearest.npc.role === 'scribe') addChat('Escriba', 'Registrei seu nome entre os viajantes desta primeira era.');
    if (nearest.npc.role === 'guard') addChat('Guarda da Cidade', 'A area de treino fica ao sul da praca.');
    if (nearest.npc.role === 'traveler') addChat('Viajante de Antioquia', 'As estradas ficam melhores quando caminhamos juntos.');
    updateQuest();
  }

  function attack() {
    if (state.socket) state.socket.emit('concordium:attack');
  }

  function showMarket() {
    showPanel(`<h3>Mercado inicial</h3><div class="slot-grid">
      ${['Pao', 'Tunica simples', 'Pergaminho', 'Pocao de cura', 'Espada longa', 'Arco e flecha'].map(item => `<div class="slot">${item}</div>`).join('')}
    </div><p>Compra e venda ficam para a proxima camada. Este mercado ja marca a missao inicial.</p>`);
  }

  function showInventory() {
    const me = getMe();
    const weapon = me?.weapon || state.character?.weapon || 'Arma inicial';
    showPanel(`<h3>Inventario</h3><div class="slot-grid">
      ${[weapon, 'Pao', '12 moedas', 'Pergaminho introdutorio', '', '', '', ''].map(item => `<div class="slot">${item || 'Vazio'}</div>`).join('')}
    </div>`);
  }

  function showSheet() {
    const me = getMe();
    if (!me) return;
    const attrRows = ATTRS.map(([key, label]) => `
      <div class="stat-row"><span>${label}</span><b>${me.attrs?.[key] || 0}</b><button data-up="${key}" ${me.attrPoints > 0 ? '' : 'disabled'}>+</button></div>`).join('');
    showPanel(`<h3>Ficha do personagem</h3>
      <p><b>${me.name}</b><br>${me.origin} | ${me.weapon}</p>
      <p>Nivel ${me.level} | XP ${me.xp} | Vida ${Math.round(me.hp)}/${me.maxHp} | Energia ${me.energy}/${me.maxEnergy}</p>
      <p>Pontos livres: ${me.attrPoints || 0}</p>
      ${attrRows}`);
    state.panel.querySelectorAll('[data-up]').forEach(button => {
      button.addEventListener('click', () => state.socket.emit('concordium:allocate-attr', button.dataset.up));
    });
  }

  function showPanel(html) {
    state.panel.innerHTML = html;
    state.panel.classList.remove('hidden');
  }

  function updateQuest() {
    const text = document.querySelector('#quest-text');
    if (!state.quest.elder) text.textContent = 'Fale com o Anciao da Praca.';
    else if (!state.quest.market) text.textContent = 'Visite o mercado.';
    else if (!state.quest.training) text.textContent = 'Teste sua arma na area de treino.';
    else if (!state.quest.done) text.textContent = 'Volte ao Anciao da Praca.';
    else text.textContent = 'Missao concluida. Explore a praca com outros jogadores.';
  }

  function syncHud() {
    const me = getMe();
    if (!me) return;
    document.querySelector('#hud-name').textContent = me.name;
    document.querySelector('#hud-origin').textContent = me.origin;
    document.querySelector('#hp-bar').style.width = `${clamp((me.hp / me.maxHp) * 100, 0, 100)}%`;
    document.querySelector('#energy-bar').style.width = `${clamp((me.energy / me.maxEnergy) * 100, 0, 100)}%`;
  }

  function addChat(name, text) {
    const log = document.querySelector('#chat-log');
    const row = document.createElement('div');
    row.innerHTML = `<b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
    log.appendChild(row);
    while (log.children.length > 45) log.firstChild.remove();
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
})();
