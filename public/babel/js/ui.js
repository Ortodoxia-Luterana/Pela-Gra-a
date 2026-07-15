import { ENCOUNTERS, EQUIPMENT_SLOTS, MISSIONS, PETS, REGIONS, SKILLS, WEAPONS } from './content.js?v=2.2.0';
import { TRAINING_STATS } from './simulation.js?v=2.2.0';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

export class GameUI {
  constructor(simulation, boot) {
    this.sim = simulation;
    this.boot = boot;
    this.drawer = document.getElementById('drawer');
    this.drawerContent = document.getElementById('drawer-content');
    this.modal = document.getElementById('modal');
    this.toastTimer = null;
    this.modalHandler = null;
    this.selectedBody = null;
    this.introStep = 0;
    this.introReplay = false;
    this.currentPanel = null;
    this.equipmentFilter = 'weapon';
    this.summonCategory = 'equipment';
    this.onlineState = { status: 'connecting', connected: false, count: 0, players: [] };
    this.bindProfile();
    this.bindControls();
    this.bindIntro();
    this.bindJoystick();
    this.bindOnline();
    this.eventHandler = event => this.onSimulationEvent(event.detail.type, event.detail.payload);
    window.addEventListener('babel:event', this.eventHandler);
    this.refresh();
    this.interval = window.setInterval(() => this.refresh(), 120);
  }

  bindOnline() {
    this.onlineHandler = event => {
      this.onlineState = event.detail || this.onlineState;
      const badge = document.getElementById('online-count');
      badge.classList.toggle('online', Boolean(this.onlineState.connected));
      badge.classList.toggle('reconnecting', !this.onlineState.connected);
      badge.textContent = this.onlineState.connected
        ? `● ${this.onlineState.count} online`
        : this.onlineState.status === 'replaced' ? 'Outra aba ativa' : 'Reconectando…';
      if (!this.drawer.hidden && this.currentPanel === 'guild') this.drawerContent.innerHTML = this.renderGuild();
    };
    window.addEventListener('babel:online', this.onlineHandler);
  }

  bindProfile() {
    const name = this.boot.user?.name || 'Aventureiro';
    document.getElementById('profile-name').textContent = name;
    this.renderProfileAvatar();
    document.getElementById('profile-chip').addEventListener('click', () => this.openPanel('training'));
  }

  renderProfileAvatar() {
    const avatar = document.getElementById('profile-avatar');
    const name = this.boot.user?.name || 'Aventureiro';
    avatar.classList.toggle('sprite-profile', !this.boot.user?.avatarData);
    if (this.boot.user?.avatarData) {
      const image = new Image();
      image.alt = name;
      image.src = this.boot.user.avatarData;
      avatar.replaceChildren(image);
    } else {
      const body = this.sim.state.profile.body === 'female' ? 'female' : 'male';
      const stack = document.createElement('span');
      stack.className = 'profile-sprite-stack';
      stack.innerHTML = `<i class="profile-sprite-base" style="--profile-skin:url('/assets/babel/assets/characters/hero-${body}.png')"></i>${EQUIPMENT_SLOTS.map(slot => {
        const setId = this.sim.state.equipped[slot]?.setId;
        return setId ? `<i class="profile-sprite-layer layer-${slot}" style="--profile-skin:url('/assets/babel/assets/characters/equipment/${setId}/${body}/${slot}.png')"></i>` : '';
      }).join('')}`;
      avatar.replaceChildren(stack);
    }
  }

  bindControls() {
    document.getElementById('auto-button').addEventListener('click', () => this.sim.toggleAuto());
    const attack = document.getElementById('attack-button');
    const startAttack = event => {
      event.preventDefault();
      attack.setPointerCapture?.(event.pointerId);
      attack.classList.add('active');
      this.sim.setAttackPressed(true);
    };
    const stopAttack = () => {
      attack.classList.remove('active');
      this.sim.setAttackPressed(false);
    };
    attack.addEventListener('pointerdown', startAttack);
    attack.addEventListener('pointerup', stopAttack);
    attack.addEventListener('pointercancel', stopAttack);
    attack.addEventListener('lostpointercapture', stopAttack);
    document.querySelectorAll('.game-nav button').forEach(button => button.addEventListener('click', () => {
      const panel = button.dataset.panel;
      document.querySelectorAll('.game-nav button').forEach(item => item.classList.toggle('active', item === button));
      this.openPanel(panel);
    }));
    document.querySelectorAll('[data-close-drawer]').forEach(button => button.addEventListener('click', () => this.closeDrawer()));
    document.getElementById('modal-action').addEventListener('click', () => {
      const handler = this.modalHandler;
      this.hideModal();
      if (handler) handler();
    });
  }

  bindIntro() {
    const intro = document.getElementById('intro');
    if (!this.sim.state.profile.created) this.openIntro(false);
    intro.querySelectorAll('[data-body]').forEach(button => button.addEventListener('click', () => {
      this.selectedBody = button.dataset.body;
      intro.querySelectorAll('[data-body]').forEach(item => item.classList.toggle('selected', item === button));
      this.updateStartButton();
    }));
    document.getElementById('start-journey').addEventListener('click', () => {
      if (!this.selectedBody) return;
      this.sim.startJourney(this.selectedBody);
      intro.hidden = true;
      this.toast('A jornada começou.');
    });
    document.getElementById('intro-back').addEventListener('click', () => this.showIntroStep(this.introStep - 1));
    document.getElementById('intro-next').addEventListener('click', () => {
      if (this.introStep < 2) this.showIntroStep(this.introStep + 1);
      else if (this.introReplay) this.closeIntro();
      else this.showIntroStep(3);
    });
    document.getElementById('intro-skip').addEventListener('click', () => {
      if (this.introReplay) this.closeIntro();
      else this.showIntroStep(3);
    });
  }

