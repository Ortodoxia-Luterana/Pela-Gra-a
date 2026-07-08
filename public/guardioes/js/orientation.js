/* Caminho dos Guardioes - jogo vertical (mobile-first), sem trava de orientacao.
   So oferece um atalho de tela cheia opcional. */
(function (global) {
  'use strict';

  function requestFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }

  global.GuardioesOrientation = { requestFullscreen };
})(window);
