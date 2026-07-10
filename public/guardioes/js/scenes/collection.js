/* Tower Defense - CollectionScene: colecao de torres, evoluir atributos com fragmentos */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const UPGRADE_LABELS = {
    damage: 'Dano', range: 'Alcance', rate: 'Velocidade de Ataque',
    aoeRadius: 'Raio de Área', slowDuration: 'Duração de Lentidão',
    slowFactor: 'Força de Lentidão', pierce: 'Perfuração',
    auraRadius: 'Raio da Aura', auraDamageMult: 'Bônus da Aura'
  };
  const FRAGMENT_COST_PER_LEVEL = 3;
  const MAX_UPGRADE_LEVEL = 5;

  class CollectionScene extends Phaser.Scene {
    constructor() { super('Collection'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      this.add.rectangle(0, 0, width, height, 0x181410).setOrigin(0);
      UI.topBar(this, 'Coleção de Defesas', () => this.scene.start('Menu'));

      this.detailPanel = null;
      this.renderGrid();
    }

    renderGrid() {
      const { width, height } = this.scale;
      const state = this.state;
      const cardW = 150, cardH = 150, gap = 16;
      const cols = Math.max(1, Math.floor((width - 30) / (cardW + gap)));
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = width / 2 - totalW / 2 + cardW / 2;
      const startY = 170;

      D.DEFENSE_ORDER.forEach((id, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        const owned = state.collection[id].owned;
        const def = D.DEFENSES[id];
        const container = this.add.container(x, y);
        const bg = UI.makePanel(this, 0, 0, cardW, cardH);
        if (owned) {
          const sprite = this.add.image(0, -20, `tex-defense-${id}`).setScale(0.9);
          container.add(sprite);
        } else {
          const lock = this.add.text(0, -20, '🔒', { fontSize: '32px' }).setOrigin(0.5);
          bg.setTint(0x555555);
          container.add(lock);
        }
        const name = this.add.text(0, 46, owned ? def.name : '???', {
          fontFamily: 'Georgia, serif', fontSize: '13px', color: '#3a2c1a', fontStyle: 'bold'
        }).setOrigin(0.5);
        const seal = UI.makeRaritySeal(this, -cardW / 2 + 18, -cardH / 2 + 18, def.rarity, 0.45);
        container.add([bg, name, seal]);
        container.setSize(cardW, cardH);
        container.list.forEach(c => container.bringToTop(c));
        if (owned) {
          container.setInteractive({ useHandCursor: true });
          container.on('pointerdown', () => this.openDetail(id));
        }
      });
    }

    openDetail(id) {
      if (this.detailPanel) this.detailPanel.destroy();
      const { width, height } = this.scale;
      const def = D.DEFENSES[id];
      const entry = this.state.collection[id];
      const panel = this.add.container(0, 0).setDepth(100);
      const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setInteractive();
      const box = UI.makePanel(this, width / 2, height / 2, 560, 420);
      const close = this.add.text(width / 2 + 260, height / 2 - 190, '✕', { fontSize: '26px', color: '#3a2c1a' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      close.on('pointerdown', () => panel.destroy());
      dim.on('pointerdown', () => panel.destroy());

      const title = this.add.text(width / 2, height / 2 - 175, def.name, {
        fontFamily: 'Georgia, serif', fontSize: '26px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0.5);
      const desc = this.add.text(width / 2, height / 2 - 140, def.desc, {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#5a4a32', wordWrap: { width: 460 }
      }).setOrigin(0.5, 0);
      const fragText = this.add.text(width / 2, height / 2 - 95, `Fragmentos: ${entry.fragments}`, {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#7a3a1a', fontStyle: 'bold'
      }).setOrigin(0.5);

      panel.add([dim, box, title, desc, fragText, close]);

      def.upgrades.forEach((attr, i) => {
        const y = height / 2 - 50 + i * 46;
        const level = entry.upgrades[attr] || 0;
        const label = this.add.text(width / 2 - 240, y, `${UPGRADE_LABELS[attr] || attr} (Nv ${level}/${MAX_UPGRADE_LEVEL})`, {
          fontFamily: 'Georgia, serif', fontSize: '14px', color: '#3a2c1a'
        }).setOrigin(0, 0.5);
        const cost = (level + 1) * FRAGMENT_COST_PER_LEVEL;
        const canUpgrade = level < MAX_UPGRADE_LEVEL && entry.fragments >= cost;
        const btn = UI.makeButton(this, width / 2 + 200, y, `+1 (${cost})`, () => {
          if (level >= MAX_UPGRADE_LEVEL || entry.fragments < cost) return;
          entry.fragments -= cost;
          entry.upgrades[attr] = level + 1;
          global.GuardioesSave.save(this.state);
          panel.destroy();
          this.openDetail(id);
        }, { width: 130, height: 40, fontSize: 13 });
        btn.setAlpha(canUpgrade ? 1 : 0.45);
        panel.add([label, btn]);
      });
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.CollectionScene = CollectionScene;
})(window);
