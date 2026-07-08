/* Caminho dos Guardioes - BattleScene: loop central do tower defense (Arcade Physics + pooling + audio + pausa real) */
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
  const ARRIVAL_THRESHOLD = 6;
  const TEXT_POOL_SIZE = 28;
  const PROJECTILE_POOL_SIZE = 60;

  class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    init(data) {
      this.wantsResume = Boolean(data.resume);
      this.loadout = data.loadout || [];
    }

    create() {
      const state = this.registry.get('state');
      this.state = state;
      const effects = this.computeClassEffects();
      this.effects = effects;
      this.paused = false;
      this.runEnded = false;

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
        this.buyCost = Math.round(BASE_BUY_COST * (1 + (effects.buyCostMult || 0)));
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
      this.input.on('pointerdown', p => this.onMapTap(p));
      this.physics.add.overlap(this.projectileGroup, this.enemyGroup, (proj, enemySprite) => this.onProjectileHitEnemy(proj, enemySprite));

      if (isResume && run.towers) {
        run.towers.forEach(t => this.placeTower(t.defenseId, t.level, t.x, t.y, true));
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

    // ---------- mapa ----------
    buildMap() {
      const { width, height } = this.scale;
      const hasMapArt = this.textures.exists('tex-map-bg');
      if (hasMapArt) {
        this.add.image(width / 2, height / 2, 'tex-map-bg').setDisplaySize(width, height);
      } else {
        this.add.tileSprite(0, 0, width, height, 'tex-ground').setOrigin(0);
      }

      // O caminho sempre e desenhado por cima: garante que a rota fique visivel e
      // consistente mesmo se o mapa de fundo (procedural ou arte real) mudar depois.
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

      this.menuBtn = this.add.text(width - 24, 28, '☰', { fontSize: '26px', color: '#f2e2b8' }).setOrigin(1, 0.5).setDepth(401).setInteractive({ useHandCursor: true });
      this.menuBtn.on('pointerdown', () => this.openPauseMenu());
      UI.muteButton(this, width - 60, 28).setDepth(401);

      this.waveBtn = UI.makeButton(this, width - 150, 90, 'Iniciar Onda', () => this.startNextWave(), { width: 190, height: 50, fontSize: 15 }).setDepth(401);
      if (this.waveIndex > 0) this.waveBtn.list[1].setText(`Iniciar ${D.WAVES[Math.min(this.waveIndex, D.WAVES.length - 1)].label}`);

      this.updateHud();
    }

    updateHud() {
      this.hpText.setText(`Arquivo: ${this.archiveHp}/${this.maxArchiveHp}`);
      this.moneyText.setText(`${this.money} moedas`);
      const total = D.WAVES.length;
      this.waveText.setText(this.waveActive ? `${D.WAVES[this.waveIndex].label}` : (this.waveIndex >= total ? 'Vitória!' : `Pronto para ${D.WAVES[this.waveIndex].label}`));
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
      this.physics.world.resume();
      this.time.paused = false;
      overlay.destroy();
    }

    exitToMenu(overlay) {
      overlay.destroy();
      this.persistRunSnapshot();
      this.scene.start('Menu');
    }

    // ---------- botao de compra ----------
    buildBuyArea() {
      const { width, height } = this.scale;
      this.buyBtn = UI.makeButton(this, 110, height - 60, `Comprar (${this.buyCost})`, () => this.buyDefense(), { width: 190, height: 64, fontSize: 18 }).setDepth(401);
      this.heldPreview = this.add.container(320, height - 60).setDepth(401);
      this.heldIcon = this.add.image(0, 0, 'tex-defense-archer').setVisible(false);
      this.heldLabel = this.add.text(0, 34, '', { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#f2e2b8' }).setOrigin(0.5).setVisible(false);
      this.heldPreview.add([this.heldIcon, this.heldLabel]);
      this.previewMarker = this.add.image(0, 0, 'tex-valid-preview').setVisible(false).setDepth(50);
      this.rangeRing = this.add.image(0, 0, 'tex-range-ring').setVisible(false).setDepth(49).setAlpha(0.5);

      this.input.on('pointermove', p => this.updateHeldPreview(p));
    }

    buyDefense() {
      if (this.paused) return;
      if (this.held) { this.floatText(110, this.scale.height - 110, 'Posicione a defesa na mão primeiro', '#e74c3c'); return; }
      if (this.money < this.buyCost) { this.floatText(110, this.scale.height - 110, 'Moedas insuficientes', '#e74c3c'); return; }
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

      this.money -= this.buyCost;
      this.buyCount += 1;
      this.buyCost = Math.round((BASE_BUY_COST + this.buyCount * BUY_COST_INCREMENT) * (1 + (this.effects.buyCostMult || 0)));
      this.held = { defenseId: pick, level: 1 };

      this.heldIcon.setTexture(`tex-defense-${pick}`).setVisible(true);
      this.heldLabel.setText(D.DEFENSES[pick].name).setVisible(true);
      this.buyBtn.list[1].setText(`Comprar (${this.buyCost})`);
      AUDIO.buy();
      this.floatText(110, this.scale.height - 110, `${D.DEFENSES[pick].name}!`, this.rarityColorHex(D.DEFENSES[pick].rarity));
      this.updateHud();
      this.persistRunSnapshot();
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
      if (!this.held || this.paused) { this.previewMarker.setVisible(false); this.rangeRing.setVisible(false); return; }
      const p = this.toWorldPoint(pointer);
      const def = D.DEFENSES[this.held.defenseId];
      const valid = this.isValidPlacement(p.x, p.y, this.held.defenseId);
      this.previewMarker.setTexture(valid ? 'tex-valid-preview' : 'tex-invalid-preview').setPosition(p.x, p.y).setVisible(true);
      if (def.range) {
        this.rangeRing.setPosition(p.x, p.y).setDisplaySize(def.range * 2, def.range * 2).setVisible(true);
      } else {
        this.rangeRing.setVisible(false);
      }
    }

    toWorldPoint(pointer) {
      return this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    }

    onMapTap(pointer) {
      if (this.paused) return;
      if (pointer.y < 70) return; // evita HUD
      if (!this.held) return;
      const p = this.toWorldPoint(pointer);

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
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setVisible(false);
      this.previewMarker.setVisible(false);
      this.rangeRing.setVisible(false);
      this.persistRunSnapshot();
    }

    placeTower(defenseId, level, x, y, silent) {
      const sprite = this.add.image(x, y, `tex-defense-${defenseId}`);
      const tower = { defenseId, level, x, y, sprite, lastFire: 0, targetCooldowns: new Map() };
      sprite.setScale(1 + (level - 1) * 0.12);
      this.towers.push(tower);
      if (!silent) this.tweens.add({ targets: sprite, scaleX: sprite.scaleX * 1.15, scaleY: sprite.scaleY * 1.15, duration: 90, yoyo: true });
    }

    fuseTower(tower) {
      const maxLevel = D.MAX_FUSION_LEVEL + (this.effects.maxFusionBonus || 0);
      if (tower.level >= maxLevel) {
        this.floatText(tower.x, tower.y - 40, 'Nível máximo', '#e0a52a');
        this.held = null; this.heldIcon.setVisible(false); this.heldLabel.setVisible(false);
        return;
      }
      tower.level += 1;
      tower.sprite.setScale(1 + (tower.level - 1) * 0.12);
      this.spawnFusionFx(tower.x, tower.y);
      AUDIO.fuse();
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setVisible(false);
      this.previewMarker.setVisible(false);
      this.rangeRing.setVisible(false);
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

    // ---------- ondas ----------
    startNextWave() {
      if (this.paused || this.waveActive || this.waveIndex >= D.WAVES.length) return;
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
    }

    spawnEnemy(enemyId) {
      const def = D.ENEMIES[enemyId];
      const start = D.MAP.path[0];
      const sprite = this.physics.add.sprite(start.x, start.y, `tex-enemy-${enemyId}`);
      sprite.body.setAllowGravity(false);
      sprite.body.setCircle(sprite.width / 2.4, sprite.width * 0.08, sprite.height * 0.08);
      this.enemyGroup.add(sprite);
      if (def.isBoss) sprite.setScale(1.15);
      const hpBar = this.add.rectangle(start.x, start.y - 30, 40, 6, 0x2ecc71).setDepth(60);
      const enemy = {
        id: enemyId, def, hp: def.hp, maxHp: def.hp, sprite, hpBar,
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
      const speed = e.def.speed * ((this.time.now < e.slowUntil) ? e.slowFactor : 1);
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
          this.waveBtn.setAlpha(1);
          this.waveBtn.list[1].setText(`Iniciar ${D.WAVES[this.waveIndex].label}`);
        }
        this.persistRunSnapshot();
        this.updateHud();
      }
    }

    // ---------- update loop ----------
    update(time) {
      if (this.runEnded || this.paused) return;
      this.updateEnemies(time);
      this.updateTowers(time);
      this.checkWaveComplete();
    }

    updateEnemies(time) {
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

    updateTowers(time) {
      for (const tower of this.towers) {
        const def = D.DEFENSES[tower.defenseId];
        const range = def.range * (1 + (this.effects.rangeMult || 0));
        if (def.onPath) {
          this.updateTrapTower(tower, def, time);
          continue;
        }
        if (time - tower.lastFire < def.rate) continue;
        const target = this.findTarget(tower.x, tower.y, range);
        if (target) { this.fireProjectile(tower, target, def); tower.lastFire = time; }
      }
    }

    updateTrapTower(tower, def, time) {
      const nearby = this.enemiesInRadius(tower.x, tower.y, D.MAP.trapPathRadius);
      nearby.forEach(e => {
        const cd = tower.targetCooldowns.get(e) || 0;
        if (time - cd < def.rate) return;
        tower.targetCooldowns.set(e, time);
        this.damageEnemy(e, this.scaledDamage(def, tower.level));
        e.slowUntil = time + def.slowDuration;
        e.slowFactor = 1 - def.slowFactor;
      });
    }

    // usa a query espacial da propria fisica do Phaser (overlapCirc) em vez de varrer tudo na mao
    enemiesInRadius(x, y, radius) {
      const bodies = this.physics.world.overlapCirc(x, y, radius, true, false);
      const found = [];
      bodies.forEach(body => {
        const ref = body.gameObject && body.gameObject.getData && body.gameObject.getData('ref');
        if (ref) found.push(ref);
      });
      return found;
    }

    findTarget(x, y, range) {
      const candidates = this.enemiesInRadius(x, y, range);
      let best = null, bestProgress = -1;
      candidates.forEach(e => {
        const score = e.pathIndex * 100000 - Math.hypot(e.sprite.x - x, e.sprite.y - y);
        if (score > bestProgress) { bestProgress = score; best = e; }
      });
      return best;
    }

    scaledDamage(def, level) {
      const lvlMult = 1 + (level - 1) * 0.6;
      const fusionMult = level > 1 ? (1 + (this.effects.fusionDamageMult || 0)) : 1;
      return def.damage * lvlMult * fusionMult;
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
      spr.setData('def', def);
      spr.setData('level', tower.level);
      spr.setData('pierceLeft', def.pierce || 0);
      spr.setData('hitSet', new Set());
      const fireToken = (spr.getData('fireToken') || 0) + 1;
      spr.setData('fireToken', fireToken);

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
      const level = proj.getData('level');
      const dmg = this.scaledDamage(def, level);
      this.damageEnemy(ref, dmg);
      if (def.aoeRadius) this.explodeAt(proj.x, proj.y, def, level, ref);

      let pierceLeft = proj.getData('pierceLeft');
      if (pierceLeft > 0) {
        proj.setData('pierceLeft', pierceLeft - 1);
      } else {
        this.retireProjectile(proj);
      }
    }

    explodeAt(x, y, def, level, exclude) {
      const radius = def.aoeRadius;
      this.enemiesInRadius(x, y, radius).forEach(e => {
        if (e === exclude) return;
        this.damageEnemy(e, this.scaledDamage(def, level) * 0.6);
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
      if (e.def.isBoss) UI.screenShake(this, 0.012, 260);
      this.floatText(e.sprite.x, e.sprite.y - 20, `+${bounty}`, '#e0a52a');
      e.sprite.destroy(); e.hpBar.destroy();
      this.enemies.splice(idx, 1);
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
      const coinsReward = Math.round(120 * winCoinMult);
      const xpReward = Math.round(60 * xpMult);
      const fragmentsReward = Math.round(4 * fragmentMult);

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
        towers: this.towers.map(t => ({ defenseId: t.defenseId, level: t.level, x: t.x, y: t.y }))
      };
      SAVE.save(this.state);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BattleScene = BattleScene;
})(window);
