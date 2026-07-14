/* Tower Defense - BuildSetupScene: escolhe quais torres entram no sorteio da partida */
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
      const desktop = Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
      const state = this.registry.get('state');
      this.state = state;
      this.selected = new Set(state.loadouts[state.activeLoadout].defenseIds);

      const bgKey = desktop && this.textures.exists('tex-menu-bg-desktop') ? 'tex-menu-bg-desktop' : 'tex-menu-bg';
      if (this.textures.exists(bgKey)) {
        const bg = this.add.image(width / 2, height / 2, bgKey);
        const source = this.textures.get(bgKey).getSourceImage();
        bg.setScale(Math.max(width / source.width, height / source.height)).setTint(0x51493f);
      }
      this.add.rectangle(0, 0, width, height, 0x0b0907, 0.68).setOrigin(0);
      const level = D.LEVELS[this.levelIndex];
      UI.topBar(this, `Formação · ${level.name}`, () => this.scene.start('Menu'));

      this.add.text(width / 2, desktop ? 112 : 92, 'Escolha até 5 aliados para o sorteio da batalha', {
        fontFamily: 'Georgia, serif', fontSize: desktop ? '22px' : '16px', color: '#f1dfad', fontStyle: 'bold'
      }).setOrigin(0.5);

      this.cardNodes = {};
      const owned = D.DEFENSE_ORDER.filter(id => state.collection[id].owned);
      const cardW = desktop ? 250 : 170;
      const cardH = desktop ? 286 : 188;
      const gap = desktop ? 32 : 20;
      const maxCols = Math.max(1, Math.floor((width - 30) / (cardW + gap)));
      const cols = Math.min(3, owned.length, maxCols);
      const totalW = cols * cardW + (cols - 1) * gap;
      const startX = width / 2 - totalW / 2 + cardW / 2;
      const startY = desktop ? 320 : 210;

      owned.forEach((id, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const x = startX + col * (cardW + gap);
        const y = startY + row * (cardH + gap);
        this.buildCard(id, x, y, cardW, cardH);
      });

      this.startBtn = UI.makeButton(this, width / 2, height - (desktop ? 88 : 70), 'Jogar agora', () => this.startRun(), {
        width: desktop ? 360 : 280, height: desktop ? 78 : 66, fontSize: desktop ? 28 : 24
      });
      this.updateStartState();
    }

    buildCard(id, x, y, w, h) {
      const def = D.DEFENSES[id];
      const desktop = Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
      const container = this.add.container(x, y);
      const bg = UI.makePanel(this, 0, 0, w, h);
      const spriteSize = desktop ? 144 : 86;
      const sprite = this.add.image(0, desktop ? -62 : -48, `tex-defense-${id}`).setDisplaySize(spriteSize, spriteSize);
      const name = this.add.text(0, desktop ? 46 : 22, def.name, {
        fontFamily: 'Georgia, serif', fontSize: desktop ? '20px' : '14px', color: '#3a2c1a', fontStyle: 'bold',
        align: 'center', wordWrap: { width: w - 22 }
      }).setOrigin(0.5);
      const role = this.add.text(0, desktop ? 90 : 54, def.role, {
        fontFamily: 'Georgia, serif', fontSize: desktop ? '13px' : '10px', color: '#5a4a32', align: 'center',
        wordWrap: { width: w - 24 }
      }).setOrigin(0.5);
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
