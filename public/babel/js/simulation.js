import { ENCOUNTERS, LOOT_TABLE, SKILLS, WEAPONS, WORLD } from './content.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function calculateDamage(power, attack, defense) {
  return Math.max(1, Math.round(power * attack * (100 / (100 + Math.max(0, defense)))));
}

export function defaultState() {
  return {
    version: 1,
    profile: { created: false, body: 'male', weapon: 'sword' },
    player: {
      x: WORLD.start.x,
      y: WORLD.start.y,
      level: 1,
      xp: 0,
      xpNext: 50,
      hp: 128,
      maxHp: 128,
      baseAttack: 14,
      baseDefense: 5,
      gold: 120,
      gems: 0,
      energy: 0
    },
    world: {
      regionId: 'campos-fronteiras',
      checkpoint: 'Acampamento do Sul',
      progress: 0,
      defeatedIds: [],
      bossUnlocked: false,
      bossDefeated: false
    },
    systems: { autoUnlocked: false, autoEnabled: false, speed: 1, companionUnlocked: false },
    inventory: [],
    equipped: {},
    skills: SKILLS.map(skill => ({ id: skill.id, priority: skill.priority })),
    lastSeenServer: null
  };
}

function mergeState(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  return {
    ...base,
    ...saved,
    profile: { ...base.profile, ...(saved.profile || {}) },
    player: { ...base.player, ...(saved.player || {}) },
    world: { ...base.world, ...(saved.world || {}), defeatedIds: Array.isArray(saved.world?.defeatedIds) ? [...new Set(saved.world.defeatedIds)] : [] },
    systems: { ...base.systems, ...(saved.systems || {}) },
    inventory: Array.isArray(saved.inventory) ? saved.inventory.slice(0, 80) : [],
    equipped: saved.equipped && typeof saved.equipped === 'object' ? saved.equipped : {},
    skills: Array.isArray(saved.skills) ? saved.skills : base.skills
  };
}

export class GameSimulation {
  constructor(savedState, emit = () => {}) {
    this.state = mergeState(savedState);
    this.emit = emit;
    this.paused = false;
    this.input = { x: 0, y: 0 };
    this.moveTarget = null;
    this.basicTimer = 0;
    this.petTimer = 0;
    this.skillTimers = Object.fromEntries(SKILLS.map(skill => [skill.id, Math.random() * 1.5]));
    this.attackPoseUntil = 0;
    this.runtime = { now: 0, targetId: null, moving: false, facing: 'down' };
    this.enemies = ENCOUNTERS
      .filter(item => !this.state.world.defeatedIds.includes(item.id))
      .filter(item => !item.boss || this.state.world.bossUnlocked)
      .map(item => ({ ...item, maxHp: item.hp, currentHp: item.hp, alive: true, attackTimer: 0, spawnX: item.x, spawnY: item.y, phase: 1 }));
    this.recalculate();
  }

  recalculate() {
    const weapon = WEAPONS[this.state.profile.weapon] || WEAPONS.sword;
    const bonuses = Object.values(this.state.equipped).filter(Boolean).reduce((sum, item) => ({ attack: sum.attack + (item.attack || 0), defense: sum.defense + (item.defense || 0) }), { attack: 0, defense: 0 });
    const attack = this.state.player.baseAttack + weapon.attack + bonuses.attack + (this.state.player.level - 1) * 2;
    const defense = this.state.player.baseDefense + bonuses.defense + (this.state.player.level - 1);
    this.stats = {
      attack,
      defense,
      range: weapon.range,
      attackSpeed: weapon.speed,
      power: Math.round(attack * 5.2 + defense * 2 + this.state.player.level * 18)
    };
  }

  startJourney(body, weapon) {
    this.state.profile = { created: true, body: body === 'female' ? 'female' : 'male', weapon: WEAPONS[weapon] ? weapon : 'sword' };
    this.recalculate();
    this.emit('journeyStarted', { body, weapon: this.state.profile.weapon });
  }

  setInput(x, y) {
    this.input.x = clamp(Number(x) || 0, -1, 1);
    this.input.y = clamp(Number(y) || 0, -1, 1);
    if (Math.hypot(this.input.x, this.input.y) > 0.08) this.moveTarget = null;
  }

