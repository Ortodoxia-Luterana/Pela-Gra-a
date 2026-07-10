/* Tower Defense - kit de UI reutilizavel (botoes/paineis com identidade propria) */
(function (global) {
  'use strict';

  function makeButton(scene, x, y, label, onClick, opts) {
    opts = opts || {};
    const width = opts.width || 260;
    const height = opts.height || 72;
    const fontSize = opts.fontSize || 24;
    const container = scene.add.container(x, y);
    const img = scene.add.image(0, 0, 'tex-wood-button').setDisplaySize(width, height);
    const text = scene.add.text(0, 0, label, {
      fontFamily: 'Georgia, serif', fontSize: `${fontSize}px`, color: '#f2e2b8', fontStyle: 'bold'
    }).setOrigin(0.5);
    container.add([img, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.04, duration: 90 }));
    container.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: 90 }));
    container.on('pointerdown', () => {
      if (global.GuardioesAudio) global.GuardioesAudio.uiClick();
      scene.tweens.add({ targets: container, scale: 0.94, duration: 60, yoyo: true, onComplete: onClick });
    });
    return container;
  }

  function makePanel(scene, x, y, width, height) {
    const img = scene.add.image(x, y, 'tex-parchment').setDisplaySize(width, height);
    return img;
  }

  function makeStonePanel(scene, x, y, width, height) {
    const img = scene.add.image(x, y, 'tex-stone-panel').setDisplaySize(width, height);
    return img;
  }

  function makeRaritySeal(scene, x, y, rarity, scale) {
    return scene.add.image(x, y, `tex-seal-${rarity}`).setScale(scale || 1);
  }

  function topBar(scene, title, onBack) {
    const width = scene.scale.width;
    const bar = scene.add.container(0, 0);
    const bg = scene.add.rectangle(width / 2, 34, width, 68, 0x1c1712, 0.85).setOrigin(0.5);
    const label = scene.add.text(width / 2, 34, title, {
      fontFamily: 'Georgia, serif', fontSize: '28px', color: '#f2e2b8', fontStyle: 'bold'
    }).setOrigin(0.5);
    bar.add([bg, label]);
    if (onBack) {
      const back = makeButton(scene, 90, 34, '< Voltar', onBack, { width: 150, height: 52, fontSize: 18 });
      bar.add(back);
    }
    return bar;
  }

  function floatingText(scene, x, y, text, color) {
    const t = scene.add.text(x, y, text, {
      fontFamily: 'Georgia, serif', fontSize: '22px', color: color || '#ffe9a8', fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(500);
    scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
    return t;
  }

  function screenShake(scene, intensity, duration) {
    scene.cameras.main.shake(duration || 160, intensity || 0.006);
  }

  function muteButton(scene, x, y) {
    const audio = global.GuardioesAudio;
    const btn = scene.add.text(x, y, audio.muted ? '🔇' : '🔊', { fontSize: '26px' }).setOrigin(0.5).setDepth(600).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      const muted = audio.toggleMuted();
      btn.setText(muted ? '🔇' : '🔊');
      if (!muted) audio.uiClick();
    });
    return btn;
  }

  global.GuardioesUI = { makeButton, makePanel, makeStonePanel, makeRaritySeal, topBar, floatingText, screenShake, muteButton };
})(window);
