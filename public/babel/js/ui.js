import { ENCOUNTERS, SKILLS, WEAPONS } from './content.js';

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
    this.selectedWeapon = null;
    this.currentPanel = null;
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
    const avatar = document.getElementById('profile-avatar');
    const name = this.boot.user?.name || 'Aventureiro';
    document.getElementById('profile-name').textContent = name;
    if (this.boot.user?.avatarData) {
      const image = new Image();
      image.alt = name;
      image.src = this.boot.user.avatarData;
      avatar.replaceChildren(image);
    } else {
      avatar.textContent = name.slice(0, 2).toUpperCase();
    }
    document.getElementById('profile-chip').addEventListener('click', () => this.openPanel('journey'));
  }

  bindControls() {
    document.getElementById('auto-button').addEventListener('click', () => this.sim.toggleAuto());
    document.getElementById('speed-button').addEventListener('click', () => this.sim.toggleSpeed());
    document.getElementById('pause-button').addEventListener('click', () => this.openPause());
    document.getElementById('ultimate-button').addEventListener('click', () => {
      if (!this.sim.activateUltimate()) this.toast(this.sim.state.player.energy < 100 ? 'A ultimate ainda está carregando.' : 'Aproxime-se de um inimigo.');
    });
    document.querySelectorAll('.skill').forEach(button => button.addEventListener('click', () => {
      const skill = SKILLS.find(item => item.id === button.dataset.skill);
      if (skill) this.toast(`${skill.name}: ${skill.description}`);
    }));
    document.querySelectorAll('.game-nav button').forEach(button => button.addEventListener('click', () => {
      const panel = button.dataset.panel;
      document.querySelectorAll('.game-nav button').forEach(item => item.classList.toggle('active', item === button));
      if (panel === 'journey') this.closeDrawer();
      else this.openPanel(panel);
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
    intro.hidden = this.sim.state.profile.created;
    intro.querySelectorAll('[data-body]').forEach(button => button.addEventListener('click', () => {
      this.selectedBody = button.dataset.body;
      intro.querySelectorAll('[data-body]').forEach(item => item.classList.toggle('selected', item === button));
      this.updateStartButton();
    }));
    intro.querySelectorAll('[data-weapon]').forEach(button => button.addEventListener('click', () => {
      this.selectedWeapon = button.dataset.weapon;
      intro.querySelectorAll('[data-weapon]').forEach(item => item.classList.toggle('selected', item === button));
      this.updateStartButton();
    }));
    document.getElementById('start-journey').addEventListener('click', () => {
      if (!this.selectedBody || !this.selectedWeapon) return;
      this.sim.startJourney(this.selectedBody, this.selectedWeapon);
      intro.hidden = true;
      this.showModal({ icon: '⌁', kicker: 'OBJETIVO INICIAL', title: 'Entre na Grande Estrada', body: '<p>Use o controle para caminhar em quatro direções. Aproxime-se dos saqueadores e o ataque básico começará automaticamente.</p>', action: 'Começar' });
    });
  }

  updateStartButton() {
    document.getElementById('start-journey').disabled = !(this.selectedBody && this.selectedWeapon);
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
      knob.style.transform = 'translate(-50%, -50%)';
    };
    joystick.addEventListener('pointerdown', event => {
      joystick.setPointerCapture(event.pointerId);
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
    document.getElementById('region-fill').style.width = `${state.world.progress}%`;
    document.getElementById('region-status').textContent = this.regionStatus();
    const autoButton = document.getElementById('auto-button');
    autoButton.disabled = !state.systems.autoUnlocked;
    autoButton.setAttribute('aria-pressed', String(state.systems.autoEnabled));
    document.getElementById('speed-value').textContent = `${state.systems.speed}×`;
    document.getElementById('ultimate-value').textContent = `${Math.round(player.energy)}%`;
    document.getElementById('ultimate-button').classList.toggle('ready', player.energy >= 100);
    document.getElementById('inventory-badge').hidden = state.inventory.length === 0;
    for (const skill of SKILLS) {
      const button = document.querySelector(`[data-skill="${skill.id}"]`);
      if (!button) continue;
      const remaining = this.sim.skillTimers[skill.id] || 0;
      button.querySelector('em').style.height = `${Math.min(100, remaining / skill.cooldown * 100)}%`;
    }
  }

  regionStatus() {
    const state = this.sim.state;
    const boss = this.sim.enemies.find(enemy => enemy.boss && enemy.alive);
    if (boss) return `${boss.name} · ${Math.ceil(boss.currentHp / boss.maxHp * 100)}%`;
    if (state.world.bossDefeated) return 'Fronteira libertada';
    if (state.world.bossUnlocked) return 'O portão do boss está aberto';
    const defeated = state.world.defeatedIds.length;
    if (defeated < 3) return 'Explore e vença os saqueadores';
    if (defeated < 5) return 'Alcance o waypoint antigo';
    return 'Siga o brilho violeta ao norte';
  }

  openPanel(panel) {
    const renderers = {
      journey: () => this.renderJourney(),
      equipment: () => this.renderEquipment(),
      skills: () => this.renderSkills(),
      companion: () => this.renderCompanion(),
      guild: () => this.renderGuild()
    };
    const titles = {
      journey: ['PERFIL DA CONTA', 'Aventureiro da Estrada'],
      equipment: ['FORJA DE CAMPO', 'Equipamento'],
      skills: ['LOADOUT ATIVO', 'Habilidades'],
      companion: ['COMPANHEIRO ATIVO', 'Lagarto de Brasa'],
      guild: ['SISTEMA ONLINE', 'Companhia de Expedição']
    };
    const [kicker, title] = titles[panel] || titles.journey;
    this.currentPanel = panel;
    document.getElementById('drawer-kicker').textContent = kicker;
    document.getElementById('drawer-title').textContent = title;
    this.drawerContent.innerHTML = (renderers[panel] || renderers.journey)();
    this.drawer.hidden = false;
    this.sim.setPaused(true);
    this.bindPanelActions(panel);
  }

  bindPanelActions(panel) {
    if (panel === 'equipment') {
      this.drawerContent.querySelectorAll('[data-equip]').forEach(button => button.addEventListener('click', () => {
        this.sim.equipItem(Number(button.dataset.equip));
        this.drawerContent.innerHTML = this.renderEquipment();
        this.bindPanelActions('equipment');
      }));
    }
    const challenge = this.drawerContent.querySelector('[data-challenge-boss]');
    if (challenge) challenge.addEventListener('click', () => {
      const boss = ENCOUNTERS.find(item => item.boss);
      this.closeDrawer();
      this.sim.setMoveTarget(boss.x, boss.y + 125);
    });
  }

  closeDrawer() {
    this.drawer.hidden = true;
    this.currentPanel = null;
    document.querySelectorAll('.game-nav button').forEach(button => {
      button.classList.toggle('active', button.dataset.panel === 'journey');
    });
    if (this.modal.hidden) this.sim.setPaused(false);
  }

  renderJourney() {
    const state = this.sim.state;
    const weapon = WEAPONS[state.profile.weapon];
    const objective = state.world.bossDefeated ? 'A primeira região foi concluída.' : state.world.bossUnlocked ? 'O Senhor das Estacas bloqueia a passagem ao norte.' : 'Atravessar os Campos das Fronteiras e abrir o portão do norte.';
    return `<p class="panel-lead">Este é o perfil <strong>${escapeHtml(this.boot.user?.name)}</strong> conectado ao Game Hub. Seu corpo de jornada, build e save ficam ligados a essa conta.</p>
      <div class="resource-row"><span><b>${state.player.gold.toLocaleString('pt-BR')}</b>ouro</span><span><b>${state.player.gems.toLocaleString('pt-BR')}</b>gemas</span><span><b>${Math.round(state.world.progress)}%</b>região</span></div>
      <article class="boss-card"><small>OBJETIVO ATUAL</small><h3>${escapeHtml(objective)}</h3><p>Arma: ${escapeHtml(weapon.name)} · ${this.sim.stats.attack} ataque · ${this.sim.stats.defense} defesa</p>${state.world.bossUnlocked && !state.world.bossDefeated ? '<button class="primary-action" data-challenge-boss>Desafiar boss</button>' : ''}</article>`;
  }

  renderEquipment() {
    const state = this.sim.state;
    const equippedIds = new Set(Object.values(state.equipped).filter(Boolean).map(item => item.instanceId));
    const items = state.inventory.length ? state.inventory.map((item, index) => `<article class="item-card ${equippedIds.has(item.instanceId) ? 'equipped' : ''}" style="--rarity:${item.color}"><div><small>${escapeHtml(item.rarity)} · ${escapeHtml(item.slot)}</small><strong>${escapeHtml(item.name)}</strong><small>+${item.attack || 0} ataque · +${item.defense || 0} defesa · Nv. ${item.level}</small></div><button type="button" data-equip="${index}">${equippedIds.has(item.instanceId) ? 'Equipado' : 'Equipar'}</button></article>`).join('') : '<p class="locked-copy">Os primeiros inimigos deixam equipamentos. Caminhe até a estrada e lute para encontrar seu primeiro item.</p>';
    return `<div class="resource-row"><span><b>${state.player.gold.toLocaleString('pt-BR')}</b>ouro</span><span><b>${this.sim.stats.attack}</b>ataque</span><span><b>${this.sim.stats.defense}</b>defesa</span></div><div class="item-list">${items}</div>`;
  }

  renderSkills() {
    return `<p class="panel-lead">Quatro habilidades automáticas são verificadas por prioridade, cooldown e condição. A ultimate continua sob seu controle.</p><div class="skill-list">${SKILLS.map(skill => `<article class="skill-card"><i>${{ guard: '✦', cleave: '↯', rend: '⚔', shard: '◆' }[skill.id]}</i><div><strong>${escapeHtml(skill.name)}</strong><p>${escapeHtml(skill.description)}</p></div><b>Prioridade ${skill.priority}<br>${skill.cooldown}s</b></article>`).join('')}</div>`;
  }

  renderCompanion() {
    if (!this.sim.state.systems.companionUnlocked) return '<div class="companion-portrait" style="filter:grayscale(1) brightness(.35)"></div><p class="locked-copy">Algo pequeno observa sua jornada. Alcance o waypoint central para conquistar a confiança do primeiro companheiro.</p>';
    return '<div class="companion-portrait"></div><article class="companion-card"><small>ATACANTE · ATIVO</small><h3>Lagarto de Brasa</h3><p>Dispara uma mordida cristalina a cada poucos segundos e fortalece o ritmo do farm. Ele acompanha o aventureiro no próprio mapa.</p></article>';
  }

  renderGuild() {
    const local = { name: this.boot.user?.name || 'Aventureiro', level: this.sim.state.player.level, power: this.sim.stats.power };
    const players = [local, ...(this.onlineState.players || [])];
    const roster = this.onlineState.connected
      ? players.map(player => `<span><b>${escapeHtml(player.name)}</b><small>Nv. ${Number(player.level) || 1} · ${Number(player.power) || 0} poder</small></span>`).join('')
      : '<p class="locked-copy">Reconectando ao mundo compartilhado…</p>';
    return `<article class="boss-card"><small>MUNDO COMPARTILHADO · ${this.onlineState.count || 0} ONLINE</small><h3>Campos das Fronteiras ao vivo</h3><p>Os aventureiros abaixo estão na mesma região. Movimento, direção, animação, nível e poder são sincronizados em tempo real.</p><div class="online-roster">${roster}</div></article>`;
  }

  openPause() {
    this.showModal({
      icon: 'Ⅱ',
      kicker: 'JORNADA PAUSADA',
      title: 'Respire no caminho',
      body: '<p>Seu progresso está salvo na conta. Você pode continuar agora ou voltar ao Game Hub.</p><a href="/" class="primary-action" style="display:block;text-decoration:none">Voltar ao hub</a>',
      action: 'Continuar',
      onAction: () => this.sim.setPaused(false)
    });
  }

  showOffline(reward) {
    if (!reward) return;
    this.showModal({ icon: '☾', kicker: 'RECOMPENSA OFFLINE', title: 'A fronteira continuou viva', body: `<p>Seu acampamento trabalhou por ${Math.floor(reward.minutes / 60)}h ${reward.minutes % 60}min na melhor fronteira estável.</p><div class="reward-grid"><span><b>+${reward.gold.toLocaleString('pt-BR')}</b>ouro</span><span><b>+${reward.xp.toLocaleString('pt-BR')}</b>XP</span></div>`, action: 'Coletar' });
  }

  showModal({ icon = '✦', kicker = 'MARCO DA JORNADA', title, body, action = 'Continuar', onAction = null }) {
    document.getElementById('modal-icon').textContent = icon;
    document.getElementById('modal-kicker').textContent = kicker;
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-action').textContent = action;
    this.modalHandler = onAction;
    this.modal.hidden = false;
    this.sim.setPaused(true);
  }

  hideModal() {
    this.modal.hidden = true;
    this.modalHandler = null;
    if (this.drawer.hidden) this.sim.setPaused(false);
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
    if (type === 'autoLocked') this.toast('O combate automático é liberado após os primeiros confrontos.');
    if (type === 'autoUnlocked') this.showModal({ icon: '✦', kicker: 'SISTEMA DESBLOQUEADO', title: 'Auto battle', body: '<p>Você aprendeu o ritmo da estrada. Ative AUTO para buscar o próximo inimigo e lutar sem manter o controle pressionado. É possível desligá-lo a qualquer momento.</p>', action: 'Entendi' });
    if (type === 'companionUnlocked') this.showModal({ icon: '♞', kicker: 'NOVO COMPANHEIRO', title: 'Lagarto de Brasa', body: '<p>O pequeno coletor de cristais decidiu seguir você. Ele aparece no mapa e ataca alvos próximos automaticamente.</p>', action: 'Adotar' });
    if (type === 'bossUnlocked') this.showModal({ icon: '◆', kicker: 'PORTÃO DO NORTE', title: payload.name, body: '<p>A corrupção violeta abriu o caminho para a arena. Melhore sua build ou siga ao norte para enfrentar o boss da região.</p>', action: 'Preparar' });
    if (type === 'regionComplete') this.showModal({ icon: '♜', kicker: 'REGIÃO CONCLUÍDA', title: 'A fronteira foi libertada', body: '<p>O Senhor das Estacas caiu. O caminho para a Floresta das Vozes foi aberto e 20 gemas foram registradas em sua conta.</p>', action: 'Continuar explorando' });
    if (type === 'playerDefeated') this.showModal({ icon: '✚', kicker: 'RETORNO À FRONTEIRA', title: 'A build não resistiu', body: `<p>${escapeHtml(payload.enemy)} venceu este confronto. Você voltou ao acampamento sem perder recursos. Equipe o loot obtido e tente novamente.</p>`, action: 'Reorganizar' });
    if (type === 'levelUp') this.toast(`Nível ${payload.level}! Vida, ataque e defesa aumentaram.`);
    if (type === 'loot') this.addLoot(`${payload.item.rarity}: ${payload.item.name}`);
    if (type === 'enemyDefeated') this.addLoot(`+${payload.gold} ouro · +${payload.xp} XP`);
    if (type === 'itemEquipped') this.toast(`${payload.item.name} equipado.`);
    if (type === 'bossPhase') this.toast('Fase 2: as correntes se romperam!');
  }
}
