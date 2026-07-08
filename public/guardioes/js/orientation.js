/* Caminho dos Guardioes - landscape obrigatorio, sem duas interfaces */
(function (global) {
  'use strict';

  function isPortrait() {
    return window.innerHeight > window.innerWidth;
  }

  function requestFullscreenAndLock() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    const p = req ? req.call(el).catch(() => {}) : Promise.resolve();
    p.then(() => {
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock('landscape').catch(() => {});
      }
    });
  }

  function initOrientationGate() {
    const overlay = document.getElementById('rotate-overlay');
    const fsBtn = document.getElementById('fullscreen-btn');

    function update() {
      if (!overlay) return;
      overlay.style.display = isPortrait() ? 'flex' : 'none';
    }

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    if (screen.orientation) screen.orientation.addEventListener('change', update);
    update();

    if (fsBtn) fsBtn.addEventListener('click', requestFullscreenAndLock);
  }

  global.GuardioesOrientation = { initOrientationGate, requestFullscreenAndLock, isPortrait };
})(window);
