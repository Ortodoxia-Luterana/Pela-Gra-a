/* Tower Defense - BootScene: gera texturas e carrega assets externos quando existem. */
(function (global) {
  'use strict';

  // Assets reais (se existirem em /assets/guardioes/assets/) substituem a arte procedural
  // automaticamente - basta soltar um PNG com o mesmo nome, sem mexer em codigo.
  const ASSET_BASE = '/assets/guardioes/assets/';
  const ASSET_VERSION = 'sola-torre-visuals-2026-07-10-1';
  const HUB_BUILDINGS = ['build', 'collection', 'class', 'shop'];
  const ENEMY_ASSET_IDS = ['raider', 'runner', 'shield', 'flyer', 'healer', 'ram', 'boss'];
  const OVERRIDE_MANIFEST = [
    ['tex-menu-bg', 'menu-bg.jpg'],
    ['tex-menu-bg-desktop', 'menu-bg-desktop.jpg'],
    ['tex-guardian', 'guardian.png'],
    ...HUB_BUILDINGS.map(id => [`tex-building-${id}`, `building-${id}.png`]),
    ...global.GuardioesData.LEVELS.map(l => [`tex-map-${l.id}`, `map-${l.id}.jpg`]),
    ...global.GuardioesData.LEVELS.map(l => [`tex-map-${l.id}-desktop`, `map-${l.id}-desktop.jpg`]),
    ...global.GuardioesData.DEFENSE_ORDER.map(id => [`tex-defense-${id}`, `defense-${id}.png`]),
    ...ENEMY_ASSET_IDS.map(id => [`tex-enemy-${id}`, `enemy-${id}.png`])
  ];

  class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }

    preload() {
      this.load.on('loaderror', () => { /* arquivo ainda nao existe: segue com o procedural */ });
      OVERRIDE_MANIFEST.forEach(([key, file]) => this.load.image(key, `${ASSET_BASE}${file}?v=${ASSET_VERSION}`));
    }

    hasOverride(key) { return this.textures.exists(key); }

    create() {
      this.buildPanelTextures();
      this.buildGroundTextures();
      this.buildDefenseTextures();
      this.buildEnemyTextures();
      this.buildEffectTextures();
      this.buildHubTextures();
      this.scene.start('Menu');
    }

    g() { return this.make.graphics({ x: 0, y: 0, add: false }); }

    // --- paineis / UI: pergaminho, madeira, pedra ---
    buildPanelTextures() {
      // Pergaminho (parchment) - painel principal de menus
      let gfx = this.g();
      gfx.fillStyle(0xe8dcb8, 1);
      gfx.fillRoundedRect(0, 0, 512, 256, 18);
      gfx.lineStyle(6, 0x7a5a2e, 1);
      gfx.strokeRoundedRect(3, 3, 506, 250, 18);
      for (let i = 0; i < 140; i++) {
        const x = Math.random() * 512, y = Math.random() * 256;
        gfx.fillStyle(0xcfc09a, 0.35);
        gfx.fillCircle(x, y, Math.random() * 2 + 0.5);
      }
      gfx.generateTexture('tex-parchment', 512, 256);
      gfx.destroy();

      // Madeira escura - botoes e molduras
      gfx = this.g();
      gfx.fillStyle(0x3a2a1c, 1);
      gfx.fillRoundedRect(0, 0, 320, 96, 14);
      for (let y = 6; y < 96; y += 9) {
        gfx.lineStyle(2, 0x2a1c12, 0.6);
        gfx.lineBetween(6, y, 314, y + (Math.random() * 4 - 2));
      }
      gfx.lineStyle(4, 0x8a6a3a, 1);
      gfx.strokeRoundedRect(2, 2, 316, 92, 14);
      gfx.generateTexture('tex-wood-button', 320, 96);
      gfx.destroy();

      // Pedra escura - paineis de HUD
      gfx = this.g();
      gfx.fillStyle(0x2c2e33, 1);
      gfx.fillRoundedRect(0, 0, 256, 256, 10);
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * 256, y = Math.random() * 256;
        gfx.fillStyle(0x1c1e22, 0.5);
        gfx.fillRect(x, y, Math.random() * 30 + 10, Math.random() * 14 + 4);
      }
      gfx.lineStyle(4, 0x545a63, 1);
      gfx.strokeRoundedRect(2, 2, 252, 252, 10);
      gfx.generateTexture('tex-stone-panel', 256, 256);
      gfx.destroy();

      // Vidro colorido - selos de raridade
      const rarityColors = { comum: 0xb8b0a0, rara: 0x3d8bcf, epica: 0x9b4fd6, lendaria: 0xe0a52a };
      Object.entries(rarityColors).forEach(([key, color]) => {
        const gg = this.g();
        gg.fillStyle(color, 0.85);
        gg.fillCircle(24, 24, 22);
        gg.lineStyle(3, 0xffffff, 0.6);
        gg.strokeCircle(24, 24, 22);
        gg.fillStyle(0xffffff, 0.35);
        gg.fillEllipse(18, 16, 14, 8);
        gg.generateTexture(`tex-seal-${key}`, 48, 48);
        gg.destroy();
      });
    }

    // --- chao do mapa: cidade antiga / caminho de terra ---
    buildGroundTextures() {
      let gfx;
      if (this.hasOverride('tex-ground')) {
        // asset real ja carregado no preload - nao gerar por cima
      } else {
        gfx = this.g();
        gfx.fillStyle(0xb8a978, 1);
        gfx.fillRect(0, 0, 128, 128);
        // sombreado suave em diagonal pra nao ficar chapado
        gfx.fillStyle(0xcab989, 0.35);
        gfx.fillTriangle(0, 0, 128, 0, 0, 128);
        for (let i = 0; i < 60; i++) {
          gfx.fillStyle(0xa89968, 0.5);
          gfx.fillRect(Math.random() * 128, Math.random() * 128, Math.random() * 10 + 2, Math.random() * 10 + 2);
        }
        gfx.generateTexture('tex-ground', 128, 128);
        gfx.destroy();
      }

      gfx = this.g();
      gfx.fillStyle(0x8a6a45, 1);
      gfx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 50; i++) {
        gfx.fillStyle(0x7a5a38, 0.5);
        gfx.fillCircle(Math.random() * 128, Math.random() * 128, Math.random() * 4 + 1);
      }
      gfx.generateTexture('tex-path-tile', 128, 128);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0x6f5636, 1);
      gfx.fillRect(0, 0, 96, 96);
      gfx.lineStyle(3, 0x4a3822, 0.8);
      gfx.strokeRect(0, 0, 96, 96);
      gfx.generateTexture('tex-blocked', 96, 96);
      gfx.destroy();
    }

    // --- silhuetas das defesas ---
    buildDefenseTextures() {
      const D = global.GuardioesData.DEFENSES;

      // Arqueiro: base circular + figura em pe com arco
      this.drawTowerBase(D.archer.id, D.archer.color, gfx => {
        gfx.fillStyle(0x4a3a2a, 1);
        gfx.fillRect(-6, -30, 12, 26);
        gfx.fillStyle(D.archer.color, 1);
        gfx.fillCircle(0, -34, 9);
        gfx.lineStyle(3, 0x2a2a2a, 1);
        gfx.strokeCircle(10, -20, 14);
      });

      // Braseiro: braseiro de metal com chama
      this.drawTowerBase(D.fire.id, D.fire.color, gfx => {
        gfx.fillStyle(0x2c2c2c, 1);
        gfx.fillRect(-14, -10, 28, 12);
        gfx.fillStyle(0xff9d3d, 1);
        gfx.fillTriangle(0, -46, -12, -14, 12, -14);
        gfx.fillStyle(0xffe08a, 1);
        gfx.fillTriangle(0, -36, -6, -14, 6, -14);
      });

      // Armadilha: placa com espinhos, achatada (fica no chao)
      this.drawFlatBase(D.trap.id, D.trap.color, gfx => {
        gfx.fillStyle(0x3a3226, 1);
        gfx.fillRoundedRect(-26, -10, 52, 20, 4);
        for (let i = -20; i <= 20; i += 10) {
          gfx.fillStyle(0x8a8a8a, 1);
          gfx.fillTriangle(i, -10, i - 4, -22, i + 4, -22);
        }
      });

      // Balista: estrutura pesada de madeira e metal
      this.drawTowerBase(D.ballista.id, D.ballista.color, gfx => {
        gfx.fillStyle(0x3a2a1c, 1);
        gfx.fillRect(-20, -18, 40, 14);
        gfx.fillStyle(0x666f7a, 1);
        gfx.fillRect(-24, -30, 48, 6);
        gfx.lineStyle(3, 0x1c1c1c, 1);
        gfx.lineBetween(-24, -27, 24, -27);
      });

      // Estandarte: mastro com bandeira rasgada
      this.drawTowerBase(D.banner.id, D.banner.color, gfx => {
        gfx.fillStyle(0x3a2a1c, 1);
        gfx.fillRect(-2, -48, 4, 44);
        gfx.fillStyle(D.banner.color, 1);
        gfx.fillTriangle(2, -46, 2, -26, 26, -36);
        gfx.fillStyle(0xe0c05a, 1);
        gfx.fillCircle(0, -48, 4);
      });

      // Reliquia: base dourada com orbe flutuante
      this.drawTowerBase(D.relic.id, D.relic.color, gfx => {
        gfx.fillStyle(0x6a4f18, 1);
        gfx.fillRect(-10, -22, 20, 20);
        gfx.fillStyle(0xffe9a8, 1);
        gfx.fillCircle(0, -34, 12);
        gfx.lineStyle(3, 0xffffff, 0.8);
        gfx.strokeCircle(0, -34, 16);
      });
    }

    drawTowerBase(id, color, drawTop) {
      const key = `tex-defense-${id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      gfx.fillStyle(0x000000, 0.3);
      gfx.fillEllipse(0, 10, 36, 15);
      gfx.fillStyle(0x555555, 1);
      gfx.fillEllipse(0, 8, 34, 14);
      gfx.fillStyle(color, 1);
      gfx.fillRoundedRect(-16, -12, 32, 24, 6);
      gfx.fillStyle(0xffffff, 0.18);
      gfx.fillRoundedRect(-16, -12, 14, 24, 6);
      gfx.lineStyle(2, 0x000000, 0.4);
      gfx.strokeRoundedRect(-16, -12, 32, 24, 6);
      drawTop(gfx);
      gfx.generateTexture(key, 80, 80, -40, -46);
      gfx.destroy();
    }

    drawFlatBase(id, color, drawTop) {
      const key = `tex-defense-${id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillEllipse(2, 4, 58, 24);
      gfx.fillStyle(color, 0.9);
      gfx.fillEllipse(0, 0, 56, 24);
      gfx.fillStyle(0xffffff, 0.15);
      gfx.fillEllipse(-10, -6, 26, 10);
      drawTop(gfx);
      gfx.generateTexture(key, 80, 60, -40, -30);
      gfx.destroy();
    }

    // --- silhuetas dos inimigos ---
    buildEnemyTextures() {
      const E = global.GuardioesData.ENEMIES;

      this.drawEnemy(E.raider.id, E.raider.color, 22, gfx => {
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillTriangle(-6, -14, 6, -14, 0, -22);
      });
      this.drawEnemy(E.runner.id, E.runner.color, 16, gfx => {
        // rastro de velocidade atras do corpo
        gfx.fillStyle(0xd8a84a, 0.5);
        gfx.fillTriangle(-14, -4, -14, 4, -30, 0);
        gfx.fillStyle(0x2a2a2a, 1);
        gfx.fillCircle(5, -4, 3);
      });
      this.drawEnemy(E.shield.id, E.shield.color, 26, gfx => {
        gfx.fillStyle(0x9a9aa4, 1);
        gfx.fillRect(-16, -6, 8, 22);
      });
      this.drawFlyerTexture(E.flyer);
      this.drawHealerTexture(E.healer);
      this.drawEnemy(E.ram.id, E.ram.color, 32, gfx => {
        gfx.fillStyle(0x4a3a26, 1);
        gfx.fillRect(-24, -8, 48, 16);
        gfx.fillStyle(0x8a8a8a, 1);
        gfx.fillTriangle(-24, -8, -24, 8, -34, 0);
      });
      this.drawEnemy(E.boss.id, E.boss.color, 42, gfx => {
        gfx.fillStyle(0xe0a52a, 1);
        gfx.fillTriangle(-14, -30, 14, -30, 0, -46);
        gfx.fillStyle(0x8a1010, 1);
        gfx.fillCircle(0, -10, 6);
      });
    }

    // Harpia: desenho dedicado em camadas - sombra descolada (esta VOANDO),
    // asas membranosas com "dedos", corpo com barriga clara, cabeca com bico.
    drawFlyerTexture(def) {
      const key = `tex-enemy-${def.id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      // sombra pequena e afastada do corpo = sensacao de altitude
      gfx.fillStyle(0x000000, 0.20);
      gfx.fillEllipse(0, 30, 26, 8);
      // asas: membrana em dois tons + linhas de "dedos"
      [[-1, 0], [1, 0]].forEach(([s]) => {
        gfx.fillStyle(0x5a3f78, 1);
        gfx.fillTriangle(s * 10, -8, s * 44, -26, s * 16, 6);
        gfx.fillStyle(0x8a6ab0, 1);
        gfx.fillTriangle(s * 10, -8, s * 38, -20, s * 15, 2);
        gfx.lineStyle(2, 0x3a2a52, 0.8);
        gfx.lineBetween(s * 12, -6, s * 40, -23);
        gfx.lineBetween(s * 12, -3, s * 33, -12);
      });
      // corpo com barriga clara
      gfx.fillStyle(0x6a4a8a, 1);
      gfx.fillEllipse(0, -4, 24, 30);
      gfx.fillStyle(0x9a7ab8, 1);
      gfx.fillEllipse(0, 2, 14, 18);
      // cabeca + bico + olhos
      gfx.fillStyle(0x6a4a8a, 1);
      gfx.fillCircle(0, -20, 11);
      gfx.fillStyle(0xe0c05a, 1);
      gfx.fillTriangle(-3, -18, 3, -18, 0, -10);
      gfx.fillStyle(0xffe08a, 1);
      gfx.fillCircle(-4, -22, 2.5);
      gfx.fillCircle(4, -22, 2.5);
      gfx.lineStyle(2, 0x2a1c3a, 0.7);
      gfx.strokeEllipse(0, -4, 24, 30);
      gfx.generateTexture(key, 100, 84, 50, 42);
      gfx.destroy();
    }

    // Curandeiro: monge encapuzado com manto em camadas, corda na cintura
    // e cajado com orbe de cura brilhante.
    drawHealerTexture(def) {
      const key = `tex-enemy-${def.id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillEllipse(0, 26, 34, 11);
      // manto: base escura + frente clara
      gfx.fillStyle(0x2a5a36, 1);
      gfx.fillTriangle(-20, 24, 20, 24, 0, -26);
      gfx.fillStyle(0x3a7a4a, 1);
      gfx.fillTriangle(-13, 22, 13, 22, 0, -20);
      // capuz com rosto sombreado
      gfx.fillStyle(0x2a5a36, 1);
      gfx.fillCircle(0, -20, 12);
      gfx.fillStyle(0x14301c, 1);
      gfx.fillEllipse(0, -18, 14, 12);
      gfx.fillStyle(0xd8f0d8, 0.9);
      gfx.fillCircle(-3, -19, 1.8);
      gfx.fillCircle(3, -19, 1.8);
      // corda da cintura
      gfx.lineStyle(3, 0xcab989, 1);
      gfx.lineBetween(-11, 8, 11, 10);
      // cajado com orbe de cura
      gfx.lineStyle(4, 0x5a4632, 1);
      gfx.lineBetween(17, 24, 20, -24);
      gfx.fillStyle(0x5ae08a, 0.4);
      gfx.fillCircle(20, -27, 9);
      gfx.fillStyle(0xaef2c8, 1);
      gfx.fillCircle(20, -27, 5);
      // cruz de cura no peito
      gfx.fillStyle(0xd8f0d8, 1);
      gfx.fillRect(-2.5, -8, 5, 16);
      gfx.fillRect(-8, -3, 16, 5);
      gfx.generateTexture(key, 88, 92, 44, 50);
      gfx.destroy();
    }

    drawEnemy(id, color, radius, drawExtra) {
      const key = `tex-enemy-${id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillEllipse(0, radius * 0.7, radius * 1.3, radius * 0.5);
      gfx.fillStyle(color, 1);
      gfx.fillCircle(0, 0, radius);
      gfx.fillStyle(0xffffff, 0.16);
      gfx.fillEllipse(-radius * 0.3, -radius * 0.35, radius * 0.9, radius * 0.5);
      gfx.lineStyle(2, 0x000000, 0.5);
      gfx.strokeCircle(0, 0, radius);
      drawExtra(gfx);
      const size = radius * 2 + 20;
      gfx.generateTexture(key, size, size, size / 2, size / 2);
      gfx.destroy();
    }

    // --- efeitos: projeteis, particulas, aneis ---
    buildEffectTextures() {
      let gfx = this.g();
      gfx.fillStyle(0xf2e7c9, 1);
      gfx.fillRect(-1, -8, 2, 16);
      gfx.generateTexture('tex-arrow', 6, 20, 3, 10);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0xffb35a, 1);
      gfx.fillCircle(0, 0, 6);
      gfx.generateTexture('tex-fireball', 14, 14, 7, 7);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0x3a3f4a, 1);
      gfx.fillRect(-2, -10, 4, 20);
      gfx.generateTexture('tex-bolt', 8, 24, 4, 12);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0xffe9a8, 1);
      gfx.fillCircle(0, 0, 8);
      gfx.lineStyle(2, 0xffffff, 0.8);
      gfx.strokeCircle(0, 0, 10);
      gfx.generateTexture('tex-relic-orb', 24, 24, 12, 12);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(0, 0, 4);
      gfx.generateTexture('tex-spark', 10, 10, 5, 5);
      gfx.destroy();

      gfx = this.g();
      gfx.lineStyle(3, 0x8ad2ff, 0.8);
      gfx.strokeCircle(60, 60, 58);
      gfx.generateTexture('tex-range-ring', 120, 120);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0x2ecc71, 0.35);
      gfx.fillCircle(30, 30, 28);
      gfx.generateTexture('tex-valid-preview', 60, 60);
      gfx.destroy();

      gfx = this.g();
      gfx.fillStyle(0xe74c3c, 0.35);
      gfx.fillCircle(30, 30, 28);
      gfx.generateTexture('tex-invalid-preview', 60, 60);
      gfx.destroy();
    }

    // --- vilarejo (tela inicial estilo hub): predios clicaveis + guardiao parado ---
    buildHubTextures() {
      this.buildBuildingIcon('build', 0x8a2f3f, gfx => {
        // Tenda de comando listrada com estandarte no topo
        gfx.fillStyle(0x5a3a28, 1);
        gfx.fillTriangle(-32, 22, 32, 22, 0, -20);
        gfx.fillStyle(0x7a4a32, 1);
        gfx.fillTriangle(-24, 22, 24, 22, 0, -14);
        gfx.fillStyle(0x4a2a1c, 1);
        gfx.fillTriangle(-8, 22, 8, 22, 0, 4);   // entrada da tenda
        gfx.lineStyle(2, 0x2a1810, 0.7);
        gfx.lineBetween(0, -20, -32, 22);
        gfx.lineBetween(0, -20, 32, 22);
        gfx.fillStyle(0x3a2a1c, 1);
        gfx.fillRect(-2, -48, 4, 32);
        gfx.fillStyle(0x8a2f3f, 1);
        gfx.fillTriangle(2, -46, 2, -28, 24, -37);
        gfx.fillStyle(0xb84a5c, 1);
        gfx.fillTriangle(2, -44, 2, -34, 15, -39);
        gfx.fillStyle(0xe0c05a, 1);
        gfx.fillCircle(0, -48, 3.5);
      });

      this.buildBuildingIcon('collection', 0x8a6a3a, gfx => {
        // Bau do tesouro com faixas de metal e brilho saindo da tampa
        gfx.fillStyle(0xffe9a8, 0.35);
        gfx.fillTriangle(-20, -12, 20, -12, 0, -38);   // luz vazando
        gfx.fillStyle(0x5a4020, 1);
        gfx.fillRoundedRect(-26, -8, 52, 28, 5);
        gfx.fillStyle(0x7a5a2e, 1);
        gfx.fillRoundedRect(-28, -22, 56, 18, 7);
        gfx.fillStyle(0x9a7a44, 1);
        gfx.fillRoundedRect(-24, -20, 48, 8, 5);
        // faixas de metal
        gfx.fillStyle(0x8a8f9a, 1);
        gfx.fillRect(-18, -22, 5, 42);
        gfx.fillRect(13, -22, 5, 42);
        // fechadura dourada
        gfx.fillStyle(0xe0c05a, 1);
        gfx.fillRoundedRect(-6, -12, 12, 12, 3);
        gfx.fillStyle(0x5a4020, 1);
        gfx.fillCircle(0, -7, 2.5);
        gfx.lineStyle(2, 0x2a1c12, 0.7);
        gfx.strokeRoundedRect(-26, -8, 52, 28, 5);
      });

      this.buildBuildingIcon('class', 0x3d8bcf, gfx => {
        // Arvore de habilidades: tronco + copa em camadas com "nos" dourados
        gfx.fillStyle(0x5a4632, 1);
        gfx.fillRect(-4, -2, 8, 26);
        gfx.fillTriangle(-4, 6, -12, 14, -4, 12);
        gfx.fillStyle(0x2e6a4a, 1);
        gfx.fillCircle(0, -18, 19);
        gfx.fillCircle(-15, -6, 13);
        gfx.fillCircle(15, -6, 13);
        gfx.fillStyle(0x3f8f63, 1);
        gfx.fillCircle(-4, -20, 12);
        gfx.fillCircle(12, -9, 8);
        // nos de habilidade brilhando na copa
        gfx.fillStyle(0xffe08a, 1);
        gfx.fillCircle(-10, -14, 3.5);
        gfx.fillCircle(8, -22, 3.5);
        gfx.fillCircle(14, -4, 3.5);
        gfx.lineStyle(2, 0xe0c05a, 0.6);
        gfx.lineBetween(-10, -14, 8, -22);
        gfx.lineBetween(8, -22, 14, -4);
      });

      this.buildBuildingIcon('shop', 0xc65b2b, gfx => {
        // Barraca de feira: toldo listrado, balcao de madeira e mercadorias
        gfx.fillStyle(0x6a4a2c, 1);
        gfx.fillRect(-26, -6, 5, 28);
        gfx.fillRect(21, -6, 5, 28);
        gfx.fillStyle(0x8a5a34, 1);
        gfx.fillRect(-28, 12, 56, 12);   // balcao
        gfx.fillStyle(0x7a4a28, 1);
        gfx.fillRect(-28, 12, 56, 4);
        // mercadorias no balcao
        gfx.fillStyle(0xe0a52a, 1);
        gfx.fillCircle(-14, 9, 5);
        gfx.fillStyle(0x9b4fd6, 1);
        gfx.fillCircle(0, 8, 6);
        gfx.fillStyle(0x3d8bcf, 1);
        gfx.fillCircle(14, 9, 5);
        // toldo listrado com barra
        for (let i = 0; i < 5; i++) {
          gfx.fillStyle(i % 2 === 0 ? 0xe0c05a : 0xc65b2b, 1);
          gfx.fillRect(-30 + i * 12, -24, 12, 14);
        }
        gfx.fillStyle(0x8a4a1c, 1);
        gfx.fillRect(-30, -12, 60, 4);
        // recortes onduladas do toldo
        for (let i = 0; i < 5; i++) {
          gfx.fillStyle(i % 2 === 0 ? 0xe0c05a : 0xc65b2b, 1);
          gfx.fillTriangle(-30 + i * 12, -8, -18 + i * 12, -8, -24 + i * 12, -2);
        }
      });

      // Defensor parado na tela inicial - cavaleiro com capa, armadura com
      // detalhe dourado, elmo com pluma, escudo com emblema e lanca.
      const key = 'tex-guardian';
      if (!this.hasOverride(key)) {
        const gfx = this.g();
        gfx.fillStyle(0x000000, 0.28);
        gfx.fillEllipse(0, 78, 52, 16);
        // capa: externa escura + forro interno mais claro
        gfx.fillStyle(0x4a2530, 1);
        gfx.fillTriangle(-30, 72, 30, 72, 0, -22);
        gfx.fillStyle(0x6a3542, 1);
        gfx.fillTriangle(-22, 68, 22, 68, 0, -14);
        // pernas/botas
        gfx.fillStyle(0x2a2a30, 1);
        gfx.fillRect(-12, 44, 9, 28);
        gfx.fillRect(3, 44, 9, 28);
        gfx.fillStyle(0x4a3a2a, 1);
        gfx.fillRect(-13, 64, 11, 10);
        gfx.fillRect(2, 64, 11, 10);
        // torso: armadura com peitoral e faixa dourada
        gfx.fillStyle(0x3a4656, 1);
        gfx.fillRoundedRect(-17, -10, 34, 56, 9);
        gfx.fillStyle(0x53637a, 1);
        gfx.fillRoundedRect(-13, -6, 18, 46, 8);
        gfx.lineStyle(3, 0xc9a24a, 1);
        gfx.strokeRoundedRect(-17, -10, 34, 56, 9);
        gfx.fillStyle(0xc9a24a, 1);
        gfx.fillRect(-17, 16, 34, 5);
        // ombreiras
        gfx.fillStyle(0x2c3a46, 1);
        gfx.fillEllipse(-19, -6, 14, 12);
        gfx.fillEllipse(19, -6, 14, 12);
        // cabeca: elmo com viseira e pluma
        gfx.fillStyle(0xd8b98a, 1);
        gfx.fillCircle(0, -28, 13);
        gfx.fillStyle(0x53637a, 1);
        gfx.fillRoundedRect(-14, -44, 28, 18, 7);
        gfx.fillStyle(0x2c3a46, 1);
        gfx.fillRect(-14, -30, 28, 5);
        gfx.fillStyle(0xb03a3a, 1);
        gfx.fillEllipse(0, -50, 8, 12);
        gfx.fillEllipse(4, -46, 6, 10);
        // escudo no braco esquerdo com emblema (rosa/cruz)
        gfx.fillStyle(0x5a4632, 1);
        gfx.fillEllipse(-28, 16, 22, 30);
        gfx.fillStyle(0x8a6a3a, 1);
        gfx.fillEllipse(-28, 16, 16, 24);
        gfx.fillStyle(0xe8dcb8, 1);
        gfx.fillRect(-30, 8, 4, 16);
        gfx.fillRect(-34, 14, 12, 4);
        gfx.lineStyle(2, 0x2a1c12, 0.8);
        gfx.strokeEllipse(-28, 16, 22, 30);
        // lanca no braco direito: haste com anel + ponta metalica com brilho
        gfx.fillStyle(0x6a4a2a, 1);
        gfx.fillRect(28, -66, 5, 138);
        gfx.fillStyle(0xc9a24a, 1);
        gfx.fillRect(26, -20, 9, 5);
        gfx.fillStyle(0xb8bfcc, 1);
        gfx.fillTriangle(22, -66, 39, -66, 30.5, -92);
        gfx.fillStyle(0xffffff, 0.5);
        gfx.fillTriangle(27, -68, 31, -68, 29, -84);
        gfx.generateTexture(key, 110, 200, 55, 100);
        gfx.destroy();
      }
    }

    buildBuildingIcon(id, color, drawTop) {
      const key = `tex-building-${id}`;
      if (this.hasOverride(key)) return;
      const gfx = this.g();
      gfx.fillStyle(0x000000, 0.25);
      gfx.fillEllipse(0, 26, 60, 18);
      gfx.fillStyle(0xcab989, 1);
      gfx.fillRoundedRect(-32, 10, 64, 18, 6);
      gfx.lineStyle(2, 0x00000033, 1);
      gfx.strokeRoundedRect(-32, 10, 64, 18, 6);
      drawTop(gfx);
      gfx.generateTexture(key, 120, 120, 60, 70);
      gfx.destroy();
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.BootScene = BootScene;
})(window);