  openIntro(replay = false) {
    this.introReplay = replay;
    const intro = document.getElementById('intro');
    intro.hidden = false;
    this.showIntroStep(0);
  }

  closeIntro() {
    document.getElementById('intro').hidden = true;
    this.introReplay = false;
  }

  showIntroStep(step) {
    const maxStep = this.introReplay ? 2 : 3;
    this.introStep = Math.max(0, Math.min(maxStep, step));
    document.querySelectorAll('[data-intro-step]').forEach(slide => { slide.hidden = Number(slide.dataset.introStep) !== this.introStep; });
    const dots = document.getElementById('intro-dots');
    dots.innerHTML = Array.from({ length: maxStep + 1 }, (_, index) => `<i class="${index === this.introStep ? 'active' : ''}"></i>`).join('');
    const back = document.getElementById('intro-back');
    const next = document.getElementById('intro-next');
    const skip = document.getElementById('intro-skip');
    back.disabled = this.introStep === 0;
    next.hidden = this.introStep === 3;
    next.textContent = this.introReplay && this.introStep === 2 ? 'Voltar à jornada' : this.introStep === 2 ? 'Criar aventureiro' : 'Continuar';
    skip.hidden = this.introStep === 3;
    skip.textContent = this.introReplay ? 'Fechar' : 'Pular história';
  }

  updateStartButton() {
    document.getElementById('start-journey').disabled = !this.selectedBody;
  }

  bindJoystick() {
    const joystick = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    const update = event => {
      const rect = joystick.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const max = rect.width * .31;
      const length = Math.hypot(dx, dy) || 1;
      const scale = Math.min(1, max / length);
      const px = dx * scale;
      const py = dy * scale;
      knob.style.transform = `translate(-50%, -50%) translate(${px}px, ${py}px)`;
      this.sim.joystickActive = true;
      this.sim.setInput(px / max, py / max);
    };
    const end = () => {
      this.sim.joystickActive = false;
      this.sim.setInput(0, 0);
      joystick.classList.remove('active');
      knob.style.transform = 'translate(-50%, -50%)';
    };
    joystick.addEventListener('pointerdown', event => {
      joystick.setPointerCapture(event.pointerId);
      joystick.classList.add('active');
      update(event);
    });
    joystick.addEventListener('pointermove', event => { if (joystick.hasPointerCapture(event.pointerId)) update(event); });
    joystick.addEventListener('pointerup', end);
    joystick.addEventListener('pointercancel', end);
  }

  refresh() {
    const state = this.sim.state;
    const player = state.player;
    document.getElementById('level-value').textContent = player.level;
    document.getElementById('power-value').textContent = this.sim.stats.power.toLocaleString('pt-BR');
    document.getElementById('hp-fill').style.width = `${Math.max(0, player.hp / player.maxHp * 100)}%`;
    document.getElementById('hp-value').textContent = `${Math.ceil(player.hp)}/${player.maxHp}`;
    document.getElementById('xp-fill').style.width = `${Math.max(0, player.xp / player.xpNext * 100)}%`;
    document.getElementById('xp-value').textContent = `${player.xp}/${player.xpNext}`;
    document.getElementById('gold-value').textContent = player.gold.toLocaleString('pt-BR');
    document.getElementById('gem-value').textContent = player.gems.toLocaleString('pt-BR');
    document.getElementById('region-status').textContent = this.regionStatus();
    const autoButton = document.getElementById('auto-button');
    autoButton.disabled = !state.systems.autoUnlocked;
    autoButton.setAttribute('aria-pressed', String(state.systems.autoEnabled));
    autoButton.querySelector('small').textContent = state.systems.autoUnlocked ? (state.systems.autoEnabled ? 'ATIVO' : 'PRONTO') : 'Nv. 10';
    document.getElementById('inventory-badge').hidden = !state.notifications?.equipment;
    const ability = document.getElementById('ability-slot');
    const skill = SKILLS.find(item => item.id === state.equippedSkillId);
    ability.hidden = !skill;
    if (skill) {
      const remaining = this.sim.skillTimers[skill.id] || 0;
      const percent = Math.max(0, Math.min(100, remaining / skill.cooldown * 100));
      ability.dataset.skill = skill.id;
      ability.setAttribute('aria-label', `${skill.name}${remaining > 0 ? `, recarregando por ${remaining.toFixed(1)} segundos` : ', pronta'}`);
      const image = document.getElementById('ability-image');
      image.src = this.skillAsset(skill.id);
      image.alt = skill.name;
      ability.querySelector('i').style.height = `${percent}%`;
      ability.querySelector('small').textContent = remaining > 0 ? Math.ceil(remaining) : '';
    }
  }

  regionStatus() {
    return REGIONS.find(region => region.id === this.sim.state.world.currentRegionId)?.name || 'Campos das Fronteiras';
  }

