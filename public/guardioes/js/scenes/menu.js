/* Tower Defense - MenuScene: hub de campanha mobile:
   barra de recursos no topo, cenario com predios clicaveis (alguns travados), guardiao parado,
   navegador de fase com setas + botao Comecar, e uma barra de abas embaixo. */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const BUILDINGS = [
    { id: 'build', feature: 'build', label: 'Build', scene: 'BuildSetup', x: 0.72, y: 0.30 },
    { id: 'collection', feature: 'collection', label: 'Coleção', scene: 'Collection', x: 0.24, y: 0.42 },
    { id: 'class', feature: 'class', label: 'Classe', scene: 'ClassTree', x: 0.76, y: 0.52 },
    { id: 'shop', feature: 'shop', label: 'Loja', scene: 'Shop', x: 0.30, y: 0.62 }
  ];

  const TABS = [
    { id: 'home', label: 'In\u00edcio', icon: 'tex-tab-home' },
    { id: 'build', label: 'Build', icon: 'tex-tab-build', scene: 'BuildSetup' },
    { id: 'collection', label: 'Cole\u00e7\u00e3o', icon: 'tex-tab-collection', scene: 'Collection' },
    { id: 'class', label: 'Classe', icon: 'tex-tab-class', scene: 'ClassTree' },
    { id: 'shop', label: 'Loja', icon: 'tex-tab-shop', scene: 'Shop' }
  ];

  class MenuScene extends Phaser.Scene {
    constructor() { super('Menu'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      this.selectedLevelIndex = this.pickDefaultLevelIndex();

      this.add.rectangle(0, 0, width, height, 0x1a1712).setOrigin(0);
      this.buildVillageScene(width, height);
      this.buildBuildings(width, height);
      this.buildTopBar(width);
      this.buildLevelBrowser(width, height);
      this.buildBottomTabs(width, height);
      this.buildResumeChip(width, height);
    }

    pickDefaultLevelIndex() {
      const state = this.state;
      for (let i = 0; i < D.LEVELS.length; i++) {
        const lvl = D.LEVELS[i];
        const done = state.progress.levels[lvl.id] && state.progress.levels[lvl.id].completed;
        if (!done) return i;
      }
      return D.LEVELS.length - 1;
    }

    highestUnlockedIndex() {
      const state = this.state;
      let idx = 0;
      for (let i = 1; i < D.LEVELS.length; i++) {
        const prevDone = state.progress.levels[D.LEVELS[i - 1].id] && state.progress.levels[D.LEVELS[i - 1].id].completed;
        if (prevDone) idx = i; else break;
      }
      return idx;
    }

    // ---------- cenario ----------
    buildVillageScene(width, height) {
      const top = 64, bottom = height - 220;
      const key = this.isDesktopLayout() && this.textures.exists('tex-menu-bg-desktop') ? 'tex-menu-bg-desktop' : 'tex-menu-bg';
      if (this.textures.exists(key)) {
        this.addCoverImage(key, width / 2, height / 2, width, height).setDepth(0);
      } else {
        this.add.rectangle(0, top, width, bottom - top, 0x241d16).setOrigin(0, 0);
        this.drawSkyline(width, bottom);
      }
      // guardiao parado no centro-baixo do vilarejo
      const g = this.add.image(width * 0.5, bottom - 40, 'tex-guardian');
      g.setDisplaySize(120, 228);
      this.tweens.add({ targets: g, y: g.y - 6, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    }

    isDesktopLayout() {
      return Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
    }

    addCoverImage(key, x, y, targetW, targetH) {
      const img = this.add.image(x, y, key);
      const tex = this.textures.get(key).getSourceImage();
      const scale = Math.max(targetW / tex.width, targetH / tex.height);
      img.setScale(scale);
      return img;
    }

    drawSkyline(width, bottom) {
      const g = this.add.graphics();
      g.fillStyle(0x2e2618, 1);
      const baseY = bottom * 0.92;
      let x = 0;
      while (x < width) {
        const w = 40 + Math.random() * 60;
        const h = 40 + Math.random() * 100;
        g.fillRect(x, baseY - h, w, h + 200);
        x += w + 6;
      }
    }

    // ---------- predios clicaveis ----------
    buildBuildings(width, height) {
      const top = 64, bottom = height - 220;
      const usableH = bottom - top;
      BUILDINGS.forEach(b => {
        const x = width * b.x;
        const y = top + usableH * b.y;
        const unlocked = D.isFeatureUnlocked(this.state, b.feature);
        const container = this.add.container(x, y);
        const icon = this.add.image(0, 0, `tex-building-${b.id}`).setScale(0.86);
        const label = this.add.text(0, 46, b.label, {
          fontFamily: 'Georgia, serif', fontSize: '13px', color: '#f2e2b8', fontStyle: 'bold'
        }).setOrigin(0.5).setShadow(0, 2, '#000', 3, true, true);
        container.add([icon, label]);
        if (!unlocked) {
          icon.setTint(0x555555);
          label.setColor('#8a8a8a');
          const lock = this.add.text(18, -18, '🔒', { fontSize: '18px' }).setOrigin(0.5);
          container.add(lock);
        }
        container.setSize(90, 90);
        container.setInteractive({ useHandCursor: true });
        container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.08, duration: 90 }));
        container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 90 }));
        container.on('pointerdown', () => {
          global.GuardioesAudio.uiClick();
          if (!unlocked) {
            this.showLockedHint(b, x, y);
            return;
          }
          this.goToScene(b.scene);
        });
      });
    }

    showLockedHint(building, x, y) {
      const hints = {
        shop: 'Vença a Fase 1 pra abrir a Loja',
        class: 'Alcance o Nível 2 pra abrir a Classe'
      };
      UI.floatingText(this, x, y - 60, hints[building.feature] || 'Ainda bloqueado', '#e74c3c');
    }

    // ---------- barra de recursos (topo) ----------
    buildTopBar(width) {
      const profile = this.state.profile;
      this.add.rectangle(width / 2, 32, width, 64, 0x120e0a, 0.88).setOrigin(0.5).setDepth(300);

      const levelPill = this.add.container(70, 32).setDepth(301);
      const levelBg = this.add.circle(0, 0, 22, 0x3a2a1c).setStrokeStyle(2, 0x8a6a3a);
      const levelTxt = this.add.text(0, 0, String(profile.level), {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0.5);
      levelPill.add([levelBg, levelTxt]);

      this.add.text(105, 20, 'Nível', { fontFamily: 'Georgia, serif', fontSize: '10px', color: '#8a7a5a' }).setDepth(301);
      this.add.text(105, 32, `${profile.xp} XP`, { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#cbb98a' }).setDepth(301);

      const coinIcon = this.add.circle(width - 130, 32, 12, 0xe0a52a).setStrokeStyle(2, 0x8a6a1a).setDepth(301);
      this.add.text(width - 110, 32, `${profile.coins}`, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(0, 0.5).setDepth(301);

      const muteBtn = UI.muteButton(this, width - 26, 32).setDepth(301);
    }

    // ---------- navegador de fase + botao Comecar ----------
    buildLevelBrowser(width, height) {
      const y = this.isDesktopLayout() ? height - 235 : height - 195;
      const level = D.LEVELS[this.selectedLevelIndex];
      const highest = this.highestUnlockedIndex();

      this.browserPanel = this.add.container(0, 0).setDepth(310);
      this.renderLevelBrowser(width, y, level, highest);

      this.leftArrow = this.add.text(30, y, '◀', { fontSize: '30px', color: '#f2e2b8' })
        .setOrigin(0.5).setDepth(311).setInteractive({ useHandCursor: true });
      this.rightArrow = this.add.text(width - 30, y, '▶', { fontSize: '30px', color: '#f2e2b8' })
        .setOrigin(0.5).setDepth(311).setInteractive({ useHandCursor: true });
      this.leftArrow.on('pointerdown', () => this.changeLevel(-1));
      this.rightArrow.on('pointerdown', () => this.changeLevel(1));

      UI.makeButton(this, width / 2, height - 110, 'Começar', () => {
        this.scene.start('BuildSetup', { levelIndex: this.selectedLevelIndex });
      }, { width: 300, height: 70, fontSize: 26 }).setDepth(311);
    }

    changeLevel(dir) {
      const highest = this.highestUnlockedIndex();
      const next = Phaser.Math.Clamp(this.selectedLevelIndex + dir, 0, highest);
      if (next === this.selectedLevelIndex) return;
      global.GuardioesAudio.uiClick();
      this.selectedLevelIndex = next;
      const width = this.scale.width;
      const y = this.isDesktopLayout() ? this.scale.height - 235 : this.scale.height - 195;
      this.renderLevelBrowser(width, y, D.LEVELS[next], highest);
    }

    levelPanelWidth(width) {
      return this.isDesktopLayout() ? Math.min(980, width - 320) : width - 110;
    }

    renderLevelBrowser(width, y, level, highest) {
      this.browserPanel.removeAll(true);
      const bg = UI.makePanel(this, width / 2, y, this.levelPanelWidth(width), this.isDesktopLayout() ? 96 : 74);
      const isTop = this.selectedLevelIndex === highest;
      const name = this.add.text(width / 2, y - 12, `${this.selectedLevelIndex + 1}. ${level.name}`, {
        fontFamily: 'Georgia, serif', fontSize: '17px', color: '#3a2c1a', fontStyle: 'bold'
      }).setOrigin(0.5);
      const tag = this.add.text(width / 2, y + 14, isTop ? 'Capítulo mais alto' : 'Concluída', {
        fontFamily: 'Georgia, serif', fontSize: '11px', color: isTop ? '#7a3a1a' : '#2e7a3a'
      }).setOrigin(0.5);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => { global.GuardioesAudio.uiClick(); this.scene.start('LevelSelect'); });
      this.browserPanel.add([bg, name, tag]);
      if (this.leftArrow) this.leftArrow.setAlpha(this.selectedLevelIndex > 0 ? 1 : 0.3);
      if (this.rightArrow) this.rightArrow.setAlpha(this.selectedLevelIndex < highest ? 1 : 0.3);
    }

    // ---------- chip de continuar partida ----------
    buildResumeChip(width, height) {
      const state = this.state;
      const hasRun = Boolean(state.run && state.run.active);
      if (!hasRun) return;
      const chip = UI.makeButton(this, width / 2, 100, '▶ Continuar Partida', () => {
        this.scene.start('Battle', { resume: true, loadout: state.run.loadout, levelIndex: state.run.levelIndex || 0 });
      }, { width: 260, height: 46, fontSize: 15 }).setDepth(320);
    }

    // ---------- barra de abas ----------
    buildBottomTabs(width, height) {
      const barH = this.isDesktopLayout() ? 108 : 92;
      const barY = height - barH / 2;
      this.add.rectangle(width / 2, barY, width, barH, 0x120e0a, 0.94).setOrigin(0.5).setDepth(300);
      this.add.rectangle(width / 2, height - barH + 2, width, 3, 0x8a6a3a, 0.75).setOrigin(0.5).setDepth(301);
      const cols = TABS.length;
      const colW = width / cols;
      TABS.forEach((tab, i) => {
        const x = colW * i + colW / 2;
        const active = tab.id === 'home';
        const unlocked = !tab.scene || D.isFeatureUnlocked(this.state, tab.id);
        const container = this.add.container(x, barY).setDepth(301);
        const iconRadius = this.isDesktopLayout() ? 35 : 29;
        const iconBg = this.add.circle(0, -14, iconRadius, active ? 0x3a2a1c : 0x1b1510, active ? 0.95 : 0.48)
          .setStrokeStyle(active ? 3 : 1, active ? 0xe0c05a : 0x5a4528, active ? 1 : 0.55);
        const icon = this.add.image(0, -14, tab.icon);
        const targetSize = this.isDesktopLayout() ? 58 : 48;
        const tex = this.textures.get(tab.icon).getSourceImage();
        icon.setScale(targetSize / Math.max(tex.width, tex.height));
        if (!active) icon.setAlpha(0.82);
        if (!unlocked) icon.setTint(0x6f6a60).setAlpha(0.45);
        container.add([iconBg, icon]);
        container.add(this.add.text(0, 20, tab.label, {
          fontFamily: 'Georgia, serif',
          fontSize: this.isDesktopLayout() ? '15px' : '10px',
          color: active ? '#f2e2b8' : (unlocked ? '#b9a67a' : '#706654'),
          fontStyle: active ? 'bold' : 'normal'
        }).setOrigin(0.5));
        if (tab.scene) {
          container.setSize(colW, barH);
          container.setInteractive({ useHandCursor: true });
          container.on('pointerdown', () => {
            if (!unlocked) {
              global.GuardioesAudio.invalid();
              UI.floatingText(this, x, barY - 50, 'Bloqueado', '#e74c3c');
              return;
            }
            global.GuardioesAudio.uiClick();
            this.goToScene(tab.scene);
          });
        }
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
