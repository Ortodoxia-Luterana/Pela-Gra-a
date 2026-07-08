/* Caminho dos Guardioes - BattleScene: loop central do tower defense */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;
  const SAVE = global.GuardioesSave;

  const BASE_START_HP = 20;
  const BASE_START_MONEY = 120;
  const BASE_BUY_COST = 40;
  const BUY_COST_INCREMENT = 6;

  class BattleScene extends Phaser.Scene {
    constructor() { super('Battle'); }

    init(data) { this.loadout = data.loadout || []; }

    create() {
      const state = this.registry.get('state');
      this.state = state;
      const effects = this.computeClassEffects();
      this.effects = effects;

      this.rngSeed = (state.run && state.run.randomSeed) || SAVE.randomSeed();
      this.rng = SAVE.mulberry32(this.rngSeed);

      this.archiveHp = BASE_START_HP;
      this.maxArchiveHp = BASE_START_HP;
      this.money = BASE_START_MONEY;
      this.buyCost = Math.round(BASE_BUY_COST * (1 + (effects.buyCostMult || 0)));
      this.buyCount = 0;
      this.held = null; // { defenseId, level }
      this.towers = []; // { defenseId, level, x, y, sprite, lastFire, lastTick }
      this.enemies = [];
      this.projectiles = [];
      this.waveIndex = 0;
      this.waveActive = false;
      this.spawnQueue = [];
      this.spawnTimers = [];
      this.runEnded = false;

      this.buildMap();
      this.buildHud();
      this.buildBuyArea();
      this.input.on('pointerdown', p => this.onMapTap(p));

      this.state.run = { active: true, wave: this.waveIndex, hp: this.archiveHp, money: this.money, randomSeed: this.rngSeed };
      SAVE.save(this.state);
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

    // ---------- mapa ----------
    buildMap() {
      const { width, height } = this.scale;
      this.add.tileSprite(0, 0, width, height, 'tex-ground').setOrigin(0);

      const g = this.add.graphics();
      const path = D.MAP.path;
      g.lineStyle(96, 0x8a6a45, 1);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
      g.strokePath();
      g.lineStyle(4, 0x6f5636, 0.6);
      g.beginPath();
      g.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) g.lineTo(path[i].x, path[i].y);
      g.strokePath();

      this.placementLayer = this.add.container(0, 0);
    }

    // ---------- HUD ----------
    buildHud() {
      const width = this.scale.width;
      this.hudBar = this.add.rectangle(width / 2, 30, width, 60, 0x1c1712, 0.82).setOrigin(0.5).setDepth(400);
      this.hpText = this.add.text(20, 16, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#e74c3c', fontStyle: 'bold' }).setDepth(401);
      this.moneyText = this.add.text(20, 40, '', { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#e0a52a' }).setDepth(401);
      this.waveText = this.add.text(width / 2, 28, '', { fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e2b8', fontStyle: 'bold' }).setOrigin(0.5).setDepth(401);

      this.menuBtn = this.add.text(width - 24, 28, '☰', { fontSize: '26px', color: '#f2e2b8' }).setOrigin(1, 0.5).setDepth(401).setInteractive({ useHandCursor: true });
      this.menuBtn.on('pointerdown', () => this.pauseToMenu());

      this.waveBtn = UI.makeButton(this, width - 130, 90, 'Iniciar Onda', () => this.startNextWave(), { width: 190, height: 50, fontSize: 15 }).setDepth(401);

      this.updateHud();
    }

    updateHud() {
      this.hpText.setText(`Arquivo: ${this.archiveHp}/${this.maxArchiveHp}`);
      this.moneyText.setText(`${this.money} moedas`);
      const total = D.WAVES.length;
      this.waveText.setText(this.waveActive ? `${D.WAVES[this.waveIndex].label}` : (this.waveIndex >= total ? 'Vitória!' : `Pronto para ${D.WAVES[this.waveIndex].label}`));
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
      if (this.held) { UI.floatingText(this, 110, this.scale.height - 110, 'Posicione a defesa na mão primeiro', '#e74c3c'); return; }
      if (this.money < this.buyCost) { UI.floatingText(this, 110, this.scale.height - 110, 'Moedas insuficientes', '#e74c3c'); return; }
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
      UI.floatingText(this, 110, this.scale.height - 110, `${D.DEFENSES[pick].name}!`, this.rarityColorHex(D.DEFENSES[pick].rarity));
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
      if (!this.held) { this.previewMarker.setVisible(false); this.rangeRing.setVisible(false); return; }
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
      if (pointer.y < 70) return; // evita HUD
      if (!this.held) return;
      const p = this.toWorldPoint(pointer);

      const fuseTarget = this.towers.find(t => Math.hypot(t.x - p.x, t.y - p.y) < 40 && t.defenseId === this.held.defenseId && t.level === this.held.level);
      if (fuseTarget) { this.fuseTower(fuseTarget); return; }

      if (!this.isValidPlacement(p.x, p.y, this.held.defenseId)) {
        UI.floatingText(this, p.x, p.y - 30, 'Posição inválida', '#e74c3c');
        UI.screenShake(this, 0.003, 100);
        return;
      }
      this.placeTower(this.held.defenseId, this.held.level, p.x, p.y);
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setVisible(false);
      this.previewMarker.setVisible(false);
      this.rangeRing.setVisible(false);
      this.persistRunSnapshot();
    }

    placeTower(defenseId, level, x, y) {
      const sprite = this.add.image(x, y, `tex-defense-${defenseId}`);
      const tower = { defenseId, level, x, y, sprite, lastFire: 0, lastTick: 0, targetCooldowns: new Map() };
      sprite.setScale(1 + (level - 1) * 0.12);
      this.towers.push(tower);
      this.tweens.add({ targets: sprite, scaleX: sprite.scaleX * 1.15, scaleY: sprite.scaleY * 1.15, duration: 90, yoyo: true });
    }

    fuseTower(tower) {
      const maxLevel = D.MAX_FUSION_LEVEL + (this.effects.maxFusionBonus || 0);
      if (tower.level >= maxLevel) {
        UI.floatingText(this, tower.x, tower.y - 40, 'Nível máximo', '#e0a52a');
        this.held = null; this.heldIcon.setVisible(false); this.heldLabel.setVisible(false);
        return;
      }
      tower.level += 1;
      tower.sprite.setScale(1 + (tower.level - 1) * 0.12);
      this.spawnFusionFx(tower.x, tower.y);
      this.held = null;
      this.heldIcon.setVisible(false);
      this.heldLabel.setVisible(false);
      this.previewMarker.setVisible(false);
      this.rangeRing.setVisible(false);
      this.persistRunSnapshot();
    }

    spawnFusionFx(x, y) {
      UI.floatingText(this, x, y - 50, 'Fusão!', '#2ecc71');
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
      if (this.waveActive || this.waveIndex >= D.WAVES.length) return;
      this.waveActive = true;
      this.waveBtn.setAlpha(0.4);
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
      const sprite = this.add.image(start.x, start.y, `tex-enemy-${enemyId}`);
      if (def.isBoss) sprite.setScale(1.15);
      const hpBar = this.add.rectangle(start.x, start.y - 30, 40, 6, 0x2ecc71).setDepth(60);
      const enemy = {
        id: enemyId, def, hp: def.hp, maxHp: def.hp, sprite, hpBar,
        pathIndex: 0, progress: 0, slowUntil: 0, slowFactor: 1
      };
      this.enemies.push(enemy);
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
    update(time, delta) {
      if (this.runEnded) return;
      this.updateEnemies(time, delta);
      this.updateTowers(time, delta);
      this.updateProjectiles(time, delta);
      this.checkWaveComplete();
    }

    updateEnemies(time, delta) {
      const path = D.MAP.path;
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        let speed = e.def.speed;
        if (time < e.slowUntil) speed *= e.slowFactor;
        e.progress += (speed * delta) / 1000;

        let a = path[e.pathIndex], b = path[e.pathIndex + 1];
        if (!b) { this.enemyReachedEnd(e, i); continue; }
        let segLen = Math.hypot(b.x - a.x, b.y - a.y);
        while (e.progress > segLen && path[e.pathIndex + 2]) {
          e.progress -= segLen;
          e.pathIndex += 1;
          a = path[e.pathIndex]; b = path[e.pathIndex + 1];
          segLen = Math.hypot(b.x - a.x, b.y - a.y);
        }
        if (!path[e.pathIndex + 1]) { this.enemyReachedEnd(e, i); continue; }
        const t = segLen === 0 ? 0 : e.progress / segLen;
        const x = a.x + (b.x - a.x) * t;
        const y = a.y + (b.y - a.y) * t;
        e.sprite.setPosition(x, y);
        e.hpBar.setPosition(x, y - 30);
        e.hpBar.width = 40 * Math.max(0, e.hp / e.maxHp);
      }
    }

    enemyReachedEnd(e, index) {
      this.archiveHp = Math.max(0, this.archiveHp - 1);
      e.sprite.destroy(); e.hpBar.destroy();
      this.enemies.splice(index, 1);
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
      const triggerRadius = D.MAP.trapPathRadius;
      for (const e of this.enemies) {
        if (Math.hypot(e.sprite.x - tower.x, e.sprite.y - tower.y) > triggerRadius) continue;
        const cd = tower.targetCooldowns.get(e) || 0;
        if (time - cd < def.rate) continue;
        tower.targetCooldowns.set(e, time);
        this.damageEnemy(e, this.scaledDamage(def, tower.level));
        e.slowUntil = time + def.slowDuration;
        e.slowFactor = 1 - def.slowFactor;
      }
    }

    findTarget(x, y, range) {
      let best = null, bestProgress = -1;
      for (const e of this.enemies) {
        const d = Math.hypot(e.sprite.x - x, e.sprite.y - y);
        if (d > range) continue;
        const progressScore = e.pathIndex * 10000 + e.progress;
        if (progressScore > bestProgress) { bestProgress = progressScore; best = e; }
      }
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
      const sprite = this.add.image(tower.x, tower.y - 20, texKey);
      this.projectiles.push({
        sprite, target, tower, def, speed: def.projectileSpeed || 900,
        pierceLeft: def.pierce || 0, hitSet: new Set()
      });
    }

    updateProjectiles(time, delta) {
      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const p = this.projectiles[i];
        if (!p.target || !this.enemies.includes(p.target)) {
          if (p.def.aoeRadius) { this.explodeProjectile(p); }
          p.sprite.destroy(); this.projectiles.splice(i, 1); continue;
        }
        const tx = p.target.sprite.x, ty = p.target.sprite.y;
        const dx = tx - p.sprite.x, dy = ty - p.sprite.y;
        const dist = Math.hypot(dx, dy);
        const step = (p.speed * delta) / 1000;
        if (dist <= step) {
          this.resolveProjectileHit(p);
          p.sprite.destroy(); this.projectiles.splice(i, 1); continue;
        }
        p.sprite.setPosition(p.sprite.x + (dx / dist) * step, p.sprite.y + (dy / dist) * step);
        p.sprite.rotation = Math.atan2(dy, dx) + Math.PI / 2;
      }
    }

    resolveProjectileHit(p) {
      const dmg = this.scaledDamage(p.def, p.tower.level);
      this.damageEnemy(p.target, dmg);
      p.hitSet.add(p.target);
      if (p.def.aoeRadius) this.explodeProjectile(p);
      if (p.pierceLeft > 0) {
        const next = this.findTarget(p.sprite.x, p.sprite.y, p.def.range || 300);
        if (next && !p.hitSet.has(next)) { p.target = next; p.pierceLeft -= 1; return; }
      }
    }

    explodeProjectile(p) {
      const radius = p.def.aoeRadius;
      const x = p.sprite.x, y = p.sprite.y;
      this.enemies.forEach(e => {
        if (e === p.target) return;
        if (Math.hypot(e.sprite.x - x, e.sprite.y - y) <= radius) this.damageEnemy(e, this.scaledDamage(p.def, p.tower.level) * 0.6);
      });
      const ring = this.add.circle(x, y, radius, 0xffb35a, 0.25).setDepth(45);
      this.tweens.add({ targets: ring, alpha: 0, scale: 1.3, duration: 260, onComplete: () => ring.destroy() });
    }

    damageEnemy(e, amount) {
      const armor = e.def.armor || 0;
      const dmg = Math.max(1, amount - armor);
      e.hp -= dmg;
      UI.floatingText(this, e.sprite.x, e.sprite.y - 40, `-${Math.round(dmg)}`, '#ffffff');
      this.tweens.add({ targets: e.sprite, tint: 0xff6666, duration: 60, yoyo: true });
      if (e.hp <= 0) this.killEnemy(e);
    }

    killEnemy(e) {
      const idx = this.enemies.indexOf(e);
      if (idx === -1) return;
      const bounty = Math.round(e.def.bounty * (1 + (this.effects.bountyMult || 0)));
      this.money += bounty;
      if (e.def.isBoss) UI.screenShake(this, 0.012, 260);
      UI.floatingText(this, e.sprite.x, e.sprite.y - 20, `+${bounty}`, '#e0a52a');
      e.sprite.destroy(); e.hpBar.destroy();
      this.enemies.splice(idx, 1);
      this.updateHud();
    }

    // ---------- fim de partida ----------
    onVictory() {
      this.runEnded = true;
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

    pauseToMenu() {
      this.persistRunSnapshot();
      this.scene.start('Menu');
    }

    persistRunSnapshot() {
      this.state.run = {
        active: !this.runEnded,
        wave: this.waveIndex,
        hp: this.archiveHp,
        money: this.money,
        randomSeed: this.rngSeed
      };
      SAVE.save(this.state);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BattleScene = BattleScene;
})(window);
