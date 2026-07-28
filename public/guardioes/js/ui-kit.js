/* Tower Defense - kit de UI contido, legivel e reutilizavel. */
(function (global) {
  'use strict';

  const FONT_UI = '"Trebuchet MS", Arial, sans-serif';
  const FONT_TITLE = 'Georgia, "Times New Roman", serif';

  function fitText(text, maxWidth, maxHeight, preferredSize, minimumSize) {
    let size = preferredSize;
    const min = minimumSize || 11;
    text.setScale(1);
    text.setFontSize(preferredSize);
    text.setWordWrapWidth(maxWidth, true);
    while (size > min && (text.width > maxWidth || text.height > maxHeight)) {
      size -= 1;
      text.setFontSize(size);
    }
    if (text.width > maxWidth || text.height > maxHeight) {
      const scale = Math.min(1, maxWidth / Math.max(1, text.width), maxHeight / Math.max(1, text.height));
      text.setScale(scale);
    }
    return text;
  }

  function makeButton(scene, x, y, label, onClick, opts) {
    opts = opts || {};
    const width = opts.width || 260;
    const height = opts.height || 72;
    const fontSize = opts.fontSize || 24;
    const container = scene.add.container(x, y);
    const texture = scene.textures.exists('tex-ui-button-clean') ? 'tex-ui-button-clean' : 'tex-wood-button';
    const img = scene.add.image(0, 0, texture).setDisplaySize(width, height);
    const text = scene.add.text(0, 0, label, {
      fontFamily: FONT_UI,
      fontSize: `${fontSize}px`,
      color: '#fff7df',
      fontStyle: 'bold',
      align: 'center',
      lineSpacing: 0
    }).setOrigin(0.5);
    text.setData('preferredFontSize', fontSize);
    fitText(text, width - 28, height - 16, fontSize, 11);
    container.add([img, text]);
    container.setSize(width, height);
    container.setInteractive({ useHandCursor: true });
    container.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.025, duration: 90 }));
    container.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: 90 }));
    container.on('pointerdown', () => {
      if (global.GuardioesAudio) global.GuardioesAudio.uiClick();
      scene.tweens.add({ targets: container, scale: 0.97, duration: 55, yoyo: true, onComplete: onClick });
    });
    return container;
  }

  function setButtonLabel(button, label) {
    if (!button || !button.list || button.list.length < 2) return;
    const bg = button.list[0];
    const text = button.list[1];
    const preferred = text.getData('preferredFontSize') || parseInt(text.style.fontSize, 10) || 18;
    text.setText(label);
    fitText(text, bg.displayWidth - 28, bg.displayHeight - 16, preferred, 11);
  }

  function makePanel(scene, x, y, width, height) {
    const texture = scene.textures.exists('tex-ui-panel-clean') ? 'tex-ui-panel-clean' : 'tex-parchment';
    return scene.add.image(x, y, texture).setDisplaySize(width, height);
  }

  function makeStonePanel(scene, x, y, width, height) {
    const texture = scene.textures.exists('tex-ui-hud-clean') ? 'tex-ui-hud-clean' : 'tex-stone-panel';
    return scene.add.image(x, y, texture).setDisplaySize(width, height);
  }

  function makeRaritySeal(scene, x, y, rarity, scale) {
    return scene.add.image(x, y, `tex-seal-${rarity}`).setScale(scale || 1);
  }

  function topBar(scene, title, onBack) {
    const width = scene.scale.width;
    const desktop = Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
    const bar = scene.add.container(0, 0);
    const bg = scene.add.rectangle(width / 2, 34, width, 68, 0x101619, 0.96).setOrigin(0.5);
    const label = scene.add.text(width / 2, 34, title, {
      fontFamily: FONT_TITLE,
      fontSize: desktop ? '26px' : '20px',
      color: '#f2e2b8',
      fontStyle: 'bold',
      align: 'center'
    }).setOrigin(0.5);
    fitText(label, width - (onBack ? (desktop ? 360 : 230) : 50), 48, desktop ? 26 : 20, 13);
    bar.add([bg, label]);
    if (onBack) {
      const back = makeButton(scene, desktop ? 86 : 52, 34, 'Voltar', onBack, {
        width: desktop ? 136 : 86,
        height: desktop ? 44 : 40,
        fontSize: desktop ? 16 : 12
      });
      bar.add(back);
    }
    return bar;
  }

  function floatingText(scene, x, y, text, color) {
    const t = scene.add.text(x, y, text, {
      fontFamily: FONT_UI,
      fontSize: '20px',
      color: color || '#ffe9a8',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(500);
    scene.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 700, ease: 'Cubic.Out', onComplete: () => t.destroy() });
    return t;
  }

  function screenShake(scene, intensity, duration) {
    scene.cameras.main.shake(duration || 160, intensity || 0.006);
  }

  function muteButton(scene, x, y) {
    const audio = global.GuardioesAudio;
    const desktop = Boolean(global.GuardioesRuntime && global.GuardioesRuntime.isDesktop);
    const btn = scene.add.text(x, y, audio.muted ? 'MUDO' : 'SOM', {
      fontFamily: FONT_UI,
      fontSize: desktop ? '12px' : '18px',
      color: '#e6dcc2',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(600).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      const muted = audio.toggleMuted();
      btn.setText(muted ? 'MUDO' : 'SOM');
      if (!muted) audio.uiClick();
    });
    return btn;
  }

  global.GuardioesUI = {
    makeButton,
    setButtonLabel,
    makePanel,
    makeStonePanel,
    makeRaritySeal,
    topBar,
    floatingText,
    screenShake,
    muteButton,
    fitText,
    FONT_UI,
    FONT_TITLE
  };
})(window);