  setMoveTarget(x, y) {
    if (this.state.systems.autoEnabled || this.paused) return;
    this.moveTarget = { x: clamp(x, 40, WORLD.width - 40), y: clamp(y, 40, WORLD.height - 40) };
  }

  toggleAuto(force) {
    if (!this.state.systems.autoUnlocked) {
      this.emit('autoLocked', {});
      return false;
    }
    this.state.systems.autoEnabled = typeof force === 'boolean' ? force : !this.state.systems.autoEnabled;
    this.moveTarget = null;
    this.emit('autoChanged', { enabled: this.state.systems.autoEnabled });
    return this.state.systems.autoEnabled;
  }

  toggleSpeed() {
    this.state.systems.speed = this.state.systems.speed === 2 ? 1 : 2;
    this.emit('speedChanged', { speed: this.state.systems.speed });
    return this.state.systems.speed;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.emit('pauseChanged', { paused: this.paused });
  }

  applyOffline(seconds) {
    const safeSeconds = clamp(Number(seconds) || 0, 0, 12 * 60 * 60);
    if (safeSeconds < 60 || !this.state.profile.created) return null;
    const minutes = Math.floor(safeSeconds / 60);
    const gold = Math.floor(minutes * (2.5 + this.state.player.level * 0.75));
    const xp = Math.min(Math.floor(minutes * 0.45), this.state.player.xpNext * 2);
    this.state.player.gold += gold;
    this.addXp(xp, false);
    return { seconds: safeSeconds, minutes, gold, xp };
  }

  equipItem(index) {
    const item = this.state.inventory[index];
    if (!item) return false;
    this.state.equipped[item.slot] = item;
    this.recalculate();
    this.emit('itemEquipped', { item });
    return true;
  }

  activateUltimate() {
    if (this.state.player.energy < 100 || this.paused) return false;
    this.state.player.energy = 0;
    const targets = this.enemies.filter(enemy => enemy.alive && distance(this.state.player, enemy) <= 360);
    if (!targets.length) return false;
    targets.forEach(enemy => this.hitEnemy(enemy, calculateDamage(4.1, this.stats.attack, enemy.defense), 'ultimate'));
    this.emit('ultimate', { targets: targets.map(target => target.id) });
    return true;
  }

  update(rawDt) {
    if (this.paused || !this.state.profile.created) return;
    const dt = clamp(rawDt, 0, 0.05) * this.state.systems.speed;
    this.runtime.now += dt;
    this.basicTimer -= dt;
    this.petTimer -= dt;
    Object.keys(this.skillTimers).forEach(id => { this.skillTimers[id] = Math.max(0, this.skillTimers[id] - dt); });

    const player = this.state.player;
    const living = this.enemies.filter(enemy => enemy.alive);
    let target = living.find(enemy => enemy.id === this.runtime.targetId) || null;
    if (!target) target = this.nearestEnemy(living);
    this.runtime.targetId = target?.id || null;

    let mx = this.input.x;
    let my = this.input.y;
    if (this.state.systems.autoEnabled && target) {
      const gap = distance(player, target);
      if (gap > this.stats.range * 0.82) {
        mx = target.x - player.x;
        my = target.y - player.y;
      } else {
        mx = 0;
        my = 0;
      }
    } else if (this.moveTarget) {
      const gap = distance(player, this.moveTarget);
      if (gap > 12) {
        mx = this.moveTarget.x - player.x;
        my = this.moveTarget.y - player.y;
      } else {
        this.moveTarget = null;
        mx = 0;
        my = 0;
      }
    }

    const magnitude = Math.hypot(mx, my);
    this.runtime.moving = magnitude > 0.08;
    if (this.runtime.moving) {
      mx /= magnitude;
      my /= magnitude;
      const speed = 190;
      player.x = clamp(player.x + mx * speed * dt, 35, WORLD.width - 35);
      player.y = clamp(player.y + my * speed * dt, 55, WORLD.height - 40);
      if (Math.abs(my) > Math.abs(mx)) this.runtime.facing = my < 0 ? 'up' : 'down';
      else this.runtime.facing = mx < 0 ? 'left' : 'right';
    }

    for (const enemy of living) this.updateEnemy(enemy, dt);
    target = this.enemies.find(enemy => enemy.alive && enemy.id === this.runtime.targetId) || this.nearestEnemy(this.enemies.filter(enemy => enemy.alive));
    if (target && distance(player, target) <= this.stats.range && this.basicTimer <= 0) {
      this.basicTimer = this.stats.attackSpeed;
      this.attackPoseUntil = this.runtime.now + 0.18;
      this.hitEnemy(target, calculateDamage(1, this.stats.attack, target.defense), 'basic');
      this.emit('playerAttack', { targetId: target.id, weapon: this.state.profile.weapon });
    }

    this.updateSkills(target);
    this.updateCompanion(target);
  }