  skillGlyph(id) {
    return { guard: '✦', cleave: '↯', rend: '⚔', shard: '◆' }[id] || '✦';
  }

  skillAsset(id) {
    return {
      guard: '/assets/babel/assets/items/artifacts/sun-amulet.png',
      cleave: '/assets/babel/assets/items/weapons/sky-halberd.png',
      rend: '/assets/babel/assets/items/weapons/obsidian-sword.png',
      shard: '/assets/babel/assets/items/artifacts/violet-shard.png'
    }[id] || '/assets/babel/assets/items/artifacts/tower-idol.png';
  }

  openPanel(panel) {
    if (panel === 'equipment') this.sim.markEquipmentSeen();
    const renderers = {
      training: () => this.renderTraining(),
      equipment: () => this.renderEquipment(),
      summon: () => this.renderSummon(),
      missions: () => this.renderMissions(),
      guild: () => this.renderGuild()
    };
    const titles = {
      training: ['CRESCIMENTO DO HERÓI', 'Treinamento'],
      equipment: ['FORJA DE CAMPO', 'Equipamento'],
      summon: ['ALTAR DOS FRAGMENTOS', 'Invocação'],
      missions: ['REGISTRO DA JORNADA', 'Missões'],
      guild: ['SISTEMA ONLINE', 'Companhia de Expedição']
    };
    const [kicker, title] = titles[panel] || titles.training;
    this.currentPanel = panel;
    document.getElementById('drawer-kicker').textContent = kicker;
    document.getElementById('drawer-title').textContent = title;
    this.drawer.dataset.panel = panel;
    this.drawerContent.innerHTML = (renderers[panel] || renderers.training)();
    this.drawer.hidden = false;
    this.bindPanelActions(panel);
  }

  bindPanelActions(panel) {
    if (panel === 'training') {
      this.drawerContent.querySelectorAll('[data-train]').forEach(button => button.addEventListener('click', () => {
        this.sim.upgradeTraining(button.dataset.train);
        this.drawerContent.innerHTML = this.renderTraining();
        this.bindPanelActions('training');
      }));
    }
    if (panel === 'equipment') {
      this.drawerContent.querySelectorAll('[data-equip]').forEach(button => button.addEventListener('click', () => {
        this.sim.equipItem(Number(button.dataset.equip));
        this.drawerContent.innerHTML = this.renderEquipment();
        this.bindPanelActions('equipment');
      }));
      this.drawerContent.querySelectorAll('[data-equip-pet]').forEach(button => button.addEventListener('click', () => {
        this.sim.equipPet(button.dataset.equipPet);
        this.drawerContent.innerHTML = this.renderEquipment();
        this.bindPanelActions('equipment');
      }));
      this.drawerContent.querySelectorAll('[data-equipment-filter]').forEach(button => button.addEventListener('click', () => {
        this.equipmentFilter = button.dataset.equipmentFilter;
        this.drawerContent.innerHTML = this.renderEquipment();
        this.bindPanelActions('equipment');
      }));
      this.drawerContent.querySelectorAll('[data-fuse-equipment]').forEach(button => button.addEventListener('click', () => {
        this.sim.fuseEquipment(button.dataset.fuseEquipment, Number(button.dataset.fuseLevel), button.dataset.fuseRarity);
        this.drawerContent.innerHTML = this.renderEquipment();
        this.bindPanelActions('equipment');
      }));
    }
    if (panel === 'summon') {
      this.drawerContent.querySelectorAll('[data-summon-category]').forEach(button => button.addEventListener('click', () => {
        this.summonCategory = button.dataset.summonCategory;
        this.drawerContent.innerHTML = this.renderSummon();
        this.bindPanelActions('summon');
      }));
      this.drawerContent.querySelectorAll('[data-summon]').forEach(button => button.addEventListener('click', () => {
        const results = this.sim.summon(this.summonCategory, Number(button.dataset.summon));
        if (results.length) this.showSummonResults(results);
        this.drawerContent.innerHTML = this.renderSummon();
        this.bindPanelActions('summon');
      }));
      this.drawerContent.querySelectorAll('[data-equip-skill]').forEach(button => button.addEventListener('click', () => {
        this.sim.equipSkill(button.dataset.equipSkill);
        this.drawerContent.innerHTML = this.renderSummon();
        this.bindPanelActions('summon');
      }));
      this.drawerContent.querySelectorAll('[data-fuse-skill]').forEach(button => button.addEventListener('click', () => {
        this.sim.fuseSkill(button.dataset.fuseSkill, Number(button.dataset.fuseLevel), button.dataset.fuseRarity);
        this.drawerContent.innerHTML = this.renderSummon();
        this.bindPanelActions('summon');
      }));
    }
    if (panel === 'missions') {
      this.drawerContent.querySelectorAll('[data-claim-mission]').forEach(button => button.addEventListener('click', () => {
        this.sim.claimMission(button.dataset.claimMission);
        this.drawerContent.innerHTML = this.renderMissions();
        this.bindPanelActions('missions');
      }));
    }
    const replayIntro = this.drawerContent.querySelector('[data-replay-intro]');
    if (replayIntro) replayIntro.addEventListener('click', () => {
      this.closeDrawer();
      this.openIntro(true);
    });
    const challenge = this.drawerContent.querySelector('[data-challenge-boss]');
    if (challenge) challenge.addEventListener('click', () => {
      const boss = ENCOUNTERS.find(item => item.boss);
      this.closeDrawer();
      this.sim.setMoveTarget(boss.x, boss.y + 125);
    });
  }

