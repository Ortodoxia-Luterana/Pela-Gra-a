import { ENCOUNTERS, LOOT_TABLE, MISSIONS, PETS, REGIONS, SKILLS, WEAPONS, WORLD, regionAtY } from './content.js?v=2.2.0';
import { MAP_COLLIDERS } from './map-data.js?v=2.2.0';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const PLAYER_RADIUS = 23;
const FUSION_MAX_LEVEL = 5;
const ENEMY_ACTIVE_RADIUS = 920;
const RESPAWN_MIN_SECONDS = 5;
const RESPAWN_MAX_SECONDS = 13;
const RESPAWN_PLAYER_CLEARANCE = 420;
const RESPAWN_ENEMY_CLEARANCE = 68;

export const FUSION_RARITIES = Object.freeze([
  { name: 'Comum', color: '#9b927d' },
  { name: 'Incomum', color: '#68bf62' },
  { name: 'Raro', color: '#54a6df' },
  { name: 'Épico', color: '#9a68da' },
  { name: 'Lendário', color: '#e5a63f' },
  { name: 'Relíquia', color: '#ef6c57' }
]);

const fusionRarity = rarity => FUSION_RARITIES.find(entry => entry.name === rarity) || FUSION_RARITIES[0];
const fusionLevel = level => clamp(Math.round(Number(level) || 1), 1, FUSION_MAX_LEVEL);
const fusionKey = (id, level, rarity) => `${id}::${fusionLevel(level)}::${fusionRarity(rarity).name}`;
const isFinalFusion = (level, rarity) => fusionLevel(level) === FUSION_MAX_LEVEL && fusionRarity(rarity) === FUSION_RARITIES[FUSION_RARITIES.length - 1];

const fusionResult = (level, rarity) => {
  const currentLevel = fusionLevel(level);
  const currentRarity = fusionRarity(rarity);
  if (isFinalFusion(currentLevel, currentRarity.name)) return null;
  if (currentLevel < FUSION_MAX_LEVEL) return { level: currentLevel + 1, rarity: currentRarity.name, color: currentRarity.color, promoted: false };
  const nextRarity = FUSION_RARITIES[FUSION_RARITIES.indexOf(currentRarity) + 1];
  return { level: 1, rarity: nextRarity.name, color: nextRarity.color, promoted: true };
};

const collidesWithMap = (x, y) => MAP_COLLIDERS.some(collider => {
  const nearestX = clamp(x, collider.x - collider.width / 2, collider.x + collider.width / 2);
  const nearestY = clamp(y, collider.y - collider.height / 2, collider.y + collider.height / 2);
  return Math.hypot(x - nearestX, y - nearestY) < PLAYER_RADIUS;
});

export function calculateDamage(power, attack, defense) {
  return Math.max(1, Math.round(power * attack * (100 / (100 + Math.max(0, defense)))));
}

export const TRAINING_STATS = Object.freeze({
  attack: { name: 'ATQ', fullName: 'Ataque', baseCost: 60, perLevel: 2 },
  vitality: { name: 'PV', fullName: 'Vida', baseCost: 70, perLevel: 10 },
  critChance: { name: '% CRÍT.', fullName: 'Chance crítica', baseCost: 120, perLevel: .1 },
  critDamage: { name: 'DANO CRÍT.', fullName: 'Dano crítico', baseCost: 115, perLevel: .1 },
  moveSpeed: { name: 'MOV.', fullName: 'Movimento', baseCost: 90, perLevel: 3 }
});

export function defaultState() {
  return {
    version: 7,
    profile: { created: false, body: 'male', weapon: 'fists' },
    player: {
      x: WORLD.start.x, y: WORLD.start.y, level: 1, xp: 0, xpNext: 100,
      hp: 128, maxHp: 128, baseAttack: 14, baseDefense: 5,
      gold: 120, gems: 0, energy: 0
    },
    world: {
      regionId: 'campos-fronteiras', currentRegionId: 'campos-fronteiras', checkpoint: 'Acampamento do Sul', progress: 0,
      distanceTraveled: 0, defeatedIds: [], totalDefeats: 0, gemMilestones: [],
      bossUnlocked: false, bossDefeated: false
    },
    systems: { autoUnlocked: false, autoEnabled: false, speed: 1 },
    training: { attack: 0, vitality: 0, critChance: 0, critDamage: 0, moveSpeed: 0 },
    inventory: [],
    equipped: {},
    pets: [],
    equippedPetId: null,
    skillsOwned: [],
    equippedSkillId: null,
    skillLevels: {},
    skillCopies: [],
    notifications: { equipment: false },
    summoning: { equipment: 0, skill: 0, pet: 0, total: 0 },
    claimedMissions: [],
    lastSeenServer: null
  };
}

