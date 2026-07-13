import { ASSETS, WORLD } from './content.js';

const Phaser = window.Phaser;

export class JourneyScene extends Phaser.Scene {
  constructor(simulation, realtime) {
    super({ key: 'JourneyScene' });
    this.sim = simulation;
    this.realtime = realtime;
    this.enemyViews = new Map();
    this.damageBars = new Map();
    this.remoteViews = new Map();
  }

  preload() {
    this.load.image('babel-map', ASSETS.map);
    this.load.spritesheet('hero-male', ASSETS.heroMale, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    this.load.spritesheet('hero-female', ASSETS.heroFemale, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    this.load.spritesheet('frontier-enemies', ASSETS.enemies, { frameWidth: 320, frameHeight: 320, endFrame: 3 });
    this.load.image('stakes-boss', ASSETS.boss);
    this.load.image('ember-pet', ASSETS.companion);
  }

  create() {
    this.add.image(WORLD.width / 2, WORLD.height / 2, 'babel-map').setDisplaySize(WORLD.width, WORLD.height).setDepth(-1000);
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#071827');

    this.playerShadow = this.add.ellipse(this.sim.state.player.x, this.sim.state.player.y + 35, 70, 23, 0x071019, .34).setDepth(9);
    this.player = this.physics.add.sprite(this.sim.state.player.x, this.sim.state.player.y, this.heroKey(), 0).setOrigin(.5, .83).setDepth(10);
    this.player.setDisplaySize(92, 122);
    this.player.body.setSize(240, 180).setOffset(150, 480);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.cameras.main.setDeadzone(45, 80);

    this.companion = this.add.image(this.sim.state.player.x - 58, this.sim.state.player.y + 35, 'ember-pet').setOrigin(.5, .75).setDisplaySize(58, 58).setDepth(8);
    this.companion.setVisible(this.sim.state.systems.companionUnlocked);

    this.syncEnemyViews();
    this.keys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT' });
    this.input.on('pointerdown', pointer => {
      if (pointer.leftButtonDown() && !this.sim.paused) this.sim.setMoveTarget(pointer.worldX, pointer.worldY);
    });

    this.eventHandler = event => this.onSimulationEvent(event.detail.type, event.detail.payload);
    window.addEventListener('babel:event', this.eventHandler);
    this.stopRealtimeSync = this.realtime.on('sync', () => this.syncRemoteViews());
    this.syncRemoteViews();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('babel:event', this.eventHandler);
      this.stopRealtimeSync?.();
    });
  }

  heroKey() {
    return this.sim.state.profile.body === 'female' ? 'hero-female' : 'hero-male';
  }

  syncEnemyViews() {
    for (const enemy of this.sim.enemies) {
      if (this.enemyViews.has(enemy.id)) continue;
      const shadow = this.add.ellipse(enemy.x, enemy.y + 28, enemy.boss ? 175 : enemy.kind === 'elite' ? 105 : 66, enemy.boss ? 48 : 24, 0x071019, .32);
      const sprite = enemy.boss
        ? this.add.image(enemy.x, enemy.y, 'stakes-boss')
        : this.add.sprite(enemy.x, enemy.y, 'frontier-enemies', enemy.frame);
      sprite.setOrigin(.5, .82).setDisplaySize(enemy.boss ? 250 : enemy.kind === 'elite' ? 145 : enemy.scale, enemy.scale).setDepth(enemy.y);
      const bar = this.add.graphics().setDepth(enemy.y + 1);
      this.enemyViews.set(enemy.id, { sprite, shadow, bar });
    }
  }

  update(_time, delta) {
    const horizontal = (this.keys.left.isDown || this.keys.left2.isDown ? -1 : 0) + (this.keys.right.isDown || this.keys.right2.isDown ? 1 : 0);
    const vertical = (this.keys.up.isDown || this.keys.up2.isDown ? -1 : 0) + (this.keys.down.isDown || this.keys.down2.isDown ? 1 : 0);
    if (horizontal || vertical) this.sim.setInput(horizontal, vertical);
    else if (!this.sim.joystickActive) this.sim.setInput(0, 0);

    this.sim.update(delta / 1000);
    this.syncEnemyViews();
    this.renderPlayer();
    this.renderEnemies();
    this.renderCompanion();
    this.renderRemotePlayers(delta);
    this.realtime.updateLocal(performance.now());
  }

