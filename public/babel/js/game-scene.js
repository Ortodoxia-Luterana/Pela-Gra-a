import { ASSETS, ENEMY_ASSETS, EQUIPMENT_SKINS, EQUIPMENT_SLOTS, LOOT_TABLE, REGIONS, WORLD } from './content.js?v=2.2.0';
import { MAP_PROPS, REGION_GATES } from './map-data.js?v=2.2.0';

const Phaser = window.Phaser;
const ENEMY_VIEW_CREATE_RADIUS = 1250;
const ENEMY_VIEW_RELEASE_RADIUS = 1650;
const enemyDistance = (player, enemy) => Math.hypot(player.x - enemy.x, player.y - enemy.y);

export class JourneyScene extends Phaser.Scene {
  constructor(simulation, realtime) {
    super({ key: 'JourneyScene' });
    this.sim = simulation;
    this.realtime = realtime;
    this.enemyViews = new Map();
    this.enemyStateById = new Map(this.sim.enemies.map(enemy => [enemy.id, enemy]));
    this.damageBars = new Map();
    this.remoteViews = new Map();
    this.gearViews = new Map();
    this.equipmentViews = new Map();
    this.pendingEquipmentKeys = new Set();
  }

  preload() {
    this.load.image('terrain-grass', ASSETS.terrainGrass);
    this.load.image('path-frontier', ASSETS.windingPath);
    this.load.image('terrain-forest', ASSETS.terrainForest);
    this.load.image('path-forest', ASSETS.pathForest);
    this.load.image('terrain-ruins', ASSETS.terrainRuins);
    this.load.image('path-ruins', ASSETS.pathRuins);
    this.load.image('region-gate', ASSETS.regionGate);
    this.load.image('broadleaf-tree', ASSETS.broadleafTree);
    this.load.image('pine-tree', ASSETS.pineTree);
    this.load.image('rock-cluster', ASSETS.rockCluster);
    this.load.image('frontier-tent', ASSETS.frontierTent);
    this.load.image('supply-crates', ASSETS.supplyCrates);
    this.load.image('fence-sign', ASSETS.fenceSign);
    this.load.spritesheet('hero-male', ASSETS.heroMale, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    this.load.spritesheet('hero-female', ASSETS.heroFemale, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    this.load.spritesheet('hero-male-walk', ASSETS.heroMaleWalk, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    this.load.spritesheet('hero-female-walk', ASSETS.heroFemaleWalk, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
    EQUIPMENT_SLOTS.forEach(slot => {
      const setId = this.sim.state.equipped[slot]?.setId;
      if (setId) this.queueEquipmentTextures(setId, this.sim.state.profile.body, slot, false);
    });
    this.load.spritesheet('frontier-enemies', ASSETS.enemies, { frameWidth: 320, frameHeight: 320, endFrame: 3 });
    this.load.image('stakes-boss', ASSETS.boss);
    this.load.image('pet-ember', ASSETS.petEmber);
    this.load.image('pet-owl', ASSETS.petOwl);
    this.load.image('pet-fox', ASSETS.petFox);
    Object.entries(ENEMY_ASSETS).forEach(([key, path]) => this.load.image(key, path));
    LOOT_TABLE.forEach(item => this.load.image(`gear-${item.id}`, item.icon));
  }

  create() {
    this.pendingEquipmentKeys.clear();
    this.load.on('filecomplete', key => this.pendingEquipmentKeys.delete(key));
    this.load.on('loaderror', file => this.pendingEquipmentKeys.delete(file?.key));
    REGIONS.forEach(region => {
      this.createMirroredTerrain(region);
      this.createPathRibbon(region);
    });
    REGION_GATES.forEach(gate => this.add.image(gate.x, gate.y, 'region-gate')
      .setOrigin(.5, .78)
      .setDisplaySize(430, 360)
      .setDepth(gate.y + 2));
    this.mapProps = MAP_PROPS.map(prop => this.add.image(prop.x, prop.y, prop.asset)
      .setOrigin(.5, 1)
      .setScale(prop.scale)
      .setTint(prop.tint || 0xffffff)
      .setDepth(prop.y));
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBounds(0, 0, WORLD.width, WORLD.height);
    this.cameras.main.setBackgroundColor('#071827');
    this.cameras.main.roundPixels = true;

    this.anims.create({ key: 'walk-male', frames: this.anims.generateFrameNumbers('hero-male-walk', { start: 0, end: 3 }), frameRate: 9, repeat: -1 });
    this.anims.create({ key: 'walk-female', frames: this.anims.generateFrameNumbers('hero-female-walk', { start: 0, end: 3 }), frameRate: 9, repeat: -1 });

    this.playerShadow = this.add.ellipse(this.sim.state.player.x, this.sim.state.player.y + 2, 54, 15, 0x071019, .3).setDepth(9);
    this.player = this.physics.add.sprite(this.sim.state.player.x, this.sim.state.player.y, this.heroWalkKey(), 0).setOrigin(.5, .965).setDepth(10);
    this.player.setDisplaySize(112, 112);
    this.player.body.setSize(104, 54).setOffset(76, 188);
    this.player.setCollideWorldBounds(true);
    ['weapon'].forEach(slot => {
      const fallback = LOOT_TABLE.find(item => item.slot === slot);
      if (fallback) this.gearViews.set(slot, this.add.image(this.player.x, this.player.y, `gear-${fallback.id}`).setVisible(false));
    });
    EQUIPMENT_SLOTS.forEach(slot => {
      const layer = this.add.sprite(this.player.x, this.player.y, this.heroKey(), 0)
        .setOrigin(.5, .965)
        .setDisplaySize(112, 112)
        .setVisible(false);
      this.equipmentViews.set(slot, layer);
    });
    this.cameras.main.startFollow(this.player, true, .09, .09);
    this.cameras.main.setDeadzone(45, 80);

    this.companion = this.add.image(this.sim.state.player.x - 58, this.sim.state.player.y + 22, this.petKey()).setOrigin(.5, .92).setDisplaySize(62, 62).setDepth(8);
    this.companion.setVisible(Boolean(this.sim.state.equippedPetId));

    this.syncEnemyViews();
    this.keys = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D', up2: 'UP', down2: 'DOWN', left2: 'LEFT', right2: 'RIGHT', attack: 'SPACE', attack2: 'J' });
    [this.keys.attack, this.keys.attack2].forEach(key => {
      key.on('down', () => this.sim.setAttackPressed(true));
      key.on('up', () => this.sim.setAttackPressed(false));
    });
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

  createMirroredTerrain(region) {
    const source = this.textures.get(region.terrain).getSourceImage();
    const scale = .56;
    const tileWidth = Math.round(source.width * scale);
    const tileHeight = Math.round(source.height * scale);
    const columns = Math.ceil(WORLD.width / tileWidth);
    const rows = Math.ceil(region.height / tileHeight);

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        this.add.image(column * tileWidth + tileWidth / 2, region.y + row * tileHeight + tileHeight / 2, region.terrain)
          .setOrigin(.5)
          .setDisplaySize(tileWidth + 2, tileHeight + 2)
          .setFlipX(column % 2 === 1)
          .setFlipY(row % 2 === 1)
          .setDepth(-1000);
      }
    }
  }

  createPathRibbon(region) {
    const source = this.textures.get(region.path).getSourceImage();
    const targetWidth = region.id === 'campos-fronteiras' ? 720 : 760;
    const targetHeight = Math.round(source.height * (targetWidth / source.width));
    const step = targetHeight - 8;
    const rows = Math.ceil(region.height / step) + 1;

    for (let row = 0; row < rows; row += 1) {
      this.add.image(WORLD.width / 2, region.y + row * step + targetHeight / 2, region.path)
        .setOrigin(.5)
        .setDisplaySize(targetWidth, targetHeight)
        .setFlipX(row % 4 >= 2)
        .setFlipY(row % 2 === 1)
        .setAlpha(.99)
        .setDepth(-900);
    }
  }

  heroKey(body = this.sim.state.profile.body) {
    return `hero-${body}`;
  }

  heroWalkKey(body = this.sim.state.profile.body) {
    return `hero-${body}-walk`;
  }

  heroWalkAnimation(body = this.sim.state.profile.body) {
    return `walk-${body}`;
  }

  queueEquipmentTextures(setId, body, slot, dynamic = true) {
    const skin = EQUIPMENT_SKINS[setId]?.[body]?.[slot];
    if (!skin) return;
    let queued = false;
    [[`equipment-${setId}-${body}-${slot}`, skin.main], [`equipment-${setId}-${body}-${slot}-walk`, skin.walk]].forEach(([key, path]) => {
      if (this.textures.exists(key) || this.pendingEquipmentKeys.has(key)) return;
      this.pendingEquipmentKeys.add(key);
      this.load.spritesheet(key, path, { frameWidth: 256, frameHeight: 256, endFrame: 3 });
      queued = true;
    });
    if (dynamic && queued && !this.load.isLoading()) this.load.start();
  }

  petKey() {
    return { 'ember-lizard': 'pet-ember', 'dawn-owl': 'pet-owl', 'frontier-fox': 'pet-fox' }[this.sim.state.equippedPetId] || 'pet-ember';
  }

  syncEnemyViews() {
    const player = this.sim.state.player;
    for (const enemy of this.sim.enemies) {
      if (!this.enemyViews.has(enemy.id) && enemyDistance(player, enemy) <= ENEMY_VIEW_CREATE_RADIUS) this.createEnemyView(enemy);
    }
    for (const [enemyId, view] of this.enemyViews) {
      const enemy = this.enemyStateById.get(enemyId);
      if (!enemy) {
        this.destroyEnemyView(enemyId, view);
        continue;
      }
      const deathAnimating = !enemy.alive && this.sim.runtime.now < view.deathUntil;
      if (!deathAnimating && enemyDistance(player, enemy) > ENEMY_VIEW_RELEASE_RADIUS) this.destroyEnemyView(enemyId, view);
    }
  }

  createEnemyView(enemy) {
    const shadow = this.add.ellipse(enemy.x, enemy.y + 28, enemy.boss ? 175 : enemy.kind === 'elite' ? 105 : 66, enemy.boss ? 48 : 24, 0x071019, .32);
    const usesFrontierSheet = enemy.assetKey === 'frontier-enemies';
    const texture = enemy.assetKey === 'stakes-boss' ? 'stakes-boss' : enemy.assetKey;
    const sprite = usesFrontierSheet
      ? this.add.sprite(enemy.x, enemy.y, texture, enemy.frame)
      : this.add.image(enemy.x, enemy.y, texture);
    const width = enemy.boss ? enemy.scale : enemy.kind === 'elite' ? enemy.scale * 1.05 : enemy.scale;
    sprite.setOrigin(.5, .84).setDisplaySize(width, enemy.scale).setDepth(enemy.y);
    const bar = this.add.graphics().setDepth(enemy.y + 1);
    this.enemyViews.set(enemy.id, { sprite, shadow, bar, deathUntil: 0 });
  }

  destroyEnemyView(enemyId, view) {
    view.sprite?.destroy();
    view.shadow?.destroy();
    view.bar?.destroy();
    this.enemyViews.delete(enemyId);
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
    const body = this.sim.state.profile.body;
    const facing = this.sim.runtime.facing;
    const horizontal = ['left', 'right'].includes(facing);
    this.player.setPosition(state.x, state.y).setDepth(state.y + 20);
    this.playerShadow.setPosition(state.x, state.y + 2).setDepth(state.y - 1);
    if (horizontal) {
      const desiredKey = this.heroWalkKey(body);
      if (this.player.texture.key !== desiredKey) this.player.setTexture(desiredKey, 0);
      this.player.setOrigin(.5, .965).setDisplaySize(112, 112);
      if (this.sim.runtime.moving) this.player.play(this.heroWalkAnimation(body), true);
      else {
        this.player.anims.stop();
        this.player.setFrame(0);
      }
    } else {
      const desiredKey = this.heroKey(body);
      const frame = facing === 'up' ? 2 : 0;
      if (this.player.texture.key !== desiredKey) this.player.setTexture(desiredKey, frame);
      this.player.anims.stop();
      this.player.setOrigin(.5, .965).setDisplaySize(112, 112);
      this.player.setFrame(frame);
    }
    this.player.setFlipX(facing === 'left' && horizontal);
    this.renderEquipmentVisuals();
  }

  renderEquipmentVisuals() {
    const equipped = this.sim.state.equipped;
    const depth = this.player.depth;
    const facing = this.sim.runtime.facing;
    const horizontal = ['left', 'right'].includes(facing);
    const frame = Math.max(0, Math.min(3, Number(this.player.frame.name) || 0));

    this.renderEquipmentLayers(
      this.player,
      this.equipmentViews,
      equipped,
      this.sim.state.profile.body,
      horizontal,
      frame,
      depth
    );

    const weaponView = this.gearViews.get('weapon');
    const weapon = equipped.weapon;
    if (!weaponView || !weapon || !this.textures.exists(`gear-${weapon.id}`)) {
      weaponView?.setVisible(false);
      return;
    }
    this.renderWeaponVisual(weaponView, weapon, this.player, facing, this.sim.runtime.now < this.sim.attackPoseUntil, depth);
  }

  renderEquipmentLayers(target, views, equipment, body, walk, frame, depth) {
    const zOrder = { boots: .1, pants: .2, armor: .3, helmet: .4 };
    EQUIPMENT_SLOTS.forEach(slot => {
      const view = views.get(slot);
      const value = equipment?.[slot];
      const setId = typeof value === 'string' ? value : value?.setId;
      const key = setId ? `equipment-${setId}-${body}-${slot}${walk ? '-walk' : ''}` : '';
      if (!view || !setId || !this.textures.exists(key)) {
        if (view && setId) this.queueEquipmentTextures(setId, body, slot);
        view?.setVisible(false);
        return;
      }
      if (view.texture.key !== key) view.setTexture(key, frame);
      view.setVisible(true)
        .setPosition(target.x, target.y)
        .setOrigin(.5, .965)
        .setDisplaySize(112, 112)
        .setFrame(frame)
        .setFlipX(target.flipX)
        .setAlpha(target.alpha)
        .setDepth(depth + zOrder[slot]);
    });
  }

  renderWeaponVisual(view, weapon, target, facing, attacking, depth) {
    const texture = `gear-${weapon.id}`;
    if (!this.textures.exists(texture)) {
      view.setVisible(false);
      return;
    }
    if (view.texture.key !== texture) view.setTexture(texture);
    const type = weapon.weaponType || 'sword';
    const sizes = { sword: 60, bow: 74, spear: 88, staff: 84 };
    const placements = {
      up: { x: -23, y: -55, angle: -12, layer: -.2 },
      down: { x: 25, y: -48, angle: 2, layer: .8 },
      left: { x: -29, y: -47, angle: -6, layer: .8 },
      right: { x: 29, y: -47, angle: 6, layer: .8 }
    };
    const placement = placements[facing] || placements.down;
    const typeAngle = type === 'bow' ? -12 : type === 'staff' ? -4 : 0;
    const swing = attacking ? (facing === 'left' ? -34 : 34) : 0;
    const size = sizes[type] || sizes.sword;
    view.setVisible(true)
      .setOrigin(.5, .72)
      .setPosition(target.x + placement.x, target.y + placement.y)
      .setDisplaySize(size, size)
      .setFlipX(facing === 'left')
      .setAlpha(.99)
      .setAngle(placement.angle + typeAngle + swing)
      .setDepth(depth + placement.layer);
  }

  renderEnemies() {
    for (const [enemyId, view] of this.enemyViews) {
      const enemy = this.enemyStateById.get(enemyId);
      if (!enemy) continue;
      if (!enemy.alive && this.sim.runtime.now >= view.deathUntil) {
        view.sprite.setVisible(false);
        view.shadow.setVisible(false);
        view.bar.clear();
        continue;
      }
      const dying = !enemy.alive;
      const bob = Math.sin(this.sim.runtime.now * 3 + enemy.x * .01) * (enemy.boss ? 2 : 1.4);
      const deathProgress = dying ? Math.max(0, 1 - (view.deathUntil - this.sim.runtime.now) / .38) : 0;
      view.sprite.setVisible(true).setAlpha(dying ? 1 - deathProgress : 1).setAngle(dying ? deathProgress * 12 : 0).setPosition(enemy.x, enemy.y + bob + deathProgress * 14).setDepth(enemy.y + 10);
      view.shadow.setVisible(true).setPosition(enemy.x, enemy.y + (enemy.boss ? 74 : enemy.kind === 'elite' ? 49 : 30)).setDepth(enemy.y - 1);
      view.bar.setDepth(enemy.y + 11);
      view.bar.clear();
      if (!dying && (enemy.currentHp < enemy.maxHp || enemy.boss)) {
        const width = enemy.boss ? 185 : enemy.kind === 'elite' ? 105 : 70;
        const y = enemy.y - enemy.scale * .72;
        view.bar.fillStyle(0x06131f, .9).fillRoundedRect(enemy.x - width / 2, y, width, 8, 4);
        view.bar.fillStyle(enemy.boss ? 0xa55ad8 : 0xc8474e, 1).fillRoundedRect(enemy.x - width / 2 + 1, y + 1, (width - 2) * (enemy.currentHp / enemy.maxHp), 6, 3);
      }
    }
  }

  renderCompanion() {
    const visible = Boolean(this.sim.state.equippedPetId);
    this.companion.setVisible(visible);
    if (!visible) return;
    const key = this.petKey();
    if (this.companion.texture.key !== key) this.companion.setTexture(key);
    const side = this.sim.runtime.facing === 'left' ? 1 : -1;
    const targetX = this.sim.state.player.x + 58 * side;
    const targetY = this.sim.state.player.y + 18;
    this.companion.x = Phaser.Math.Linear(this.companion.x, targetX, .075);
    this.companion.y = Phaser.Math.Linear(this.companion.y, targetY, .075) + Math.sin(this.sim.runtime.now * 5) * .5;
    this.companion.setDepth(this.companion.y + 5).setFlipX(side > 0);
  }

  syncRemoteViews() {
    for (const [id, player] of this.realtime.players) {
      let view = this.remoteViews.get(id);
      if (!view) {
        const shadow = this.add.ellipse(player.x, player.y + 2, 54, 15, 0x071019, .28).setDepth(player.y - 1);
        const key = this.heroWalkKey(player.body);
        const sprite = this.add.sprite(player.x, player.y, key, player.frame || 0)
          .setOrigin(.5, .965)
          .setDisplaySize(112, 112)
          .setAlpha(0)
          .setDepth(player.y + 18);
        const equipmentViews = new Map();
        EQUIPMENT_SLOTS.forEach(slot => equipmentViews.set(slot, this.add.sprite(player.x, player.y, this.heroKey(player.body), 0)
          .setOrigin(.5, .965)
          .setDisplaySize(112, 112)
          .setAlpha(0)
          .setVisible(false)));
        const fallbackWeapon = LOOT_TABLE.find(item => item.slot === 'weapon');
        const weaponView = fallbackWeapon
          ? this.add.image(player.x, player.y, `gear-${fallbackWeapon.id}`).setAlpha(0).setVisible(false)
          : null;
        const label = this.add.text(player.x, player.y - 102, '', {
          fontFamily: 'Segoe UI, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#fff4cf',
          align: 'center',
          backgroundColor: 'rgba(4, 19, 33, .68)',
          padding: { x: 5, y: 2 },
          stroke: '#07121d',
          strokeThickness: 1
        }).setOrigin(.5, 1).setDepth(player.y + 19);
        view = { sprite, shadow, label, equipmentViews, weaponView, targetX: player.x, targetY: player.y, state: player };
        this.remoteViews.set(id, view);
        this.tweens.add({ targets: [sprite, ...equipmentViews.values(), weaponView].filter(Boolean), alpha: 1, duration: 180 });
      }
      view.targetX = player.x;
      view.targetY = player.y;
      view.state = player;
      view.label.setText(player.name);
    }

    for (const [id, view] of this.remoteViews) {
      if (this.realtime.players.has(id)) continue;
      view.sprite.destroy();
      view.shadow.destroy();
      view.label.destroy();
      view.equipmentViews.forEach(layer => layer.destroy());
      view.weaponView?.destroy();
      this.remoteViews.delete(id);
    }
  }

  renderRemotePlayers(delta) {
    const smoothing = 1 - Math.exp(-Math.min(60, delta) / 90);
    for (const view of this.remoteViews.values()) {
      const state = view.state;
      view.sprite.x = Phaser.Math.Linear(view.sprite.x, view.targetX, smoothing);
      view.sprite.y = Phaser.Math.Linear(view.sprite.y, view.targetY, smoothing);
      const horizontal = ['left', 'right'].includes(state.facing);
      const key = horizontal
        ? this.heroWalkKey(state.body)
        : this.heroKey(state.body);
      if (view.sprite.texture.key !== key) view.sprite.setTexture(key, 0);
      if (state.moving && horizontal) view.sprite.play(this.heroWalkAnimation(state.body), true);
      else {
        view.sprite.anims.stop();
        view.sprite.setFrame(state.facing === 'up' ? 2 : 0);
      }
      view.sprite.setFlipX(state.facing === 'left' && horizontal).setDepth(view.sprite.y + 18);
      const frame = Math.max(0, Math.min(3, Number(view.sprite.frame.name) || 0));
      this.renderEquipmentLayers(view.sprite, view.equipmentViews, state.equipment || {}, state.body, horizontal, frame, view.sprite.depth);
      const weapon = LOOT_TABLE.find(item => item.id === state.equipment?.weapon);
      if (view.weaponView && weapon) this.renderWeaponVisual(view.weaponView, weapon, view.sprite, state.facing, false, view.sprite.depth);
      else view.weaponView?.setVisible(false);
      view.shadow.setPosition(view.sprite.x, view.sprite.y + 2).setDepth(view.sprite.y - 1);
      view.label.setPosition(view.sprite.x, view.sprite.y - 102).setDepth(view.sprite.y + 19);
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
        if (payload.hp <= 0) view.deathUntil = this.sim.runtime.now + .38;
        view.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
        this.time.delayedCall(70, () => view.sprite?.clearTint());
        const critical = payload.critical || payload.source === 'ultimate';
        this.floatText(view.sprite.x, view.sprite.y - 45, `${critical ? 'CRÍTICO ' : ''}-${payload.damage}`, critical ? '#ffe17c' : '#ffffff', critical ? 25 : 20);
      }
    }
    if (type === 'enemyAttack') {
      this.player.setTint(0xff6868).setTintMode(Phaser.TintModes.FILL);
      this.time.delayedCall(90, () => this.player?.clearTint());
      this.floatText(this.player.x, this.player.y - 58, `-${payload.damage}`, '#ff9a8c', 18);
    }
    if (type === 'skill') this.skillEffect(payload);
    if (type === 'ultimate') {
      const ring = this.add.circle(this.player.x, this.player.y, 28, 0xffd86b, .55).setDepth(this.player.y + 30);
      this.tweens.add({ targets: ring, radius: 285, alpha: 0, duration: 470, onComplete: () => ring.destroy() });
    }
    if (type === 'companionAttack') {
      const target = this.enemyViews.get(payload.targetId)?.sprite;
      if (target) this.projectile(this.companion.x, this.companion.y, target.x, target.y, 0xffa228);
    }
    if (type === 'bossPhase') {
      const boss = this.enemyViews.get(this.sim.runtime.targetId)?.sprite;
      if (boss) {
        this.cameras.main.flash(240, 125, 51, 174, false);
        this.tweens.add({ targets: boss, scaleX: boss.scaleX * 1.06, scaleY: boss.scaleY * 1.06, yoyo: true, duration: 260 });
      }
    }
    if (type === 'regionChanged') this.cameras.main.flash(280, 238, 197, 108, false);
  }

  slashEffect(x, y, weapon) {
    const colors = { fists: 0xf2b875, sword: 0x72c9ff, bow: 0xa7e158, staff: 0xbe8bf6, spear: 0xf3c765 };
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
