/* Caminho dos Guardioes - BuildSetupScene: escolhe quais defesas entram no sorteio da partida */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const MAX_LOADOUT = 5;

  class BuildSetupScene extends Phaser.Scene {
    constructor() { super('BuildSetup'); }

    init(data) {
      this.levelIndex = typeof data.levelIndex === 'number' ? data.levelIndex : 0;
    }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;
      this.selected = new Set(state.loadouts[state.activeLoadout].defenseIds);

      this.add.rectangle(0, 0, width, height, 0x181410).setOrigin(0);
      const level = D.LEVELS[this.levelIndex];
      UI.topBar(this, `Build · ${level.name}`, () => this.scene.start('LevelSelect'));

      this.add.text(width / 2, 92, 'Escolha até 5 defesas para entrarem no sorteio da partida', {
        fontFamily: 'Georgia, serif', fontSize: '16px', color: '#cbb98a'
      }).setOrigin(0.5);

      this.cardNodes = {};
      const owned = D.DEFENSE_ORDER.filter(id => state.collection[id].owned);
      const cardW = 150, cardH = 200, gap = 16;
      const maxCols = Math.max(1, Math.floor((width - 30) / (cardW + gap)));
      const cols = Math.min(owned.length, maxCols);
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = width / 2 - totalW / 2 + cardW / 2;
      const startY = 150;

      owned.forEach((id, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        this.buildCard(id, x, y, cardW, cardH);
      });

      this.startBtn = UI.makeButton(this, width / 2, height - 70, 'Iniciar Partida', () => this.startRun(), { width: 280, height: 66, fontSize: 24 });
      this.updateStartState();
    }

    buildCard(id, x, y, w, h) {
      const def = D.DEFENSES[id];
      const container = this.add.container(x, y);
      const bg = UI.makePanel(this, 0, 0, w, h);
      const sprite = this.add.image(0, -50, `tex-defense-${id}`).setScale(1.1);
      const name = this.add.text(0, 20, def.name, { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#3a2c1a', fontStyle: 'bold' }).setOrigin(0.5);
      const role = this.add.text(0, 42, def.role, { fontFamily: 'Georgia, serif', fontSize: '11px', color: '#5a4a32', wordWrap: { width: w - 20 } }).setOrigin(0.5);
      const seal = UI.makeRaritySeal(this, -w / 2 + 22, -h / 2 + 22, def.rarity, 0.5);
      const check = this.add.text(w / 2 - 24, -h / 2 + 16, '', { fontFamily: 'Georgia', fontSize: '26px', color: '#2ecc71' }).setOrigin(0.5);
      container.add([bg, sprite, name, role, seal, check]);
      container.setSize(w, h);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerdown', () => this.toggleCard(id, container, check));
      this.cardNodes[id] = { container, check };
      this.refreshCard(id);
    }

    toggleCard(id, container, check) {
      if (this.selected.has(id)) {
        this.selected.delete(id);
      } else {
        if (this.selected.size >= MAX_LOADOUT) {
          UI.floatingText(this, container.x, container.y - 120, 'Máximo de 5 defesas', '#e74c3c');
          return;
        }
        this.selected.add(id);
      }
      this.refreshCard(id);
      this.updateStartState();
    }

    refreshCard(id) {
      const { container, check } = this.cardNodes[id];
      const on = this.selected.has(id);
      check.setText(on ? '✔' : '');
      container.list[0].setTint(on ? 0xffffff : 0x9a9a9a);
      container.setAlpha(on ? 1 : 0.75);
    }

    updateStartState() {
      const ok = this.selected.size > 0;
      this.startBtn.setAlpha(ok ? 1 : 0.5);
    }

    startRun() {
      if (this.selected.size === 0) return;
      const state = this.state;
      state.loadouts[state.activeLoadout].defenseIds = Array.from(this.selected);
      global.GuardioesSave.save(state);
      this.scene.start('Battle', { loadout: Array.from(this.selected), levelIndex: this.levelIndex });
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BuildSetupScene = BuildSetupScene;
})(window);
