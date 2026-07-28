/* Tower Defense - BattleScene: loop central do tower defense.
   Arcade Physics + pooling + audio + pausa real + velocidade 2x + teclado (PC)
   + selecao/venda de torre + aura de suporte + upgrades de fragmento aplicados. */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;
  const SAVE = global.GuardioesSave;
  const AUDIO = global.GuardioesAudio;

  const BASE_START_HP = 24;
  const BASE_START_MONEY = 120;
  const BASE_BUY_COST = 45;
  const BUY_COST_INCREMENT = 7;
  const ARRIVAL_THRESHOLD = 12;
  const TEXT_POOL_SIZE = 28;
  const PROJECTILE_POOL_SIZE = 60;
  const SELL_REFUND = 0.7;
  const TARGETING_MODES = ['first', 'strong', 'close'];
  const TARGETING_LABELS = { first: 'Primeiro', strong: 'Mais Forte', close: 'Mais Perto' };
  const TOWER_DISPLAY_SIZES = {
    spearman: 136, archer: 132, 'burning-oil': 130,
    barbarian: 146, slinger: 138, shieldbearer: 148,
    zealot: 142, priest: 136, 'fire-archer': 138
  };
  const ENEMY_DISPLAY_SIZES = { runner: 86, raider: 96, flyer: 94, shield: 106, healer: 104, ram: 122, boss: 156 };
  const HEAL_TICK_MS = 1500;
  const HP_BAR_HEIGHT = 5;
  const TOP_HUD_SAFE_Y = 150;
  const BOTTOM_COMMAND_SAFE_Y = 1130;
  const SLOT_SNAP_RADIUS = 54;

  class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    init(data) {
      this.wantsResume = Boolean(data.resume);
      this.loadout = data.loadout || [];
      this.levelIndex = typeof data.levelIndex === 'number' ? data.levelIndex : 0;
    }

    create() {
      const state = this.registry.get('state');
      this.state = state;
      this.effects = this.computeClassEffects();
      this.paused = false;
      this.runEnded = false;
      this.battleTime = 0;      // relogio proprio, escala com gameSpeed
      this.gameSpeed = 1;
      this._hitStopActive = false;
      this.selectedTower = null;
      this.towerPanel = null;
      this.pauseOverlay = null;
      this.dragCandidate = null;
      this.placementSlots = [];

      const run = state.run && state.run.active ? state.run : null;
      const runtimeLayout = this.runtime().layout;
      const isResume = Boolean(this.wantsResume && run && (run.layout ? run.layout === runtimeLayout : runtimeLayout === 'mobile'));

      this.rngSeed = (run && run.randomSeed) || SAVE.randomSeed();
      this.rng = SAVE.mulberry32(this.rngSeed);

      if (isResume) {
        this.levelIndex = typeof run.levelIndex === 'number' ? run.levelIndex : this.levelIndex;
        this.loadout = run.loadout || this.loadout;
        this.archiveHp = run.hp;
        this.maxArchiveHp = run.maxHp || BASE_START_HP;
        this.money = run.money;
        this.buyCost = run.buyCost;
        this.buyCount = run.buyCount || 0;
        this.waveIndex = run.wave || 0;
      } else {
        this.archiveHp = BASE_START_HP;
        this.maxArchiveHp = BASE_START_HP;
        this.money = BASE_START_MONEY;
        this.buyCost = Math.round(BASE_BUY_COST * (1 + (this.effects.buyCostMult || 0)));
        this.buyCount = 0;
        this.waveIndex = 0;
      }

      this.level = D.LEVELS[Math.min(this.levelIndex, D.LEVELS.length - 1)];
      this.arenaPath = this.buildArenaPath();
      this.held = null;
      this.towers = [];
      this.enemies = [];
      this.enemySpawnSerial = 0;
      this.waveActive = false;
      this.spawnTimers = [];

      this.buildPhysicsGroups();
      this.buildTextPool();
      this.buildMap();
      this.buildHud();
      this.buildBuyArea();
      this.bindKeyboard();
      this.input.on('pointerdown', (p, over) => this.onPointerDown(p, over));
      this.input.on('pointerup', (p, over) => this.onPointerUp(p, over));
      this.input.on('pointerupoutside', p => this.onPointerUp(p, []));
      this.physics.add.overlap(this.projectileGroup, this.enemyGroup, (proj, enemySprite) => this.onProjectileHitEnemy(proj, enemySprite));

      if (isResume && run.towers) {
        run.towers.forEach(t => this.placeTower(t.defenseId, t.level, t.x, t.y, true, t.targeting, t.guardHp));
      }

      this.tutorialStep = 0;
      if (this.levelIndex === 0 && !state.stats.tutorialDone && !isResume) this.startTutorial();

      this.persistRunSnapshot();
    }

    // ---------- tutorial da primeira partida ----------
    startTutorial() {
      this.tutorialStep = 1;
      const y = this.scale.height - (this.isDesktopLayout() ? 166 : 174);
      this.tutorialPanel = this.add.image(this.scale.width / 2, y, this.textures.exists('tex-ui-hud-clean') ? 'tex-ui-hud-clean' : 'tex-stone-panel')
        .setDisplaySize(this.isDesktopLayout() ? 660 : 570, 68).setDepth(649);
      this.tutorialText = this.add.text(this.scale.width / 2, y, '', {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#ffe9a8', fontStyle: 'bold',
        align: 'center', wordWrap: { width: this.isDesktopLayout() ? 570 : 500 }
      }).setOrigin(0.5).setDepth(650);
      this.tweens.add({ targets: this.tutorialText, alpha: 0.72, duration: 600, yoyo: true, repeat: -1 });
      this.setTutorialHint('GERAR ALIADO sorteia uma unidade da sua formação');
    }

    setTutorialHint(msg) {
      if (this.tutorialText) this.tutorialText.setText(msg);
    }

    setTutorialVisible(visible) {
      if (this.tutorialPanel) this.tutorialPanel.setVisible(visible);
      if (this.tutorialText) this.tutorialText.setVisible(visible);
    }

    advanceTutorial(fromStep) {
      if (this.tutorialStep !== fromStep) return;
      this.tutorialStep = fromStep + 1;
      if (this.tutorialStep === 2) {
        const heldDef = this.held && D.DEFENSES[this.held.defenseId];
        this.setTutorialHint(heldDef && heldDef.onPath
          ? 'Armadilhas devem ficar EM CIMA do caminho'
          : 'Agora toque num espaço livre FORA do caminho pra posicionar');
      } else if (this.tutorialStep === 3) {
        this.setTutorialHint('Defesa no lugar! Toque em "Iniciar Onda" pra começar o ataque');
      } else {
        if (this.tutorialText) { this.tutorialText.destroy(); this.tutorialText = null; }
        if (this.tutorialPanel) { this.tutorialPanel.destroy(); this.tutorialPanel = null; }
        this.tutorialStep = 0;
        this.state.stats.tutorialDone = true;
        SAVE.save(this.state);
      }
    }

    // ---------- classe / efeitos ----------
    computeClassEffects() {
      const state = this.registry.get('state') || this.state;
      const classId = D.CLASSES[state.profile.selectedClass] ? state.profile.selectedClass : D.CLASS_ORDER[0];
      return Object.assign({}, D.CLASSES[classId].effect);
    }

    // Upgrades de fragmento (Colecao) aplicados de verdade em batalha.
    // Cada nivel de upgrade vale +8% no atributo (Estrategista amplia via upgradeEffectMult).
    towerStat(defenseId, stat) {
      const def = D.DEFENSES[defenseId];
      const base = def[stat];
      if (base === undefined) return base;
      const entry = this.state.collection[defenseId] || {};
      const upg = (entry.upgrades || {})[stat] || 0;
      if (!upg) return base;
      const eff = 1 + (this.effects.upgradeEffectMult || 0);
      if (stat === 'rate') return base * Math.max(0.5, 1 - 0.06 * upg * eff);     // recarga menor = melhor
      if (stat === 'pierce') return base + Math.floor(upg / 2);
      if (stat === 'slowFactor') return Math.min(0.96, base + 0.04 * upg * eff);
      return base * (1 + 0.08 * upg * eff);
    }

    // ---------- fisica / pooling ----------
    buildPhysicsGroups() {
      this.enemyGroup = this.physics.add.group();
      this.projectileGroup = this.physics.add.group({ maxSize: PROJECTILE_POOL_SIZE });
    }

    buildTextPool() {
      this.textPool = [];
      this.textPoolCursor = 0;
      for (let i = 0; i < TEXT_POOL_SIZE; i++) {
        const t = this.add.text(-999, -999, '', { fontFamily: 'Georgia, serif', fontSize: '22px', fontStyle: 'bold' }).setOrigin(0.5).setDepth(500).setVisible(false);
        this.textPool.push(t);
      }
    }

    floatText(x, y, msg, color) {
      const t = this.textPool[this.textPoolCursor];
      this.textPoolCursor = (this.textPoolCursor + 1) % this.textPool.length;
      this.tweens.killTweensOf(t);
      t.setText(msg).setColor(color || '#ffe9a8').setPosition(x, y).setAlpha(1).setVisible(true);
      this.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.setVisible(false) });
    }

    // ---------- velocidade ----------
    setGameSpeed(speed) {
      this.gameSpeed = speed;
      if (!this.paused) this.physics.world.timeScale = 1 / speed;  // Arcade: >1 = mais lento
      this.time.timeScale = speed;                                  // timers de spawn
      this.tweens.timeScale = speed;                                 // efeitos acompanham
      if (this.speedBtn) UI.setButtonLabel(this.speedBtn, speed === 1 ? '1x' : '2x');
    }

    toggleGameSpeed() { this.setGameSpeed(this.gameSpeed === 1 ? 2 : 1); }

    toggleAutoWave() {
      this.autoWave = !this.autoWave;
      UI.setButtonLabel(this.autoBtn, this.autoWave ? 'Auto ON' : 'Auto OFF');
      const label = this.autoBtn.list && this.autoBtn.list[1];
      label.setColor(this.autoWave ? '#8ff0ad' : '#d6c38f');
      if (this.autoWave && !this.waveActive && !this.runEnded) this.startNextWave();
    }

    // Hit-stop: congela a fisica por alguns ms REAIS pra vender o impacto (game-feel).
    hitStop(ms) {
      if (this._hitStopActive || this.paused || this.runEnded) return;
      this._hitStopActive = true;
      this.physics.world.timeScale = 1000;
      window.setTimeout(() => {
        this._hitStopActive = false;
        if (!this.paused && !this.runEnded) this.physics.world.timeScale = 1 / this.gameSpeed;
      }, ms || 90);
    }

    // ---------- teclado (PC) ----------
    bindKeyboard() {
      if (!this.input.keyboard) return;
      this.input.keyboard.on('keydown-SPACE', () => this.generateTower());
      this.input.keyboard.on('keydown-W', () => this.startNextWave());
      this.input.keyboard.on('keydown-X', () => this.cancelHeld());
      this.input.keyboard.on('keydown-A', () => this.toggleAutoWave());
      this.input.keyboard.on('keydown-ONE', () => this.setGameSpeed(1));
      this.input.keyboard.on('keydown-TWO', () => this.setGameSpeed(2));
      this.input.keyboard.on('keydown-M', () => {
        const muted = AUDIO.toggleMuted();
        if (this.muteBtn) this.muteBtn.setText(muted ? '🔇' : '🔊');
      });
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.paused && this.pauseOverlay) this.closePauseMenu(this.pauseOverlay);
        else this.openPauseMenu();
      });
    }

    runtime() {
      return global.GuardioesRuntime || {
        layout: 'mobile',
        isDesktop: false,
        width: D.MAP.width,
        height: D.MAP.height
      };
    }

    isDesktopLayout() {
      return this.runtime().isDesktop;
    }

    safeArea() {
      const { width, height } = this.scale;
      if (this.isDesktopLayout()) {
        return { top: 124, bottom: height - 142, left: 36, right: width - 36, commandY: height - 72 };
      }
      return { top: TOP_HUD_SAFE_Y, bottom: BOTTOM_COMMAND_SAFE_Y, left: 20, right: width - 20, commandY: height - 74 };
    }

    buildArenaPath() {
      const { width, height } = this.scale;
      const source = this.isDesktopLayout() && this.level.desktopPath ? this.level.desktopPath : this.level.path;
      const points = source.map(point => this.isDesktopLayout()
        ? new Phaser.Math.Vector2(point.x * width / 1920, point.y * height / 1080)
        : new Phaser.Math.Vector2(point.x, point.y));
      const spline = new Phaser.Curves.Spline(points);
      return spline.getSpacedPoints(this.isDesktopLayout() ? 180 : 130).map(point => ({ x: point.x, y: point.y }));
    }

    // ---------- mapa ----------
    buildMap() {
      const { width, height } = this.scale;
      this.add.rectangle(0, 0, width, height, 0x20321d).setOrigin(0);
      const mapKey = this.mapTextureKey();
      if (mapKey && this.textures.exists(mapKey)) {
        this.addCoverImage(mapKey, width / 2, height / 2, width, height).setDepth(0);
      } else {
        const bg = this.add.graphics().setDepth(0);
        this.drawArenaGround(bg, width, height);
        this.drawNaturalRoad(bg, this.arenaPath);
        this.drawProtectedObjective(bg, width, height);
      }
      this.placementSlots = [];
    }

    mapTextureKey() {
      const suffix = this.isDesktopLayout() ? '-desktop' : '';
      const key = `tex-map-${this.level.id}${suffix}`;
      if (this.textures.exists(key)) return key;
      return this.textures.exists(`tex-map-${this.level.id}`) ? `tex-map-${this.level.id}` : null;
    }

    addCoverImage(key, x, y, targetW, targetH) {
      const img = this.add.image(x, y, key);
      const tex = this.textures.get(key).getSourceImage();
      const scale = Math.max(targetW / tex.width, targetH / tex.height);
      img.setScale(scale);
      return img;
    }

    drawArenaGround(g, width, height) {
      g.fillStyle(0x263d22, 1);
      g.fillRect(0, 0, width, height);
      g.fillStyle(0x365d2b, 0.95);
      for (let i = 0; i < 140; i++) {
        const x = (i * 137 + this.levelIndex * 53) % width;
        const y = (i * 211 + this.levelIndex * 97) % height;
        const r = 12 + (i % 5) * 5;
        g.fillEllipse(x, y, r * 1.9, r);
      }
      g.fillStyle(0x5f6f4b, 0.85);
      for (let i = 0; i < 60; i++) {
        const x = (i * 173 + 31) % width;
        const y = (i * 149 + 89) % height;
        g.fillEllipse(x, y, 18 + (i % 4) * 5, 9 + (i % 3) * 3);
      }
      const safe = this.safeArea();
      g.fillStyle(0x5c3d2a, 0.7);
      g.fillRect(0, 0, width, safe.top - 12);
      g.fillRect(0, safe.bottom - 8, width, height - safe.bottom + 8);
    }

    drawNaturalRoad(g, path) {
      this.strokePath(g, path, 136, 0x3b2b1d, 0.55);
      this.strokePath(g, path, 122, 0x705135, 1);
      this.strokePath(g, path, 102, 0xba9259, 1);
      this.strokePath(g, path, 76, 0xd0aa6b, 0.95);
      this.strokePath(g, path, 8, 0x8c6b43, 0.28);
      g.fillStyle(0xf0cf8a, 0.22);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        for (let s = 0; s <= 5; s++) {
          const t = (s + 0.35) / 6;
          const x = Phaser.Math.Linear(a.x, b.x, t);
          const y = Phaser.Math.Linear(a.y, b.y, t);
          g.fillEllipse(x + ((i + s) % 3 - 1) * 18, y + ((i + s * 2) % 3 - 1) * 9, 34, 13);
        }
      }
    }

    strokePath(g, path, width, color, alpha) {
      g.lineStyle(width, color, alpha);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
      g.strokePath();
    }

    drawProtectedObjective(g, width, height) {
      const end = this.arenaPath[this.arenaPath.length - 1];
      const y = Math.min(height - 106, end.y - 72);
      g.fillStyle(0x1a2434, 1);
      g.fillRoundedRect(width / 2 - 90, y - 34, 180, 74, 10);
      g.lineStyle(5, 0xd8b24a, 0.95);
      g.strokeRoundedRect(width / 2 - 90, y - 34, 180, 74, 10);
      g.fillStyle(0x46b9ff, 0.35);
      g.fillCircle(width / 2, y - 26, 30);
      g.fillStyle(0x9be7ff, 1);
      g.fillTriangle(width / 2, y - 72, width / 2 - 22, y - 20, width / 2 + 22, y - 20);
      g.fillStyle(0xeef9ff, 0.65);
      g.fillTriangle(width / 2 + 4, y - 62, width / 2 - 4, y - 24, width / 2 + 16, y - 24);
    }

    createPlacementSlots() {
      const slots = [];
      const path = this.arenaPath;
      const safe = this.safeArea();
      const offset = this.isDesktopLayout() ? 96 : 128;
      const minGap = this.isDesktopLayout() ? 112 : 128;
      for (let i = 1; i < path.length - 1; i++) {
        const prev = path[i - 1], p = path[i], next = path[i + 1];
        const dx = next.x - prev.x;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        [-1, 1].forEach(side => {
          const x = Phaser.Math.Clamp(p.x + nx * side * offset, safe.left + 42, safe.right - 42);
          const y = Phaser.Math.Clamp(p.y + ny * side * offset, safe.top + 34, safe.bottom - 42);
          if (this.distanceToPath(x, y) < D.MAP.towerPathRadius + 26) return;
          if (slots.some(s => Math.hypot(s.x - x, s.y - y) < minGap)) return;
          slots.push({ x, y });
        });
      }
      return slots.slice(0, this.isDesktopLayout() ? 14 : 10);
    }

    drawPlacementSlots(g) {
      this.placementSlots.forEach(slot => {
        g.fillStyle(0x101922, 0.28);
        g.fillCircle(slot.x, slot.y + 7, 47);
        g.fillStyle(0xf0dfad, 0.28);
        g.fillCircle(slot.x, slot.y, 43);
        g.lineStyle(5, 0xffd45c, 0.5);
        g.strokeCircle(slot.x, slot.y, 43);
        g.lineStyle(2, 0xffffff, 0.25);
        g.strokeCircle(slot.x, slot.y, 34);
      });
    }

    // ---------- HUD ----------
    buildHud() {
      if (this.isDesktopLayout()) {
        this.buildDesktopHud();
        return;
      }

      const width = this.scale.width;
      this.add.rectangle(width / 2, 64, width, 128, 0x07101b, 0.88).setOrigin(0.5).setDepth(398);

      this.hpPanel = this.add.container(126, 48).setDepth(401);
      this.wavePanel = this.add.container(width / 2, 48).setDepth(401);
      this.moneyPanel = this.add.container(width - 126, 48).setDepth(401);
      this.buildHudPanel(this.hpPanel, 238, 84, 'INTEGRIDADE');
      this.buildHudPanel(this.wavePanel, 220, 84, 'ONDA');
      this.buildHudPanel(this.moneyPanel, 238, 84, 'SUPRIMENTOS');

      this.hpText = this.add.text(0, 10, '', { fontFamily: 'Georgia, serif', fontSize: '25px', color: '#f3f7ff', fontStyle: 'bold' }).setOrigin(0.5);
      this.hpBarBack = this.add.rectangle(0, 36, 150, 10, 0x102011, 0.9).setOrigin(0.5);
      this.hpBarFill = this.add.rectangle(-75, 36, 150, 10, 0x62d64c, 0.98).setOrigin(0, 0.5);
      this.hpPanel.add([this.hpText, this.hpBarBack, this.hpBarFill]);

      this.waveText = this.add.text(0, 5, '', { fontFamily: 'Georgia, serif', fontSize: '25px', color: '#f3f7ff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
      this.enemyCountText = this.add.text(0, 33, '', { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#d9e2ef', fontStyle: 'bold' }).setOrigin(0.5);
      this.wavePanel.add([this.waveText, this.enemyCountText]);

      this.moneyText = this.add.text(0, 15, '', { fontFamily: 'Georgia, serif', fontSize: '27px', color: '#f3f7ff', fontStyle: 'bold' }).setOrigin(0.5);
      this.moneyPanel.add(this.moneyText);

      this.menuBtn = UI.makeButton(this, width - 102, 112, 'II', () => this.openPauseMenu(), { width: 68, height: 50, fontSize: 22 }).setDepth(401);
      this.muteBtn = UI.muteButton(this, width - 28, 112).setDepth(401);

      this.speedBtn = UI.makeButton(this, width - 180, 112, '1x', () => this.toggleGameSpeed(), { width: 72, height: 50, fontSize: 20 }).setDepth(401);

      this.autoWave = false;
      this.autoBtn = UI.makeButton(this, 72, 112, 'Auto OFF', () => this.toggleAutoWave(), { width: 120, height: 46, fontSize: 14 }).setDepth(401);

      this.previewText = null;

      if (this.isDesktopLayout()) {
        this.add.text(width / 2, this.scale.height - 148, 'Espaco: gerar aliado | W: onda | X: cancelar | 1/2: velocidade | Esc: pausa', {
          fontFamily: 'Georgia, serif', fontSize: '11px', color: '#8a7a5a'
        }).setOrigin(0.5).setDepth(401);
      }

      this.updateHud();
      this.updateWavePreview();
    }

    buildDesktopHud() {
      const { width } = this.scale;
      this.add.rectangle(width / 2, 48, width, 96, 0x07101b, 0.9).setOrigin(0.5).setDepth(398);

      this.hpPanel = this.add.container(170, 48).setDepth(401);
      this.wavePanel = this.add.container(width / 2, 48).setDepth(401);
      this.moneyPanel = this.add.container(width - 182, 48).setDepth(401);
      this.buildHudPanel(this.hpPanel, 310, 82, 'INTEGRIDADE');
      this.buildHudPanel(this.wavePanel, 270, 82, 'ONDA');
      this.buildHudPanel(this.moneyPanel, 310, 82, 'SUPRIMENTOS');

      this.hpBarMaxWidth = 190;
      this.hpText = this.add.text(0, 8, '', { fontFamily: 'Georgia, serif', fontSize: '27px', color: '#f3f7ff', fontStyle: 'bold' }).setOrigin(0.5);
      this.hpBarBack = this.add.rectangle(0, 34, this.hpBarMaxWidth, 12, 0x102011, 0.9).setOrigin(0.5);
      this.hpBarFill = this.add.rectangle(-this.hpBarMaxWidth / 2, 34, this.hpBarMaxWidth, 12, 0x62d64c, 0.98).setOrigin(0, 0.5);
      this.hpPanel.add([this.hpText, this.hpBarBack, this.hpBarFill]);

      this.waveText = this.add.text(0, 6, '', { fontFamily: 'Georgia, serif', fontSize: '29px', color: '#f3f7ff', fontStyle: 'bold', align: 'center' }).setOrigin(0.5);
      this.enemyCountText = this.add.text(0, 34, '', { fontFamily: 'Georgia, serif', fontSize: '14px', color: '#d9e2ef', fontStyle: 'bold' }).setOrigin(0.5);
      this.wavePanel.add([this.waveText, this.enemyCountText]);

      this.moneyText = this.add.text(0, 9, '', { fontFamily: 'Georgia, serif', fontSize: '31px', color: '#f3f7ff', fontStyle: 'bold' }).setOrigin(0.5);
      this.moneyPanel.add(this.moneyText);

      this.autoWave = false;
      this.autoBtn = UI.makeButton(this, 382, 48, 'Auto OFF', () => this.toggleAutoWave(), { width: 142, height: 52, fontSize: 17 }).setDepth(401);

      this.speedBtn = UI.makeButton(this, width - 520, 48, '1x', () => this.toggleGameSpeed(), { width: 78, height: 54, fontSize: 21 }).setDepth(401);

      this.menuBtn = UI.makeButton(this, width - 430, 48, 'II', () => this.openPauseMenu(), { width: 70, height: 54, fontSize: 20 }).setDepth(401);
      this.muteBtn = UI.muteButton(this, width - 360, 48).setDepth(401);

      this.previewText = null;

      this.updateHud();
      this.updateWavePreview();
    }

    buildHudPanel(container, width, height, title) {
      const bg = this.add.rectangle(0, 0, width, height, 0x111b20, 0.96)
        .setStrokeStyle(2, 0x64706e, 0.85);
      const label = this.add.text(0, -24, title, {
        fontFamily: UI.FONT_UI, fontSize: '12px', color: '#cbd3d2', fontStyle: 'bold'
      }).setOrigin(0.5);
      container.add([bg, label]);
    }

    updateHud() {
      this.hpText.setText(`${this.archiveHp}/${this.maxArchiveHp}`);
      const hpBarWidth = this.hpBarMaxWidth || 150;
      if (this.hpBarFill) this.hpBarFill.width = hpBarWidth * Phaser.Math.Clamp(this.archiveHp / this.maxArchiveHp, 0, 1);
      this.moneyText.setText(`${this.money}`);
      const total = this.level.waves.length;
      this.waveText.setText(this.waveIndex >= total ? 'VITORIA' : `${Math.min(this.waveIndex + 1, total)}/${total}`);
      const remaining = this.enemies.length + this.spawnTimers.filter(t => t && t.getRemaining && t.getRemaining() > 0).length;
      this.enemyCountText.setText(this.waveActive ? `${remaining} INIMIGOS` : 'PRONTO');
    }

    updateWavePreview() {
      if (this.waveActive || this.waveIndex >= this.level.waves.length) return;
      const wave = this.level.waves[this.waveIndex];
      const counts = {};
      wave.spawns.forEach(s => { counts[s.enemy] = (counts[s.enemy] || 0) + s.count; });
      const parts = Object.entries(counts).map(([id, n]) => `${n}x ${D.ENEMIES[id].name}`);
      this.enemyCountText.setText(parts.join(' / '));
    }

    // ---------- pausa ----------
    openPauseMenu() {
      if (this.paused || this.runEnded) return;
      this.paused = true;
      this.physics.world.pause();
      this.time.paused = true;
      this.persistRunSnapshot();

      const { width, height } = this.scale;
      const overlay = this.add.container(0, 0).setDepth(700);
      this.pauseOverlay = overlay;
      const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setInteractive();
      const box = UI.makePanel(this, width / 2, height / 2, 440, 280);
      const title = this.add.text(width / 2, height / 2 - 100, 'Pausado', {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0.5);
      const note = this.add.text(width / 2, height / 2 - 56, 'Progresso salvo.', {
        fontFamily: UI.FONT_UI, fontSize: '14px', color: '#5a4a32', align: 'center',
        wordWrap: { width: 340 }
      }).setOrigin(0.5);
      overlay.add([dim, box, title, note]);

      const resumeBtn = UI.makeButton(this, width / 2, height / 2 + 20, 'Continuar', () => this.closePauseMenu(overlay), { width: 260, height: 56, fontSize: 20 });
      const exitBtn = UI.makeButton(this, width / 2, height / 2 + 90, 'Sair para o Menu', () => this.exitToMenu(overlay), { width: 260, height: 56, fontSize: 18 });
      overlay.add([resumeBtn, exitBtn]);
    }

    closePauseMenu(overlay) {
      this.paused = false;
      this.pauseOverlay = null;
      this.physics.world.resume();
      this.physics.world.timeScale = 1 / this.gameSpeed;
      this.time.paused = false;
      overlay.destroy();
    }

    exitToMenu(overlay) {
      overlay.destroy();
      this.pauseOverlay = null;
      this.persistRunSnapshot();
      this.scene.start('Menu');
    }

    // ---------- gerar aliado / unidade na mao ----------
    buyButtonLabel() {
      return `GERAR ALIADO\nCusto: ${this.buyCost} suprimentos`;
    }

    buildBuyArea() {
      if (this.isDesktopLayout()) {
        this.buildDesktopBuyArea();
        return;
      }

      const { width, height } = this.scale;
      this.add.rectangle(width / 2, height - 74, width, 148, 0x07101b, 0.9).setDepth(398);

      this.heldPreview = this.add.container(84, height - 76).setDepth(401);
      const heldBg = this.add.image(0, 0, this.textures.exists('tex-ui-hud-clean') ? 'tex-ui-hud-clean' : 'tex-stone-panel').setDisplaySize(146, 116);
      const heldTitle = this.add.text(0, -46, 'ALIADO SORTEADO', {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.heldIcon = this.add.image(0, -10, this.defenseTextureKey('archer', 1)).setVisible(false);
      this.heldLabel = this.add.text(0, 38, 'vazio', {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#8a9ab0', align: 'center',
        wordWrap: { width: 122 }
      }).setOrigin(0.5);
      this.cancelBtn = this.add.text(58, -36, 'X', { fontSize: '20px', color: '#e74c3c', fontStyle: 'bold' })
        .setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
      this.cancelBtn.on('pointerdown', () => this.cancelHeld());
      this.heldPreview.add([heldBg, heldTitle, this.heldIcon, this.heldLabel, this.cancelBtn]);

      this.buyBtn = UI.makeButton(this, width / 2 - 18, height - 70, this.buyButtonLabel(), () => this.generateTower(), { width: 336, height: 92, fontSize: 21 }).setDepth(401);
      this.waveBtn = UI.makeButton(this, width - 92, height - 70, 'INICIAR\nONDA', () => this.startNextWave(), { width: 160, height: 92, fontSize: 23 }).setDepth(401);
      if (this.waveIndex > 0 && this.waveIndex < this.level.waves.length) UI.setButtonLabel(this.waveBtn, `INICIAR\n${this.waveIndex + 1}`);

      this.previewMarker = this.add.image(0, 0, 'tex-valid-preview').setVisible(false).setDepth(84).setAlpha(0.6);
      this.previewGhost = this.add.image(0, 0, this.defenseTextureKey('archer', 1)).setVisible(false).setDepth(86).setAlpha(0.82);
      this.rangeRing = this.add.image(0, 0, 'tex-range-ring').setVisible(false).setDepth(49).setAlpha(0.5);

      this.input.on('pointermove', p => this.updateHeldPreview(p));
    }

    buildDesktopBuyArea() {
      const { width, height } = this.scale;
      this.add.rectangle(width / 2, height - 72, width, 144, 0x07101b, 0.92).setDepth(398);

      this.heldPreview = this.add.container(170, height - 72).setDepth(401);
      const heldBg = this.add.image(0, 0, this.textures.exists('tex-ui-hud-clean') ? 'tex-ui-hud-clean' : 'tex-stone-panel').setDisplaySize(300, 104);
      const heldTitle = this.add.text(-44, -24, 'ALIADO', {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.heldIcon = this.add.image(-78, 13, this.defenseTextureKey('archer', 1)).setVisible(false);
      this.heldLabel = this.add.text(48, 12, 'vazio', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#8a9ab0', align: 'left',
        wordWrap: { width: 158 }
      }).setOrigin(0.5);
      this.cancelBtn = this.add.text(124, -32, 'X', { fontSize: '24px', color: '#e74c3c', fontStyle: 'bold' })
        .setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
      this.cancelBtn.on('pointerdown', () => this.cancelHeld());
      this.heldPreview.add([heldBg, heldTitle, this.heldIcon, this.heldLabel, this.cancelBtn]);

      this.buyBtn = UI.makeButton(this, width / 2 - 170, height - 72, this.buyButtonLabel(), () => this.generateTower(), { width: 430, height: 92, fontSize: 24 }).setDepth(401);
      this.waveBtn = UI.makeButton(this, width - 220, height - 72, 'INICIAR\nONDA', () => this.startNextWave(), { width: 320, height: 92, fontSize: 29 }).setDepth(401);
      if (this.waveIndex > 0 && this.waveIndex < this.level.waves.length) UI.setButtonLabel(this.waveBtn, `INICIAR\n${this.waveIndex + 1}`);

      this.previewMarker = this.add.image(0, 0, 'tex-valid-preview').setVisible(false).setDepth(84).setAlpha(0.6);
      this.previewGhost = this.add.image(0, 0, this.defenseTextureKey('archer', 1)).setVisible(false).setDepth(86).setAlpha(0.82);
      this.rangeRing = this.add.image(0, 0, 'tex-range-ring').setVisible(false).setDepth(49).setAlpha(0.5);

      this.input.on('pointermove', p => this.updateHeldPreview(p));
    }

    generateTower() {
      if (this.paused || this.runEnded) return;
      if (this.held) { this.floatText(this.buyBtn.x, this.scale.height - 142, 'Posicione o aliado primeiro', '#e74c3c'); return; }
      if (this.money < this.buyCost) { this.floatText(this.buyBtn.x, this.scale.height - 142, 'Suprimentos insuficientes', '#e74c3c'); return; }
      const luckShift = this.effects.luckShift || 0;
      const epicLuckShift = this.effects.epicLuckShift || 0;
      const rarity = D.pickRarity(this.rng, luckShift, epicLuckShift);
      let pool = this.loadout.filter(id => D.DEFENSES[id].rarity === rarity);
      if (!pool.length) {
        const order = D.RARITY_ORDER;
        const idx = order.indexOf(rarity);
        for (let d = 1; d < order.length && !pool.length; d++) {
          pool = this.loadout.filter(id => D.DEFENSES[id].rarity === order[Math.max(0, idx - d)]);
          if (!pool.length) pool = this.loadout.filter(id => D.DEFENSES[id].rarity === order[Math.min(order.length - 1, idx + d)]);
        }
      }
      if (!pool.length) pool = this.loadout;
      const pick = pool[Math.floor(this.rng() * pool.length)];

      const paid = this.buyCost;
      this.money -= paid;
      this.buyCount += 1;
      this.buyCost = Math.round((BASE_BUY_COST + this.buyCount * BUY_COST_INCREMENT) * (1 + (this.effects.buyCostMult || 0)));
      this.held = { defenseId: pick, level: 1, paidCost: paid, sourceTower: null };
      this.closeTowerPanel();

      this.heldIcon.setTexture(this.defenseTextureKey(pick, 1)).setVisible(true);
      const heldIconSize = this.isDesktopLayout() ? 86 : 66;
      this.heldIcon.setDisplaySize(heldIconSize, heldIconSize);
      this.heldLabel.setText(`${D.DEFENSES[pick].name}\nNv 1`).setColor('#f2e2b8').setVisible(true);
      this.cancelBtn.setVisible(true);
      UI.setButtonLabel(this.buyBtn, this.buyButtonLabel());
      AUDIO.buy();
      this.floatText(this.buyBtn.x, this.scale.height - 142, `${D.DEFENSES[pick].name}!`, this.rarityColorHex(D.DEFENSES[pick].rarity));
      this.advanceTutorial(1);
      this.updateHud();
      this.persistRunSnapshot();
    }

    buyDefense() { this.generateTower(); }

    cancelHeld() {
      if (!this.held || this.paused) return;
      if (!this.held.sourceTower) {
        this.money += this.held.paidCost || 0;   // devolve o valor pago; o custo crescente nao volta
        this.floatText(this.buyBtn.x, this.scale.height - 110, `+${this.held.paidCost} (cancelado)`, '#cbb98a');
      }
      AUDIO.uiClick();
      this.clearHeld();
      this.updateHud();
      this.persistRunSnapshot();
    }

    clearHeld(restoreMoved = true) {
      if (restoreMoved && this.held && this.held.sourceTower) this.restoreMovedTower();
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setText('vazio').setColor('#8a9ab0').setVisible(true);
      this.cancelBtn.setVisible(false);
      this.previewMarker.setVisible(false);
      this.previewGhost.setVisible(false);
      this.rangeRing.setVisible(false);
    }

    rarityColorHex(rarity) {
      return '#' + D.RARITY[rarity].color.toString(16).padStart(6, '0');
    }

    towerDisplaySize(defenseId, level) {
      const base = TOWER_DISPLAY_SIZES[defenseId] || 92;
      return Math.round(base * (1 + (level - 1) * 0.13));
    }

    defenseTextureKey(defenseId, level) {
      const lvl = Phaser.Math.Clamp(level || 1, 1, D.MAX_FUSION_LEVEL);
      const key = `tex-defense-${defenseId}-lv${lvl}`;
      if (this.textures.exists(key)) return key;
      const baseKey = `tex-defense-${defenseId}-lv1`;
      if (this.textures.exists(baseKey)) return baseKey;
      return `tex-defense-${defenseId}`;
    }

    applyTowerDisplay(tower, stretchX, stretchY) {
      const size = this.towerDisplaySize(tower.defenseId, tower.level);
      tower.sprite.setTexture(this.defenseTextureKey(tower.defenseId, tower.level));
      tower.sprite.setDisplaySize(size, size);
      const normalScaleX = tower.sprite.scaleX;
      const normalScaleY = tower.sprite.scaleY;
      if (stretchX || stretchY) {
        tower.sprite.setScale(normalScaleX * (stretchX || 1), normalScaleY * (stretchY || 1));
      }
      return { normalScaleX, normalScaleY };
    }

    enemyDisplaySize(enemyId) {
      return ENEMY_DISPLAY_SIZES[enemyId] || 74;
    }

    combatDistance(value) {
      return value * (this.isDesktopLayout() ? 1 : 1.22);
    }

    attackRange(defenseId) {
      return this.combatDistance(this.towerStat(defenseId, 'range')) * (1 + (this.effects.rangeMult || 0));
    }

    effectRadius(defenseId, stat) {
      return this.combatDistance(this.towerStat(defenseId, stat));
    }

    hpBarSpec(enemyId) {
      const size = this.enemyDisplaySize(enemyId);
      return { width: Math.round(size * 0.58), yOffset: Math.round(size * 0.55) };
    }

    // ---------- posicionamento ----------
    distanceToPath(x, y) {
      const path = this.arenaPath;
      let min = Infinity;
      for (let i = 0; i < path.length - 1; i++) {
        min = Math.min(min, this.distToSegment(x, y, path[i], path[i + 1]));
      }
      return min;
    }

    distToSegment(px, py, a, b) {
      const dx = b.x - a.x, dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      let t = len2 === 0 ? 0 : ((px - a.x) * dx + (py - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const cx = a.x + t * dx, cy = a.y + t * dy;
      return Math.hypot(px - cx, py - cy);
    }

    nearestSlot(x, y) {
      let best = null;
      let bestDist = Infinity;
      this.placementSlots.forEach(slot => {
        const d = Math.hypot(slot.x - x, slot.y - y);
        if (d < bestDist) { bestDist = d; best = slot; }
      });
      return best && bestDist <= SLOT_SNAP_RADIUS ? best : null;
    }

    slotOccupied(slot, ignoreTower) {
      return this.towers.some(t => t !== ignoreTower && Math.hypot(t.x - slot.x, t.y - slot.y) < D.MAP.towerMinGap);
    }

    towerTooClose(x, y, ignoreTower) {
      const minGap = this.isDesktopLayout() ? 128 : 82;
      return this.towers.some(t => t !== ignoreTower && Math.hypot(t.x - x, t.y - y) < minGap);
    }

    isValidPlacement(x, y, defenseId, ignoreTower) {
      const def = D.DEFENSES[defenseId];
      const safe = this.safeArea();
      if (x < safe.left || y < safe.top || x > safe.right || y > safe.bottom) return false;
      const dist = this.distanceToPath(x, y);
      if (def.onPath) {
        if (dist > D.MAP.trapPathRadius) return false;
      } else {
        if (dist < D.MAP.towerPathRadius) return false;
        if (def.range && dist > this.attackRange(defenseId) - 18) return false;
        if (this.towerTooClose(x, y, ignoreTower)) return false;
      }
      return true;
    }

    snapPlacement(x, y, defenseId) {
      return { x, y };
    }

    updateHeldPreview(pointer) {
      if (!this.held || this.paused) {
        if (!this.selectedTower) { this.previewMarker.setVisible(false); this.previewGhost.setVisible(false); this.rangeRing.setVisible(false); }
        return;
      }
      const p = this.toWorldPoint(pointer);
      const def = D.DEFENSES[this.held.defenseId];
      const snapped = this.snapPlacement(p.x, p.y, this.held.defenseId);
      const targetX = snapped.x;
      const targetY = snapped.y;
      const valid = this.isValidPlacement(targetX, targetY, this.held.defenseId, this.held.sourceTower);
      const previewSize = this.towerDisplaySize(this.held.defenseId, this.held.level);
      const fuseTarget = this.findFuseTarget(targetX, targetY);
      const canCommit = this.held.sourceTower ? Boolean(fuseTarget) : (valid || Boolean(fuseTarget));
      this.previewMarker.setTexture(canCommit ? 'tex-valid-preview' : 'tex-invalid-preview').setPosition(targetX, targetY).setDisplaySize(96, 96).setVisible(true);
      if (this.held.sourceTower) {
        this.previewGhost.setVisible(false);
        this.held.sourceTower.sprite
          .setPosition(p.x, p.y)
          .setAlpha(fuseTarget ? 0.9 : 0.62)
          .setTint(fuseTarget ? 0xffffff : 0xff7777);
      } else {
        this.previewGhost
          .setTexture(this.defenseTextureKey(this.held.defenseId, this.held.level))
          .setPosition(targetX, targetY)
          .setDisplaySize(previewSize, previewSize)
          .setAlpha(canCommit ? 0.86 : 0.58)
          .setTint(canCommit ? 0xffffff : 0xff7777)
          .setVisible(true);
      }
      const radius = def.auraRadius
        ? this.effectRadius(this.held.defenseId, 'auraRadius')
        : (def.range ? this.attackRange(this.held.defenseId) : 0);
      if (radius) {
        this.rangeRing.setPosition(targetX, targetY).setDisplaySize(radius * 2, radius * 2).setVisible(true);
      } else {
        this.rangeRing.setVisible(false);
      }
    }

    toWorldPoint(pointer) {
      return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    }

    pointerInCommandZone(pointer) {
      const safe = this.safeArea();
      return pointer.y < safe.top || pointer.y > safe.bottom;
    }

    towerAt(x, y) {
      const radius = this.isDesktopLayout() ? 72 : 58;
      return this.towers.find(t => Math.hypot(t.x - x, t.y - y) < radius);
    }

    findFuseTarget(x, y) {
      if (!this.held) return null;
      const radius = this.isDesktopLayout() ? 82 : 66;
      return this.towers.find(t =>
        t !== this.held.sourceTower &&
        Math.hypot(t.x - x, t.y - y) < radius &&
        t.defenseId === this.held.defenseId &&
        t.level === this.held.level
      );
    }

    hasFuseTargetForTower(tower) {
      return this.towers.some(t => t !== tower && t.defenseId === tower.defenseId && t.level === tower.level);
    }

    onPointerDown(pointer, currentlyOver) {
      if (this.paused || this.runEnded) return;
      if (currentlyOver && currentlyOver.length) return;
      if (this.pointerInCommandZone(pointer)) return;
      const p = this.toWorldPoint(pointer);

      if (this.held) {
        if (!this.held.sourceTower) this.commitHeldAt(p.x, p.y);
        else this.updateHeldPreview(pointer);
        return;
      }

      const tower = this.towerAt(p.x, p.y);
      if (!tower) { this.closeTowerPanel(); return; }
      this.dragCandidate = {
        tower, startX: p.x, startY: p.y, pointerId: pointer.id, started: false,
        holdTimer: this.time.delayedCall(180, () => {
          if (this.dragCandidate && this.dragCandidate.tower === tower) this.beginTowerMove(tower);
        })
      };
    }

    onPointerUp(pointer, currentlyOver) {
      if (this.paused || this.runEnded) return;
      const p = this.toWorldPoint(pointer);
      if (this.held && !this.pointerInCommandZone(pointer)) {
        this.commitHeldAt(p.x, p.y);
        this.dragCandidate = null;
        return;
      }
      if (this.dragCandidate && !this.dragCandidate.started) {
        if (this.dragCandidate.holdTimer) this.dragCandidate.holdTimer.remove(false);
        const tower = this.dragCandidate.tower;
        this.dragCandidate = null;
        this.openTowerPanel(tower);
      }
    }

    beginTowerMove(tower) {
      if (!tower || !this.towers.includes(tower) || this.held || this.paused) return;
      if (!this.hasFuseTargetForTower(tower)) {
        this.floatText(tower.x, tower.y - 60, 'Só move para fundir', '#e0a52a');
        AUDIO.invalid();
        return;
      }
      this.closeTowerPanel();
      this.dragCandidate.started = true;
      tower.dragging = true;
      tower.originX = tower.x;
      tower.originY = tower.y;
      tower.sprite.setDepth(120);
      if (tower.auraRing) tower.auraRing.setAlpha(0.25);
      if (tower.guardHpBack) tower.guardHpBack.setVisible(false);
      if (tower.guardHpBar) tower.guardHpBar.setVisible(false);
      this.held = { defenseId: tower.defenseId, level: tower.level, paidCost: 0, sourceTower: tower };
      const heldIconSize = this.isDesktopLayout() ? 86 : 66;
      this.heldIcon.setTexture(this.defenseTextureKey(tower.defenseId, tower.level)).setDisplaySize(heldIconSize, heldIconSize).setVisible(true);
      this.heldLabel.setText(`${D.DEFENSES[tower.defenseId].name}\nFundir Nv ${tower.level}`).setColor('#f2e2b8').setVisible(true);
      this.cancelBtn.setVisible(true);
    }

    restoreMovedTower() {
      const tower = this.held && this.held.sourceTower;
      if (!tower) return;
      tower.x = tower.originX;
      tower.y = tower.originY;
      tower.dragging = false;
      tower.sprite.clearTint().setAlpha(1).setDepth(88).setPosition(tower.x, tower.y);
      if (tower.auraRing) tower.auraRing.setPosition(tower.x, tower.y).setAlpha(0.07);
      this.updateGuardBar(tower);
    }

    commitHeldAt(x, y) {
      if (!this.held) return;
      const fuseTarget = this.findFuseTarget(x, y);
      if (fuseTarget) { this.fuseTower(fuseTarget, this.held.sourceTower); return; }

      if (this.held.sourceTower) {
        this.floatText(x, y - 30, 'Solte em uma igual para fundir', '#e0a52a');
        AUDIO.invalid();
        this.restoreMovedTower();
        this.clearHeld(false);
        return;
      }

      const snapped = this.snapPlacement(x, y, this.held.defenseId);
      if (!this.isValidPlacement(snapped.x, snapped.y, this.held.defenseId, this.held.sourceTower)) {
        this.floatText(x, y - 30, 'Posição inválida', '#e74c3c');
        AUDIO.invalid();
        UI.screenShake(this, 0.003, 100);
        if (this.held.sourceTower) {
          this.restoreMovedTower();
          this.clearHeld(false);
        }
        return;
      }

      if (this.held.sourceTower) {
        const tower = this.held.sourceTower;
        tower.x = snapped.x;
        tower.y = snapped.y;
        tower.dragging = false;
        tower.sprite.clearTint().setAlpha(1).setDepth(88).setPosition(tower.x, tower.y);
        if (tower.auraRing) tower.auraRing.setPosition(tower.x, tower.y).setAlpha(0.07);
        this.updateGuardBar(tower);
      } else {
        this.placeTower(this.held.defenseId, this.held.level, snapped.x, snapped.y);
      }
      AUDIO.place();
      this.advanceTutorial(2);
      this.clearHeld(false);
      this.persistRunSnapshot();
    }

    placeTower(defenseId, level, x, y, silent, targeting, guardHp) {
      const def = D.DEFENSES[defenseId];
      const sprite = this.add.image(x, y, this.defenseTextureKey(defenseId, level));
      const tower = { defenseId, level, x, y, sprite, lastFire: 0, targetCooldowns: new Map(), targeting: targeting || 'first', auraRing: null };
      sprite.setDepth(88);
      const normal = this.applyTowerDisplay(tower);
      if (def.guard) {
        tower.maxGuardHp = Math.round(this.towerStat(defenseId, 'guardHp') * (1 + (level - 1) * 0.38));
        tower.guardHp = Phaser.Math.Clamp(typeof guardHp === 'number' ? guardHp : tower.maxGuardHp, 0, tower.maxGuardHp);
        tower.guardHpBack = this.add.rectangle(x, y - 74, 76, 8, 0x160f0b, 0.86).setDepth(106);
        tower.guardHpBar = this.add.rectangle(x - 38, y - 74, 76, 6, 0x35d16f, 0.95).setOrigin(0, 0.5).setDepth(107);
        this.updateGuardBar(tower);
      }
      if (def.auraRadius) {
        const r = this.effectRadius(defenseId, 'auraRadius') * (1 + (level - 1) * 0.15);
        tower.auraRing = this.add.circle(x, y, r, def.color, 0.07).setStrokeStyle(2, def.color, 0.35).setDepth(20);
      }
      this.towers.push(tower);
      if (!silent) {
        // squash & stretch: achata no impacto e volta com overshoot (game-feel)
        sprite.setScale(normal.normalScaleX * 1.3, normal.normalScaleY * 0.7);
        this.tweens.add({ targets: sprite, scaleX: normal.normalScaleX, scaleY: normal.normalScaleY, duration: 220, ease: 'Back.Out' });
      }
    }

    updateGuardBar(tower) {
      if (!tower || !tower.guardHpBar) return;
      tower.guardHpBack.setPosition(tower.x, tower.y - 74);
      tower.guardHpBar.setPosition(tower.x - 38, tower.y - 74);
      tower.guardHpBar.width = 76 * Math.max(0, tower.guardHp / tower.maxGuardHp);
      const visible = tower.guardHp > 0;
      tower.guardHpBack.setVisible(visible);
      tower.guardHpBar.setVisible(visible);
    }

    fuseTower(tower, consumedTower) {
      const maxLevel = D.MAX_FUSION_LEVEL + (this.effects.maxFusionBonus || 0);
      if (tower.level >= maxLevel) {
        this.floatText(tower.x, tower.y - 40, 'Nível máximo', '#e0a52a');
        if (consumedTower) {
          this.restoreMovedTower();
          this.clearHeld(false);
        }
        return;
      }
      if (consumedTower) {
        const idx = this.towers.indexOf(consumedTower);
        if (idx !== -1) this.towers.splice(idx, 1);
        consumedTower.sprite.destroy();
        if (consumedTower.auraRing) consumedTower.auraRing.destroy();
        if (consumedTower.guardHpBack) consumedTower.guardHpBack.destroy();
        if (consumedTower.guardHpBar) consumedTower.guardHpBar.destroy();
      }
      tower.level += 1;
      const def = D.DEFENSES[tower.defenseId];
      if (def.guard) {
        const previousMax = tower.maxGuardHp || this.towerStat(tower.defenseId, 'guardHp');
        tower.maxGuardHp = Math.round(this.towerStat(tower.defenseId, 'guardHp') * (1 + (tower.level - 1) * 0.38));
        tower.guardHp = Math.min(tower.maxGuardHp, Math.round((tower.guardHp || previousMax) + (tower.maxGuardHp - previousMax)));
        this.updateGuardBar(tower);
      }
      const normal = this.applyTowerDisplay(tower, 1.35, 0.65);
      this.tweens.add({ targets: tower.sprite, scaleX: normal.normalScaleX, scaleY: normal.normalScaleY, duration: 260, ease: 'Back.Out' });
      if (tower.auraRing) {
        const r = this.effectRadius(tower.defenseId, 'auraRadius') * (1 + (tower.level - 1) * 0.15);
        tower.auraRing.setRadius(r);
      }
      this.spawnFusionFx(tower.x, tower.y);
      AUDIO.fuse();
      this.hitStop(60);
      this.clearHeld(false);
      this.persistRunSnapshot();
    }

    spawnFusionFx(x, y) {
      this.floatText(x, y - 50, 'Fusão!', '#2ecc71');
      for (let i = 0; i < 10; i++) {
        const spark = this.add.image(x, y, 'tex-spark');
        const angle = (i / 10) * Math.PI * 2;
        this.tweens.add({
          targets: spark, x: x + Math.cos(angle) * 40, y: y + Math.sin(angle) * 40, alpha: 0, duration: 380,
          onComplete: () => spark.destroy()
        });
      }
      this.cameras.main.flash(120, 255, 240, 180, false);
    }

    // ---------- painel da torre (selecao, alvo, venda) ----------
    openTowerPanel(tower) {
      this.closeTowerPanel();
      this.setTutorialVisible(false);
      this.selectedTower = tower;
      const { width, height } = this.scale;
      const def = D.DEFENSES[tower.defenseId];

      const radius = def.auraRadius
        ? this.effectRadius(tower.defenseId, 'auraRadius') * (1 + (tower.level - 1) * 0.15)
        : this.attackRange(tower.defenseId);
      if (radius) this.rangeRing.setPosition(tower.x, tower.y).setDisplaySize(radius * 2, radius * 2).setVisible(true);

      const panel = this.add.container(0, 0).setDepth(450);
      const py = height - 190;
      const bg = UI.makeStonePanel(this, width / 2, py, width - 30, 104);
      const name = this.add.text(width / 2 - (width - 30) / 2 + 16, py - 34, `${def.name}  Nv ${tower.level}`, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      const info = this.add.text(width / 2 - (width - 30) / 2 + 16, py - 12, def.role, {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#cbb98a'
      }).setOrigin(0, 0.5);
      const close = this.add.text(width / 2 + (width - 30) / 2 - 18, py - 34, '✕', { fontSize: '20px', color: '#f2e2b8' })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      close.on('pointerdown', () => this.closeTowerPanel());
      panel.add([bg, name, info, close]);

      const refund = Math.floor(def.cost * SELL_REFUND) * tower.level;
      const sellBtn = UI.makeButton(this, width / 2 + (width - 30) / 2 - 90, py + 22, `Vender +${refund}`, () => this.sellTower(tower, refund), { width: 150, height: 42, fontSize: 13 });
      panel.add(sellBtn);

      if (!def.auraRadius && !def.onPath) {
        const targetBtn = UI.makeButton(this, width / 2 - (width - 30) / 2 + 100, py + 22, `Alvo: ${TARGETING_LABELS[tower.targeting]}`, () => {
          const idx = TARGETING_MODES.indexOf(tower.targeting);
          tower.targeting = TARGETING_MODES[(idx + 1) % TARGETING_MODES.length];
          UI.setButtonLabel(targetBtn, `Alvo: ${TARGETING_LABELS[tower.targeting]}`);
          this.persistRunSnapshot();
        }, { width: 170, height: 42, fontSize: 13 });
        panel.add(targetBtn);
      }

      this.towerPanel = panel;
    }

    closeTowerPanel() {
      if (this.towerPanel) { this.towerPanel.destroy(); this.towerPanel = null; }
      this.selectedTower = null;
      if (!this.held) this.rangeRing.setVisible(false);
      if (this.tutorialStep > 0) this.setTutorialVisible(true);
    }

    sellTower(tower, refund) {
      const idx = this.towers.indexOf(tower);
      if (idx === -1) return;
      this.towers.splice(idx, 1);
      this.money += refund;
      this.floatText(tower.x, tower.y - 30, `+${refund}`, '#e0a52a');
      AUDIO.uiClick();
      this.tweens.add({ targets: tower.sprite, scale: 0, alpha: 0, duration: 180, ease: 'Back.In', onComplete: () => tower.sprite.destroy() });
      if (tower.auraRing) tower.auraRing.destroy();
      if (tower.guardHpBack) tower.guardHpBack.destroy();
      if (tower.guardHpBar) tower.guardHpBar.destroy();
      this.closeTowerPanel();
      this.updateHud();
      this.persistRunSnapshot();
    }

    // ---------- ondas ----------
    startNextWave() {
      if (this.paused || this.runEnded || this.waveActive || this.waveIndex >= this.level.waves.length) return;
      this.closeTowerPanel();
      this.waveActive = true;
      this.waveBtn.setAlpha(0.4);
      this.advanceTutorial(3);
      AUDIO.waveStart();
      const wave = this.level.waves[this.waveIndex];
      wave.spawns.forEach(spawnDef => {
        for (let i = 0; i < spawnDef.count; i++) {
          const t = this.time.delayedCall((spawnDef.delay || 0) + i * spawnDef.interval, () => this.spawnEnemy(spawnDef.enemy));
          this.spawnTimers.push(t);
        }
      });
      this.updateHud();
      this.updateWavePreview();
    }

    spawnEnemy(enemyId) {
      const def = D.ENEMIES[enemyId];
      const start = this.arenaPath[0];
      const walkAnim = `anim-enemy-${enemyId}-walk`;
      const walkTexture = `tex-enemy-${enemyId}-walk`;
      const textureKey = this.anims.exists(walkAnim) && this.textures.exists(walkTexture) ? walkTexture : `tex-enemy-${enemyId}`;
      const sprite = this.physics.add.sprite(start.x, start.y, textureKey);
      const displaySize = this.enemyDisplaySize(enemyId);
      sprite.setDepth(92).setDisplaySize(displaySize, displaySize);
      if (this.anims.exists(walkAnim)) sprite.play(walkAnim);
      sprite.body.setAllowGravity(false);
      // IMPORTANTE: setCircle espera radius/offset em unidades NAO escaladas (o frame
      // nativo da textura) - o Phaser aplica o scale do sprite por cima sozinho. Usar
      // sprite.width/height aqui (que ja e o tamanho de EXIBICAO pos-scale) faz o raio
      // ser escalado duas vezes, encolhendo e deslocando o hitbox de cada inimigo de um
      // jeito diferente (cada arte real tem uma proporcao de escala diferente). Isso é
      // a causa raiz de fusao/mira/posicionamento parecendo "errados" depois da arte real.
      const frameW = sprite.frame.width, frameH = sprite.frame.height;
      sprite.body.setCircle(frameW / 2.4, frameW * 0.08, frameH * 0.08);
      this.enemyGroup.add(sprite);
      // Escala geometrica por onda x multiplicador do nivel (pressao de upgrade constante)
      const hpMult = this.level.hpMult * Math.pow(D.HP_GROWTH, this.waveIndex);
      const hp = Math.round(def.hp * hpMult);
      const bar = this.hpBarSpec(enemyId);
      const hpBack = this.add.rectangle(start.x, start.y - bar.yOffset, bar.width + 4, HP_BAR_HEIGHT + 2, 0x160f0b, 0.82).setDepth(104);
      const hpBar = this.add.rectangle(start.x, start.y - bar.yOffset, bar.width, HP_BAR_HEIGHT, 0x35d16f, 0.95).setDepth(105);
      const enemy = {
        id: enemyId, def, hp, maxHp: hp, sprite, hpBack, hpBar,
        pathIndex: 1, slowUntil: 0, slowFactor: 1, walkAnim,
        laneOffset: [0, -7, 7, -12, 12][this.enemySpawnSerial++ % 5]
      };
      sprite.setData('ref', enemy);
      this.enemies.push(enemy);
      this.steerEnemy(enemy);
    }

    steerEnemy(e) {
      const path = this.arenaPath;
      const target = path[e.pathIndex];
      if (!target) return;
      const speed = e.def.speed * ((this.battleTime < e.slowUntil) ? e.slowFactor : 1);
      const previous = path[Math.max(0, e.pathIndex - 1)] || target;
      const tangentX = target.x - previous.x;
      const tangentY = target.y - previous.y;
      const tangentLength = Math.hypot(tangentX, tangentY) || 1;
      const laneX = target.x + (-tangentY / tangentLength) * e.laneOffset;
      const laneY = target.y + (tangentX / tangentLength) * e.laneOffset;
      e.currentTarget = { x: laneX, y: laneY };
      const dx = laneX - e.sprite.x, dy = laneY - e.sprite.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.sprite.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      if (Math.abs(dx) > 6) e.sprite.setFlipX(dx < 0);
      if (e.walkAnim && this.anims.exists(e.walkAnim)) {
        if (!e.sprite.anims.isPlaying) e.sprite.play(e.walkAnim);
        e.sprite.anims.timeScale = Phaser.Math.Clamp(speed / Math.max(1, e.def.speed), 0.55, 1.45);
      }
    }

    checkWaveComplete() {
      if (!this.waveActive) return;
      const allSpawned = this.spawnTimers.every(t => !t.getRemaining || t.getRemaining() <= 0);
      if (allSpawned && this.enemies.length === 0) {
        const clearedWave = this.waveIndex;
        this.waveActive = false;
        this.waveIndex += 1;
        this.spawnTimers = [];
        if (this.waveIndex >= this.level.waves.length) {
          this.onVictory();
        } else {
          // Recompensa curta entre ondas. O custo acumulado nao e apagado.
          const bonus = Math.round((D.WAVE_CLEAR_BONUS + clearedWave * D.WAVE_CLEAR_BONUS_GROWTH) * (1 + (this.effects.bountyMult || 0)));
          this.money += bonus;
          this.buyCost = Math.round((BASE_BUY_COST + this.buyCount * BUY_COST_INCREMENT) * (1 + (this.effects.buyCostMult || 0)));
          UI.setButtonLabel(this.buyBtn, this.buyButtonLabel());
          this.floatText(this.scale.width / 2, 180, `Onda vencida! +${bonus}`, '#2ecc71');
          this.waveBtn.setAlpha(1);
          UI.setButtonLabel(this.waveBtn, `INICIAR\n${this.waveIndex + 1}`);
          if (this.autoWave) this.time.delayedCall(1600, () => { if (!this.runEnded && !this.paused) this.startNextWave(); });
        }
        this.persistRunSnapshot();
        this.updateHud();
        this.updateWavePreview();
      }
    }

    // ---------- update loop ----------
    update(time, delta) {
      if (this.runEnded || this.paused) return;
      this.battleTime += delta * this.gameSpeed;
      this.updateEnemies();
      this.updateTowers();
      this.checkWaveComplete();
    }

    updateEnemies() {
      const path = this.arenaPath;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const target = path[e.pathIndex];
        if (!target) { this.enemyReachedEnd(e, i); continue; }
        const activeTarget = e.currentTarget || target;
        const distToTarget = Math.hypot(activeTarget.x - e.sprite.x, activeTarget.y - e.sprite.y);
        if (distToTarget < ARRIVAL_THRESHOLD) {
          e.pathIndex += 1;
          if (!path[e.pathIndex]) { this.enemyReachedEnd(e, i); continue; }
        }
        this.steerEnemy(e);
        this.tickBurn(e);
        if (e.def.healRadius) this.tickHealer(e);
        if (!this.enemies.includes(e)) continue;
        const bar = this.hpBarSpec(e.id);
        e.hpBack.setPosition(e.sprite.x, e.sprite.y - bar.yOffset);
        e.hpBar.setPosition(e.sprite.x, e.sprite.y - bar.yOffset);
        e.hpBar.width = bar.width * Math.max(0, e.hp / e.maxHp);
      }
    }

    tickHealer(healer) {
      if (this.battleTime - (healer.lastHeal || 0) < HEAL_TICK_MS) return;
      healer.lastHeal = this.battleTime;
      const amount = Math.round(healer.def.healAmount * this.level.hpMult);
      let healedAny = false;
      this.enemiesInRadius(healer.sprite.x, healer.sprite.y, healer.def.healRadius).forEach(ally => {
        if (ally === healer || ally.hp >= ally.maxHp) return;
        ally.hp = Math.min(ally.maxHp, ally.hp + amount);
        this.floatText(ally.sprite.x, ally.sprite.y - 50, `+${amount}`, '#5aE08a');
        healedAny = true;
      });
      if (healedAny) {
        const ring = this.add.circle(healer.sprite.x, healer.sprite.y, healer.def.healRadius, 0x5ae08a, 0.10).setDepth(44);
        this.tweens.add({ targets: ring, alpha: 0, duration: 400, onComplete: () => ring.destroy() });
      }
    }

    tickBurn(e) {
      if (!e.burnUntil || this.battleTime >= e.burnUntil) return;
      const tick = e.burnTick || 500;
      if (this.battleTime - (e.lastBurn || 0) < tick) return;
      e.lastBurn = this.battleTime;
      this.damageEnemy(e, e.burnDamage || 1, '#ff9d3d');
    }

    enemyReachedEnd(e, index) {
      const damage = Math.max(1, e.def.siegeDamage || 1);
      this.archiveHp = Math.max(0, this.archiveHp - damage);
      e.sprite.destroy(); e.hpBack.destroy(); e.hpBar.destroy();
      this.enemies.splice(index, 1);
      AUDIO.baseHit();
      UI.screenShake(this, 0.008, 200);
      this.floatText(this.scale.width / 2, this.safeArea().top + 52, `-${damage} integridade`, '#e16b61');
      this.updateHud();
      if (this.archiveHp <= 0) this.onDefeat();
    }

    updateTowers() {
      const now = this.battleTime;
      for (const tower of this.towers) {
        if (tower.dragging) continue;
        const def = D.DEFENSES[tower.defenseId];
        if (tower.guardHpBar) this.updateGuardBar(tower);
        if (def.healGuardAmount || def.auraRateMult) { this.updateSupportTower(tower, def, now); continue; }
        if (def.onPath) { this.updateTrapTower(tower, def, now); continue; }
        const rate = this.attackRate(tower);
        if (now - tower.lastFire < rate) continue;
        const range = this.attackRange(tower.defenseId);
        const target = this.findTarget(tower, range);
        if (!target) continue;
        if (def.melee) this.meleeStrike(tower, target, def);
        else this.fireProjectile(tower, target, def);
        tower.lastFire = now;
      }
    }

    updateTrapTower(tower, def, now) {
      if (def.guard && tower.guardHp <= 0) return;
      const nearby = this.enemiesInRadius(tower.x, tower.y, this.combatDistance(D.MAP.trapPathRadius));
      const rate = this.attackRate(tower);
      nearby.forEach(e => {
        if (e.def.flying) return;   // voadoras passam por cima das armadilhas
        if (def.guard) {
          e.slowUntil = now + this.towerStat(tower.defenseId, 'slowDuration');
          e.slowFactor = 1 - this.towerStat(tower.defenseId, 'slowFactor');
          if (now - (tower.lastGuardHit || 0) > 820) {
            tower.lastGuardHit = now;
            tower.guardHp = Math.max(0, tower.guardHp - Math.max(4, Math.round((e.def.hp || 30) / 10)));
            this.updateGuardBar(tower);
            if (tower.guardHp <= 0) {
              tower.sprite.setAlpha(0.45);
              this.floatText(tower.x, tower.y - 72, 'Caiu', '#e74c3c');
            }
          }
        }
        const cd = tower.targetCooldowns.get(e) || 0;
        if (now - cd < rate) return;
        tower.targetCooldowns.set(e, now);
        this.damageEnemy(e, this.computeDamage(tower));
        e.slowUntil = now + this.towerStat(tower.defenseId, 'slowDuration');
        e.slowFactor = 1 - this.towerStat(tower.defenseId, 'slowFactor');
        if (def.burnDamage) this.applyBurn(e, tower);
      });
    }

    updateSupportTower(tower, def, now) {
      const healRate = this.towerStat(tower.defenseId, 'healRate') || def.healRate || 1000;
      if (!def.healGuardAmount || now - (tower.lastHeal || 0) < healRate) return;
      const radius = this.effectRadius(tower.defenseId, 'auraRadius') * (1 + (tower.level - 1) * 0.15);
      const amount = Math.round(this.towerStat(tower.defenseId, 'healGuardAmount') * (1 + (tower.level - 1) * 0.45));
      let healedAny = false;
      this.towers.forEach(ally => {
        if (!ally.guardHpBar || ally.guardHp <= 0 || ally.guardHp >= ally.maxGuardHp) return;
        if (Math.hypot(ally.x - tower.x, ally.y - tower.y) > radius) return;
        ally.guardHp = Math.min(ally.maxGuardHp, ally.guardHp + amount);
        this.updateGuardBar(ally);
        this.floatText(ally.x, ally.y - 86, `+${amount}`, '#5aE08a');
        healedAny = true;
      });
      if (healedAny) {
        tower.lastHeal = now;
        const ring = this.add.circle(tower.x, tower.y, radius, 0x5ae08a, 0.10).setDepth(44);
        this.tweens.add({ targets: ring, alpha: 0, duration: 420, onComplete: () => ring.destroy() });
      }
    }

    meleeStrike(tower, target, def) {
      this.damageEnemy(target, this.computeDamage(tower));
      if (def.aoeRadius) this.explodeAt(target.sprite.x, target.sprite.y, tower.defenseId, this.computeDamage(tower), target);
      this.tweens.add({ targets: tower.sprite, x: tower.x + (target.sprite.x > tower.x ? 7 : -7), duration: 55, yoyo: true });
      AUDIO.fire(tower.defenseId);
    }

    attackRate(tower) {
      const base = this.towerStat(tower.defenseId, 'rate') || 999999;
      return base * Math.max(0.55, 1 - this.rateBonusAt(tower.x, tower.y));
    }

    enemiesInRadius(x, y, radius) {
      const radiusSq = radius * radius;
      return this.enemies.filter(e => {
        if (!e || !e.sprite || !e.sprite.active || e.hp <= 0) return false;
        const dx = e.sprite.x - x;
        const dy = e.sprite.y - y;
        return dx * dx + dy * dy <= radiusSq;
      });
    }

    // Prioridade de alvo por torre: primeiro no caminho / mais forte / mais perto
    findTarget(tower, range) {
      const candidates = this.enemiesInRadius(tower.x, tower.y, range);
      if (!candidates.length) return null;
      if (tower.targeting === 'strong') {
        return candidates.reduce((a, b) => (b.hp > a.hp ? b : a));
      }
      if (tower.targeting === 'close') {
        return candidates.reduce((a, b) => {
          const da = Math.hypot(a.sprite.x - tower.x, a.sprite.y - tower.y);
          const db = Math.hypot(b.sprite.x - tower.x, b.sprite.y - tower.y);
          return db < da ? b : a;
        });
      }
      // 'first': mais avancado no caminho (padrao pra segurar vazamentos)
      let best = null, bestProgress = -1;
      candidates.forEach(e => {
        const score = e.pathIndex * 100000 - Math.hypot(e.sprite.x - tower.x, e.sprite.y - tower.y);
        if (score > bestProgress) { bestProgress = score; best = e; }
      });
      return best;
    }

    // Dano final da torre: base * nivel de fusao * upgrades de fragmento * aura de Estandartes
    computeDamage(tower) {
      const base = this.towerStat(tower.defenseId, 'damage');
      const lvlMult = 1 + (tower.level - 1) * 0.6;
      const fusionMult = tower.level > 1 ? (1 + (this.effects.fusionDamageMult || 0)) : 1;
      return base * lvlMult * fusionMult * (1 + this.auraBonusAt(tower.x, tower.y));
    }

    auraBonusAt(x, y) {
      let bonus = 0;
      for (const t of this.towers) {
        const def = D.DEFENSES[t.defenseId];
        if (!def.auraRadius) continue;
        const r = this.effectRadius(t.defenseId, 'auraRadius') * (1 + (t.level - 1) * 0.15);
        if (Math.hypot(t.x - x, t.y - y) <= r) {
          bonus += this.towerStat(t.defenseId, 'auraDamageMult') * (1 + (t.level - 1) * 0.5);
        }
      }
      return bonus;
    }

    rateBonusAt(x, y) {
      let bonus = 0;
      for (const t of this.towers) {
        const def = D.DEFENSES[t.defenseId];
        if (!def.auraRadius || !def.auraRateMult) continue;
        const r = this.effectRadius(t.defenseId, 'auraRadius') * (1 + (t.level - 1) * 0.15);
        if (Math.hypot(t.x - x, t.y - y) <= r) {
          bonus += this.towerStat(t.defenseId, 'auraRateMult') * (1 + (t.level - 1) * 0.25);
        }
      }
      return Math.min(0.45, bonus);
    }

    fireProjectile(tower, target, def) {
      let texKey = 'tex-arrow';
      if (tower.defenseId === 'fire-archer') texKey = 'tex-fireball';
      if (tower.defenseId === 'slinger') texKey = 'tex-bolt';

      const spr = this.projectileGroup.get(tower.x, tower.y - 20, texKey);
      if (!spr) return;
      spr.setActive(true).setVisible(true).setTexture(texKey).setDepth(98);
      if (!spr.body) this.physics.world.enable(spr);
      spr.body.setAllowGravity(false);
      spr.body.reset(tower.x, tower.y - 20);
      spr.setData('dmg', this.computeDamage(tower));
      spr.setData('def', def);
      spr.setData('towerId', tower.defenseId);
      spr.setData('towerRef', tower);
      spr.setData('pierceLeft', this.towerStat(tower.defenseId, 'pierce') || 0);
      spr.setData('hitSet', new Set());
      const fireToken = (spr.getData('fireToken') || 0) + 1;
      spr.setData('fireToken', fireToken);

      // recuo curto da torre ao atirar (game-feel barato que vende o disparo)
      this.tweens.add({ targets: tower.sprite, y: tower.y + 3, duration: 50, yoyo: true });

      const dx = target.sprite.x - spr.x, dy = target.sprite.y - spr.y;
      const dist = Math.hypot(dx, dy) || 1;
      const speed = def.projectileSpeed || 900;
      spr.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
      spr.rotation = Math.atan2(dy, dx) + Math.PI / 2;

      if (def.rate >= 900) AUDIO.fire(tower.defenseId);

      const lifespan = (dist / speed) * 1000 + 600;
      this.time.delayedCall(lifespan, () => {
        if (spr.getData('fireToken') === fireToken) this.retireProjectile(spr);
      });
    }

    retireProjectile(spr) {
      if (!spr.active) return;
      this.projectileGroup.killAndHide(spr);
      if (spr.body) spr.body.stop();
    }

    onProjectileHitEnemy(proj, enemySprite) {
      if (!proj.active) return;
      const ref = enemySprite.getData('ref');
      if (!ref || !this.enemies.includes(ref)) return;
      const hitSet = proj.getData('hitSet');
      if (hitSet.has(ref)) return;
      hitSet.add(ref);

      const def = proj.getData('def');
      const dmg = proj.getData('dmg');
      this.damageEnemy(ref, dmg);
      if (def.aoeRadius) this.explodeAt(proj.x, proj.y, proj.getData('towerId'), dmg, ref);
      if (def.burnDamage && this.enemies.includes(ref)) this.applyBurn(ref, proj.getData('towerRef') || proj.getData('towerId'));

      let pierceLeft = proj.getData('pierceLeft');
      if (pierceLeft > 0) {
        proj.setData('pierceLeft', pierceLeft - 1);
      } else {
        this.retireProjectile(proj);
      }
    }

    explodeAt(x, y, towerId, dmg, exclude) {
      const radius = this.effectRadius(towerId, 'aoeRadius');
      this.enemiesInRadius(x, y, radius).forEach(e => {
        if (e === exclude) return;
        this.damageEnemy(e, dmg * 0.6);
      });
      const ring = this.add.circle(x, y, radius, 0xffb35a, 0.25).setDepth(45);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 260, onComplete: () => ring.destroy() });
    }

    applyBurn(enemy, towerOrId) {
      const towerId = typeof towerOrId === 'string' ? towerOrId : towerOrId.defenseId;
      const towerLevel = typeof towerOrId === 'string' ? 1 : towerOrId.level;
      const lvlMult = 1 + (towerLevel - 1) * 0.45;
      enemy.burnDamage = Math.max(enemy.burnDamage || 0, this.towerStat(towerId, 'burnDamage') * lvlMult);
      enemy.burnUntil = Math.max(enemy.burnUntil || 0, this.battleTime + this.towerStat(towerId, 'burnDuration'));
      enemy.burnTick = this.towerStat(towerId, 'burnTick') || 500;
    }

    damageEnemy(e, amount, color) {
      const armor = e.def.armor || 0;
      const dmg = Math.max(1, amount - armor);
      e.hp -= dmg;
      this.floatText(e.sprite.x, e.sprite.y - 40, `-${Math.round(dmg)}`, color || '#ffffff');
      this.tweens.add({ targets: e.sprite, tint: 0xff6666, duration: 60, yoyo: true });
      if (e.hp <= 0) this.killEnemy(e);
    }

    killEnemy(e) {
      const idx = this.enemies.indexOf(e);
      if (idx === -1) return;
      const bounty = Math.round(e.def.bounty * (1 + (this.effects.bountyMult || 0)));
      this.money += bounty;
      AUDIO.kill(e.def.isBoss);
      if (e.def.isBoss) { UI.screenShake(this, 0.012, 260); this.hitStop(110); }
      this.floatText(e.sprite.x, e.sprite.y - 20, `+${bounty}`, '#e0a52a');
      // pop de morte: infla e some em vez de simplesmente sumir
      e.sprite.body.enable = false;
      this.enemies.splice(idx, 1);
      e.hpBack.destroy();
      e.hpBar.destroy();
      this.tweens.add({ targets: e.sprite, scaleX: e.sprite.scaleX * 1.45, scaleY: e.sprite.scaleY * 1.45, alpha: 0, duration: 200, ease: 'Cubic.Out', onComplete: () => e.sprite.destroy() });
      this.updateHud();
    }

    // ---------- fim de partida ----------
    onVictory() {
      this.runEnded = true;
      AUDIO.victory();
      const state = this.state;
      const winCoinMult = 1 + (this.effects.winCoinMult || 0);
      const xpMult = 1 + (this.effects.xpMult || 0);
      const fragmentMult = 1 + (this.effects.fragmentMult || 0);
      const coinsReward = Math.round(this.level.rewards.coins * winCoinMult);
      const xpReward = Math.round(this.level.rewards.xp * xpMult);
      const fragmentsReward = Math.round(this.level.rewards.fragments * fragmentMult);

      state.profile.coins += coinsReward;
      state.profile.xp += xpReward;
      this.applyLevelUp(state);
      this.loadout.forEach(id => { state.collection[id].fragments += fragmentsReward; });
      state.stats.wins = (state.stats.wins || 0) + 1;
      // Estrelas por desempenho: 3 = quase sem levar dano, 2 = metade da vida, 1 = sobreviveu.
      const hpRatio = this.archiveHp / this.maxArchiveHp;
      const stars = hpRatio >= 0.9 ? 3 : (hpRatio >= 0.5 ? 2 : 1);
      const prev = state.progress.levels[this.level.id] || {};
      state.progress.levels[this.level.id] = {
        completed: true,
        stars: Math.max(prev.stars || 0, stars),
        completedAt: new Date().toISOString()
      };
      state.run = null;
      SAVE.save(state, true);

      this.showEndOverlay(true, coinsReward, xpReward, fragmentsReward, stars);
    }

    onDefeat() {
      this.runEnded = true;
      AUDIO.defeat();
      const state = this.state;
      state.stats.losses = (state.stats.losses || 0) + 1;
      state.run = null;
      SAVE.save(state, true);
      this.showEndOverlay(false, 0, 0, 0);
    }

    applyLevelUp(state) {
      const xpForNext = level => 80 + level * 40;
      while (state.profile.xp >= xpForNext(state.profile.level)) {
        state.profile.xp -= xpForNext(state.profile.level);
        state.profile.level += 1;
      }
    }

    showEndOverlay(victory, coins, xp, fragments, stars) {
      const { width, height } = this.scale;
      const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setDepth(500);
      const box = UI.makePanel(this, width / 2, height / 2, 460, 360).setDepth(501);
      const title = this.add.text(width / 2, height / 2 - 140, victory ? 'Vitória!' : 'A Fortaleza Caiu', {
        fontFamily: 'Georgia, serif', fontSize: '30px', color: victory ? '#2ecc71' : '#e74c3c', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(502);
      if (victory && stars) {
        const starStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const starText = this.add.text(width / 2, height / 2 - 106, starStr, {
          fontSize: '34px', color: '#e0a52a'
        }).setOrigin(0.5).setDepth(502).setScale(0);
        this.tweens.add({ targets: starText, scale: 1, duration: 420, ease: 'Back.Out' });
      }
      let detail = '';
      if (victory) detail = `${this.level.name} concluído!\n+${coins} moedas\n+${xp} XP\n+${fragments} fragmentos por defesa equipada`;
      const desc = this.add.text(width / 2, height / 2 - 60, detail, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a2c1a', align: 'center'
      }).setOrigin(0.5).setDepth(502);

      const hasNext = victory && this.levelIndex + 1 < D.LEVELS.length;
      if (hasNext) {
        UI.makeButton(this, width / 2, height / 2 + 60, `Próximo: ${D.LEVELS[this.levelIndex + 1].name}`, () => {
          this.scene.start('BuildSetup', { levelIndex: this.levelIndex + 1 });
        }, { width: 340, height: 58, fontSize: 17 }).setDepth(502);
      }
      const backLabel = victory ? 'Mapas' : 'Tentar de Novo';
      UI.makeButton(this, width / 2, height / 2 + (hasNext ? 130 : 80), backLabel, () => {
        if (victory) this.scene.start('LevelSelect');
        else this.scene.start('BuildSetup', { levelIndex: this.levelIndex });
      }, { width: 260, height: 56, fontSize: 18 }).setDepth(502);
      const menuBtn = this.add.text(width / 2, height / 2 + (hasNext ? 178 : 130), 'Voltar ao Menu', {
        fontFamily: 'Georgia, serif', fontSize: '14px', color: '#7a5a2e'
      }).setOrigin(0.5).setDepth(502).setInteractive({ useHandCursor: true });
      menuBtn.on('pointerdown', () => this.scene.start('Menu'));
    }

    persistRunSnapshot() {
      this.state.run = {
        active: !this.runEnded,
        layout: this.runtime().layout,
        levelIndex: this.levelIndex,
        wave: this.waveIndex,
        hp: this.archiveHp,
        maxHp: this.maxArchiveHp,
        money: this.money,
        buyCost: this.buyCost,
        buyCount: this.buyCount,
        randomSeed: this.rngSeed,
        loadout: this.loadout,
        towers: this.towers.map(t => ({ defenseId: t.defenseId, level: t.level, x: t.x, y: t.y, targeting: t.targeting, guardHp: t.guardHp }))
      };
      SAVE.save(this.state);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BattleScene = BattleScene;
})(window);