  closeDrawer() {
    this.drawer.hidden = true;
    this.drawer.dataset.panel = '';
    this.currentPanel = null;
    document.querySelectorAll('.game-nav button').forEach(button => button.classList.remove('active'));
  }

  renderTraining() {
    const state = this.sim.state;
    const statValue = id => ({
      attack: `${this.sim.stats.attack} ATQ`,
      vitality: `${state.player.maxHp} PV`,
      critChance: `${this.sim.stats.critChance.toFixed(1)}%`,
      critDamage: `${this.sim.stats.critDamage.toFixed(1)}%`,
      moveSpeed: `${this.sim.stats.moveSpeed} vel.`
    }[id]);
    const nextValue = id => ({
      attack: `+2 ATQ · dano comum ${this.sim.stats.basicDamage} → ${this.sim.stats.basicDamage + 2}`,
      vitality: `+10 PV máximos`,
      critChance: `+0,10 ponto percentual`,
      critDamage: `+0,10% no multiplicador crítico`,
      moveSpeed: `+3 de velocidade no mapa`
    }[id]);
    const symbols = {
      attack: '/assets/babel/assets/items/weapons/frontier-sword.png',
      vitality: '/assets/babel/assets/items/artifacts/ember-orb.png',
      critChance: '/assets/babel/assets/items/artifacts/star-orb.png',
      critDamage: '/assets/babel/assets/items/weapons/obsidian-sword.png',
      moveSpeed: '/assets/babel/assets/items/armor/ranger-boots.png'
    };
    const cards = Object.entries(TRAINING_STATS).map(([id, definition]) => {
      const level = state.training[id] || 0;
      const cost = this.sim.trainingCost(id);
      return `<article class="training-card stat-${id}"><div class="training-emblem"><img src="${symbols[id]}" alt=""></div><div class="training-copy"><small>NÍVEL ${level}</small><h3>${escapeHtml(definition.fullName)}</h3><strong>${statValue(id)}</strong><p>${nextValue(id)}</p></div><button type="button" data-train="${id}" ${state.player.gold < cost ? 'class="insufficient"' : ''}><span>Melhorar</span><b>${cost.toLocaleString('pt-BR')} ouro</b></button></article>`;
    }).join('');
    return `<section class="training-hero"><div class="training-avatar ${state.profile.body === 'female' ? 'female' : 'male'}"></div><div><small>NÍVEL DO AVENTUREIRO</small><h3>Nv. ${state.player.level}</h3><p>Dano básico estimado contra inimigo comum: <b>${this.sim.stats.basicDamage}</b></p></div><span><b>${state.player.gold.toLocaleString('pt-BR')}</b><small>OURO</small></span></section><div class="training-list">${cards}</div><button class="secondary-action training-lore" type="button" data-replay-intro>Rever a história do mundo</button>`;
  }

