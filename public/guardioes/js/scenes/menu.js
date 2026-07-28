/* Tower Defense - menu principal com uma unica camada de navegacao. */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const TABS = [
    { id: 'home', label: 'Início' },
    { id: 'build', label: 'Formação', scene: 'BuildSetup' },
    { id: 'collection', label: 'Coleção', scene: 'Collection' },
    { id: 'class', label: 'Classe', scene: 'ClassTree' },
    { id: 'shop', label: 'Loja', scene: 'Shop' }
  ];

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
      const { width, height } = this.scale;
      this.state = this.registry.get('state');
      this.selectedLevelIndex = this.pickDefaultLevelIndex();

      this.buildBackdrop(width, height);
      this.buildTopBar(width);
      this.buildTitle(width);
      this.buildCampaignPicker(width, height);
      this.buildBottomTabs(width, height);
    }

    isDesktopLayout() {
      return Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
    }

    pickDefaultLevelIndex() {
      for (let i = 0; i < D.LEVELS.length; i++) {
        const progress = this.state.progress.levels[D.LEVELS[i].id];
        if (!progress || !progress.completed) return i;
      }
      return D.LEVELS.length - 1;
    }

    highestUnlockedIndex() {
      let index = 0;
      for (let i = 1; i < D.LEVELS.length; i++) {
        const previous = this.state.progress.levels[D.LEVELS[i - 1].id];
        if (previous && previous.completed) index = i;
        else break;
      }
      return index;
    }

    buildBackdrop(width, height) {
      const key = this.isDesktopLayout() && this.textures.exists('tex-menu-bg-desktop')
        ? 'tex-menu-bg-desktop'
        : 'tex-menu-bg';
      this.add.rectangle(0, 0, width, height, 0x17201d).setOrigin(0);
      if (this.textures.exists(key)) {
        const image = this.add.image(width / 2, height / 2, key);
        const source = this.textures.get(key).getSourceImage();
        image.setScale(Math.max(width / source.width, height / source.height));
        image.setTint(0x747a70).setAlpha(0.42);
      }
      this.add.rectangle(0, 0, width, height, 0x0b1112, 0.46).setOrigin(0);
      this.add.rectangle(width / 2, 118, width, 236, 0x0a0f10, 0.38).setOrigin(0.5);
      this.add.rectangle(width / 2, height - 190, width, 380, 0x0a0f10, 0.34).setOrigin(0.5);
    }

    buildTopBar(width) {
      const profile = this.state.profile;
      const desktop = this.isDesktopLayout();
      const height = desktop ? 72 : 76;
      this.add.rectangle(width / 2, height / 2, width, height, 0x0d1416, 0.96).setOrigin(0.5).setDepth(300);
      this.add.rectangle(width / 2, height - 1, width, 2, 0x8d7a50, 0.65).setOrigin(0.5).setDepth(301);

      this.add.text(desktop ? 42 : 24, height / 2, `Nível ${profile.level}  |  ${profile.xp} XP`, {
        fontFamily: UI.FONT_UI,
        fontSize: desktop ? '17px' : '20px',
        color: '#e9dec3',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(302);

      const coinX = width - (desktop ? 108 : 92);
      this.add.circle(coinX, height / 2, desktop ? 8 : 7, 0xd7aa3d).setDepth(302);
      this.add.text(coinX + 15, height / 2, String(profile.coins), {
        fontFamily: UI.FONT_UI,
        fontSize: desktop ? '17px' : '20px',
        color: '#f2e2b8',
        fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(302);
      UI.muteButton(this, width - (desktop ? 34 : 30), height / 2).setDepth(302);
    }

    buildTitle(width) {
      const desktop = this.isDesktopLayout();
      this.add.text(width / 2, desktop ? 154 : 160, 'SOLA TORRE', {
        fontFamily: UI.FONT_TITLE,
        fontSize: desktop ? '54px' : '46px',
        color: '#f3e8ce',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(20);
      this.add.rectangle(width / 2, desktop ? 194 : 198, desktop ? 154 : 126, 2, 0xb9974d, 0.9).setDepth(20);
    }

    buildCampaignPicker(width, height) {
      const desktop = this.isDesktopLayout();
      const navHeight = desktop ? 84 : 92;
      const pickerY = height - navHeight - (desktop ? 176 : 208);
      const pickerW = desktop ? Math.min(720, width - 280) : width - 96;
      const hasRun = Boolean(this.state.run && this.state.run.active);

      this.add.rectangle(width / 2, pickerY, pickerW, desktop ? 112 : 122, 0x11191b, 0.92)
        .setStrokeStyle(2, 0x756846, 0.9)
        .setDepth(40);

      this.levelCounter = this.add.text(width / 2, pickerY - 35, '', {
        fontFamily: UI.FONT_UI,
        fontSize: desktop ? '13px' : '18px',
        color: '#b9ad8c',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(42);

      this.levelName = this.add.text(width / 2, pickerY + 2, '', {
        fontFamily: UI.FONT_TITLE,
        fontSize: desktop ? '27px' : '29px',
        color: '#f3e8ce',
        fontStyle: 'bold',
        align: 'center'
      }).setOrigin(0.5).setDepth(42);
      UI.fitText(this.levelName, pickerW - 110, 48, desktop ? 27 : 29, 17);

      this.levelState = this.add.text(width / 2, pickerY + 38, '', {
        fontFamily: UI.FONT_UI,
        fontSize: desktop ? '12px' : '17px',
        color: '#c8b775'
      }).setOrigin(0.5).setDepth(42);

      this.leftArrow = this.makeArrow(width / 2 - pickerW / 2 - (desktop ? 42 : 30), pickerY, '<', -1);
      this.rightArrow = this.makeArrow(width / 2 + pickerW / 2 + (desktop ? 42 : 30), pickerY, '>', 1);

      const primaryY = pickerY + (desktop ? 102 : 112);
      const primaryLabel = hasRun ? 'CONTINUAR' : 'COMEÇAR';
      UI.makeButton(this, width / 2, primaryY, primaryLabel, () => {
        if (hasRun) {
          const run = this.state.run;
          this.scene.start('Battle', {
            resume: true,
            loadout: run.loadout,
            levelIndex: run.levelIndex || 0
          });
          return;
        }
        this.scene.start('BuildSetup', { levelIndex: this.selectedLevelIndex });
      }, {
        width: desktop ? 330 : 292,
        height: desktop ? 62 : 64,
        fontSize: desktop ? 22 : 21
      }).setDepth(43);

      if (hasRun) {
        const newRun = this.add.text(width / 2, primaryY + 47, 'Nova partida', {
          fontFamily: UI.FONT_UI,
          fontSize: desktop ? '14px' : '13px',
          color: '#d8ccb0'
        }).setOrigin(0.5).setDepth(43).setInteractive({ useHandCursor: true });
        newRun.on('pointerdown', () => this.scene.start('BuildSetup', { levelIndex: this.selectedLevelIndex }));
      }

      this.refreshCampaignPicker();
    }

    makeArrow(x, y, label, direction) {
      const button = this.add.text(x, y, label, {
        fontFamily: UI.FONT_UI,
        fontSize: '34px',
        color: '#f0e3c4',
        fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(43).setInteractive({ useHandCursor: true });
      button.on('pointerdown', () => this.changeLevel(direction));
      return button;
    }

    changeLevel(direction) {
      const next = Phaser.Math.Clamp(
        this.selectedLevelIndex + direction,
        0,
        this.highestUnlockedIndex()
      );
      if (next === this.selectedLevelIndex) return;
      global.GuardioesAudio.uiClick();
      this.selectedLevelIndex = next;
      this.refreshCampaignPicker();
    }

    refreshCampaignPicker() {
      const level = D.LEVELS[this.selectedLevelIndex];
      const highest = this.highestUnlockedIndex();
      const progress = this.state.progress.levels[level.id];
      this.levelCounter.setText(`MAPA ${this.selectedLevelIndex + 1} DE ${D.LEVELS.length}`);
      this.levelName.setText(level.name);
      UI.fitText(this.levelName, this.isDesktopLayout() ? 610 : this.scale.width - 206, 48, this.isDesktopLayout() ? 27 : 29, 17);
      this.levelState.setText(progress && progress.completed ? 'Concluído' : 'Disponível');
      this.leftArrow.setAlpha(this.selectedLevelIndex > 0 ? 1 : 0.28);
      this.rightArrow.setAlpha(this.selectedLevelIndex < highest ? 1 : 0.28);
    }

    buildBottomTabs(width, height) {
      const desktop = this.isDesktopLayout();
      const barH = desktop ? 84 : 92;
      const barTop = height - barH;
      this.add.rectangle(width / 2, height - barH / 2, width, barH, 0x0d1416, 0.98).setDepth(300);
      this.add.rectangle(width / 2, barTop, width, 2, 0x6f654c, 0.8).setDepth(301);

      const colW = width / TABS.length;
      TABS.forEach((tab, index) => {
        const x = colW * index + colW / 2;
        const active = tab.id === 'home';
        const unlocked = !tab.scene || D.isFeatureUnlocked(this.state, tab.id);
        const label = this.add.text(x, height - barH / 2, tab.label, {
          fontFamily: UI.FONT_UI,
          fontSize: desktop ? '15px' : '17px',
          color: active ? '#f3e8ce' : (unlocked ? '#b8ae96' : '#67675f'),
          fontStyle: active ? 'bold' : 'normal',
          align: 'center'
        }).setOrigin(0.5).setDepth(302);
        UI.fitText(label, colW - 12, 36, desktop ? 15 : 17, 13);

        if (active) {
          this.add.rectangle(x, barTop + 3, Math.min(colW - 28, desktop ? 96 : 68), 3, 0xd2aa4d).setDepth(303);
        }
        if (!tab.scene) return;

        const hit = this.add.zone(x, height - barH / 2, colW, barH).setDepth(304).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          if (!unlocked) {
            global.GuardioesAudio.invalid();
            UI.floatingText(this, x, barTop - 22, 'Bloqueado', '#e16b61');
            return;
          }
          global.GuardioesAudio.uiClick();
          this.goToScene(tab.scene);
        });
      });
    }

    goToScene(scene) {
      if (scene === 'BuildSetup') this.scene.start(scene, { levelIndex: this.selectedLevelIndex });
      else this.scene.start(scene);
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.MenuScene = MenuScene;
})(window);
