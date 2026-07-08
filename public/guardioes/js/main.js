/* Caminho dos Guardioes - bootstrap: carrega save, cria o jogo, liga o gate de orientacao */
(function (global) {
  'use strict';

  async function boot() {
    global.GuardioesOrientation.initOrientationGate();

    const state = await global.GuardioesSave.load();

    const config = {
      type: Phaser.AUTO,
      parent: 'game-root',
      backgroundColor: '#0d0b08',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: global.GuardioesData.MAP.width,
        height: global.GuardioesData.MAP.height
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [
        global.GuardioesScenes.BootScene,
        global.GuardioesScenes.MenuScene,
        global.GuardioesScenes.BuildSetupScene,
        global.GuardioesScenes.CollectionScene,
        global.GuardioesScenes.ClassTreeScene,
        global.GuardioesScenes.ShopScene,
        global.GuardioesScenes.BattleScene
      ]
    };

    const game = new Phaser.Game(config);
    game.registry.set('state', state);

    global.GuardioesSave.flushOnUnload(() => game.registry.get('state'));
  }

  boot();
})(window);