  updateEnemy(enemy, dt) {
    const player = this.state.player;
    const gap = distance(player, enemy);
    const aggro = enemy.boss ? 520 : 285;
    const range = enemy.kind === 'ranged' ? 190 : enemy.boss ? 118 : 78;
    if (gap < aggro && gap > range) {
      const dx = (player.x - enemy.x) / Math.max(1, gap);
      const dy = (player.y - enemy.y) / Math.max(1, gap);
      enemy.x += dx * enemy.speed * dt;
      enemy.y += dy * enemy.speed * dt;
    }
    enemy.attackTimer -= dt;
    if (gap <= range && enemy.attackTimer <= 0) {
      enemy.attackTimer = enemy.boss ? 1.45 : enemy.kind === 'ranged' ? 1.7 : 1.25;
      const damage = calculateDamage(enemy.boss && enemy.phase === 2 ? 1.4 : 1, enemy.attack, this.stats.defense);
      player.hp = clamp(player.hp - damage, 0, player.maxHp);
      this.emit('enemyAttack', { enemyId: enemy.id, damage });
      if (player.hp <= 0) this.playerDefeated(enemy);
    }
    if (enemy.boss && enemy.phase === 1 && enemy.currentHp <= enemy.maxHp * 0.5) {
      enemy.phase = 2;
      enemy.speed *= 1.22;
      enemy.attack = Math.round(enemy.attack * 1.24);
      this.emit('bossPhase', { phase: 2, name: enemy.name });
    }
  }

  updateSkills(target) {
    const player = this.state.player;
    if (this.skillTimers.guard <= 0 && player.hp / player.maxHp < 0.62) {
      const amount = Math.round(player.maxHp * 0.22);
      player.hp = clamp(player.hp + amount, 0, player.maxHp);
      this.skillTimers.guard = SKILLS.find(skill => skill.id === 'guard').cooldown;
      this.emit('skill', { id: 'guard', amount });
    }
    const nearby = this.enemies.filter(enemy => enemy.alive && distance(player, enemy) <= 165);
    if (this.skillTimers.cleave <= 0 && nearby.length >= 2) {
      nearby.forEach(enemy => this.hitEnemy(enemy, calculateDamage(0.74, this.stats.attack, enemy.defense), 'cleave'));
      this.skillTimers.cleave = SKILLS.find(skill => skill.id === 'cleave').cooldown;
      this.emit('skill', { id: 'cleave', targets: nearby.map(enemy => enemy.id) });
    }
    if (this.skillTimers.rend <= 0 && target && distance(player, target) <= this.stats.range * 1.15) {
      const multiplier = target.kind === 'boss' || target.kind === 'elite' ? 1.85 : 1.45;
      this.hitEnemy(target, calculateDamage(multiplier, this.stats.attack, target.defense), 'rend');
      this.skillTimers.rend = SKILLS.find(skill => skill.id === 'rend').cooldown;
      this.emit('skill', { id: 'rend', targetId: target.id });
    }
    const threat = this.enemies.filter(enemy => enemy.alive && distance(player, enemy) <= 340).sort((a, b) => b.attack - a.attack)[0];
    if (this.skillTimers.shard <= 0 && threat) {
      this.hitEnemy(threat, calculateDamage(1.25, this.stats.attack, threat.defense), 'shard');
      this.skillTimers.shard = SKILLS.find(skill => skill.id === 'shard').cooldown;
      this.emit('skill', { id: 'shard', targetId: threat.id });
    }
  }

  updateCompanion(target) {
    if (!this.state.systems.companionUnlocked || !target || this.petTimer > 0 || distance(this.state.player, target) > 260) return;
    this.petTimer = 2.35;
    const damage = calculateDamage(0.58, this.stats.attack, target.defense);
    this.hitEnemy(target, damage, 'companion');
    this.emit('companionAttack', { targetId: target.id });
  }

