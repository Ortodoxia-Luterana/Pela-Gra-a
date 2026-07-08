/* Caminho dos Guardioes - MenuScene: tela inicial como jogo, nao dashboard web */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');

      this.add.rectangle(0, 0, width, height, 0x1a1712).setOrigin(0);
      this.drawSkyline(width, height);

      this.add.text(width / 2, height * 0.22, 'CAMINHO DOS', {
        fontFamily: 'Georgia, serif', fontSize: '30px', color: '#cbb98a', fontStyle: 'bold'
      }).setOrigin(0.5);
      this.add.text(width / 2, height * 0.22 + 42, 'GUARDIÕES', {
        fontFamily: 'Georgia, serif', fontSize: '54px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0.5).setShadow(0, 4, '#000', 6, true, true);

      const profile = state.profile;
      UI.makePanel(this, width / 2, height * 0.42, 420, 60);
      this.add.text(width / 2, height * 0.42, `Nível ${profile.level}  •  ${profile.coins} moedas`, {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0.5);

      const cx = width / 2;
      const startY = height * 0.56;
      const gapY = 78;

      const hasRun = Boolean(state.run && state.run.active);
      UI.makeButton(this, cx, startY, hasRun ? 'Continuar Partida' : 'Jogar', () => {
        if (hasRun) this.scene.start('Battle', { resume: true, loadout: state.run.loadout });
        else this.scene.start('BuildSetup');
      }, { width: 300, height: 74, fontSize: 26 });
      UI.makeButton(this, cx - 170, startY + gapY, 'Coleção', () => this.scene.start('Collection'), { width: 200 });
      UI.makeButton(this, cx + 170, startY + gapY, 'Classe', () => this.scene.start('ClassTree'), { width: 200 });
      UI.makeButton(this, cx - 170, startY + gapY * 2, 'Loja', () => this.scene.start('Shop'), { width: 200 });
      UI.makeButton(this, cx + 170, startY + gapY * 2, 'Build', () => this.scene.start('BuildSetup'), { width: 200 });

      const fsBtn = this.add.text(width - 26, 26, '⛶', { fontFamily: 'Georgia', fontSize: '30px', color: '#f2e2b8' })
        .setOrigin(1, 0).setInteractive({ useHandCursor: true });
      fsBtn.on('pointerdown', () => global.GuardioesOrientation.requestFullscreenAndLock());
      UI.muteButton(this, width - 66, 32);
    }

    drawSkyline(width, height) {
      const g = this.add.graphics();
      g.fillStyle(0x252017, 1);
      const baseY = height * 0.86;
      let x = 0;
      while (x < width) {
        const w = 40 + Math.random() * 60;
        const h = 40 + Math.random() * 120;
        g.fillRect(x, baseY - h, w, h + 200);
        x += w + 6;
      }
      g.fillStyle(0x120f0a, 1);
      g.fillRect(0, baseY + 40, width, height);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.MenuScene = MenuScene;
})(window);
