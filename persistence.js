(function () {
  const saveId = window.__SAVE_ID__;
  const statusEl = () => document.getElementById('save-status');
  let lastSaved = '';
  let saveTimer = null;

  function setStatus(text, bad = false) {
    const el = statusEl();
    if (!el) return;
    el.textContent = text;
    el.classList.toggle('bad', bad);
  }

  function serializeGame(game) {
    return {
      ...game,
      lastEv: Array.from(game.lastEv || []),
      foundedDenoms: Array.from(game.foundedDenoms || [])
    };
  }

  function reviveGame(raw) {
    if (!raw) return null;
    return {
      ...raw,
      lastEv: new Set(raw.lastEv || []),
      foundedDenoms: new Set(raw.foundedDenoms || [])
    };
  }

  async function loadInto(game) {
    try {
      const response = await fetch(`/api/saves/${saveId}`);
      if (!response.ok) throw new Error('Falha ao carregar save');
      const payload = await response.json();
      const saved = reviveGame(payload.state);
      if (saved) {
        Object.keys(game).forEach(key => delete game[key]);
        Object.assign(game, saved);
        setStatus('Save carregado do SQLite');
      } else {
        setStatus('História nova');
      }
    } catch (error) {
      console.error(error);
      setStatus('Sem persistência SQLite', true);
    }
  }

  async function save(game) {
    const state = serializeGame(game);
    const body = JSON.stringify({ state });
    if (body === lastSaved) return;
    lastSaved = body;

    try {
      const response = await fetch(`/api/saves/${saveId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!response.ok) throw new Error('Falha ao salvar');
      setStatus('Salvo no SQLite');
    } catch (error) {
      console.error(error);
      setStatus('Erro ao salvar', true);
    }
  }

  function start(game) {
    saveTimer = setInterval(() => save(game), 3000);
    window.addEventListener('beforeunload', () => {
      if (saveTimer) clearInterval(saveTimer);
      navigator.sendBeacon?.(`/api/saves/${saveId}`, JSON.stringify({ state: serializeGame(game) }));
    });
  }

  window.CultivandoPersistence = { loadInto, start, save };
})();
