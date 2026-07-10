/* Tower Defense - bootstrap: carrega save e cria o jogo (vertical, mobile-first) */
(function (global) {
  'use strict';

  async function boot() {
    const state = await global.GuardioesSave.load();
    const desktopQuery = '(min-width: 900px) and (min-height: 560px) and (orientation: landscape)';
    const isDesktop = global.matchMedia && global.matchMedia(desktopQuery).matches;
    global.GuardioesRuntime = {
      layout: isDesktop ? 'desktop' : 'mobile',
      isDesktop,
      width: isDesktop ? 1280 : global.GuardioesData.MAP.width,
      height: isDesktop ? 720 : global.GuardioesData.MAP.height
    };
    document.documentElement.dataset.guardioesLayout = global.GuardioesRuntime.layout;

    const config = {
      type: Phaser.AUTO,
      parent: 'game-root',
      backgroundColor: '#0d0b08',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: global.GuardioesRuntime.width,
        height: global.GuardioesRuntime.height
      },
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: [
        global.GuardioesScenes.BootScene,
        global.GuardioesScenes.MenuScene,
        global.GuardioesScenes.LevelSelectScene,
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
