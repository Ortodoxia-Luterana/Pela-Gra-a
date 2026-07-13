/* Sola Torre - Classe: escolha simples entre dois estilos de campanha. */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const CLASS_CARDS = [
    {
      id: 'merchant',
      icon: 'tex-tab-shop',
      tint: 0xe0a52a,
      lines: ['-18% custo para gerar defesa', '+10% suprimentos por abate', '+10% moedas ao vencer']
    },
    {
      id: 'diplomat',
      icon: 'tex-tab-class',
      tint: 0x5aa6d8,
      lines: ['Mais chance de rara ou melhor', 'Mais chance de epica/lendaria', 'Sorte aplicada no sorteio da batalha']
    }
  ];

  class ClassTreeScene extends Phaser.Scene {
    constructor() { super('ClassTree'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      if (!D.CLASSES[state.profile.selectedClass]) state.profile.selectedClass = D.CLASS_ORDER[0];

      this.add.rectangle(0, 0, width, height, 0x15110d).setOrigin(0);
      this.drawBackdrop(width, height);
      UI.topBar(this, 'Classe', () => this.scene.start('Menu'));

      this.add.text(width / 2, 98, 'Escolha uma vocacao. Ela fica ativa de verdade na batalha.', {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '24px' : '16px',
        color: '#d8c28d',
        align: 'center',
        wordWrap: { width: width - 80 }
      }).setOrigin(0.5);

      this.cardNodes = {};
      this.renderCards(width, height);
    }

    isDesktopLayout() {
      return Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
    }

    drawBackdrop(width, height) {
      const g = this.add.graphics().setDepth(0);
      g.fillStyle(0x24180f, 0.85);
      g.fillEllipse(width * 0.5, height * 0.56, width * 0.82, height * 0.72);
      g.lineStyle(6, 0x6f542b, 0.28);
      for (let i = 0; i < 6; i++) {
        const y = height * (0.24 + i * 0.11);
        g.beginPath();
        g.moveTo(width * 0.15, y);
        g.quadraticCurveTo(width * 0.5, y + (i % 2 ? 34 : -26), width * 0.85, y + 8);
        g.strokePath();
      }
      g.fillStyle(0xd6a842, 0.14);
      g.fillCircle(width * 0.24, height * 0.25, 170);
      g.fillCircle(width * 0.78, height * 0.7, 220);
    }

    renderCards(width, height) {
      const desktop = this.isDesktopLayout();
      const cardW = desktop ? Math.min(560, width * 0.34) : width - 70;
      const cardH = desktop ? 460 : 290;
      const gap = desktop ? 70 : 28;
      const startY = desktop ? height / 2 + 36 : 250;
      const positions = desktop
        ? [
            { x: width / 2 - cardW / 2 - gap / 2, y: startY },
            { x: width / 2 + cardW / 2 + gap / 2, y: startY }
          ]
        : [
            { x: width / 2, y: startY },
            { x: width / 2, y: startY + cardH + gap }
          ];

      CLASS_CARDS.forEach((card, index) => {
        const pos = positions[index];
        this.buildClassCard(card, pos.x, pos.y, cardW, cardH);
      });
    }

    buildClassCard(card, x, y, w, h) {
      const cls = D.CLASSES[card.id];
      const selected = this.state.profile.selectedClass === card.id;
      const container = this.add.container(x, y).setDepth(10);
      const g = this.add.graphics();
      this.drawCardShape(g, w, h, card.tint, selected);

      const icon = this.add.image(0, -h * 0.27, card.icon);
      const iconSize = this.isDesktopLayout() ? 110 : 78;
      icon.setDisplaySize(iconSize, iconSize);

      const title = this.add.text(0, -h * 0.06, cls.name, {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '34px' : '24px',
        color: '#f8e7b8',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const short = this.add.text(0, h * 0.03, cls.short, {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '20px' : '14px',
        color: '#d8c28d',
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const desc = this.add.text(0, h * 0.16, cls.desc, {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '18px' : '13px',
        color: '#f1dfb0',
        align: 'center',
        wordWrap: { width: w - 90 }
      }).setOrigin(0.5);

      const detail = this.add.text(0, h * 0.33, card.lines.join('\n'), {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '16px' : '12px',
        color: '#d9c18b',
        align: 'center',
        lineSpacing: 5,
        wordWrap: { width: w - 80 }
      }).setOrigin(0.5);

      const status = this.add.text(0, h * 0.45, selected ? 'ATIVA' : 'ESCOLHER', {
        fontFamily: 'Georgia, serif',
        fontSize: this.isDesktopLayout() ? '18px' : '13px',
        color: selected ? '#5ae08a' : '#f2e2b8',
        fontStyle: 'bold',
        backgroundColor: selected ? '#17351fcc' : '#3a2a1ccc',
        padding: { x: 16, y: 8 }
      }).setOrigin(0.5);

      container.add([g, icon, title, short, desc, detail, status]);
      container.setSize(w, h);
      container.setInteractive({ useHandCursor: true });
      container.on('pointerover', () => this.tweens.add({ targets: container, scale: 1.03, duration: 110 }));
      container.on('pointerout', () => this.tweens.add({ targets: container, scale: 1, duration: 110 }));
      container.on('pointerdown', () => this.selectClass(card.id));
      this.cardNodes[card.id] = { container, status };
    }

    drawCardShape(g, w, h, tint, selected) {
      const x = -w / 2;
      const y = -h / 2;
      g.fillStyle(0x2a2118, 0.96);
      g.fillRoundedRect(x + 8, y + 10, w - 16, h - 20, 34);
      g.fillStyle(tint, selected ? 0.24 : 0.12);
      g.fillEllipse(0, y + h * 0.33, w * 0.72, h * 0.46);
      g.lineStyle(selected ? 7 : 3, selected ? 0xe0c05a : 0x6f542b, selected ? 1 : 0.7);
      g.strokeRoundedRect(x + 8, y + 10, w - 16, h - 20, 34);
      g.lineStyle(2, 0xf6e0a3, selected ? 0.42 : 0.18);
      g.beginPath();
      g.moveTo(x + 56, y + h * 0.55);
      g.quadraticCurveTo(0, y + h * 0.62, x + w - 56, y + h * 0.55);
      g.strokePath();
    }

    selectClass(id) {
      if (this.state.profile.selectedClass === id) return;
      this.state.profile.selectedClass = id;
      global.GuardioesSave.save(this.state, true);
      global.GuardioesAudio.uiClick();
      this.scene.restart();
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.ClassTreeScene = ClassTreeScene;
})(window);