  renderEquipment() {
    const state = this.sim.state;
    const equippedIds = new Set(Object.values(state.equipped).filter(Boolean).map(item => item.instanceId));
    const slots = ['weapon', 'helmet', 'armor', 'pants', 'boots', 'amulet', 'ring'];
    const slotCards = slots.map(slot => {
      const item = state.equipped[slot];
      const label = this.slotLabel(slot);
      return `<div class="loadout-slot slot-${slot} ${item ? 'filled' : 'empty'}" style="--rarity:${item?.color || '#aa8656'}" title="${escapeHtml(item?.name || label)}">${this.gearIcon(slot, item?.icon)}<small>${item ? `Nv.${item.level}` : '+'}</small><span class="sr-only">${escapeHtml(item?.name || `${label} vazio`)}</span></div>`;
    }).join('');
    const activePet = PETS.find(pet => pet.id === state.equippedPetId);
    const petSlot = `<div class="loadout-pet ${activePet ? 'filled' : 'empty'}" style="--pet-image:url('${activePet ? this.petAsset(activePet.id) : ''}');--rarity:${activePet?.color || '#aa8656'}" title="${escapeHtml(activePet?.name || 'Pet vazio')}">${activePet ? '' : this.gearIcon('pet')}<span class="sr-only">${escapeHtml(activePet?.name || 'Nenhum pet equipado')}</span></div>`;
    const ownedPets = PETS.filter(pet => state.pets.includes(pet.id));
    const petCollection = ownedPets.length
      ? ownedPets.map(pet => `<button class="pet-collection-tile ${pet.id === state.equippedPetId ? 'equipped' : ''}" style="--rarity:${pet.color};--pet-image:url('${this.petAsset(pet.id)}')" type="button" data-equip-pet="${pet.id}" aria-label="${escapeHtml(pet.name)}, ${pet.id === state.equippedPetId ? 'ativo' : 'equipar'}"><span></span><strong>${escapeHtml(pet.name)}</strong></button>`).join('')
      : '<div class="empty-state"><img src="/assets/babel/assets/ui/nav/nav-missions-v2.png" alt=""><b>Vazio</b><small>Nv. 5</small></div>';
    const groups = {
      weapon: ['weapon'],
      armor: ['helmet', 'armor', 'pants', 'boots'],
      accessory: ['amulet', 'ring']
    };
    const filteredEntries = state.inventory.map((item, index) => ({ item, index }))
      .filter(({ item }) => (groups[this.equipmentFilter] || []).includes(item.slot));
    const items = filteredEntries.length
      ? filteredEntries.map(({ item, index }) => {
        const stats = this.sim.itemStats(item);
        return `<button class="inventory-tile ${equippedIds.has(item.instanceId) ? 'equipped' : ''}" style="--rarity:${item.color}" type="button" data-equip="${index}" aria-label="${escapeHtml(item.name)}, nível ${item.level}, ${equippedIds.has(item.instanceId) ? 'equipado' : 'equipar'}"><b>T${this.rarityTier(item.rarity)}</b>${this.gearIcon(item.slot, item.icon)}<strong>Nv.${item.level}</strong><small>+${stats.attack} ATQ · +${stats.defense} DEF</small></button>`;
      }).join('')
      : '<div class="empty-state inventory-empty"><img src="/assets/babel/assets/ui/nav/nav-summon-v2.png" alt=""><b>Vazio</b></div>';
    const filters = [
      ['weapon', 'weapon', 'Armas'], ['armor', 'armor', 'Armaduras'], ['accessory', 'amulet', 'Acessórios'], ['pet', 'pet', 'Pets'], ['fusion', 'fusion', 'Fusão']
    ].map(([id, icon, label]) => `<button type="button" data-equipment-filter="${id}" class="${this.equipmentFilter === id ? 'active' : ''}" aria-label="${label}" title="${label}">${this.gearIcon(icon)}</button>`).join('');
    const collection = this.equipmentFilter === 'fusion'
      ? this.renderEquipmentFusion()
      : this.equipmentFilter === 'pet'
      ? `<section class="pet-roster filtered-roster"><header><small>COMPANHEIROS</small><span>Um ativo</span></header><div class="pet-collection-grid">${petCollection}</div></section>`
      : `<section class="inventory-section"><header><div><small>MOCHILA</small><h3>${{ weapon: 'Armas', armor: 'Armaduras', accessory: 'Acessórios' }[this.equipmentFilter]}</h3></div><span>${state.inventory.length}/80</span></header><div class="inventory-grid">${items}</div></section>`;
    const body = state.profile.body === 'female' ? 'female' : 'male';
    const heroSkin = `/assets/babel/assets/characters/hero-${body}.png`;
    const armorLayers = EQUIPMENT_SLOTS.map(slot => {
      const item = state.equipped[slot];
      if (!item?.setId) return '';
      const path = `/assets/babel/assets/characters/equipment/${item.setId}/${body}/${slot}.png`;
      return `<i class="avatar-layer layer-${slot}" style="--layer-skin:url('${path}')"></i>`;
    }).join('');
    const weapon = state.equipped.weapon;
    const avatarWeapon = weapon ? `<img class="avatar-gear avatar-weapon weapon-${weapon.weaponType || 'sword'}" src="${weapon.icon}" alt="">` : '';
    return `<div class="equipment-resources"><span><img src="/assets/babel/assets/ui/currency/coin-v2.png" alt=""><b>${state.player.gold.toLocaleString('pt-BR')}</b></span><span><img src="/assets/babel/assets/ui/currency/gem-v2.png" alt=""><b>${state.player.gems.toLocaleString('pt-BR')}</b></span><span><b>${this.sim.stats.attack}</b>ATQ</span><span><b>${this.sim.stats.defense}</b>DEF</span></div><section class="equipment-stage"><div class="loadout-grid">${slotCards}<div class="equipment-avatar ${body}"><span class="equipment-paperdoll"><i class="avatar-base" style="--hero-skin:url('${heroSkin}')"></i>${armorLayers}</span>${avatarWeapon}<strong>${escapeHtml(this.boot.user?.name || 'Aventureiro')}</strong></div>${petSlot}</div></section><div class="equipment-tabs" role="tablist" aria-label="Filtrar coleção">${filters}</div>${collection}`;
  }

  renderEquipmentFusion() {
    const groups = this.sim.equipmentFusionGroups();
    if (!groups.length) return '<section class="fusion-workshop"><div class="empty-state"><img src="/assets/babel/assets/ui/nav/nav-summon-v2.png" alt=""><b>Sem itens para fundir</b></div></section>';
    const cards = groups.map(group => {
      const preview = group.preview;
      const resultLabel = preview ? (preview.promoted ? preview.rarity : `Nv.${preview.level}`) : 'Máximo';
      const pips = Array.from({ length: 3 }, (_, index) => `<i class="${index < Math.min(group.count, 3) ? 'filled' : ''}"></i>`).join('');
      return `<article class="fusion-card ${group.canFuse ? 'ready' : ''} ${group.maxed ? 'maxed' : ''}" style="--rarity:${group.color};--next-rarity:${preview?.color || group.color}"><div class="fusion-item">${this.gearIcon(group.slot, group.icon)}<span><small>${escapeHtml(this.slotLabel(group.slot))}</small><b>${escapeHtml(group.name)}</b><em>${escapeHtml(group.rarity)} · Nv.${group.level}</em></span></div><div class="fusion-progress"><span>${pips}</span><b>${group.count}/3</b><strong>→ ${escapeHtml(resultLabel)}</strong></div><button type="button" data-fuse-equipment="${escapeHtml(group.id)}" data-fuse-level="${group.level}" data-fuse-rarity="${escapeHtml(group.rarity)}" ${group.canFuse ? '' : 'disabled'}>${group.maxed ? 'Máximo' : 'Fundir'}</button></article>`;
    }).join('');
    return `<section class="fusion-workshop"><header><div><small>FORJA DE FUSÃO</small><h3>Equipamentos</h3></div><span>3 iguais</span></header><div class="fusion-list">${cards}</div></section>`;
  }