function mergeState(saved) {
  const base = defaultState();
  if (!saved || typeof saved !== 'object') return base;
  const validPetIds = new Set(PETS.map(pet => pet.id));
  const validSkillIds = new Set(SKILLS.map(skill => skill.id));
  const pets = Array.isArray(saved.pets) ? [...new Set(saved.pets.filter(id => validPetIds.has(id)))] : [];
  const legacySkills = Array.isArray(saved.skills) && saved.version >= 3 ? saved.skills.map(skill => skill.id).filter(id => validSkillIds.has(id)) : [];
  const savedSkillsOwned = Array.isArray(saved.skillsOwned)
    ? [...new Set(saved.skillsOwned.filter(id => validSkillIds.has(id)))]
    : legacySkills;
  const equippedPetId = pets.includes(saved.equippedPetId) ? saved.equippedPetId : pets[0] || null;
  const legacyMap = Number(saved.version || 0) < 4;
  const legacyLoadout = Number(saved.version || 0) < 5;
  const defeatedIds = Array.isArray(saved.world?.defeatedIds) ? [...new Set(saved.world.defeatedIds)] : [];
  const hydrateItem = (item, fallbackId = 'saved') => {
    if (!item || typeof item !== 'object') return null;
    const legacyPants = item.slot === 'gloves' || String(item.id || '').endsWith('-gloves');
    const id = legacyPants ? String(item.id || '').replace(/-gloves$/, '-pants') : item.id;
    const slot = legacyPants ? 'pants' : item.slot;
    const definition = LOOT_TABLE.find(entry => entry.id === id);
    const rarity = fusionRarity(item.rarity || definition?.rarity);
    const shared = {
      ...item,
      id,
      slot,
      instanceId: item.instanceId || `${id || slot || 'item'}-legacy-${fallbackId}`,
      level: fusionLevel(item.level),
      rarity: rarity.name,
      color: rarity.color,
      fusionPower: Math.max(0, Math.round(Number(item.fusionPower) || 0))
    };
    if (!definition) return shared;
    return { ...definition, ...shared, id: definition.id, slot: definition.slot, icon: definition.icon, name: definition.name };
  };
  const inventory = Array.isArray(saved.inventory) ? saved.inventory.slice(0, 80).map((item, index) => hydrateItem(item, `inventory-${index}`)).filter(Boolean) : [];
  const equipped = saved.equipped && typeof saved.equipped === 'object'
    ? Object.fromEntries(Object.entries(saved.equipped).map(([slot, item]) => {
      const hydrated = hydrateItem(item, `equipped-${slot}`);
      return [slot === 'gloves' ? 'pants' : slot, hydrated];
    }).filter(([, item]) => Boolean(item)))
    : {};
  const hydrateSkillCopy = (copy, index) => {
    const id = typeof copy === 'string' ? copy : copy?.id;
    const skill = SKILLS.find(entry => entry.id === id);
    if (!skill) return null;
    const rarity = fusionRarity(copy?.rarity || skill.rarity);
    return {
      instanceId: copy?.instanceId || `${id}-legacy-${index}`,
      id,
      level: fusionLevel(copy?.level),
      rarity: rarity.name,
      color: rarity.color,
      fusionPower: Math.max(0, Math.round(Number(copy?.fusionPower) || 0))
    };
  };
  const skillCopies = Array.isArray(saved.skillCopies)
    ? saved.skillCopies.slice(0, 120).map(hydrateSkillCopy).filter(Boolean)
    : [];
  savedSkillsOwned.forEach((id, index) => {
    if (skillCopies.some(copy => copy.id === id)) return;
    const skill = SKILLS.find(entry => entry.id === id);
    const legacyCopyCount = Array.isArray(saved.skillCopies) ? 1 : clamp(Math.round(Number(saved.skillLevels?.[id]) || 1), 1, 30);
    for (let copyIndex = 0; copyIndex < legacyCopyCount; copyIndex += 1) {
      skillCopies.push(hydrateSkillCopy({ id, level: 1, rarity: skill?.rarity }, `owned-${index}-${copyIndex}`));
    }
  });
  const skillsOwned = [...new Set([...savedSkillsOwned, ...skillCopies.map(copy => copy.id)])];
  const equippedSkillId = skillsOwned.includes(saved.equippedSkillId) ? saved.equippedSkillId : skillsOwned[0] || null;
  const skillLevels = Object.fromEntries(skillsOwned.map(id => {
    const best = skillCopies.filter(copy => copy.id === id).sort((a, b) => (FUSION_RARITIES.indexOf(fusionRarity(b.rarity)) * 10 + b.level) - (FUSION_RARITIES.indexOf(fusionRarity(a.rarity)) * 10 + a.level))[0];
    return [id, best?.level || 1];
  }));
  const merged = {
    ...base,
    ...saved,
    version: 7,
    profile: { ...base.profile, ...(saved.profile || {}) },
    player: { ...base.player, ...(saved.player || {}) },
    world: {
      ...base.world,
      ...(saved.world || {}),
      defeatedIds,
      totalDefeats: Math.max(defeatedIds.filter(id => !id.startsWith('boss-')).length, Math.round(Number(saved.world?.totalDefeats) || 0)),
      gemMilestones: Array.isArray(saved.world?.gemMilestones) ? [...new Set(saved.world.gemMilestones)] : []
    },
    systems: { ...base.systems, ...(saved.systems || {}), speed: 1, autoUnlocked: Number(saved.player?.level || 1) >= 10 },
    training: { ...base.training, ...(saved.training || {}) },
    inventory,
    equipped,
    pets,
    equippedPetId,
    skillsOwned,
    equippedSkillId,
    skillLevels,
    skillCopies,
    notifications: { ...base.notifications, ...(saved.notifications || {}) },
    summoning: { ...base.summoning, ...(saved.summoning || {}) },
    claimedMissions: Array.isArray(saved.claimedMissions) ? [...new Set(saved.claimedMissions)] : []
  };
  if (legacyMap) {
    merged.player.x = WORLD.start.x;
    merged.player.y = WORLD.start.y;
    merged.world.currentRegionId = 'campos-fronteiras';
    merged.world.checkpoint = 'Acampamento do Sul';
  }
  merged.profile.weapon = merged.equipped.weapon?.weaponType || (legacyLoadout ? 'fists' : (WEAPONS[merged.profile.weapon] ? merged.profile.weapon : 'fists'));
  merged.player.x = clamp(merged.player.x, 35, WORLD.width - 35);
  merged.player.y = clamp(merged.player.y, 55, WORLD.height - 40);
  const region = regionAtY(merged.player.y);
  merged.world.currentRegionId = region.id;
  merged.world.checkpoint = region.checkpoint;
  return merged;
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
    this.skillTimers = Object.fromEntries(SKILLS.map(skill => [skill.id, 0]));
    this.attackPoseUntil = 0;
    this.attackPressed = false;
    this.attackQueuedUntil = 0;
    this.runtime = { now: 0, targetId: null, moving: false, facing: 'down' };
    this.enemies = ENCOUNTERS
      .filter(item => !item.boss || !this.state.world.defeatedIds.includes(item.id))
      .map(item => ({
        ...item,
        maxHp: item.hp,
        currentHp: item.hp,
        alive: true,
        attackTimer: 0,
        respawnAt: null,
        deathCount: 0,
        spawnX: item.x,
        spawnY: item.y,
        phase: 1
      }));
    this.recalculate();
  }

  itemStats(item) {
    const fusionPower = Math.max(0, Number(item?.fusionPower) || 0);
    return {
      attack: Math.max(0, Number(item?.attack) || 0) + Math.ceil(fusionPower * .75),
      defense: Math.max(0, Number(item?.defense) || 0) + fusionPower
    };
  }

  bestSkillCopy(id) {
    return this.state.skillCopies
      .filter(copy => copy.id === id)
      .sort((a, b) => {
        const rankDifference = FUSION_RARITIES.indexOf(fusionRarity(b.rarity)) - FUSION_RARITIES.indexOf(fusionRarity(a.rarity));
        return rankDifference || b.level - a.level || (b.fusionPower || 0) - (a.fusionPower || 0);
      })[0] || null;
  }

  skillPowerMultiplier(id) {
    return 1 + Math.max(0, Number(this.bestSkillCopy(id)?.fusionPower) || 0) * .08;
  }

  fusionPreview(level, rarity) {
    return fusionResult(level, rarity);
  }

  equipmentFusionGroups() {
    return this.collectFusionGroups(this.state.inventory, item => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      slot: item.slot,
      level: item.level,
      rarity: item.rarity,
      color: item.color
    }));
  }

  skillFusionGroups() {
    return this.collectFusionGroups(this.state.skillCopies, copy => {
      const skill = SKILLS.find(entry => entry.id === copy.id);
      return {
        id: copy.id,
        name: skill?.name || copy.id,
        slot: 'skill',
        level: copy.level,
        rarity: copy.rarity,
        color: copy.color
      };
    });
  }

  collectFusionGroups(source, describe) {
    const groups = new Map();
    source.forEach(entry => {
      const item = describe(entry);
      const key = fusionKey(item.id, item.level, item.rarity);
      if (!groups.has(key)) groups.set(key, { ...item, level: fusionLevel(item.level), rarity: fusionRarity(item.rarity).name, color: fusionRarity(item.rarity).color, count: 0 });
      groups.get(key).count += 1;
    });
    return [...groups.values()].map(group => {
      const preview = fusionResult(group.level, group.rarity);
      return { ...group, preview, canFuse: group.count >= 3 && Boolean(preview), maxed: !preview };
    }).sort((a, b) => Number(b.canFuse) - Number(a.canFuse) || b.count - a.count || a.name.localeCompare(b.name, 'pt-BR'));
  }

  fuseEquipment(id, level, rarity) {
    const key = fusionKey(id, level, rarity);
    const matches = this.state.inventory.filter(item => fusionKey(item.id, item.level, item.rarity) === key);
    const preview = fusionResult(level, rarity);
    if (!preview) {
      this.emit('fusionMax', { type: 'equipment' });
      return false;
    }
    if (matches.length < 3) {
      this.emit('fusionInsufficient', { type: 'equipment', count: matches.length });
      return false;
    }
    const equippedIds = new Set(Object.values(this.state.equipped).filter(Boolean).map(item => item.instanceId));
    const survivor = matches.find(item => equippedIds.has(item.instanceId)) || matches[0];
    const chosen = [survivor, ...matches.filter(item => item !== survivor)].slice(0, 3);
    const consumedIds = new Set(chosen.slice(1).map(item => item.instanceId));
    this.state.inventory = this.state.inventory.filter(item => !consumedIds.has(item.instanceId));
    Object.assign(survivor, { level: preview.level, rarity: preview.rarity, color: preview.color, fusionPower: (survivor.fusionPower || 0) + 1 });
    Object.entries(this.state.equipped).forEach(([slot, item]) => {
      if (item?.instanceId === survivor.instanceId || consumedIds.has(item?.instanceId)) this.state.equipped[slot] = survivor;
    });
    this.recalculate();
    this.emit('equipmentFused', { item: survivor, promoted: preview.promoted, consumed: 3 });
    return survivor;
  }

  fuseSkill(id, level, rarity) {
    const key = fusionKey(id, level, rarity);
    const matches = this.state.skillCopies.filter(copy => fusionKey(copy.id, copy.level, copy.rarity) === key);
    const preview = fusionResult(level, rarity);
    if (!preview) {
      this.emit('fusionMax', { type: 'skill' });
      return false;
    }
    if (matches.length < 3) {
      this.emit('fusionInsufficient', { type: 'skill', count: matches.length });
      return false;
    }
    const survivor = matches[0];
    const consumedIds = new Set(matches.slice(1, 3).map(copy => copy.instanceId));
    this.state.skillCopies = this.state.skillCopies.filter(copy => !consumedIds.has(copy.instanceId));
    Object.assign(survivor, { level: preview.level, rarity: preview.rarity, color: preview.color, fusionPower: (survivor.fusionPower || 0) + 1 });
    this.syncSkillProgress();
    const skill = SKILLS.find(entry => entry.id === id);
    this.emit('skillFused', { skill, copy: survivor, promoted: preview.promoted, consumed: 3 });
    return survivor;
  }

  syncSkillProgress() {
    this.state.skillsOwned = [...new Set(this.state.skillCopies.map(copy => copy.id))];
    this.state.skillLevels = Object.fromEntries(this.state.skillsOwned.map(id => [id, this.bestSkillCopy(id)?.level || 1]));
    if (!this.state.skillsOwned.includes(this.state.equippedSkillId)) this.state.equippedSkillId = this.state.skillsOwned[0] || null;
  }

  markEquipmentSeen() {
    if (!this.state.notifications.equipment) return false;
    this.state.notifications.equipment = false;
    this.emit('equipmentSeen', {});
    return true;
  }

  recalculate() {
    const weapon = WEAPONS[this.state.profile.weapon] || WEAPONS.fists;
    const bonuses = Object.values(this.state.equipped).filter(Boolean).reduce((sum, item) => {
      const stats = this.itemStats(item);
      return { attack: sum.attack + stats.attack, defense: sum.defense + stats.defense };
    }, { attack: 0, defense: 0 });
    const training = this.state.training;
    const attack = this.state.player.baseAttack + weapon.attack + bonuses.attack + (this.state.player.level - 1) * 2 + training.attack * 2;
    const defense = this.state.player.baseDefense + bonuses.defense + (this.state.player.level - 1);
    this.stats = {
      attack,
      defense,
      range: weapon.range,
      attackSpeed: weapon.speed,
      critChance: clamp(5 + training.critChance * TRAINING_STATS.critChance.perLevel, 5, 60),
      critDamage: 150 + training.critDamage * TRAINING_STATS.critDamage.perLevel,
      moveSpeed: clamp(190 + training.moveSpeed * 3, 190, 260),
      basicDamage: calculateDamage(1, attack, 5),
      power: Math.round(attack * 5.2 + defense * 2 + this.state.player.level * 18 + training.vitality * 1.5)
    };
  }

  trainingCost(id) {
    const definition = TRAINING_STATS[id];
    if (!definition) return Infinity;
    return Math.round(definition.baseCost * Math.pow(1.22, this.state.training[id] || 0));
  }

  upgradeTraining(id) {
    const definition = TRAINING_STATS[id];
    if (!definition) return false;
    const cost = this.trainingCost(id);
    if (this.state.player.gold < cost) {
      this.emit('goldInsufficient', { cost });
      return false;
    }
    this.state.player.gold -= cost;
    this.state.training[id] += 1;
    if (id === 'vitality') {
      this.state.player.maxHp += definition.perLevel;
      this.state.player.hp += definition.perLevel;
    }
    this.recalculate();
    this.emit('trainingUpgraded', { id, level: this.state.training[id], cost });
    return true;
  }

  summon(category, count = 1) {
    const validCategory = ['equipment', 'skill', 'pet'].includes(category) ? category : 'equipment';
    const unlockLevel = { equipment: 1, skill: 3, pet: 5 }[validCategory];
    if (this.state.player.level < unlockLevel) {
      this.emit('summonLocked', { category: validCategory, level: unlockLevel });
      return [];
    }
    const amount = count === 10 ? 10 : 1;
    const cost = amount === 10 ? 900 : 100;
    if (this.state.player.gems < cost) {
      this.emit('summonInsufficient', { cost, gems: this.state.player.gems });
      return [];
    }
    this.state.player.gems -= cost;
    const results = [];
    for (let index = 0; index < amount; index += 1) {
      if (validCategory === 'equipment') {
        const base = LOOT_TABLE[Math.floor(Math.random() * LOOT_TABLE.length)];
        const rarity = fusionRarity(base.rarity);
        const item = { ...base, instanceId: `${base.id}-${Date.now()}-${this.state.inventory.length}-${index}`, level: 1, rarity: rarity.name, color: rarity.color, fusionPower: 0 };
        this.state.inventory.push(item);
        results.push({ type: 'equipment', id: item.instanceId, name: item.name, rarity: item.rarity, item });
      } else if (validCategory === 'skill') {
        const skill = SKILLS[Math.floor(Math.random() * SKILLS.length)];
        const duplicate = this.state.skillCopies.some(copy => copy.id === skill.id);
        const rarity = fusionRarity(skill.rarity);
        const copy = { instanceId: `${skill.id}-${Date.now()}-${this.state.skillCopies.length}-${index}`, id: skill.id, level: 1, rarity: rarity.name, color: rarity.color, fusionPower: 0 };
        this.state.skillCopies.push(copy);
        if (!duplicate) this.state.skillsOwned.push(skill.id);
        if (!this.state.equippedSkillId) this.state.equippedSkillId = skill.id;
        results.push({ type: 'skill', id: skill.id, name: skill.name, rarity: copy.rarity, level: copy.level, duplicate, skill, copy });
      } else {
        const pet = PETS[Math.floor(Math.random() * PETS.length)];
        const duplicate = this.state.pets.includes(pet.id);
        if (!duplicate) this.state.pets.push(pet.id);
        else this.state.player.gold += 75;
        if (!this.state.equippedPetId) this.state.equippedPetId = pet.id;
        results.push({ type: 'pet', id: pet.id, name: pet.name, rarity: duplicate ? 'Fragmento' : pet.rarity, duplicate, pet });
      }
    }
    if (validCategory === 'equipment') this.state.notifications.equipment = true;
    if (validCategory === 'skill') this.syncSkillProgress();
    this.state.summoning[validCategory] += amount;
    this.state.summoning.total += amount;
    this.recalculate();
    this.emit('summoned', { category: validCategory, count: amount, cost, results });
    return results;
  }

  missionProgress(mission) {
    if (mission.metric === 'defeats') return this.state.world.totalDefeats;
    if (mission.metric === 'level') return this.state.player.level;
    if (mission.metric === 'distance') return Math.floor(this.state.world.distanceTraveled || 0);
    if (mission.metric === 'summons') return this.state.summoning.total || 0;
    if (mission.metric === 'region') {
      const order = ['campos-fronteiras', 'floresta-vozes', 'ruinas-coroa'];
      return order.indexOf(this.state.world.currentRegionId) + 1;
    }
    return 0;
  }

  claimMission(id) {
    const mission = MISSIONS.find(item => item.id === id);
    if (!mission || this.state.claimedMissions.includes(id) || this.missionProgress(mission) < mission.target) return false;
    this.state.claimedMissions.push(id);
    this.state.player.gems += mission.gems;
    this.emit('missionClaimed', { mission, gems: mission.gems });
    return true;
  }

  equipSkill(id) {
    if (!this.state.skillsOwned.includes(id)) return false;
    this.state.equippedSkillId = id;
    this.emit('skillEquipped', { skill: SKILLS.find(skill => skill.id === id) });
    return true;
  }

  startJourney(body) {
    this.state.profile = { created: true, body: body === 'female' ? 'female' : 'male', weapon: 'fists' };
    this.state.inventory = [];
    this.state.equipped = {};
    this.state.pets = [];
    this.state.equippedPetId = null;
    this.state.skillsOwned = [];
    this.state.equippedSkillId = null;
    this.state.skillLevels = {};
    this.state.skillCopies = [];
    this.state.notifications = { equipment: false };
    this.recalculate();
    this.emit('journeyStarted', { body, weapon: 'fists' });
  }

  setAttackPressed(pressed) {
    this.attackPressed = Boolean(pressed);
    if (this.attackPressed) this.attackQueuedUntil = this.runtime.now + .24;
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

  setPaused(paused) {
    this.paused = Boolean(paused);
    this.emit('pauseChanged', { paused: this.paused });
  }

  applyOffline(seconds) {
    const safeSeconds = clamp(Number(seconds) || 0, 0, 12 * 60 * 60);
    if (safeSeconds < 60 || !this.state.profile.created) return null;
    const minutes = Math.floor(safeSeconds / 60);
    const gold = Math.floor(minutes * (2.5 + this.state.player.level * .75));
    const xp = Math.min(Math.floor(minutes * .45), this.state.player.xpNext * 2);
    this.state.player.gold += gold;
    this.addXp(xp, false);
    return { seconds: safeSeconds, minutes, gold, xp };
  }

  equipItem(index) {
    const item = this.state.inventory[index];
    if (!item) return false;
    this.state.equipped[item.slot] = item;
    if (item.slot === 'weapon') this.state.profile.weapon = item.weaponType || 'sword';
    this.recalculate();
    this.emit('itemEquipped', { item });
    return true;
  }

  equipPet(id) {
    if (!this.state.pets.includes(id) || !PETS.some(pet => pet.id === id)) return false;
    this.state.equippedPetId = id;
    this.emit('petEquipped', { pet: PETS.find(pet => pet.id === id) });
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
    const dt = clamp(rawDt, 0, .05);
    this.runtime.now += dt;
    this.basicTimer -= dt;
    this.petTimer -= dt;
    Object.keys(this.skillTimers).forEach(id => { this.skillTimers[id] = Math.max(0, this.skillTimers[id] - dt); });
    this.updateRespawns();

    const player = this.state.player;
    const living = this.enemies.filter(enemy => enemy.alive);
    let target = living.find(enemy => enemy.id === this.runtime.targetId) || null;
    if (!target) target = this.nearestEnemy(living);
    this.runtime.targetId = target?.id || null;

    let mx = this.input.x;
    let my = this.input.y;
    if (this.state.systems.autoEnabled && target) {
      const gap = this.attackGap(target);
      if (gap > this.stats.range * .82) {
        mx = target.x - player.x;
        my = target.y - player.y;
      } else { mx = 0; my = 0; }
    } else if (this.moveTarget) {
      const gap = distance(player, this.moveTarget);
      if (gap > 12) { mx = this.moveTarget.x - player.x; my = this.moveTarget.y - player.y; }
      else { this.moveTarget = null; mx = 0; my = 0; }
    }

    const magnitude = Math.hypot(mx, my);
    this.runtime.moving = magnitude > .08;
    if (this.runtime.moving) {
      mx /= magnitude;
      my /= magnitude;
      this.movePlayer(mx * this.stats.moveSpeed * dt, my * this.stats.moveSpeed * dt);
      if (Math.abs(my) > Math.abs(mx)) this.runtime.facing = my < 0 ? 'up' : 'down';
      else this.runtime.facing = mx < 0 ? 'left' : 'right';
    }

    for (const enemy of living) {
      if (distance(player, enemy) <= ENEMY_ACTIVE_RADIUS) this.updateEnemy(enemy, dt);
    }
    target = this.enemies.find(enemy => enemy.alive && enemy.id === this.runtime.targetId) || this.nearestEnemy(this.enemies.filter(enemy => enemy.alive));
    const wantsAttack = this.state.systems.autoEnabled || this.attackPressed || this.runtime.now <= this.attackQueuedUntil;
    const targetsInRange = this.enemies.filter(enemy => enemy.alive && this.inAttackRange(enemy));
    const attackTarget = target && targetsInRange.includes(target) ? target : this.nearestEnemy(targetsInRange);
    if (wantsAttack && attackTarget && this.basicTimer <= 0) {
      this.basicTimer = this.stats.attackSpeed;
      this.attackPoseUntil = this.runtime.now + .18;
      const critical = Math.random() * 100 < this.stats.critChance;
      const damage = calculateDamage(critical ? this.stats.critDamage / 100 : 1, this.stats.attack, attackTarget.defense);
      this.hitEnemy(attackTarget, damage, 'basic', critical);
      this.emit('playerAttack', { targetId: attackTarget.id, weapon: this.state.profile.weapon, critical });
      if (!this.attackPressed && !this.state.systems.autoEnabled) this.attackQueuedUntil = 0;
    }

    this.updateSkills(target);
    this.updateCompanion(target);
  }

  movePlayer(dx, dy) {
    const player = this.state.player;
    const oldX = player.x;
    const oldY = player.y;
    const nextX = clamp(player.x + dx, 35, WORLD.width - 35);
    const nextY = clamp(player.y + dy, 55, WORLD.height - 40);
    let moved = false;
    if (!collidesWithMap(nextX, player.y)) { player.x = nextX; moved = true; }
    if (!collidesWithMap(player.x, nextY)) { player.y = nextY; moved = true; }
    if (moved) {
      this.state.world.distanceTraveled += Math.hypot(player.x - oldX, player.y - oldY) / 10;
      const region = regionAtY(player.y);
      if (region.id !== this.state.world.currentRegionId) {
        this.state.world.currentRegionId = region.id;
        this.state.world.checkpoint = region.checkpoint;
        this.emit('regionChanged', { region });
      }
    }
    else if (this.moveTarget) this.moveTarget = null;
  }

  updateEnemy(enemy, dt) {
    const player = this.state.player;
    const centerGap = distance(player, enemy);
    const attackGap = this.attackGap(enemy);
    const aggro = enemy.boss ? 420 : 230;
    const range = this.enemyAttackRange(enemy);
    if (centerGap < aggro && attackGap > range) {
      enemy.x += (player.x - enemy.x) / Math.max(1, centerGap) * enemy.speed * dt;
      enemy.y += (player.y - enemy.y) / Math.max(1, centerGap) * enemy.speed * dt;
    }
    enemy.attackTimer -= dt;
    if (attackGap <= range && enemy.attackTimer <= 0) {
      enemy.attackTimer = enemy.boss ? 1.45 : enemy.kind === 'ranged' ? 1.7 : 1.25;
      const damage = calculateDamage(enemy.boss && enemy.phase === 2 ? 1.4 : 1, enemy.attack, this.stats.defense);
      player.hp = clamp(player.hp - damage, 0, player.maxHp);
      this.emit('enemyAttack', { enemyId: enemy.id, damage });
      if (player.hp <= 0) this.playerDefeated(enemy);
    }
    if (enemy.boss && enemy.phase === 1 && enemy.currentHp <= enemy.maxHp * .5) {
      enemy.phase = 2;
      enemy.speed *= 1.22;
      enemy.attack = Math.round(enemy.attack * 1.24);
      this.emit('bossPhase', { phase: 2, name: enemy.name });
    }
  }

  updateRespawns() {
    for (const enemy of this.enemies) {
      if (enemy.alive || enemy.boss || !enemy.respawnAt || this.runtime.now < enemy.respawnAt) continue;
      const position = this.randomRespawnPosition(enemy);
      enemy.x = position.x;
      enemy.y = position.y;
      enemy.currentHp = enemy.maxHp;
      enemy.attackTimer = .65 + Math.random() * .65;
      enemy.respawnAt = null;
      enemy.phase = 1;
      enemy.alive = true;
      this.emit('enemyRespawned', { enemyId: enemy.id, name: enemy.name, x: enemy.x, y: enemy.y });
    }
  }

  randomRespawnPosition(enemy) {
    const region = REGIONS.find(item => item.id === enemy.regionId) || regionAtY(enemy.spawnY);
    const minY = region.y + 720;
    const maxY = region.y + region.height - 720;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const localSpawn = attempt < 16;
      const x = clamp(localSpawn ? enemy.spawnX + (Math.random() - .5) * 820 : 150 + Math.random() * (WORLD.width - 300), 130, WORLD.width - 130);
      const y = clamp(localSpawn ? enemy.spawnY + (Math.random() - .5) * 1100 : minY + Math.random() * (maxY - minY), minY, maxY);
      if (distance(this.state.player, { x, y }) < RESPAWN_PLAYER_CLEARANCE || collidesWithMap(x, y)) continue;
      const crowded = this.enemies.some(other => other !== enemy && other.alive && other.regionId === enemy.regionId && distance(other, { x, y }) < RESPAWN_ENEMY_CLEARANCE);
      if (!crowded) return { x, y };
    }
    return { x: enemy.spawnX, y: enemy.spawnY };
  }

  updateSkills(target) {
    const id = this.state.equippedSkillId;
    const skill = SKILLS.find(item => item.id === id);
    if (!skill || this.skillTimers[id] > 0) return;
    const player = this.state.player;
    const fusionMultiplier = this.skillPowerMultiplier(id);
    if (id === 'guard' && player.hp / player.maxHp < .62) {
      const amount = Math.round(player.maxHp * Math.min(.4, .22 * fusionMultiplier));
      player.hp = clamp(player.hp + amount, 0, player.maxHp);
      this.skillTimers[id] = skill.cooldown;
      this.emit('skill', { id, amount });
    }
    const nearby = this.enemies.filter(enemy => enemy.alive && distance(player, enemy) <= 165);
    if (id === 'cleave' && nearby.length >= 2) {
      nearby.forEach(enemy => this.hitEnemy(enemy, calculateDamage(.74 * fusionMultiplier, this.stats.attack, enemy.defense), id));
      this.skillTimers[id] = skill.cooldown;
      this.emit('skill', { id, targets: nearby.map(enemy => enemy.id) });
    }
    if (id === 'rend' && target && this.inAttackRange(target, this.stats.range * 1.15)) {
      const multiplier = target.kind === 'boss' || target.kind === 'elite' ? 1.85 : 1.45;
      this.hitEnemy(target, calculateDamage(multiplier * fusionMultiplier, this.stats.attack, target.defense), id);
      this.skillTimers[id] = skill.cooldown;
      this.emit('skill', { id, targetId: target.id });
    }
    if (id === 'shard') {
      const threat = this.enemies.filter(enemy => enemy.alive && distance(player, enemy) <= 340).sort((a, b) => b.attack - a.attack)[0];
      if (threat) {
        this.hitEnemy(threat, calculateDamage(1.25 * fusionMultiplier, this.stats.attack, threat.defense), id);
        this.skillTimers[id] = skill.cooldown;
        this.emit('skill', { id, targetId: threat.id });
      }
    }
  }

  updateCompanion(target) {
    const pet = PETS.find(item => item.id === this.state.equippedPetId);
    if (!pet || !target || this.petTimer > 0 || distance(this.state.player, target) > 260) return;
    this.petTimer = pet.cooldown;
    this.hitEnemy(target, calculateDamage(pet.attackMultiplier, this.stats.attack, target.defense), 'companion');
    this.emit('companionAttack', { targetId: target.id, petId: pet.id });
  }

  nearestEnemy(list) {
    if (!list.length) return null;
    return list.reduce((best, enemy) => distance(this.state.player, enemy) < distance(this.state.player, best) ? enemy : best, list[0]);
  }

  enemyHitRadius(enemy) {
    if (!enemy) return 0;
    const scale = Math.max(1, Number(enemy.scale) || 96);
    return enemy.boss ? Math.max(52, scale * .24) : Math.max(24, scale * .28);
  }

  attackGap(enemy) {
    return Math.max(0, distance(this.state.player, enemy) - this.enemyHitRadius(enemy));
  }

  enemyAttackRange(enemy) {
    if (enemy?.kind !== 'ranged') return WEAPONS.fists.range;
    return Math.max(WEAPONS.fists.range, 190 - this.enemyHitRadius(enemy));
  }

  inAttackRange(enemy, range = this.stats.range) {
    return this.attackGap(enemy) <= range;
  }

  hitEnemy(enemy, damage, source, critical = false) {
    if (!enemy?.alive) return;
    enemy.currentHp = Math.max(0, enemy.currentHp - damage);
    this.state.player.energy = clamp(this.state.player.energy + (source === 'basic' ? 12 : 6), 0, 100);
    this.emit('damage', { enemyId: enemy.id, damage, source, critical, hp: enemy.currentHp, maxHp: enemy.maxHp });
    if (enemy.currentHp <= 0) this.enemyDefeated(enemy);
  }

  enemyDefeated(enemy) {
    enemy.alive = false;
    enemy.deathCount = (enemy.deathCount || 0) + 1;
    enemy.respawnAt = enemy.boss ? null : this.runtime.now + RESPAWN_MIN_SECONDS + Math.random() * (RESPAWN_MAX_SECONDS - RESPAWN_MIN_SECONDS);
    this.runtime.targetId = null;
    if (!this.state.world.defeatedIds.includes(enemy.id)) this.state.world.defeatedIds.push(enemy.id);
    if (!enemy.boss) this.state.world.totalDefeats += 1;
    this.state.player.gold += enemy.gold;
    this.addXp(enemy.xp, true);

    const milestone = enemy.boss ? `challenge-${enemy.id}` : `challenge-${enemy.regionId}-${enemy.speciesId || enemy.assetKey}`;
    const legacyMilestone = `challenge-${enemy.id}`;
    if (!this.state.world.gemMilestones.includes(milestone) && !this.state.world.gemMilestones.includes(legacyMilestone)) {
      const gems = enemy.boss ? 150 : enemy.kind === 'elite' ? 40 : enemy.kind === 'ranged' ? 20 : 10;
      this.state.world.gemMilestones.push(milestone);
      this.state.player.gems += gems;
      this.emit('gemsEarned', { gems, source: 'Desafio do mapa' });
    }

    const defeats = this.state.world.defeatedIds.length;
    this.state.world.progress = clamp(defeats / ENCOUNTERS.length * 100, 0, 100);
    if (enemy.boss) {
      if (enemy.id === 'boss-stakes') this.state.world.bossDefeated = true;
      this.emit('regionComplete', { boss: enemy.name, regionId: enemy.regionId });
    }
    this.emit('enemyDefeated', { enemyId: enemy.id, name: enemy.name, gold: enemy.gold, xp: enemy.xp, respawnIn: enemy.respawnAt ? enemy.respawnAt - this.runtime.now : null });
  }

  addXp(amount, notify) {
    if (!amount) return;
    this.state.player.xp += amount;
    while (this.state.player.xp >= this.state.player.xpNext) {
      this.state.player.xp -= this.state.player.xpNext;
      this.state.player.level += 1;
      this.state.player.xpNext = Math.round(this.state.player.xpNext * 1.38 + 38);
      this.state.player.maxHp += 18;
      this.state.player.hp = this.state.player.maxHp;
      this.state.player.baseAttack += 2;
      this.state.player.baseDefense += 1;
      this.state.player.gems += 25;
      this.recalculate();
      if (this.state.player.level >= 10 && !this.state.systems.autoUnlocked) {
        this.state.systems.autoUnlocked = true;
        this.emit('autoUnlocked', { level: 10 });
      }
      if (notify) {
        this.emit('levelUp', { level: this.state.player.level, gems: 25 });
        this.emit('gemsEarned', { gems: 25, source: 'Novo nível' });
      }
    }
  }

  playerDefeated(enemy) {
    this.state.player.hp = this.state.player.maxHp;
    const region = REGIONS.find(item => item.id === this.state.world.currentRegionId) || REGIONS[2];
    this.state.player.x = WORLD.width / 2;
    this.state.player.y = region.y + region.height - 420;
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