  nearestEnemy(list) {
    if (!list.length) return null;
    return list.reduce((best, enemy) => distance(this.state.player, enemy) < distance(this.state.player, best) ? enemy : best, list[0]);
  }

  hitEnemy(enemy, damage, source) {
    if (!enemy?.alive) return;
    enemy.currentHp = Math.max(0, enemy.currentHp - damage);
    this.state.player.energy = clamp(this.state.player.energy + (source === 'basic' ? 12 : 6), 0, 100);
    this.emit('damage', { enemyId: enemy.id, damage, source, hp: enemy.currentHp, maxHp: enemy.maxHp });
    if (enemy.currentHp <= 0) this.enemyDefeated(enemy);
  }

  enemyDefeated(enemy) {
    enemy.alive = false;
    this.runtime.targetId = null;
    if (!this.state.world.defeatedIds.includes(enemy.id)) this.state.world.defeatedIds.push(enemy.id);
    this.state.player.gold += enemy.gold;
    this.addXp(enemy.xp, true);

    if (!enemy.boss) {
      const commonDefeats = this.state.world.defeatedIds.filter(id => id !== 'boss-stakes').length;
      this.state.world.progress = clamp(commonDefeats * 12.5, 0, 100);
      if (commonDefeats >= 3 && !this.state.systems.autoUnlocked) {
        this.state.systems.autoUnlocked = true;
        this.emit('autoUnlocked', {});
      }
      if (commonDefeats >= 5 && !this.state.systems.companionUnlocked) {
        this.state.systems.companionUnlocked = true;
        this.emit('companionUnlocked', {});
      }
      if (commonDefeats >= 8 && !this.state.world.bossUnlocked) {
        this.state.world.bossUnlocked = true;
        this.state.world.checkpoint = 'Portão das Estacas';
        const bossData = ENCOUNTERS.find(item => item.boss);
        this.enemies.push({ ...bossData, maxHp: bossData.hp, currentHp: bossData.hp, alive: true, attackTimer: 0, spawnX: bossData.x, spawnY: bossData.y, phase: 1 });
        this.emit('bossUnlocked', { name: bossData.name });
      }
    } else {
      this.state.world.bossDefeated = true;
      this.state.world.progress = 100;
      this.state.player.gems += 20;
      this.emit('regionComplete', { boss: enemy.name });
    }

    const lootIndex = this.state.world.defeatedIds.length - 1;
    if (!enemy.boss && lootIndex >= 0 && lootIndex < LOOT_TABLE.length) {
      const base = LOOT_TABLE[lootIndex];
      const item = { ...base, instanceId: `${base.id}-${Date.now()}-${lootIndex}`, level: Math.max(1, this.state.player.level) };
      this.state.inventory.push(item);
      this.emit('loot', { item });
    }
    this.emit('enemyDefeated', { enemyId: enemy.id, name: enemy.name, gold: enemy.gold, xp: enemy.xp });
  }

  addXp(amount, notify) {
    if (!amount) return;
    this.state.player.xp += amount;
    while (this.state.player.xp >= this.state.player.xpNext) {
      this.state.player.xp -= this.state.player.xpNext;
      this.state.player.level += 1;
      this.state.player.xpNext = Math.round(this.state.player.xpNext * 1.48 + 22);
      this.state.player.maxHp += 18;
      this.state.player.hp = this.state.player.maxHp;
      this.state.player.baseAttack += 2;
      this.state.player.baseDefense += 1;
      this.recalculate();
      if (notify) this.emit('levelUp', { level: this.state.player.level });
    }
  }

  playerDefeated(enemy) {
    this.state.player.hp = this.state.player.maxHp;
    this.state.player.x = WORLD.checkpoint.x;
    this.state.player.y = WORLD.checkpoint.y;
    this.state.systems.autoEnabled = false;
    this.moveTarget = null;
    enemy.x = enemy.spawnX;
    enemy.y = enemy.spawnY;
    this.emit('playerDefeated', { enemy: enemy.name });
  }

  snapshot() {
    return JSON.parse(JSON.stringify({ ...this.state, lastSeenServer: new Date().toISOString() }));
  }
}