  gearIcon(slot, itemIcon = '') {
    const valid = ['weapon', 'helmet', 'armor', 'pants', 'boots', 'amulet', 'ring', 'pet', 'fusion'].includes(slot) ? slot : 'weapon';
    const fallback = {
      weapon: '/assets/babel/assets/items/weapons/frontier-sword.png',
      helmet: '/assets/babel/assets/items/armor/ranger-helmet.png',
      armor: '/assets/babel/assets/items/armor/ranger-armor.png',
      pants: '/assets/babel/assets/items/armor/ranger-pants.png',
      boots: '/assets/babel/assets/items/armor/ranger-boots.png',
      amulet: '/assets/babel/assets/items/artifacts/sun-amulet.png',
      ring: '/assets/babel/assets/items/artifacts/stone-ring.png',
      pet: '/assets/babel/assets/pets/lagarto-de-brasa-v2.png',
      fusion: '/assets/babel/assets/ui/nav/nav-summon-v2.png'
    }[valid];
    return `<img class="gear-icon" src="${itemIcon || fallback}" alt="">`;
  }

  slotLabel(slot) {
    return { weapon: 'Arma', helmet: 'Elmo', armor: 'Peitoral', pants: 'Calça', boots: 'Botas', amulet: 'Amuleto', ring: 'Anel' }[slot] || slot;
  }

  rarityTier(rarity) {
    return { Comum: 1, Incomum: 2, Raro: 3, 'Épico': 4, 'Lendário': 5, 'Relíquia': 6 }[rarity] || 1;
  }

  petAsset(id) {
    return {
      'ember-lizard': '/assets/babel/assets/pets/lagarto-de-brasa-v2.png',
      'dawn-owl': '/assets/babel/assets/pets/coruja-do-alvorecer-v2.png',
      'frontier-fox': '/assets/babel/assets/pets/raposa-da-fronteira-v2.png'
    }[id] || '';
  }

  renderSummon() {
    const state = this.sim.state;
    const categoryCopy = { equipment: 'Equipamentos', skill: 'Habilidades', pet: 'Pets' };
    const unlocks = { equipment: 1, skill: 3, pet: 5 };
    const tabs = Object.entries(categoryCopy).map(([id, name]) => {
      const locked = state.player.level < unlocks[id];
      return `<button type="button" data-summon-category="${id}" class="${this.summonCategory === id ? 'active' : ''} ${locked ? 'locked' : ''}">${name}${locked ? ` · Nv.${unlocks[id]}` : ''}</button>`;
    }).join('');
    const title = categoryCopy[this.summonCategory];
    const locked = state.player.level < unlocks[this.summonCategory];
    const ownedSkills = SKILLS.filter(skill => state.skillsOwned.includes(skill.id));
    const skillCollection = this.summonCategory === 'skill' && ownedSkills.length
      ? `<section class="owned-skills"><small>HABILIDADE ATIVA</small><div>${ownedSkills.map(skill => {
        const best = this.sim.bestSkillCopy(skill.id);
        return `<button type="button" data-equip-skill="${skill.id}" class="${state.equippedSkillId === skill.id ? 'active' : ''}" style="--rarity:${best?.color || skill.color}"><img src="${this.skillAsset(skill.id)}" alt=""><span><b>${escapeHtml(skill.name)}</b><small>${escapeHtml(best?.rarity || skill.rarity)} · Nv.${best?.level || 1}</small></span></button>`;
      }).join('')}</div></section>`
      : '';
    const skillFusion = this.summonCategory === 'skill' ? this.renderSkillFusion() : '';
    return `<section class="summon-screen"><div class="summon-balance"><img src="/assets/babel/assets/ui/currency/gem-v2.png" alt=""><b>${state.player.gems.toLocaleString('pt-BR')}</b></div><div class="summon-tabs">${tabs}</div><div class="summon-altar"><img src="/assets/babel/assets/ui/summon-chest.png" alt=""><div><h3>${title}</h3><b>${locked ? `Nv. ${unlocks[this.summonCategory]}` : `Altar ${Math.floor((state.summoning[this.summonCategory] || 0) / 10) + 1}`}</b></div></div><div class="summon-actions"><button type="button" data-summon="1" ${locked ? 'disabled' : ''}><span>Invocar ×1</span><b><img src="/assets/babel/assets/ui/currency/gem-v2.png" alt="">100</b></button><button type="button" data-summon="10" ${locked ? 'disabled' : ''}><span>Invocar ×10</span><b><img src="/assets/babel/assets/ui/currency/gem-v2.png" alt="">900</b></button></div>${skillCollection}${skillFusion}</section>`;
  }

