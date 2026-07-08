/* Caminho dos Guardioes - LevelSelectScene: escolha de mapa com progressao (vencer libera o proximo) */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  class LevelSelectScene extends Phaser.Scene {
    constructor() { super('LevelSelect'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      this.add.rectangle(0, 0, width, height, 0x181410).setOrigin(0);
      UI.topBar(this, 'Escolha o Mapa', () => this.scene.start('Menu'));

      const cardW = Math.min(560, width - 40);
      const cardH = 168;
      const gap = 22;
      const startY = 190;

      D.LEVELS.forEach((level, i) => {
        const y = startY + i * (cardH + gap);
        this.buildLevelCard(level, i, width / 2, y, cardW, cardH);
      });
    }

    isUnlocked(index) {
      if (index === 0) return true;
      const prev = D.LEVELS[index - 1];
      return Boolean(this.state.progress.levels[prev.id] && this.state.progress.levels[prev.id].completed);
    }

    isCompleted(level) {
      return Boolean(this.state.progress.levels[level.id] && this.state.progress.levels[level.id].completed);
    }

    buildLevelCard(level, index, x, y, w, h) {
      const unlocked = this.isUnlocked(index);
      const completed = this.isCompleted(level);
      const container = this.add.container(x, y);
      const bg = UI.makePanel(this, 0, 0, w, h);

      const title = this.add.text(-w / 2 + 20, -h / 2 + 26, `${index + 1}. ${level.name}`, {
        fontFamily: 'Georgia, serif', fontSize: '20px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0, 0.5);
      const desc = this.add.text(-w / 2 + 20, -h / 2 + 58, level.desc, {
        fontFamily: 'Georgia, serif', fontSize: '13px', color: '#5a4a32', wordWrap: { width: w - 150 }
      }).setOrigin(0, 0.5);
      const rewards = this.add.text(-w / 2 + 20, h / 2 - 28, `Recompensa: ${level.rewards.coins} moedas · ${level.rewards.xp} XP · ${level.rewards.fragments} fragmentos`, {
        fontFamily: 'Georgia, serif', fontSize: '12px', color: '#7a5a2e'
      }).setOrigin(0, 0.5);
      container.add([bg, title, desc, rewards]);

      // desenho em miniatura do caminho do mapa, pra cada card ter cara propria
      const mini = this.add.graphics();
      const scaleX = 86 / D.MAP.width, scaleY = 118 / D.MAP.height;
      const ox = w / 2 - 110, oy = -h / 2 + 22;
      mini.lineStyle(5, unlocked ? 0x8a6a45 : 0x555555, 1);
      mini.beginPath();
      level.path.forEach((p, i) => {
        const px = ox + Math.max(0, Math.min(D.MAP.width, p.x)) * scaleX;
        const py = oy + Math.max(0, Math.min(D.MAP.height, p.y)) * scaleY;
        if (i === 0) mini.moveTo(px, py); else mini.lineTo(px, py);
      });
      mini.strokePath();
      container.add(mini);

      if (completed) {
        const check = this.add.text(w / 2 - 20, -h / 2 + 22, '✔', { fontSize: '24px', color: '#2ecc71' }).setOrigin(0.5);
        container.add(check);
      }

      if (unlocked) {
        container.setSize(w, h);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.02, duration: 90 }));
        container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 90 }));
        container.on('pointerdown', () => {
          if (global.GuardioesAudio) global.GuardioesAudio.uiClick();
          this.scene.start('BuildSetup', { levelIndex: index });
        });
      } else {
        bg.setTint(0x666666);
        container.setAlpha(0.7);
        const lock = this.add.text(w / 2 - 20, -h / 2 + 22, '🔒', { fontSize: '20px' }).setOrigin(0.5);
        container.add(lock);
      }
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.LevelSelectScene = LevelSelectScene;
})(window);
