/* Caminho dos Guardioes - BattleScene: loop central do tower defense.
   Arcade Physics + pooling + audio + pausa real + velocidade 2x + teclado (PC)
   + selecao/venda de torre + aura de suporte + upgrades de fragmento aplicados. */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;
  const SAVE = global.GuardioesSave;
  const AUDIO = global.GuardioesAudio;

  const BASE_START_HP = 20;
  const BASE_START_MONEY = 120;
  const BASE_BUY_COST = 40;
  const BUY_COST_INCREMENT = 6;
  const ARRIVAL_THRESHOLD = 12;
  const TEXT_POOL_SIZE = 28;
  const PROJECTILE_POOL_SIZE = 60;
  const SELL_REFUND = 0.7;
  const TARGETING_MODES = ['first', 'strong', 'close'];
  const TARGETING_LABELS = { first: 'Primeiro', strong: 'Mais Forte', close: 'Mais Perto' };

  class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    init(data) {
      this.wantsResume = Boolean(data.resume);
      this.loadout = data.loadout || [];
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

      const run = state.run && state.run.active ? state.run : null;
      const isResume = Boolean(this.wantsResume && run);

      this.rngSeed = (run && run.randomSeed) || SAVE.randomSeed();
      this.rng = SAVE.mulberry32(this.rngSeed);

      if (isResume) {
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

      this.held = null;
      this.towers = [];
      this.enemies = [];
      this.waveActive = false;
      this.spawnTimers = [];

      this.buildPhysicsGroups();
      this.buildTextPool();
      this.buildMap();
      this.buildHud();
      this.buildBuyArea();
      this.bindKeyboard();
      this.input.on('pointerdown', (p, over) => this.onMapTap(p, over));
      this.physics.add.overlap(this.projectileGroup, this.enemyGroup, (proj, enemySprite) => this.onProjectileHitEnemy(proj, enemySprite));

      if (isResume && run.towers) {
        run.towers.forEach(t => this.placeTower(t.defenseId, t.level, t.x, t.y, true, t.targeting));
      }

      this.persistRunSnapshot();
    }

    // ---------- classe / efeitos ----------
    computeClassEffects() {
      const state = this.registry.get('state') || this.state;
      const classId = state.profile.selectedClass;
      const cls = D.CLASSES[classId];
      const nodesState = state.profile.classes[classId].nodes;
      const eff = {};
      Object.values(cls.branches).forEach(branch => {
        branch.nodes.forEach(node => {
          if (nodesState[`${branch.id}_${node.id}`]) {
            Object.entries(node.effect).forEach(([k, v]) => { eff[k] = (eff[k] || 0) + v; });
          }
        });
      });
      return eff;
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
      if (stat === 'slowFactor') return Math.min(0.8, base + 0.04 * upg * eff);
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
      if (this.speedBtn) this.speedBtn.setText(speed === 1 ? '1x' : '2x');
    }

    toggleGameSpeed() { this.setGameSpeed(this.gameSpeed === 1 ? 2 : 1); }

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
      this.input.keyboard.on('keydown-SPACE', () => this.buyDefense());
      this.input.keyboard.on('keydown-W', () => this.startNextWave());
      this.input.keyboard.on('keydown-X', () => this.cancelHeld());
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

    // ---------- mapa ----------
    buildMap() {
      const { width, height } = this.scale;
      const hasMapArt = this.textures.exists('tex-map-bg');
      if (hasMapArt) {
        this.add.image(width / 2, height / 2, 'tex-map-bg').setDisplaySize(width, height);
      } else {
        this.add.tileSprite(0, 0, width, height, 'tex-ground').setOrigin(0);
      }

      const g = this.add.graphics();
      const path = D.MAP.path;
      const pathAlpha = hasMapArt ? 0.35 : 1;
      g.lineStyle(96, 0x8a6a45, pathAlpha);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
      g.strokePath();
      if (!hasMapArt) {
        g.lineStyle(4, 0x6f5636, 0.6);
        g.beginPath();
        g.moveTo(path[0].x, path[0].y);
        for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
        g.strokePath();
      }
    }

    // ---------- HUD ----------
    buildHud() {
      const width = this.scale.width;
      this.hudBar = this.add.rectangle(width / 2, 30, width, 60, 0x1c1712, 0.82).setOrigin(0.5).setDepth(400);
      this.hpText = this.add.text(20, 16, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e74c3c', fontStyle: 'bold' }).setDepth(401);
      this.moneyText = this.add.text(20, 40, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e0a52a' }).setDepth(401);
      this.waveText = this.add.text(width / 2, 28, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e2b8', fontStyle: 'bold' }).setOrigin(0.5).setDepth(401);

      this.menuBtn = this.add.text(width - 22, 20, '☰', { fontSize: '24px', color: '#f2e2b8' }).setOrigin(1, 0.5).setDepth(401).setInteractive({ useHandCursor: true });
      this.menuBtn.on('pointerdown', () => this.openPauseMenu());
      this.muteBtn = UI.muteButton(this, width - 30, 50).setDepth(401);

      this.speedBtn = this.add.text(width - 80, 50, '1x', {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e2b8', fontStyle: 'bold',
        backgroundColor: '#3a2a1c', padding: { x: 8, y: 3 }
      }).setOrigin(0.5).setDepth(401).setInteractive({ useHandCursor: true });
      this.speedBtn.on('pointerdown', () => { AUDIO.uiClick(); this.toggleGameSpeed(); });

      this.waveBtn = UI.makeButton(this, width / 2, 96, 'Iniciar Onda', () => this.startNextWave(), { width: 200, height: 48, fontSize: 15 }).setDepth(401);
      if (this.waveIndex > 0 && this.waveIndex < D.WAVES.length) this.waveBtn.list[1].setText(`Iniciar ${D.WAVES[this.waveIndex].label}`);

      // Telegraph: mostra a composicao da proxima onda (skill tower-defense: sem preview,
      // inimigos especiais parecem aleatorios e injustos).
      this.previewText = this.add.text(width / 2, 134, '', {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#cbb98a'
      }).setOrigin(0.5).setDepth(401);

      if (this.sys.game.device.os.desktop) {
        this.add.text(width / 2, this.scale.height - 116, 'Espaço: comprar · W: onda · X: cancelar · 1/2: velocidade · Esc: pausa', {
          fontFamily: 'Georgia, serif', fontSize: '11px', color: '#8a7a5a'
        }).setOrigin(0.5).setDepth(401);
      }

      this.updateHud();
      this.updateWavePreview();
    }

    updateHud() {
      this.hpText.setText(`Arquivo: ${this.archiveHp}/${this.maxArchiveHp}`);
      this.moneyText.setText(`${this.money} moedas`);
      const total = D.WAVES.length;
      this.waveText.setText(this.waveActive ? `${D.WAVES[this.waveIndex].label} · ${this.waveIndex + 1}/${total}` : (this.waveIndex >= total ? 'Vitória!' : `Pronto · ${this.waveIndex + 1}/${total}`));
    }

    updateWavePreview() {
      if (this.waveActive || this.waveIndex >= D.WAVES.length) { this.previewText.setText(''); return; }
      const wave = D.WAVES[this.waveIndex];
      const counts = {};
      wave.spawns.forEach(s => { counts[s.enemy] = (counts[s.enemy] || 0) + s.count; });
      const parts = Object.entries(counts).map(([id, n]) => `${n}× ${D.ENEMIES[id].name}`);
      this.previewText.setText(`A caminho: ${parts.join(' · ')}`);
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
      const box = UI.makePanel(this, width / 2, height / 2, 440, 300);
      const title = this.add.text(width / 2, height / 2 - 100, 'Pausado', {
        fontFamily: 'Georgia, serif', fontSize: '28px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0.5);
      const note = this.add.text(width / 2, height / 2 - 60, 'Suas torres e progresso estão salvos.\nInimigos da onda atual reiniciam ao continuar depois.', {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#5a4a32', align: 'center'
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

    // ---------- compra / defesa na mao ----------
    buildBuyArea() {
      const { width, height } = this.scale;
      const groupCenter = width / 2;
      this.buyBtn = UI.makeButton(this, groupCenter - 105, height - 60, `Comprar (${this.buyCost})`, () => this.buyDefense(), { width: 180, height: 64, fontSize: 17 }).setDepth(401);
      this.heldPreview = this.add.container(groupCenter + 110, height - 60).setDepth(401);
      this.heldIcon = this.add.image(0, 0, 'tex-defense-archer').setVisible(false);
      this.heldLabel = this.add.text(0, 34, '', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f2e2b8' }).setOrigin(0.5).setVisible(false);
      this.cancelBtn = this.add.text(58, -20, '✕', { fontSize: '22px', color: '#e74c3c', fontStyle: 'bold' })
        .setOrigin(0.5).setVisible(false).setInteractive({ useHandCursor: true });
      this.cancelBtn.on('pointerdown', () => this.cancelHeld());
      this.heldPreview.add([this.heldIcon, this.heldLabel, this.cancelBtn]);
      this.previewMarker = this.add.image(0, 0, 'tex-valid-preview').setVisible(false).setDepth(50);
      this.rangeRing = this.add.image(0, 0, 'tex-range-ring').setVisible(false).setDepth(49).setAlpha(0.5);

      this.input.on('pointermove', p => this.updateHeldPreview(p));
    }

    buyDefense() {
      if (this.paused || this.runEnded) return;
      if (this.held) { this.floatText(this.buyBtn.x, this.scale.height - 110, 'Posicione a defesa na mão primeiro', '#e74c3c'); return; }
      if (this.money < this.buyCost) { this.floatText(this.buyBtn.x, this.scale.height - 110, 'Moedas insuficientes', '#e74c3c'); return; }
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
      this.held = { defenseId: pick, level: 1, paidCost: paid };
      this.closeTowerPanel();

      this.heldIcon.setTexture(`tex-defense-${pick}`).setVisible(true);
      this.heldLabel.setText(D.DEFENSES[pick].name).setVisible(true);
      this.cancelBtn.setVisible(true);
      this.buyBtn.list[1].setText(`Comprar (${this.buyCost})`);
      AUDIO.buy();
      this.floatText(this.buyBtn.x, this.scale.height - 110, `${D.DEFENSES[pick].name}!`, this.rarityColorHex(D.DEFENSES[pick].rarity));
      this.updateHud();
      this.persistRunSnapshot();
    }

    cancelHeld() {
      if (!this.held || this.paused) return;
      this.money += this.held.paidCost || 0;   // devolve o valor pago; o custo crescente nao volta
      this.floatText(this.buyBtn.x, this.scale.height - 110, `+${this.held.paidCost} (cancelado)`, '#cbb98a');
      AUDIO.uiClick();
      this.clearHeld();
      this.updateHud();
      this.persistRunSnapshot();
    }

    clearHeld() {
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setVisible(false);
      this.cancelBtn.setVisible(false);
      this.previewMarker.setVisible(false);
      this.rangeRing.setVisible(false);
    }

    rarityColorHex(rarity) {
      return '#' + D.RARITY[rarity].color.toString(16).padStart(6, '0');
    }

    // ---------- posicionamento ----------
    distanceToPath(x, y) {
      const path = D.MAP.path;
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

    isValidPlacement(x, y, defenseId) {
      const def = D.DEFENSES[defenseId];
      const margin = 20;
      if (x < margin || y < margin + 60 || x > D.MAP.width - margin || y > D.MAP.height - margin) return false;
      const dist = this.distanceToPath(x, y);
      if (def.onPath) {
        if (dist > D.MAP.trapPathRadius) return false;
      } else {
        if (dist < D.MAP.towerPathRadius) return false;
        for (const t of this.towers) {
          if (Math.hypot(t.x - x, t.y - y) < D.MAP.towerMinGap) return false;
        }
      }
      return true;
    }

    updateHeldPreview(pointer) {
      if (!this.held || this.paused) { if (!this.selectedTower) { this.previewMarker.setVisible(false); this.rangeRing.setVisible(false); } return; }
      const p = this.toWorldPoint(pointer);
      const def = D.DEFENSES[this.held.defenseId];
      const valid = this.isValidPlacement(p.x, p.y, this.held.defenseId);
      this.previewMarker.setTexture(valid ? 'tex-valid-preview' : 'tex-invalid-preview').setPosition(p.x, p.y).setVisible(true);
      const radius = def.auraRadius ? this.towerStat(this.held.defenseId, 'auraRadius') : (def.range ? this.towerStat(this.held.defenseId, 'range') * (1 + (this.effects.rangeMult || 0)) : 0);
      if (radius) {
        this.rangeRing.setPosition(p.x, p.y).setDisplaySize(radius * 2, radius * 2).setVisible(true);
      } else {
        this.rangeRing.setVisible(false);
      }
    }

    toWorldPoint(pointer) {
      return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    }

    onMapTap(pointer, currentlyOver) {
      if (this.paused || this.runEnded) return;
      if (currentlyOver && currentlyOver.length) return;      // clique caiu num botao/painel
      if (pointer.y < 70) return;                              // HUD superior
      if (pointer.y > this.scale.height - 130) return;         // faixa de comandos inferior
      const p = this.toWorldPoint(pointer);

      if (!this.held) {
        const tower = this.towers.find(t => Math.hypot(t.x - p.x, t.y - p.y) < 42);
        if (tower) this.openTowerPanel(tower);
        else this.closeTowerPanel();
        return;
      }

      const fuseTarget = this.towers.find(t => Math.hypot(t.x - p.x, t.y - p.y) < 40 && t.defenseId === this.held.defenseId && t.level === this.held.level);
      if (fuseTarget) { this.fuseTower(fuseTarget); return; }

      if (!this.isValidPlacement(p.x, p.y, this.held.defenseId)) {
        this.floatText(p.x, p.y - 30, 'Posição inválida', '#e74c3c');
        AUDIO.invalid();
        UI.screenShake(this, 0.003, 100);
        return;
      }
      this.placeTower(this.held.defenseId, this.held.level, p.x, p.y);
      AUDIO.place();
      this.clearHeld();
      this.persistRunSnapshot();
    }

    placeTower(defenseId, level, x, y, silent, targeting) {
      const def = D.DEFENSES[defenseId];
      const sprite = this.add.image(x, y, `tex-defense-${defenseId}`);
      const tower = { defenseId, level, x, y, sprite, lastFire: 0, targetCooldowns: new Map(), targeting: targeting || 'first', auraRing: null };
      const baseScale = 1 + (level - 1) * 0.12;
      sprite.setScale(baseScale);
      if (def.auraRadius) {
        const r = this.towerStat(defenseId, 'auraRadius') * (1 + (level - 1) * 0.15);
        tower.auraRing = this.add.circle(x, y, r, def.color, 0.07).setStrokeStyle(2, def.color, 0.35).setDepth(20);
      }
      this.towers.push(tower);
      if (!silent) {
        // squash & stretch: achata no impacto e volta com overshoot (game-feel)
        sprite.setScale(baseScale * 1.3, baseScale * 0.7);
        this.tweens.add({ targets: sprite, scaleX: baseScale, scaleY: baseScale, duration: 220, ease: 'Back.Out' });
      }
    }

    fuseTower(tower) {
      const maxLevel = D.MAX_FUSION_LEVEL + (this.effects.maxFusionBonus || 0);
      if (tower.level >= maxLevel) {
        this.floatText(tower.x, tower.y - 40, 'Nível máximo', '#e0a52a');
        this.clearHeld();
        return;
      }
      tower.level += 1;
      const baseScale = 1 + (tower.level - 1) * 0.12;
      tower.sprite.setScale(baseScale * 1.35, baseScale * 0.65);
      this.tweens.add({ targets: tower.sprite, scaleX: baseScale, scaleY: baseScale, duration: 260, ease: 'Back.Out' });
      if (tower.auraRing) {
        const r = this.towerStat(tower.defenseId, 'auraRadius') * (1 + (tower.level - 1) * 0.15);
        tower.auraRing.setRadius(r);
      }
      this.spawnFusionFx(tower.x, tower.y);
      AUDIO.fuse();
      this.hitStop(60);
      this.clearHeld();
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
      this.selectedTower = tower;
      const { width, height } = this.scale;
      const def = D.DEFENSES[tower.defenseId];

      const radius = def.auraRadius ? this.towerStat(tower.defenseId, 'auraRadius') * (1 + (tower.level - 1) * 0.15) : this.towerStat(tower.defenseId, 'range') * (1 + (this.effects.rangeMult || 0));
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
          targetBtn.list[1].setText(`Alvo: ${TARGETING_LABELS[tower.targeting]}`);
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
      this.closeTowerPanel();
      this.updateHud();
      this.persistRunSnapshot();
    }

    // ---------- ondas ----------
    startNextWave() {
      if (this.paused || this.runEnded || this.waveActive || this.waveIndex >= D.WAVES.length) return;
      this.waveActive = true;
      this.waveBtn.setAlpha(0.4);
      AUDIO.waveStart();
      const wave = D.WAVES[this.waveIndex];
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
      const start = D.MAP.path[0];
      const sprite = this.physics.add.sprite(start.x, start.y, `tex-enemy-${enemyId}`);
      sprite.body.setAllowGravity(false);
      sprite.body.setCircle(sprite.width / 2.4, sprite.width * 0.08, sprite.height * 0.08);
      this.enemyGroup.add(sprite);
      if (def.isBoss) sprite.setScale(1.15);
      // Escala geometrica: cada onda multiplica o HP base (pressao de upgrade constante)
      const hpMult = Math.pow(D.HP_GROWTH, this.waveIndex);
      const hp = Math.round(def.hp * hpMult);
      const hpBar = this.add.rectangle(start.x, start.y - 30, 40, 6, 0x2ecc71).setDepth(60);
      const enemy = {
        id: enemyId, def, hp, maxHp: hp, sprite, hpBar,
        pathIndex: 1, slowUntil: 0, slowFactor: 1
      };
      sprite.setData('ref', enemy);
      this.enemies.push(enemy);
      this.steerEnemy(enemy);
    }

    steerEnemy(e) {
      const path = D.MAP.path;
      const target = path[e.pathIndex];
      if (!target) return;
      const speed = e.def.speed * ((this.battleTime < e.slowUntil) ? e.slowFactor : 1);
      const dx = target.x - e.sprite.x, dy = target.y - e.sprite.y;
      const dist = Math.hypot(dx, dy) || 1;
      e.sprite.body.setVelocity((dx / dist) * speed, (dy / dist) * speed);
    }

    checkWaveComplete() {
      if (!this.waveActive) return;
      const allSpawned = this.spawnTimers.every(t => !t.getRemaining || t.getRemaining() <= 0);
      if (allSpawned && this.enemies.length === 0) {
        this.waveActive = false;
        this.waveIndex += 1;
        this.spawnTimers = [];
        if (this.waveIndex >= D.WAVES.length) {
          this.onVictory();
        } else {
          const bonus = Math.round(D.WAVE_CLEAR_BONUS * (1 + (this.effects.bountyMult || 0)));
          this.money += bonus;
          this.floatText(this.scale.width / 2, 180, `Onda vencida! +${bonus}`, '#2ecc71');
          this.waveBtn.setAlpha(1);
          this.waveBtn.list[1].setText(`Iniciar ${D.WAVES[this.waveIndex].label}`);
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
      const path = D.MAP.path;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        const target = path[e.pathIndex];
        if (!target) { this.enemyReachedEnd(e, i); continue; }
        const distToTarget = Math.hypot(target.x - e.sprite.x, target.y - e.sprite.y);
        if (distToTarget < ARRIVAL_THRESHOLD) {
          e.pathIndex += 1;
          if (!path[e.pathIndex]) { this.enemyReachedEnd(e, i); continue; }
        }
        this.steerEnemy(e);
        e.hpBar.setPosition(e.sprite.x, e.sprite.y - 30);
        e.hpBar.width = 40 * Math.max(0, e.hp / e.maxHp);
      }
    }

    enemyReachedEnd(e, index) {
      this.archiveHp = Math.max(0, this.archiveHp - 1);
      e.sprite.destroy(); e.hpBar.destroy();
      this.enemies.splice(index, 1);
      AUDIO.baseHit();
      UI.screenShake(this, 0.008, 200);
      this.updateHud();
      if (this.archiveHp <= 0) this.onDefeat();
    }

    updateTowers() {
      const now = this.battleTime;
      for (const tower of this.towers) {
        const def = D.DEFENSES[tower.defenseId];
        if (def.auraRadius) continue;                          // suporte nao ataca
        if (def.onPath) { this.updateTrapTower(tower, def, now); continue; }
        const rate = this.towerStat(tower.defenseId, 'rate');
        if (now - tower.lastFire < rate) continue;
        const range = this.towerStat(tower.defenseId, 'range') * (1 + (this.effects.rangeMult || 0));
        const target = this.findTarget(tower, range);
        if (target) { this.fireProjectile(tower, target, def); tower.lastFire = now; }
      }
    }

    updateTrapTower(tower, def, now) {
      const nearby = this.enemiesInRadius(tower.x, tower.y, D.MAP.trapPathRadius);
      const rate = this.towerStat(tower.defenseId, 'rate');
      nearby.forEach(e => {
        const cd = tower.targetCooldowns.get(e) || 0;
        if (now - cd < rate) return;
        tower.targetCooldowns.set(e, now);
        this.damageEnemy(e, this.computeDamage(tower));
        e.slowUntil = now + this.towerStat(tower.defenseId, 'slowDuration');
        e.slowFactor = 1 - this.towerStat(tower.defenseId, 'slowFactor');
      });
    }

    enemiesInRadius(x, y, radius) {
      const bodies = this.physics.world.overlapCirc(x, y, radius, true, false);
      const found = [];
      bodies.forEach(body => {
        const ref = body.gameObject && body.gameObject.getData && body.gameObject.getData('ref');
        if (ref) found.push(ref);
      });
      return found;
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
        const r = this.towerStat(t.defenseId, 'auraRadius') * (1 + (t.level - 1) * 0.15);
        if (Math.hypot(t.x - x, t.y - y) <= r) {
          bonus += this.towerStat(t.defenseId, 'auraDamageMult') * (1 + (t.level - 1) * 0.5);
        }
      }
      return bonus;
    }

    fireProjectile(tower, target, def) {
      let texKey = 'tex-arrow';
      if (tower.defenseId === 'fire') texKey = 'tex-fireball';
      if (tower.defenseId === 'ballista') texKey = 'tex-bolt';
      if (tower.defenseId === 'relic') texKey = 'tex-relic-orb';

      const spr = this.projectileGroup.get(tower.x, tower.y - 20, texKey);
      if (!spr) return;
      spr.setActive(true).setVisible(true).setTexture(texKey);
      if (!spr.body) this.physics.world.enable(spr);
      spr.body.setAllowGravity(false);
      spr.body.reset(tower.x, tower.y - 20);
      spr.setData('dmg', this.computeDamage(tower));
      spr.setData('def', def);
      spr.setData('towerId', tower.defenseId);
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

      let pierceLeft = proj.getData('pierceLeft');
      if (pierceLeft > 0) {
        proj.setData('pierceLeft', pierceLeft - 1);
      } else {
        this.retireProjectile(proj);
      }
    }

    explodeAt(x, y, towerId, dmg, exclude) {
      const radius = this.towerStat(towerId, 'aoeRadius');
      this.enemiesInRadius(x, y, radius).forEach(e => {
        if (e === exclude) return;
        this.damageEnemy(e, dmg * 0.6);
      });
      const ring = this.add.circle(x, y, radius, 0xffb35a, 0.25).setDepth(45);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 260, onComplete: () => ring.destroy() });
    }

    damageEnemy(e, amount) {
      const armor = e.def.armor || 0;
      const dmg = Math.max(1, amount - armor);
      e.hp -= dmg;
      this.floatText(e.sprite.x, e.sprite.y - 40, `-${Math.round(dmg)}`, '#ffffff');
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
      e.hpBar.destroy();
      this.tweens.add({ targets: e.sprite, scale: e.sprite.scale * 1.45, alpha: 0, duration: 200, ease: 'Cubic.Out', onComplete: () => e.sprite.destroy() });
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
      const coinsReward = Math.round(220 * winCoinMult);
      const xpReward = Math.round(110 * xpMult);
      const fragmentsReward = Math.round(6 * fragmentMult);

      state.profile.coins += coinsReward;
      state.profile.xp += xpReward;
      this.applyLevelUp(state);
      this.loadout.forEach(id => { state.collection[id].fragments += fragmentsReward; });
      state.stats.wins = (state.stats.wins || 0) + 1;
      state.run = null;
      SAVE.save(state, true);

      this.showEndOverlay(true, coinsReward, xpReward, fragmentsReward);
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

    showEndOverlay(victory, coins, xp, fragments) {
      const { width, height } = this.scale;
      const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.65).setOrigin(0).setDepth(500);
      const box = UI.makePanel(this, width / 2, height / 2, 460, 320).setDepth(501);
      const title = this.add.text(width / 2, height / 2 - 120, victory ? 'Vitória!' : 'O Arquivo Caiu', {
        fontFamily: 'Georgia, serif', fontSize: '30px', color: victory ? '#2ecc71' : '#e74c3c', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(502);
      let detail = '';
      if (victory) detail = `+${coins} moedas\n+${xp} XP\n+${fragments} fragmentos por defesa equipada`;
      const desc = this.add.text(width / 2, height / 2 - 40, detail, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a2c1a', align: 'center'
      }).setOrigin(0.5).setDepth(502);
      UI.makeButton(this, width / 2, height / 2 + 100, 'Voltar ao Menu', () => this.scene.start('Menu'), { width: 260, height: 60 }).setDepth(502);
    }

    persistRunSnapshot() {
      this.state.run = {
        active: !this.runEnded,
        wave: this.waveIndex,
        hp: this.archiveHp,
        maxHp: this.maxArchiveHp,
        money: this.money,
        buyCost: this.buyCost,
        buyCount: this.buyCount,
        randomSeed: this.rngSeed,
        loadout: this.loadout,
        towers: this.towers.map(t => ({ defenseId: t.defenseId, level: t.level, x: t.x, y: t.y, targeting: t.targeting }))
      };
      SAVE.save(this.state);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BattleScene = BattleScene;
})(window);