  renderSkillFusion() {
    const groups = this.sim.skillFusionGroups();
    if (!groups.length) return `<section class="skill-fusion"><header><small>FUSÃO</small><span>3 iguais</span></header><div class="skill-fusion-empty"><img src="/assets/babel/assets/ui/nav-summon-v2.png" alt=""><b>Nenhuma habilidade repetida</b><small>As cópias invocadas aparecerão aqui.</small></div></section>`;
    const cards = groups.map(group => {
      const preview = group.preview;
      const resultLabel = preview ? (preview.promoted ? preview.rarity : `Nv.${preview.level}`) : 'Máximo';
      const pips = Array.from({ length: 3 }, (_, index) => `<i class="${index < Math.min(group.count, 3) ? 'filled' : ''}"></i>`).join('');
      return `<article class="skill-fusion-card ${group.canFuse ? 'ready' : ''}" style="--rarity:${group.color};--next-rarity:${preview?.color || group.color}"><img src="${this.skillAsset(group.id)}" alt=""><div><b>${escapeHtml(group.name)}</b><small>${escapeHtml(group.rarity)} · Nv.${group.level}</small><span>${pips}<em>${group.count}/3</em></span></div><strong>→ ${escapeHtml(resultLabel)}</strong><button type="button" data-fuse-skill="${group.id}" data-fuse-level="${group.level}" data-fuse-rarity="${escapeHtml(group.rarity)}" ${group.canFuse ? '' : 'disabled'}>${group.maxed ? 'Máximo' : 'Fundir'}</button></article>`;
    }).join('');
    return `<section class="skill-fusion"><header><small>FUSÃO</small><span>3 iguais</span></header><div>${cards}</div></section>`;
  }

  renderMissions() {
    const state = this.sim.state;
    const cards = MISSIONS.map(mission => {
      const current = this.sim.missionProgress(mission);
      const completed = current >= mission.target;
      const claimed = state.claimedMissions.includes(mission.id);
      const percent = Math.min(100, current / mission.target * 100);
      return `<article class="mission-card ${completed ? 'complete' : ''} ${claimed ? 'claimed' : ''}"><div class="mission-seal">${claimed ? '✓' : '✦'}</div><div class="mission-copy"><small>MISSÃO DE FRONTEIRA</small><h3>${escapeHtml(mission.name)}</h3><p>${escapeHtml(mission.description)}</p><span class="mission-progress"><i style="width:${percent}%"></i></span><b>${Math.min(current, mission.target).toLocaleString('pt-BR')} / ${mission.target.toLocaleString('pt-BR')}</b></div><button type="button" data-claim-mission="${mission.id}" ${!completed || claimed ? 'disabled' : ''}><span>${claimed ? 'Coletado' : completed ? 'Coletar' : 'Em progresso'}</span><b>◆ ${mission.gems}</b></button></article>`;
    }).join('');
    return `<section class="missions-screen"><div class="missions-summary"><div><small>LOCALIZAÇÃO ATUAL</small><h3>${escapeHtml(state.world.checkpoint)}</h3></div><span><b>◆ ${state.player.gems.toLocaleString('pt-BR')}</b><small>GEMAS</small></span></div><p>Complete marcos da jornada para receber gemas de invocação.</p><div class="mission-list">${cards}</div></section>`;
  }

  showSummonResults(results) {
    const resultAsset = result => result.item?.icon || (result.type === 'skill' ? this.skillAsset(result.id) : this.petAsset(result.id));
    const preview = results.slice(0, 10).map(result => `<span class="summon-result ${result.type}"><img src="${resultAsset(result)}" alt=""><b>${escapeHtml(result.name)}</b><small>${escapeHtml(result.rarity)}${result.duplicate ? ' · repetido' : ''}</small></span>`).join('');
    this.showModal({ iconAsset: resultAsset(results[0]), kicker: 'INVOCAÇÃO CONCLUÍDA', title: results.length === 1 ? results[0].name : `${results.length} fragmentos responderam`, body: `<div class="summon-results">${preview}</div>`, action: 'Guardar' });
  }

  renderGuild() {
    const local = { name: this.boot.user?.name || 'Aventureiro', level: this.sim.state.player.level, power: this.sim.stats.power };
    const players = [local, ...(this.onlineState.players || [])];
    const roster = this.onlineState.connected
      ? players.map(player => `<span><b>${escapeHtml(player.name)}</b><small>Nv. ${Number(player.level) || 1} · ${Number(player.power) || 0} poder</small></span>`).join('')
      : '<p class="locked-copy">Reconectando ao mundo compartilhado…</p>';
    return `<article class="boss-card"><small>MUNDO COMPARTILHADO · ${this.onlineState.count || 0} ONLINE</small><h3>Campos das Fronteiras ao vivo</h3><p>Os aventureiros abaixo estão na mesma região. Movimento, direção, animação, nível e poder são sincronizados em tempo real.</p><div class="online-roster">${roster}</div></article>`;
  }

  showOffline(reward) {
    if (!reward) return;
    this.showModal({ icon: '☾', kicker: 'RECOMPENSA OFFLINE', title: 'A fronteira continuou viva', body: `<p>Seu acampamento trabalhou por ${Math.floor(reward.minutes / 60)}h ${reward.minutes % 60}min na melhor fronteira estável.</p><div class="reward-grid"><span><b>+${reward.gold.toLocaleString('pt-BR')}</b>ouro</span><span><b>+${reward.xp.toLocaleString('pt-BR')}</b>XP</span></div>`, action: 'Coletar' });
  }