  renderPlayer() {
    const state = this.sim.state.player;
    this.player.setPosition(state.x, state.y).setDepth(state.y + 20);
    this.playerShadow.setPosition(state.x, state.y + 34).setDepth(state.y - 1);
    const desiredKey = this.heroKey();
    if (this.player.texture.key !== desiredKey) this.player.setTexture(desiredKey, 0);
    if (this.sim.runtime.now < this.sim.attackPoseUntil) {
      this.player.setFrame(3);
    } else if (this.sim.runtime.moving) {
      this.player.setFrame(this.sim.runtime.facing === 'up' ? 2 : 1);
    } else {
      this.player.setFrame(0);
    }
    this.player.setFlipX(this.sim.runtime.facing === 'left');
  }

  renderEnemies() {
    for (const enemy of this.sim.enemies) {
      const view = this.enemyViews.get(enemy.id);
      if (!view) continue;
      if (!enemy.alive) {
        view.sprite.setVisible(false);
        view.shadow.setVisible(false);
        view.bar.clear();
        continue;
      }
      const bob = Math.sin(this.sim.runtime.now * 3 + enemy.x * .01) * (enemy.boss ? 2 : 1.4);
      view.sprite.setVisible(true).setPosition(enemy.x, enemy.y + bob).setDepth(enemy.y + 10);
      view.shadow.setVisible(true).setPosition(enemy.x, enemy.y + (enemy.boss ? 74 : enemy.kind === 'elite' ? 49 : 30)).setDepth(enemy.y - 1);
      view.bar.setDepth(enemy.y + 11);
      view.bar.clear();
      if (enemy.currentHp < enemy.maxHp || enemy.boss) {
        const width = enemy.boss ? 185 : enemy.kind === 'elite' ? 105 : 70;
        const y = enemy.y - enemy.scale * .72;
        view.bar.fillStyle(0x06131f, .9).fillRoundedRect(enemy.x - width / 2, y, width, 8, 4);
        view.bar.fillStyle(enemy.boss ? 0xa55ad8 : 0xc8474e, 1).fillRoundedRect(enemy.x - width / 2 + 1, y + 1, (width - 2) * (enemy.currentHp / enemy.maxHp), 6, 3);
      }
    }
  }

  renderCompanion() {
    const visible = this.sim.state.systems.companionUnlocked;
    this.companion.setVisible(visible);
    if (!visible) return;
    const side = this.sim.runtime.facing === 'left' ? 1 : -1;
    const targetX = this.sim.state.player.x + 58 * side;
    const targetY = this.sim.state.player.y + 42;
    this.companion.x = Phaser.Math.Linear(this.companion.x, targetX, .075);
    this.companion.y = Phaser.Math.Linear(this.companion.y, targetY, .075) + Math.sin(this.sim.runtime.now * 5) * .5;
    this.companion.setDepth(this.companion.y + 5).setFlipX(side > 0);
  }

  syncRemoteViews() {
    for (const [id, player] of this.realtime.players) {
      let view = this.remoteViews.get(id);
      if (!view) {
        const shadow = this.add.ellipse(player.x, player.y + 34, 70, 23, 0x071019, .28).setDepth(player.y - 1);
        const key = player.body === 'female' ? 'hero-female' : 'hero-male';
        const sprite = this.add.sprite(player.x, player.y, key, player.frame || 0)
          .setOrigin(.5, .83)
          .setDisplaySize(92, 122)
          .setAlpha(0)
          .setDepth(player.y + 18);
        const label = this.add.text(player.x, player.y - 96, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fff4cf',
          align: 'center',
          backgroundColor: 'rgba(4, 19, 33, .82)',
          padding: { x: 7, y: 4 },
          stroke: '#07121d',
          strokeThickness: 2
        }).setOrigin(.5, 1).setDepth(player.y + 19);
        view = { sprite, shadow, label, targetX: player.x, targetY: player.y, state: player };
        this.remoteViews.set(id, view);
        this.tweens.add({ targets: sprite, alpha: 1, duration: 180 });
      }
      view.targetX = player.x;
      view.targetY = player.y;
      view.state = player;
      view.label.setText(`${player.name}\nNv. ${player.level} · ${player.power} poder`);
    }

