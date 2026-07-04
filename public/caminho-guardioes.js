(() => {
  const STAGE_W = 1600;
  const STAGE_H = 900;
  const MAX_WAVES = 5;
  const API_URL = '/api/caminho-guardioes/save';
  const MAP_URL = '/assets/caminho-guardioes-map.png?v=20260704';
  const SPRITE_VERSION = '20260704-sprites';

  const DEFENSES = {
    archer: {
      name: 'Arqueiro',
      rarity: 'common',
      role: 'Dano rapido',
      color: '#b8352b',
      baseDamage: 15,
      baseRange: 205,
      baseCooldown: .58
    },
    fire: {
      name: 'Braseiro',
      rarity: 'rare',
      role: 'Area continua',
      color: '#f07624',
      baseDamage: 16,
      baseRange: 95,
      baseCooldown: .18
    },
    trap: {
      name: 'Armadilha',
      rarity: 'common',
      role: 'Dano e lentidao',
      color: '#b8904b',
      baseDamage: 18,
      baseRange: 42,
      baseCooldown: 2.2
    },
    ballista: {
      name: 'Balista',
      rarity: 'epic',
      role: 'Tiro pesado',
      color: '#86522e',
      baseDamage: 72,
      baseRange: 285,
      baseCooldown: 1.85
    }
  };

  const CLASSES = {
    merchant: {
      name: 'Comerciante',
      line: 'Compra inicial e escalada custam menos.',
      effect: 'Custo de compra -8%'
    },
    fortune: {
      name: 'Sortudo',
      line: 'Melhora a chance de sorteios acima de comum.',
      effect: '+5% rara, +2% epica'
    },
    strategist: {
      name: 'Estrategista',
      line: 'Fusoes deixam a defesa resultante mais forte.',
      effect: '+10% dano após fusão'
    }
  };

  const PACKS = {
    common: { label: 'Pacote comum', cost: 80, fragments: [3, 5], rarityBoost: 0 },
    rare: { label: 'Pacote raro', cost: 220, fragments: [7, 10], rarityBoost: 1 },
    epic: { label: 'Pacote épico', cost: 520, fragments: [13, 18], rarityBoost: 2 },
    daily: { label: 'Pacote diário', cost: 0, fragments: [4, 7], rarityBoost: 0 }
  };

  const ENEMIES = {
    raider: { name: 'Saqueador', hp: 54, speed: 76, reward: 10, damage: 1, color: '#85402e' },
    shield: { name: 'Mercenario', hp: 128, speed: 48, reward: 20, damage: 2, color: '#5e6b7f' },
    ram: { name: 'Ariete', hp: 260, speed: 34, reward: 36, damage: 5, color: '#7b5435' },
    boss: { name: 'Chefe', hp: 820, speed: 28, reward: 120, damage: 10, color: '#412924' }
  };

  const DEFENSE_RENDER = {
    archer: { file: 'caminho-guardioes-defense-archer.png', w: 104, h: 128, anchor: .88 },
    fire: { file: 'caminho-guardioes-defense-fire.png', w: 104, h: 116, anchor: .78 },
    trap: { file: 'caminho-guardioes-defense-trap.png', w: 104, h: 82, anchor: .52 },
    ballista: { file: 'caminho-guardioes-defense-ballista.png', w: 126, h: 104, anchor: .66 }
  };

  const ENEMY_RENDER = {
    raider: { file: 'caminho-guardioes-enemy-raider.png', w: 70, h: 92, anchor: .78 },
    shield: { file: 'caminho-guardioes-enemy-shield.png', w: 76, h: 98, anchor: .80 },
    ram: { file: 'caminho-guardioes-enemy-ram.png', w: 118, h: 88, anchor: .62 },
    boss: { file: 'caminho-guardioes-enemy-boss.png', w: 112, h: 138, anchor: .80 }
  };

  const WAVES = [
    [{ type: 'raider', count: 8, every: .72 }],
    [{ type: 'raider', count: 8, every: .58 }, { type: 'shield', count: 3, every: 1.25, delay: 2.1 }],
    [{ type: 'raider', count: 12, every: .52 }, { type: 'shield', count: 5, every: 1.05, delay: 1.8 }],
    [{ type: 'shield', count: 7, every: .86 }, { type: 'ram', count: 2, every: 2.7, delay: 2.6 }],
    [{ type: 'raider', count: 10, every: .42 }, { type: 'shield', count: 6, every: .88, delay: 1.5 }, { type: 'ram', count: 2, every: 2.4, delay: 4.2 }, { type: 'boss', count: 1, every: 1, delay: 8.5 }]
  ];

  const PATH = [
    { x: -80, y: 512 },
    { x: 135, y: 515 },
    { x: 286, y: 446 },
    { x: 318, y: 284 },
    { x: 520, y: 267 },
    { x: 612, y: 376 },
    { x: 598, y: 575 },
    { x: 774, y: 640 },
    { x: 940, y: 548 },
    { x: 1034, y: 426 },
    { x: 1226, y: 392 },
    { x: 1425, y: 350 },
    { x: 1680, y: 348 }
  ];

  const pathLengths = [];
  let totalPathLength = 0;
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const len = distance(PATH[i], PATH[i + 1]);
    pathLengths.push(len);
    totalPathLength += len;
  }

  const canvas = document.getElementById('cg-canvas');
  const ctx = canvas.getContext('2d');
  const mapImage = new Image();
  mapImage.src = MAP_URL;
  const spriteImages = {};
  [...Object.values(DEFENSE_RENDER), ...Object.values(ENEMY_RENDER)].forEach(item => {
    const img = new Image();
    img.src = `/assets/${item.file}?v=${SPRITE_VERSION}`;
    spriteImages[item.file] = img;
  });

  const els = {
    saveStatus: document.getElementById('cg-save-status'),
    collection: document.getElementById('cg-collection'),
    battleView: document.getElementById('cg-battle'),
    tabCollection: document.getElementById('cg-tab-collection'),
    tabBattle: document.getElementById('cg-tab-battle'),
    play: document.getElementById('cg-play'),
    buildList: document.getElementById('cg-build-list'),
    wallet: document.getElementById('cg-wallet'),
    packResult: document.getElementById('cg-pack-result'),
    freePack: document.getElementById('cg-free-pack'),
    classList: document.getElementById('cg-class-list'),
    classPoints: document.getElementById('cg-class-points'),
    defenseList: document.getElementById('cg-defense-list'),
    hp: document.getElementById('cg-hp'),
    wave: document.getElementById('cg-wave'),
    battleMoney: document.getElementById('cg-battle-money'),
    startWave: document.getElementById('cg-start-wave'),
    buy: document.getElementById('cg-buy'),
    buyCost: document.getElementById('cg-buy-cost'),
    heldName: document.getElementById('cg-held-name'),
    cancelHeld: document.getElementById('cg-cancel-held'),
    exitBattle: document.getElementById('cg-exit-battle'),
    fullscreen: document.getElementById('cg-fullscreen'),
    orientationFullscreen: document.getElementById('cg-orientation-fullscreen'),
    modal: document.getElementById('cg-modal'),
    modalTitle: document.getElementById('cg-modal-title'),
    modalText: document.getElementById('cg-modal-text'),
    modalOk: document.getElementById('cg-modal-ok')
  };

  let save = defaultSave();
  let battle = null;
  let userName = 'Guardiao';
  let lastFrame = performance.now();
  let saveTimer = null;
  let pointer = { x: -999, y: -999 };
  let dragging = null;

  function defaultSave() {
    const collection = {};
    Object.keys(DEFENSES).forEach(type => {
      collection[type] = {
        owned: true,
        fragments: type === 'archer' ? 4 : 0,
        upgrades: {},
        skills: {}
      };
    });
    return {
      version: 1,
      denarii: 240,
      xp: 0,
      activeClass: 'merchant',
      classes: {
        merchant: { spent: 0, branches: {} },
        fortune: { spent: 0, branches: {} },
        strategist: { spent: 0, branches: {} }
      },
      collection,
      build: ['archer', 'fire', 'trap', 'ballista'],
      stats: { wins: 0, losses: 0, packsOpened: 0, lastDailyPack: '' },
      activeRun: null
    };
  }

  function normalizeSave(raw) {
    const base = defaultSave();
    if (!raw || typeof raw !== 'object') return base;
    const next = { ...base, ...raw };
    next.stats = { ...base.stats, ...(raw.stats || {}) };
    next.classes = { ...base.classes, ...(raw.classes || {}) };
    next.collection = { ...base.collection };
    Object.keys(DEFENSES).forEach(type => {
      next.collection[type] = {
        ...base.collection[type],
        ...(raw.collection?.[type] || {}),
        upgrades: { ...(raw.collection?.[type]?.upgrades || {}) },
        skills: { ...(raw.collection?.[type]?.skills || {}) }
      };
    });
    next.build = Array.isArray(raw.build) && raw.build.length ? raw.build.filter(type => DEFENSES[type]).slice(0, 4) : base.build;
    while (next.build.length < 4) {
      const missing = Object.keys(DEFENSES).find(type => !next.build.includes(type));
      if (!missing) break;
      next.build.push(missing);
    }
    if (!CLASSES[next.activeClass]) next.activeClass = 'merchant';
    next.denarii = clampNumber(next.denarii, 0, 999999);
    next.xp = clampNumber(next.xp, 0, 999999);
    return next;
  }

  async function loadSave() {
    try {
      const res = await fetch(API_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error('load failed');
      const payload = await res.json();
      userName = payload.user?.name || userName;
      save = normalizeSave(payload.state);
      els.saveStatus.textContent = payload.updatedAt ? 'Save automático carregado' : 'Novo save automático';
    } catch {
      save = defaultSave();
      els.saveStatus.textContent = 'Save local até reconectar';
    }
    renderCollection();
    if (save.activeRun) {
      battle = restoreBattle(save.activeRun);
      showView('battle');
    } else {
      battle = createBattle();
    }
    syncHud();
    requestAnimationFrame(loop);
  }

  function scheduleSave(reason = 'salvando') {
    els.saveStatus.textContent = `${reason}...`;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 350);
  }

  async function saveNow() {
    try {
      const res = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: save })
      });
      if (!res.ok) throw new Error('save failed');
      els.saveStatus.textContent = 'Save automático salvo agora';
    } catch {
      els.saveStatus.textContent = 'Falha ao salvar, tentando novamente';
    }
  }

  window.addEventListener('beforeunload', () => {
    if (battle && !battle.result) save.activeRun = exportBattle();
    const blob = new Blob([JSON.stringify({ state: save })], { type: 'application/json' });
    if (navigator.sendBeacon) navigator.sendBeacon(API_URL, blob);
  });

  function renderCollection() {
    const level = playerLevel();
    els.wallet.textContent = `${save.denarii} denários`;
    els.classPoints.textContent = `Nível ${level}`;
    els.buildList.innerHTML = save.build.map(type => defenseCard(type, false)).join('');
    els.classList.innerHTML = Object.entries(CLASSES).map(([id, item]) => `
      <button class="cg-class-card ${save.activeClass === id ? 'active' : ''}" type="button" data-class="${id}">
        <strong>${item.name}</strong><br>
        <span>${item.effect}</span>
      </button>
    `).join('');
    els.defenseList.innerHTML = Object.keys(DEFENSES).map(type => defenseCard(type, true)).join('');
    const today = todayKey();
    els.freePack.disabled = save.stats.lastDailyPack === today;
    els.freePack.textContent = save.stats.lastDailyPack === today ? 'Diário aberto' : 'Pacote diário';
    document.querySelectorAll('[data-class]').forEach(button => {
      button.addEventListener('click', () => {
        save.activeClass = button.dataset.class;
        renderCollection();
        scheduleSave('classe salva');
      });
    });
    document.querySelectorAll('[data-upgrade]').forEach(button => {
      button.addEventListener('click', () => upgradeDefense(button.dataset.defense, button.dataset.upgrade));
    });
  }

  function defenseCard(type, withUpgrades) {
    const def = DEFENSES[type];
    const item = save.collection[type];
    const rarity = def.rarity;
    const upgrades = item.upgrades || {};
    const upgradeButtons = withUpgrades ? `
      <div class="cg-upgrades">
        ${upgradeButton(type, 'damage', 'Dano', upgrades.damage || 0)}
        ${upgradeButton(type, 'range', 'Distância', upgrades.range || 0)}
        ${upgradeButton(type, type === 'trap' ? 'effect' : 'speed', type === 'trap' ? 'Lentidão' : 'Tempo', upgrades[type === 'trap' ? 'effect' : 'speed'] || 0)}
      </div>
    ` : '';
    return `
      <article class="cg-card">
        <div class="cg-icon">${iconFor(type)}</div>
        <span class="cg-rarity ${rarity}">${rarityLabel(rarity)}</span>
        <strong>${def.name}</strong>
        <small>${def.role} | ${item.fragments || 0} fragmentos</small>
        ${upgradeButtons}
      </article>
    `;
  }

  function upgradeButton(type, key, label, value) {
    const cost = 3 + value * 2;
    return `<button type="button" data-defense="${type}" data-upgrade="${key}">${label} ${value}/5 - ${cost} frag.</button>`;
  }

  function upgradeDefense(type, key) {
    const item = save.collection[type];
    const value = item.upgrades[key] || 0;
    const cost = 3 + value * 2;
    if (value >= 5 || item.fragments < cost) return;
    item.fragments -= cost;
    item.upgrades[key] = value + 1;
    renderCollection();
    scheduleSave('melhoria salva');
  }

  function iconFor(type) {
    const spec = DEFENSE_RENDER[type];
    return spec ? `<img src="/assets/${spec.file}?v=${SPRITE_VERSION}" alt="">` : '';
  }

  function rarityLabel(rarity) {
    return rarity === 'rare' ? 'Rara' : rarity === 'epic' ? 'Épica' : 'Comum';
  }

  function openPack(kind) {
    const pack = PACKS[kind];
    if (!pack) return;
    if (kind === 'daily') {
      const today = todayKey();
      if (save.stats.lastDailyPack === today) return;
      save.stats.lastDailyPack = today;
    } else if (save.denarii < pack.cost) {
      els.packResult.textContent = 'Denarios insuficientes.';
      return;
    } else {
      save.denarii -= pack.cost;
    }
    const type = randomPackDefense(pack.rarityBoost);
    const amount = randomInt(pack.fragments[0], pack.fragments[1]);
    save.collection[type].fragments += amount;
    save.stats.packsOpened += 1;
    els.packResult.textContent = `${pack.label}: +${amount} fragmentos de ${DEFENSES[type].name}.`;
    renderCollection();
    scheduleSave('pacote salvo');
  }

  function randomPackDefense(boost) {
    const roll = Math.random() + boost * .08;
    const candidates = Object.keys(DEFENSES);
    if (roll > .88) return 'ballista';
    if (roll > .62) return 'fire';
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function showView(view) {
    const battleView = view === 'battle';
    els.collection.classList.toggle('active', !battleView);
    els.battleView.classList.toggle('active', battleView);
    els.tabCollection.classList.toggle('active', !battleView);
    els.tabBattle.classList.toggle('active', battleView);
  }

  function createBattle() {
    return {
      time: 0,
      archiveHp: 20,
      maxArchiveHp: 20,
      waveIndex: 0,
      waveActive: false,
      denarii: 120,
      earned: 0,
      buyCost: classAdjustedCost(45),
      buyCount: 0,
      held: null,
      towers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      spawnQueue: [],
      result: null
    };
  }

  function restoreBattle(snapshot) {
    const fresh = createBattle();
    return {
      ...fresh,
      ...snapshot,
      held: null,
      projectiles: [],
      effects: [],
      towers: Array.isArray(snapshot.towers) ? snapshot.towers : [],
      enemies: Array.isArray(snapshot.enemies) ? snapshot.enemies : [],
      spawnQueue: Array.isArray(snapshot.spawnQueue) ? snapshot.spawnQueue : []
    };
  }

  function exportBattle() {
    if (!battle) return null;
    return {
      time: battle.time,
      archiveHp: battle.archiveHp,
      maxArchiveHp: battle.maxArchiveHp,
      waveIndex: battle.waveIndex,
      waveActive: battle.waveActive,
      denarii: battle.denarii,
      earned: battle.earned,
      buyCost: battle.buyCost,
      buyCount: battle.buyCount,
      towers: battle.towers.map(tower => ({ ...tower, cooldown: tower.cooldown || 0 })),
      enemies: battle.enemies.map(enemy => ({ ...enemy })),
      spawnQueue: battle.spawnQueue.map(item => ({ ...item })),
      result: battle.result
    };
  }

  function startNewBattle() {
    battle = createBattle();
    save.activeRun = exportBattle();
    showView('battle');
    syncHud();
    scheduleSave('campo iniciado');
  }

  function startWave() {
    if (!battle || battle.waveActive || battle.result || battle.waveIndex >= MAX_WAVES) return;
    const config = WAVES[battle.waveIndex];
    const queue = [];
    config.forEach(group => {
      const delay = group.delay || 0;
      for (let i = 0; i < group.count; i += 1) {
        queue.push({ type: group.type, at: battle.time + delay + i * group.every });
      }
    });
    battle.spawnQueue = queue.sort((a, b) => a.at - b.at);
    battle.waveActive = true;
    battle.waveIndex += 1;
    save.activeRun = exportBattle();
    syncHud();
    scheduleSave('onda salva');
  }

  function buyDefense() {
    if (!battle || battle.result || battle.held) return;
    if (battle.denarii < battle.buyCost) return;
    battle.denarii -= battle.buyCost;
    const picked = rollDefense();
    battle.held = { type: picked.type, level: 1, rarity: picked.rarity };
    battle.buyCount += 1;
    battle.buyCost = classAdjustedCost(45 + battle.buyCount * 17 + Math.floor(battle.buyCount * battle.buyCount * 1.7));
    save.activeRun = exportBattle();
    syncHud();
    scheduleSave('compra salva');
  }

  function rollDefense() {
    let common = .75;
    let rare = .20;
    let epic = .05;
    if (save.activeClass === 'fortune') {
      common -= .07;
      rare += .05;
      epic += .02;
    }
    const roll = Math.random();
    const rarity = roll < common ? 'common' : roll < common + rare ? 'rare' : 'epic';
    const pool = save.build.filter(type => DEFENSES[type].rarity === rarity);
    const fallback = save.build.filter(type => DEFENSES[type].rarity === 'common');
    const options = pool.length ? pool : fallback.length ? fallback : save.build;
    const type = options[Math.floor(Math.random() * options.length)];
    return { type, rarity: DEFENSES[type].rarity };
  }

  function classAdjustedCost(cost) {
    return Math.max(15, Math.round(cost * (save.activeClass === 'merchant' ? .92 : 1)));
  }

  function placeHeld(point) {
    if (!battle?.held) return;
    const held = battle.held;
    const mergeTarget = findTowerAt(point, tower => tower.type === held.type && tower.level === held.level && tower.level < 3);
    if (mergeTarget) {
      mergeTarget.level += 1;
      mergeTarget.cooldown = 0;
      if (save.activeClass === 'strategist') mergeTarget.mergeBonus = (mergeTarget.mergeBonus || 0) + .10;
      battle.held = null;
      addEffect(mergeTarget.x, mergeTarget.y, '#f7d775', 44, .45);
      save.activeRun = exportBattle();
      syncHud();
      scheduleSave('fusão salva');
      return;
    }
    if (!validPlacement(held.type, point.x, point.y)) return;
    battle.towers.push({
      id: cryptoId(),
      type: held.type,
      level: held.level,
      x: point.x,
      y: point.y,
      cooldown: 0,
      mergeBonus: 0
    });
    battle.held = null;
    save.activeRun = exportBattle();
    syncHud();
    scheduleSave('defesa salva');
  }

  function update(dt) {
    if (!battle || battle.result) return;
    battle.time += dt;
    spawnEnemies();
    updateEnemies(dt);
    updateTowers(dt);
    updateFx(dt);
    if (battle.waveActive && battle.spawnQueue.length === 0 && battle.enemies.length === 0) {
      battle.waveActive = false;
      if (battle.waveIndex >= MAX_WAVES) winBattle();
      save.activeRun = exportBattle();
      scheduleSave('onda concluída');
    }
    syncHud();
  }

  function spawnEnemies() {
    while (battle.spawnQueue.length && battle.spawnQueue[0].at <= battle.time) {
      const next = battle.spawnQueue.shift();
      const config = ENEMIES[next.type];
      battle.enemies.push({
        id: cryptoId(),
        type: next.type,
        hp: scaledEnemyHp(next.type, config.hp),
        maxHp: scaledEnemyHp(next.type, config.hp),
        progress: 0,
        slow: 1,
        slowUntil: 0,
        reward: config.reward,
        damage: config.damage
      });
    }
  }

  function scaledEnemyHp(type, hp) {
    const waveScale = 1 + Math.max(0, battle.waveIndex - 1) * .12;
    return Math.round(hp * waveScale * (type === 'boss' ? 1.08 : 1));
  }

  function updateEnemies(dt) {
    battle.enemies.forEach(enemy => {
      const config = ENEMIES[enemy.type];
      const speed = config.speed * (battle.time < enemy.slowUntil ? enemy.slow : 1);
      enemy.progress += speed * dt;
      const p = pointAt(enemy.progress);
      enemy.x = p.x;
      enemy.y = p.y;
      if (enemy.progress >= totalPathLength) {
        enemy.reached = true;
        battle.archiveHp = Math.max(0, battle.archiveHp - enemy.damage);
        addEffect(1450, 350, '#d13822', 74, .5);
      }
    });
    battle.enemies = battle.enemies.filter(enemy => !enemy.reached && enemy.hp > 0);
    if (battle.archiveHp <= 0) loseBattle();
  }

  function updateTowers(dt) {
    battle.towers.forEach(tower => {
      tower.cooldown = Math.max(0, (tower.cooldown || 0) - dt);
      if (tower.type === 'fire') {
        firePulse(tower, dt);
        return;
      }
      if (tower.type === 'trap') {
        trapPulse(tower);
        return;
      }
      if (tower.cooldown > 0) return;
      const target = acquireTarget(tower);
      if (!target) return;
      const stats = towerStats(tower);
      hitEnemy(target, stats.damage);
      tower.cooldown = stats.cooldown;
      battle.projectiles.push({ x: tower.x, y: tower.y - 18, tx: target.x, ty: target.y - 18, life: .18, max: .18, color: tower.type === 'ballista' ? '#4b2d18' : '#f2d99b', heavy: tower.type === 'ballista' });
    });
  }

  function firePulse(tower, dt) {
    const stats = towerStats(tower);
    battle.enemies.forEach(enemy => {
      if (distance(tower, enemy) <= stats.range) hitEnemy(enemy, stats.damage * dt);
    });
    if (Math.random() < .12) addEffect(tower.x + randomInt(-20, 20), tower.y + randomInt(-12, 12), '#ff8a2a', 16 + tower.level * 4, .22);
  }

  function trapPulse(tower) {
    if (tower.cooldown > 0) return;
    const stats = towerStats(tower);
    const target = battle.enemies.find(enemy => distance(tower, enemy) <= stats.range);
    if (!target) return;
    hitEnemy(target, stats.damage);
    target.slow = Math.max(.34, .62 - tower.level * .06 - upgradeValue(tower.type, 'effect') * .025);
    target.slowUntil = battle.time + 1.45 + tower.level * .18;
    tower.cooldown = stats.cooldown;
    addEffect(tower.x, tower.y, '#8dd0ff', 38, .35);
  }

  function towerStats(tower) {
    const def = DEFENSES[tower.type];
    const levelScale = 1 + (tower.level - 1) * .64;
    const damageUp = upgradeValue(tower.type, 'damage') * .10;
    const rangeUp = upgradeValue(tower.type, 'range') * .07;
    const speedUp = upgradeValue(tower.type, 'speed') * .08;
    return {
      damage: def.baseDamage * levelScale * (1 + damageUp + (tower.mergeBonus || 0)),
      range: def.baseRange * (1 + rangeUp + (tower.level - 1) * .08),
      cooldown: def.baseCooldown / (1 + speedUp + (tower.level - 1) * .08)
    };
  }

  function upgradeValue(type, key) {
    return save.collection[type]?.upgrades?.[key] || 0;
  }

  function acquireTarget(tower) {
    const stats = towerStats(tower);
    let best = null;
    battle.enemies.forEach(enemy => {
      if (distance(tower, enemy) <= stats.range && (!best || enemy.progress > best.progress)) best = enemy;
    });
    return best;
  }

  function hitEnemy(enemy, amount) {
    enemy.hp -= amount;
    if (enemy.hp <= 0 && !enemy.dead) {
      enemy.dead = true;
      battle.denarii += enemy.reward;
      battle.earned += Math.ceil(enemy.reward * .55);
      addEffect(enemy.x, enemy.y, '#fff1a8', 32, .32);
    }
  }

  function updateFx(dt) {
    battle.projectiles.forEach(p => { p.life -= dt; });
    battle.effects.forEach(e => { e.life -= dt; });
    battle.projectiles = battle.projectiles.filter(p => p.life > 0);
    battle.effects = battle.effects.filter(e => e.life > 0);
  }

  function winBattle() {
    if (battle.result) return;
    battle.result = 'win';
    const reward = 90 + battle.earned;
    const xp = 75;
    let packText = '';
    save.denarii += reward;
    save.xp += xp;
    save.stats.wins += 1;
    if (Math.random() < .35) {
      const type = randomPackDefense(0);
      const amount = randomInt(4, 8);
      save.collection[type].fragments += amount;
      packText = ` Pacote encontrado: +${amount} fragmentos de ${DEFENSES[type].name}.`;
    }
    save.activeRun = null;
    renderCollection();
    scheduleSave('vitória salva');
    showModal('Vitória em Alexandria', `Arquivo protegido. +${reward} denários e +${xp} XP.${packText}`);
  }

  function loseBattle() {
    if (battle.result) return;
    battle.result = 'lose';
    save.xp += 5;
    save.stats.losses += 1;
    save.activeRun = null;
    renderCollection();
    scheduleSave('derrota salva');
    showModal('Arquivo perdido', 'A defesa caiu. A derrota rende apenas 5 XP.');
  }

  function showModal(title, text) {
    els.modalTitle.textContent = title;
    els.modalText.textContent = text;
    els.modal.hidden = false;
  }

  function draw() {
    ctx.clearRect(0, 0, STAGE_W, STAGE_H);
    if (mapImage.complete && mapImage.naturalWidth) {
      ctx.drawImage(mapImage, 0, 0, STAGE_W, STAGE_H);
    } else {
      drawFallbackMap();
    }
    drawGoalGlow();
    if (!battle) return;
    drawPlacementPreview();
    [...battle.towers].sort((a, b) => a.y - b.y).forEach(drawTower);
    battle.enemies.forEach(drawEnemy);
    battle.projectiles.forEach(drawProjectile);
    battle.effects.forEach(drawEffect);
  }

  function drawFallbackMap() {
    const grad = ctx.createLinearGradient(0, 0, STAGE_W, STAGE_H);
    grad.addColorStop(0, '#e7c873');
    grad.addColorStop(1, '#7b4b23');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  }

  function drawGoalGlow() {
    ctx.save();
    ctx.globalAlpha = .36;
    ctx.fillStyle = '#fff2b0';
    ctx.beginPath();
    ctx.ellipse(1425, 352, 110, 58, -.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlacementPreview() {
    const held = battle.held || dragging?.tower;
    if (!held) return;
    const x = dragging ? dragging.tower.x : pointer.x;
    const y = dragging ? dragging.tower.y : pointer.y;
    const valid = validPlacement(held.type, x, y, dragging?.tower?.id);
    const stats = held.type && DEFENSES[held.type] ? towerStats({ type: held.type, level: held.level || 1, mergeBonus: held.mergeBonus || 0 }) : null;
    ctx.save();
    ctx.globalAlpha = .24;
    ctx.fillStyle = valid ? '#9ff09f' : '#ff605f';
    ctx.beginPath();
    ctx.arc(x, y, held.type === 'trap' ? 35 : 42, 0, Math.PI * 2);
    ctx.fill();
    if (stats && held.type !== 'trap') {
      ctx.globalAlpha = .13;
      ctx.beginPath();
      ctx.arc(x, y, stats.range, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTower(tower) {
    if (drawDefenseSprite(tower)) {
      drawLevel(tower.x, tower.y + 31, tower.level);
    }
  }

  function drawDefenseSprite(tower) {
    const spec = DEFENSE_RENDER[tower.type];
    if (!spec) return false;
    const img = spriteImages[spec.file];
    if (!img?.complete || !img.naturalWidth) return false;
    const scale = 1 + (tower.level - 1) * .12;
    drawCutout(img, tower.x, tower.y, spec.w * scale, spec.h * scale, spec.anchor);
    return true;
  }

  function drawArcher(t) {
    ctx.save();
    shadow(t.x, t.y + 18, 24, 9);
    ctx.translate(t.x, t.y);
    ctx.fillStyle = '#24354a';
    ctx.fillRect(-9, 8, 18, 24);
    ctx.fillStyle = '#b8352b';
    ctx.beginPath();
    ctx.moveTo(-20, 12);
    ctx.quadraticCurveTo(0, -32, 20, 12);
    ctx.lineTo(10, 20);
    ctx.lineTo(-10, 20);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f1bf82';
    ctx.beginPath();
    ctx.arc(0, -8, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#5a2f18';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(18, 0, 22, -1.1, 1.1);
    ctx.stroke();
    ctx.strokeStyle = '#f7e3b1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, -18);
    ctx.lineTo(18, 18);
    ctx.stroke();
    ctx.restore();
  }

  function drawFire(t) {
    ctx.save();
    shadow(t.x, t.y + 18, 32, 11);
    const stats = towerStats(t);
    ctx.globalAlpha = .16;
    ctx.fillStyle = '#ff7b28';
    ctx.beginPath();
    ctx.arc(t.x, t.y, stats.range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.translate(t.x, t.y);
    ctx.fillStyle = '#7b431c';
    ctx.fillRect(-24, 7, 48, 15);
    ctx.fillStyle = '#d79a41';
    ctx.beginPath();
    ctx.ellipse(0, 5, 26, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffcf54';
    ctx.beginPath();
    ctx.moveTo(-11, 2);
    ctx.quadraticCurveTo(-3, -37, 8, -4);
    ctx.quadraticCurveTo(17, -24, 18, 7);
    ctx.quadraticCurveTo(2, 18, -11, 2);
    ctx.fill();
    ctx.fillStyle = '#ff6b24';
    ctx.beginPath();
    ctx.moveTo(-4, 5);
    ctx.quadraticCurveTo(1, -21, 8, 5);
    ctx.quadraticCurveTo(2, 13, -4, 5);
    ctx.fill();
    ctx.restore();
  }

  function drawTrap(t) {
    ctx.save();
    shadow(t.x, t.y + 8, 30, 7);
    ctx.translate(t.x, t.y);
    ctx.rotate(-.08);
    ctx.fillStyle = '#7b4c2b';
    ctx.fillRect(-24, -12, 48, 24);
    ctx.fillStyle = '#c99652';
    for (let i = -18; i <= 18; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 8);
      ctx.lineTo(i + 6, -14);
      ctx.lineTo(i + 12, 8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = '#4c2c18';
    ctx.lineWidth = 3;
    ctx.strokeRect(-24, -12, 48, 24);
    ctx.restore();
  }

  function drawBallista(t) {
    ctx.save();
    shadow(t.x, t.y + 22, 38, 12);
    ctx.translate(t.x, t.y);
    ctx.fillStyle = '#5a351e';
    ctx.fillRect(-30, 10, 60, 13);
    ctx.fillStyle = '#936133';
    ctx.fillRect(-8, -14, 16, 38);
    ctx.strokeStyle = '#3b2416';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-36, -6);
    ctx.quadraticCurveTo(0, -28, 36, -6);
    ctx.stroke();
    ctx.strokeStyle = '#e6c88a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-34, -6);
    ctx.lineTo(34, -6);
    ctx.stroke();
    ctx.fillStyle = '#d8b36b';
    ctx.fillRect(-4, -33, 8, 45);
    ctx.fillStyle = '#2b2118';
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(-8, -28);
    ctx.lineTo(8, -28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(enemy) {
    const cfg = ENEMIES[enemy.type];
    if (drawEnemySprite(enemy)) {
      drawEnemyBar(enemy);
      return;
    }
  }

  function drawEnemySprite(enemy) {
    const spec = ENEMY_RENDER[enemy.type];
    if (!spec) return false;
    const img = spriteImages[spec.file];
    if (!img?.complete || !img.naturalWidth) return false;
    const bossScale = enemy.type === 'boss' ? 1.08 : 1;
    drawCutout(img, enemy.x || PATH[0].x, enemy.y || PATH[0].y, spec.w * bossScale, spec.h * bossScale, spec.anchor);
    return true;
  }

  function drawCutout(img, x, y, w, h, anchor) {
    ctx.save();
    ctx.drawImage(img, x - w / 2, y - h * anchor, w, h);
    ctx.restore();
  }

  function drawRam() {
    ctx.fillStyle = '#6b4026';
    ctx.fillRect(-28, -16, 56, 28);
    ctx.fillStyle = '#b8884e';
    ctx.fillRect(-38, -8, 76, 10);
    ctx.fillStyle = '#3a2418';
    ctx.fillRect(-30, 10, 12, 12);
    ctx.fillRect(18, 10, 12, 12);
    ctx.fillStyle = '#d6bc88';
    ctx.beginPath();
    ctx.moveTo(38, -8);
    ctx.lineTo(52, -3);
    ctx.lineTo(38, 4);
    ctx.closePath();
    ctx.fill();
  }

  function drawEnemyBar(enemy) {
    const x = enemy.x || 0;
    const y = (enemy.y || 0) - (enemy.type === 'boss' ? 54 : 42);
    const w = enemy.type === 'boss' ? 70 : 42;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(x - w / 2, y, w, 6);
    ctx.fillStyle = enemy.hp / enemy.maxHp > .45 ? '#7beb67' : '#ff705b';
    ctx.fillRect(x - w / 2, y, w * Math.max(0, enemy.hp / enemy.maxHp), 6);
    ctx.restore();
  }

  function drawProjectile(p) {
    ctx.save();
    const alpha = Math.max(0, p.life / p.max);
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.heavy ? 6 : 3;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.tx, p.ty);
    ctx.stroke();
    ctx.restore();
  }

  function drawEffect(e) {
    ctx.save();
    const pct = e.life / e.max;
    ctx.globalAlpha = Math.max(0, pct) * .7;
    ctx.strokeStyle = e.color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius * (1.15 - pct), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawLevel(x, y, level) {
    ctx.save();
    ctx.fillStyle = 'rgba(18, 12, 6, .72)';
    roundedRect(ctx, x - 20, y, 40, 16, 8);
    ctx.fill();
    ctx.fillStyle = '#f7d775';
    ctx.font = '900 11px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Nv ${level}`, x, y + 8);
    ctx.restore();
  }

  function shadow(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function addEffect(x, y, color, radius, life) {
    if (!battle) return;
    battle.effects.push({ x, y, color, radius, life, max: life });
  }

  function validPlacement(type, x, y, ignoreId = null) {
    if (x < 40 || y < 60 || x > STAGE_W - 40 || y > STAGE_H - 42) return false;
    const pathDist = distanceToPath({ x, y });
    if (type === 'trap') {
      if (pathDist > 78) return false;
    } else if (pathDist < 72) {
      return false;
    }
    if (x > 1300 && y < 520) return false;
    if (x < 210 && y < 180) return false;
    return !battle.towers.some(tower => tower.id !== ignoreId && distance(tower, { x, y }) < 54);
  }

  function findTowerAt(point, predicate = () => true) {
    if (!battle) return null;
    for (let i = battle.towers.length - 1; i >= 0; i -= 1) {
      const tower = battle.towers[i];
      if (distance(tower, point) < 42 && predicate(tower)) return tower;
    }
    return null;
  }

  function onPointerDown(event) {
    if (!battle || els.modal.hidden === false) return;
    const point = canvasPoint(event);
    pointer = point;
    canvas.setPointerCapture?.(event.pointerId);
    if (battle.held) {
      placeHeld(point);
      return;
    }
    const tower = findTowerAt(point);
    if (tower) {
      dragging = { tower, startX: tower.x, startY: tower.y };
    }
  }

  function onPointerMove(event) {
    pointer = canvasPoint(event);
    if (dragging) {
      dragging.tower.x = pointer.x;
      dragging.tower.y = pointer.y;
    }
  }

  function onPointerUp(event) {
    pointer = canvasPoint(event);
    if (!dragging) return;
    const tower = dragging.tower;
    const target = findTowerAt(pointer, other => other.id !== tower.id && other.type === tower.type && other.level === tower.level && other.level < 3);
    if (target) {
      target.level += 1;
      target.cooldown = 0;
      if (save.activeClass === 'strategist') target.mergeBonus = (target.mergeBonus || 0) + .10;
      battle.towers = battle.towers.filter(item => item.id !== tower.id);
      addEffect(target.x, target.y, '#f7d775', 48, .45);
    } else if (!validPlacement(tower.type, tower.x, tower.y, tower.id)) {
      tower.x = dragging.startX;
      tower.y = dragging.startY;
    }
    dragging = null;
    save.activeRun = exportBattle();
    syncHud();
    scheduleSave('campo salvo');
  }

  function syncHud() {
    if (!battle) return;
    els.hp.textContent = `${Math.ceil(battle.archiveHp)}/${battle.maxArchiveHp}`;
    els.wave.textContent = `${battle.waveIndex}/${MAX_WAVES}`;
    els.battleMoney.textContent = `${Math.floor(battle.denarii)}`;
    els.buyCost.textContent = `${battle.buyCost} denários`;
    els.heldName.textContent = battle.held ? `${DEFENSES[battle.held.type].name} na mão` : 'Sem defesa na mão';
    els.buy.disabled = Boolean(battle.held || battle.result || battle.denarii < battle.buyCost);
    els.cancelHeld.disabled = !battle.held;
    els.startWave.disabled = Boolean(battle.waveActive || battle.result || battle.waveIndex >= MAX_WAVES);
    els.startWave.textContent = battle.waveIndex >= MAX_WAVES ? 'Ondas completas' : battle.waveActive ? 'Onda em curso' : battle.waveIndex === 0 ? 'Iniciar onda' : 'Próxima onda';
  }

  function loop(now) {
    const dt = Math.min(.05, (now - lastFrame) / 1000);
    lastFrame = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function pointAt(progress) {
    let remaining = Math.max(0, Math.min(progress, totalPathLength));
    for (let i = 0; i < pathLengths.length; i += 1) {
      const len = pathLengths[i];
      if (remaining <= len) {
        const a = PATH[i];
        const b = PATH[i + 1];
        const t = len ? remaining / len : 0;
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      remaining -= len;
    }
    return PATH[PATH.length - 1];
  }

  function distanceToPath(point) {
    let best = Infinity;
    for (let i = 0; i < PATH.length - 1; i += 1) {
      best = Math.min(best, distanceToSegment(point, PATH[i], PATH[i + 1]));
    }
    return best;
  }

  function distanceToSegment(p, a, b) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const apx = p.x - a.x;
    const apy = p.y - a.y;
    const ab2 = abx * abx + aby * aby;
    const t = ab2 ? Math.max(0, Math.min(1, (apx * abx + apy * aby) / ab2)) : 0;
    return distance(p, { x: a.x + abx * t, y: a.y + aby * t });
  }

  function distance(a, b) {
    return Math.hypot((a.x || 0) - (b.x || 0), (a.y || 0) - (b.y || 0));
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * STAGE_W,
      y: ((event.clientY - rect.top) / rect.height) * STAGE_H
    };
  }

  function playerLevel() {
    return Math.max(1, Math.floor(save.xp / 180) + 1);
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function randomInt(min, max) {
    return Math.floor(min + Math.random() * (max - min + 1));
  }

  function clampNumber(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function cryptoId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function roundedRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  async function enterFullscreen() {
    try {
      const root = document.documentElement;
      if (!document.fullscreenElement && root.requestFullscreen) {
        await root.requestFullscreen({ navigationUI: 'hide' });
      }
      if (screen.orientation?.lock) {
        await screen.orientation.lock('landscape').catch(() => {});
      }
    } catch {
      // Mobile browsers may reject fullscreen/orientation lock outside supported gestures.
    }
  }

  els.tabCollection.addEventListener('click', () => showView('collection'));
  els.tabBattle.addEventListener('click', () => showView('battle'));
  els.play.addEventListener('click', startNewBattle);
  els.startWave.addEventListener('click', startWave);
  els.buy.addEventListener('click', buyDefense);
  els.cancelHeld.addEventListener('click', () => {
    if (!battle) return;
    battle.held = null;
    syncHud();
  });
  els.exitBattle.addEventListener('click', () => showView('collection'));
  els.modalOk.addEventListener('click', () => {
    els.modal.hidden = true;
    showView('collection');
    battle = createBattle();
    syncHud();
  });
  els.freePack.addEventListener('click', () => openPack('daily'));
  els.fullscreen?.addEventListener('click', enterFullscreen);
  els.orientationFullscreen?.addEventListener('click', enterFullscreen);
  document.querySelectorAll('[data-pack]').forEach(button => {
    button.addEventListener('click', () => openPack(button.dataset.pack));
  });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  setInterval(() => {
    if (battle && !battle.result && els.battleView.classList.contains('active')) {
      save.activeRun = exportBattle();
      scheduleSave('save automático');
    }
  }, 5000);

  loadSave();
})();