  showModal({ iconAsset = '/assets/babel/assets/items/artifacts/tower-idol.png', kicker = 'MARCO DA JORNADA', title, body, action = 'Continuar', onAction = null }) {
    const icon = document.querySelector('#modal-icon img');
    icon.src = iconAsset;
    icon.alt = '';
    document.getElementById('modal-kicker').textContent = kicker;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-action').textContent = action;
    this.modalHandler = onAction;
    this.modal.hidden = false;
  }

  hideModal() {
    this.modal.hidden = true;
    this.modalHandler = null;
  }

  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  addLoot(message) {
    const feed = document.getElementById('loot-feed');
    const row = document.createElement('span');
    row.textContent = message;
    feed.prepend(row);
    while (feed.children.length > 4) feed.lastElementChild.remove();
    setTimeout(() => row.remove(), 4600);
  }

  onSimulationEvent(type, payload) {
    if (type === 'playerAttack') {
      const attack = document.getElementById('attack-button');
      attack.classList.remove('impact');
      void attack.offsetWidth;
      attack.classList.add('impact');
      window.setTimeout(() => attack.classList.remove('impact'), 170);
    }
    if (type === 'autoLocked') this.toast('A batalha automática é liberada no nível 10.');
    if (type === 'autoUnlocked') this.showModal({ kicker: 'NÍVEL 10 · SISTEMA DESBLOQUEADO', title: 'Batalha automática', body: '<p>Agora o aventureiro pode caminhar sozinho até o próximo inimigo, entrar no alcance correto e continuar lutando pelo mapa.</p>', action: 'Ativar quando quiser' });
    if (type === 'bossUnlocked') this.showModal({ icon: '◆', kicker: 'PORTÃO DO NORTE', title: payload.name, body: '<p>A corrupção violeta abriu o caminho para a arena. Melhore sua build ou siga ao norte para enfrentar o boss da região.</p>', action: 'Preparar' });
    if (type === 'regionComplete') this.showModal({ icon: '♜', kicker: 'REGIÃO CONCLUÍDA', title: 'A fronteira foi libertada', body: '<p>O Senhor das Estacas caiu. O caminho para a Floresta das Vozes foi aberto e a recompensa do desafio foi registrada.</p>', action: 'Continuar explorando' });
    if (type === 'playerDefeated') this.showModal({ kicker: 'RETORNO AO PONTO SEGURO', title: 'A jornada continua', body: `<p>${escapeHtml(payload.enemy)} venceu este confronto. Você voltou ao último acampamento sem perder recursos.</p>`, action: 'Continuar' });
    if (type === 'levelUp') this.showModal({ kicker: 'NOVO NÍVEL', title: `Nível ${payload.level}`, body: `<p>Vida recuperada e atributos fortalecidos.</p><div class="reward-grid"><span><b>+${payload.gems || 25}</b>gemas de invocação</span><span><b>${this.sim.state.player.xp}/${this.sim.state.player.xpNext}</b>XP para o próximo</span></div>`, action: 'Continuar' });
    if (type === 'enemyDefeated') this.addLoot(`+${payload.gold} ouro · +${payload.xp} XP`);
    if (type === 'itemEquipped') {
      this.renderProfileAvatar();
      this.toast(`${payload.item.name} equipado.`);
    }
    if (type === 'petEquipped') this.toast(`${payload.pet.name} agora acompanha você.`);
    if (type === 'skillEquipped') this.toast(`${payload.skill.name} está ativa no HUD.`);
    if (type === 'equipmentFused') {
      this.renderProfileAvatar();
      this.toast(payload.promoted ? `${payload.item.name} avançou para ${payload.item.rarity}.` : `${payload.item.name} chegou ao nível ${payload.item.level}.`);
    }
    if (type === 'skillFused') this.toast(payload.promoted ? `${payload.skill.name} avançou para ${payload.copy.rarity}.` : `${payload.skill.name} chegou ao nível ${payload.copy.level}.`);
    if (type === 'fusionInsufficient') this.toast('São necessárias 3 cópias idênticas do mesmo nível e raridade.');
    if (type === 'fusionMax') this.toast('Este item já atingiu o nível máximo da raridade final.');
    if (type === 'trainingUpgraded') this.toast('Atributo aprimorado com sucesso.');
    if (type === 'goldInsufficient') this.toast(`Ouro insuficiente. Custo: ${payload.cost.toLocaleString('pt-BR')}.`);
    if (type === 'summonInsufficient') this.toast(`Você precisa de ${payload.cost} gemas para esta invocação.`);
    if (type === 'summonLocked') this.toast(`Esta invocação é liberada no nível ${payload.level}.`);
    if (type === 'missionClaimed') this.toast(`Missão concluída: +${payload.gems} gemas.`);
    if (type === 'gemsEarned') this.addLoot(`◆ +${payload.gems} gemas · ${payload.source}`);
    if (type === 'bossPhase') this.toast('Fase 2: as correntes se romperam!');
    if (type === 'regionChanged') this.toast(`Você entrou em ${payload.region.name}.`);
    if (type === 'enemyAttack') {
      const chip = document.getElementById('profile-chip');
      chip.classList.remove('hp-hit');
      void chip.offsetWidth;
      chip.classList.add('hp-hit');
      window.setTimeout(() => chip.classList.remove('hp-hit'), 260);
      this.addLoot(`-${payload.damage} PV`);
    }
  }
}