    for (const [id, view] of this.remoteViews) {
      if (this.realtime.players.has(id)) continue;
      view.sprite.destroy();
      view.shadow.destroy();
      view.label.destroy();
      this.remoteViews.delete(id);
    }
  }

  renderRemotePlayers(delta) {
    const smoothing = 1 - Math.exp(-Math.min(60, delta) / 90);
    for (const view of this.remoteViews.values()) {
      const state = view.state;
      view.sprite.x = Phaser.Math.Linear(view.sprite.x, view.targetX, smoothing);
      view.sprite.y = Phaser.Math.Linear(view.sprite.y, view.targetY, smoothing);
      const key = state.body === 'female' ? 'hero-female' : 'hero-male';
      if (view.sprite.texture.key !== key) view.sprite.setTexture(key, state.frame || 0);
      view.sprite.setFrame(state.frame || 0).setFlipX(state.facing === 'left').setDepth(view.sprite.y + 18);
      view.shadow.setPosition(view.sprite.x, view.sprite.y + 34).setDepth(view.sprite.y - 1);
      view.label.setPosition(view.sprite.x, view.sprite.y - 96).setDepth(view.sprite.y + 19);
    }
  }

  onSimulationEvent(type, payload) {
    if (type === 'playerAttack') {
      const target = this.enemyViews.get(payload.targetId)?.sprite;
      if (target) this.slashEffect(target.x, target.y, payload.weapon);
    }
    if (type === 'damage') {
      const view = this.enemyViews.get(payload.enemyId);
      if (view) {
        view.sprite.setTintFill(0xffffff);
        this.time.delayedCall(70, () => view.sprite?.clearTint());
        this.floatText(view.sprite.x, view.sprite.y - 45, `-${payload.damage}`, payload.source === 'ultimate' ? '#ffe17c' : '#ffffff', payload.source === 'ultimate' ? 28 : 20);
      }
    }
    if (type === 'enemyAttack') {
      this.player.setTintFill(0xff6868);
      this.time.delayedCall(90, () => this.player?.clearTint());
      this.floatText(this.player.x, this.player.y - 58, `-${payload.damage}`, '#ff9a8c', 18);
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(70, .0025);
    }
    if (type === 'skill') this.skillEffect(payload);
    if (type === 'ultimate') {
      const ring = this.add.circle(this.player.x, this.player.y, 28, 0xffd86b, .55).setDepth(this.player.y + 30);
      this.tweens.add({ targets: ring, radius: 285, alpha: 0, duration: 470, onComplete: () => ring.destroy() });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) this.cameras.main.shake(180, .008);
    }
    if (type === 'companionAttack') {
      const target = this.enemyViews.get(payload.targetId)?.sprite;
      if (target) this.projectile(this.companion.x, this.companion.y, target.x, target.y, 0xffa228);
    }
    if (type === 'bossPhase') {
      const boss = this.enemyViews.get('boss-stakes')?.sprite;
      if (boss) {
        this.cameras.main.flash(240, 125, 51, 174, false);
        this.tweens.add({ targets: boss, scaleX: boss.scaleX * 1.06, scaleY: boss.scaleY * 1.06, yoyo: true, duration: 260 });
      }
    }
  }

  slashEffect(x, y, weapon) {
    const colors = { sword: 0x72c9ff, bow: 0xa7e158, staff: 0xbe8bf6, spear: 0xf3c765 };
    this.projectile(this.player.x, this.player.y - 18, x, y - 12, colors[weapon] || 0xffffff);
  }

  projectile(fromX, fromY, toX, toY, color) {
    const orb = this.add.circle(fromX, fromY, 7, color, .95).setDepth(Math.max(fromY, toY) + 30);
    orb.setStrokeStyle(2, 0xffffff, .8);
    this.tweens.add({ targets: orb, x: toX, y: toY, scale: .3, alpha: .35, duration: 145, ease: 'Quad.easeIn', onComplete: () => orb.destroy() });
  }

  skillEffect(payload) {
    if (payload.id === 'guard') {
      this.floatText(this.player.x, this.player.y - 66, `+${payload.amount}`, '#76f4b4', 22);
      const halo = this.add.circle(this.player.x, this.player.y, 34, 0x5de0c4, .3).setDepth(this.player.y + 25);
      this.tweens.add({ targets: halo, scale: 2, alpha: 0, duration: 430, onComplete: () => halo.destroy() });
    }
    if (payload.id === 'shard') {
      const target = this.enemyViews.get(payload.targetId)?.sprite;
      if (target) this.projectile(this.player.x, this.player.y - 30, target.x, target.y - 20, 0x9d64e6);
    }
  }

  floatText(x, y, text, color, size) {
    const label = this.add.text(x, y, text, { fontFamily: 'Segoe UI, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, stroke: '#07121d', strokeThickness: 4 }).setOrigin(.5).setDepth(9999);
    this.tweens.add({ targets: label, y: y - 42, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => label.destroy() });
  }
}
