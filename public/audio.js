(function () {
  function detectMode() {
    if (window.__MUSIC_MODE__) return window.__MUSIC_MODE__;
    const path = window.location.pathname;
    if (path === '/' || path === '/login' || path === '/register' || path === '/saves/new') return 'login';
    if (path === '/game') return 'game';
    return '';
  }

  const mode = detectMode();
  if (!mode) return;

  function suppressOriginalGameScript() {
    if (mode !== 'game') return;
    const removeOldGame = function () {
      document.querySelectorAll('script[src]').forEach(function (script) {
        if (script.src && script.src.indexOf('/assets/game.js') !== -1) script.remove();
      });
    };
    removeOldGame();
    if (document.documentElement && window.MutationObserver) {
      const observer = new MutationObserver(removeOldGame);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      window.addEventListener('load', function () { setTimeout(function () { observer.disconnect(); }, 2000); }, { once: true });
    }
  }

  suppressOriginalGameScript();

  const playlists = {
    login: ['/assets/audio/login.mp3', '/assets/audio/login.ogg'],
    game: [
      '/assets/audio/game-1.mp3',
      '/assets/audio/game-2.mp3',
      '/assets/audio/game-3.mp3',
      '/assets/audio/game-4.mp3',
      '/assets/audio/game-5.mp3'
    ]
  };

  const tracks = playlists[mode] || [];
  if (!tracks.length) return;

  const storageKey = 'pela-graca-music-muted';
  const audio = new Audio();
  audio.preload = 'auto';
  audio.volume = mode === 'login' ? 0.38 : 0.28;
  let index = 0;
  let started = false;
  let missingAttempts = 0;

  function isMuted() {
    return localStorage.getItem(storageKey) === '1';
  }

  function setMuted(muted) {
    localStorage.setItem(storageKey, muted ? '1' : '0');
    audio.muted = muted;
    updateButton();
  }

  function updateButton() {
    const btn = document.getElementById('music-toggle');
    if (!btn) return;
    btn.textContent = isMuted() ? 'Som off' : 'Som on';
    btn.setAttribute('aria-pressed', String(!isMuted()));
  }

  function setTrack(nextIndex) {
    index = ((nextIndex % tracks.length) + tracks.length) % tracks.length;
    audio.src = tracks[index];
  }

  async function play() {
    if (!audio.src) setTrack(index);
    audio.muted = isMuted();
    try {
      await audio.play();
      started = true;
      missingAttempts = 0;
    } catch (error) {
      // Browsers can block audio before the first click; missing files also land here.
    }
    updateButton();
  }

  function nextTrack() {
    setTrack(index + 1);
    if (started && !isMuted()) play();
  }

  function firstInteraction() {
    document.removeEventListener('pointerdown', firstInteraction);
    document.removeEventListener('keydown', firstInteraction);
    play();
  }

  function addButton() {
    if (document.getElementById('music-toggle')) return;
    const btn = document.createElement('button');
    btn.id = 'music-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Ligar ou desligar musica');
    btn.style.position = 'fixed';
    btn.style.right = '12px';
    btn.style.bottom = '12px';
    btn.style.zIndex = '3000';
    btn.style.border = '1px solid #8a6a20';
    btn.style.background = '#fffaf0';
    btn.style.color = '#4a3200';
    btn.style.borderRadius = '4px';
    btn.style.padding = '7px 10px';
    btn.style.font = '700 12px system-ui, -apple-system, Segoe UI, Arial, sans-serif';
    btn.style.boxShadow = '0 4px 16px rgba(42,24,0,.16)';
    btn.style.cursor = 'pointer';
    btn.onclick = function () {
      const muted = !isMuted();
      setMuted(muted);
      if (!muted) play();
    };
    document.body.appendChild(btn);
    updateButton();
  }

  audio.addEventListener('ended', nextTrack);
  audio.addEventListener('error', function () {
    missingAttempts += 1;
    if (mode === 'game' && missingAttempts < tracks.length + 2) nextTrack();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addButton, { once: true });
  } else {
    addButton();
  }

  document.addEventListener('pointerdown', firstInteraction, { once: true });
  document.addEventListener('keydown', firstInteraction, { once: true });
  setTrack(0);
})();
