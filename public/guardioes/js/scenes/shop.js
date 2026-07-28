/* Tower Defense - ShopScene: economia fora da partida (moedas -> torres/fragmentos) */
(function (global) {
  'use strict';
  const UI = global.GuardioesUI;
  const D = global.GuardioesData;

  const PACKS = [
    { id: 'fragmentos-comuns', name: 'Saco de Fragmentos', cost: 100, kind: 'fragments', rarity: 'comum', amount: 6 },
    { id: 'fragmentos-raros', name: 'Bolsa de Fragmentos Raros', cost: 240, kind: 'fragments', rarity: 'rara', amount: 5 },
    { id: 'defesa-nova', name: 'Pergaminho de Defesa', cost: 420, kind: 'unlock', amount: 1 }
  ];

  class ShopScene extends Phaser.Scene {
    constructor() { super('Shop'); }

    create() {
      const { width, height } = this.scale;
      const state = this.registry.get('state');
      this.state = state;

      this.add.rectangle(0, 0, width, height, 0x181410).setOrigin(0);
      UI.topBar(this, 'Loja', () => this.scene.start('Menu'));

      this.coinsText = this.add.text(width - 30, 26, '', {
        fontFamily: 'Georgia, serif', fontSize: '18px', color: '#f2e2b8', fontStyle: 'bold'
      }).setOrigin(1, 0);
      this.refreshCoins();

      // Coluna unica: aproveita a altura do canvas vertical em vez de espremer na largura.
      const cardW = Math.min(420, width - 60), cardH = 190, gap = 24;
      const startY = 180;

      PACKS.forEach((pack, i) => {
        const x = width / 2;
        const y = startY + i * (cardH + gap);
        this.buildPackCard(pack, x, y, cardW, cardH);
      });
    }

    refreshCoins() {
      this.coinsText.setText(`${this.state.profile.coins} moedas`);
    }

    buildPackCard(pack, x, y, w, h) {
      const container = this.add.container(x, y);
      const bg = UI.makePanel(this, 0, 0, w, h);
      const icon = this.add.text(0, -70, pack.kind === 'unlock' ? '📜' : '💎', { fontSize: '48px' }).setOrigin(0.5);
      const name = this.add.text(0, -10, pack.name, {
        fontFamily: 'Georgia, serif', fontSize: '15px', color: '#3a2c1a', fontStyle: 'bold', wordWrap: { width: w - 30 }, align: 'center'
      }).setOrigin(0.5);
      container.add([bg, icon, name]);
      const btn = UI.makeButton(this, 0, h / 2 - 34, `${pack.cost} moedas`, () => this.buyPack(pack), { width: w - 30, height: 46, fontSize: 15 });
      container.add(btn);
    }

    buyPack(pack) {
      const state = this.state;
      if (state.profile.coins < pack.cost) {
        UI.floatingText(this, this.scale.width / 2, this.scale.height / 2, 'Moedas insuficientes', '#e74c3c');
        return;
      }
      state.profile.coins -= pack.cost;
      state.stats.packsOpened = (state.stats.packsOpened || 0) + 1;

      if (pack.kind === 'fragments') {
        const pool = D.defensesByRarity(pack.rarity).filter(id => state.collection[id].owned);
        const candidates = pool.length ? pool : D.DEFENSE_ORDER.filter(id => state.collection[id].owned);
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        state.collection[pick].fragments += pack.amount;
        UI.floatingText(this, this.scale.width / 2, this.scale.height / 2, `+${pack.amount} fragmentos de ${D.DEFENSES[pick].name}`, '#2ecc71');
      } else if (pack.kind === 'unlock') {
        const locked = D.DEFENSE_ORDER.filter(id => !state.collection[id].owned);
        if (!locked.length) {
          state.profile.coins += pack.cost;
          UI.floatingText(this, this.scale.width / 2, this.scale.height / 2, 'Coleção já completa!', '#f2e2b8');
          return;
        }
        const pick = locked[Math.floor(Math.random() * locked.length)];
        state.collection[pick].owned = true;
        UI.floatingText(this, this.scale.width / 2, this.scale.height / 2, `Nova defesa: ${D.DEFENSES[pick].name}!`, '#e0a52a');
      }

      global.GuardioesSave.save(this.state);
      this.refreshCoins();
    }
  }

  global.GuardioesScenes = global.GuardioesScenes || {};
  global.GuardioesScenes.ShopScene = ShopScene;
})(window);
