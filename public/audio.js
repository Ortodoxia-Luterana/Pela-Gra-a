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

  function stateScore(state) {
    if (!state || typeof state !== 'object') return 0;
    const year = Number(state.year) || 1904;
    const month = Number(state.month) || 0;
    let churches = 0;
    if (state.states) {
      Object.keys(state.states).forEach(function (id) {
        const slot = state.states[id] && state.states[id].denomData && state.states[id].denomData.IELB;
        churches += slot && Array.isArray(slot.churches) ? slot.churches.length : 0;
      });
    }
    return year * 12 + month + churches / 100;
  }

  function installSaveBackup() {
    if (mode !== 'game' || !window.__SAVE_ID__ || window.__saveBackupInstalled) return;
    window.__saveBackupInstalled = true;
    const saveKey = 'pela-graca-save-backup-' + window.__SAVE_ID__;
    const originalFetch = window.fetch.bind(window);

    function readBackup() {
      try { return JSON.parse(localStorage.getItem(saveKey) || 'null'); } catch (error) { return null; }
    }

    function writeBackup(state) {
      if (!state) return;
      const current = readBackup();
      if (!current || stateScore(state) >= stateScore(current.state)) {
        localStorage.setItem(saveKey, JSON.stringify({ state: state, savedAt: new Date().toISOString() }));
      }
    }

    function isSaveUrl(input) {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      return url.indexOf('/api/saves/' + window.__SAVE_ID__) !== -1;
    }

    window.fetch = async function (input, options) {
      const init = options || {};
      const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
      if (!isSaveUrl(input)) return originalFetch(input, options);

      if ((method === 'PUT' || method === 'POST') && init.body) {
        try {
          const payload = JSON.parse(init.body);
          const backup = readBackup();
          if (payload && payload.state && backup && stateScore(backup.state) > stateScore(payload.state)) {
            init.body = JSON.stringify({ state: backup.state });
          } else if (payload && payload.state) {
            writeBackup(payload.state);
          }
        } catch (error) {}
        return originalFetch(input, init);
      }

      const response = await originalFetch(input, options);
      if (method !== 'GET') return response;

      try {
        const clone = response.clone();
        const payload = await clone.json();
        const backup = readBackup();
        if (payload && payload.state) writeBackup(payload.state);
        if (backup && (!payload.state || stateScore(backup.state) > stateScore(payload.state))) {
          payload.state = backup.state;
          return new Response(JSON.stringify(payload), {
            status: response.status,
            statusText: response.statusText,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
          });
        }
      } catch (error) {}
      return response;
    };
  }

  function suppressOriginalGameScript() {
    if (mode !== 'game') return;

    function scriptPointsToOldGame(script) {
      if (!script || script.dataset && script.dataset.patchedGame === '1') return false;
      if (script.src && script.src.indexOf('/assets/game.js') !== -1) return true;
      for (let i = 0; i < script.attributes.length; i += 1) {
        if (String(script.attributes[i].value || '').indexOf('/assets/game.js') !== -1) return true;
      }
      return false;
    }

    const removeOldGame = function () {
      document.querySelectorAll('script').forEach(function (script) {
        if (scriptPointsToOldGame(script)) {
          script.type = 'text/plain';
          script.remove();
        }
      });
    };

    removeOldGame();
    if (document.documentElement && window.MutationObserver) {
      const observer = new MutationObserver(removeOldGame);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'type', 'data-src', 'data-rocket-src'] });
      window.addEventListener('load', function () { setTimeout(function () { removeOldGame(); observer.disconnect(); }, 5000); }, { once: true });
    }
  }

  installSaveBackup();
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
