/* Tower Defense - persistencia (server + cache local) */
(function (global) {
  'use strict';

  const LOCAL_KEY = 'guardioes_save_cache_v1';
  const SAVE_ENDPOINT = '/api/guardioes/save';
  const AUTOSAVE_DEBOUNCE_MS = 1200;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomSeed() {
    return (Math.random() * 0xffffffff) >>> 0;
  }

  function defaultCollectionEntry() {
    return { owned: false, fragments: 0, upgrades: {}, skills: {} };
  }

  function createDefaultProfile() {
    const D = global.GuardioesData;
    const collection = {};
    D.DEFENSE_ORDER.forEach(id => { collection[id] = defaultCollectionEntry(); });
    ['spearman', 'archer', 'burning-oil'].forEach(id => {
      collection[id].owned = true;
    });

    const classes = {};
    D.CLASS_ORDER.forEach(id => { classes[id] = { spent: 0, nodes: {} }; });

    return {
      version: 1,
      profile: {
        level: 1,
        xp: 0,
        coins: 260,
        selectedClass: 'merchant',
        classes
      },
      collection,
      loadouts: [{ name: 'Padrao', defenseIds: ['spearman', 'archer', 'burning-oil'] }],
      activeLoadout: 0,
      progress: { levels: {} },
      stats: { wins: 0, losses: 0, packsOpened: 0, lastDailyPack: '' },
      run: null
    };
  }

  function migrate(state) {
    if (!state || typeof state !== 'object') return createDefaultProfile();
    const def = createDefaultProfile();
    if (!state.profile) state.profile = def.profile;
    if (!state.collection) state.collection = def.collection;
    global.GuardioesData.DEFENSE_ORDER.forEach(id => {
      if (!state.collection[id]) state.collection[id] = JSON.parse(JSON.stringify(def.collection[id] || defaultCollectionEntry()));
    });
    if (!state.profile.classes) state.profile.classes = def.profile.classes;
    global.GuardioesData.CLASS_ORDER.forEach(id => {
      if (!state.profile.classes[id]) state.profile.classes[id] = { spent: 0, nodes: {} };
    });
    if (!global.GuardioesData.CLASSES[state.profile.selectedClass]) state.profile.selectedClass = def.profile.selectedClass;
    const validDefenseIds = new Set(global.GuardioesData.DEFENSE_ORDER);
    if (!state.loadouts || !state.loadouts.length) state.loadouts = def.loadouts;
    state.loadouts = state.loadouts.map(loadout => {
      const defenseIds = (loadout.defenseIds || []).filter(id => validDefenseIds.has(id));
      return Object.assign({}, loadout, { defenseIds: defenseIds.length ? defenseIds : def.loadouts[0].defenseIds.slice() });
    });
    if (typeof state.activeLoadout !== 'number') state.activeLoadout = 0;
    if (!state.loadouts[state.activeLoadout]) state.activeLoadout = 0;
    if (!state.progress) state.progress = { levels: {} };
    if (!state.progress.levels) state.progress.levels = {};
    if (!state.stats) state.stats = def.stats;
    if (state.run === undefined) state.run = null;
    return state;
  }

  function readLocalCache() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function writeLocalCache(state) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch (e) { /* quota / privacy mode: ignore */ }
  }

  async function loadFromServer() {
    try {
      const res = await fetch(SAVE_ENDPOINT, { credentials: 'same-origin' });
      if (!res.ok) return null;
      const data = await res.json();
      return data && data.state ? data.state : null;
    } catch (e) { return null; }
  }

  async function pushToServer(state) {
    try {
      await fetch(SAVE_ENDPOINT, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state })
      });
    } catch (e) { /* offline: local cache already has it */ }
  }

  async function load() {
    const server = await loadFromServer();
    const local = readLocalCache();
    const state = migrate(server || local || createDefaultProfile());
    writeLocalCache(state);
    return state;
  }

  let debounceHandle = null;
  function save(state, immediate) {
    writeLocalCache(state);
    if (debounceHandle) clearTimeout(debounceHandle);
    if (immediate) { pushToServer(state); return; }
    debounceHandle = setTimeout(() => pushToServer(state), AUTOSAVE_DEBOUNCE_MS);
  }

  function flushOnUnload(getState) {
    window.addEventListener('pagehide', () => {
      try {
        const payload = JSON.stringify({ state: getState() });
        navigator.sendBeacon(SAVE_ENDPOINT, new Blob([payload], { type: 'application/json' }));
      } catch (e) { /* best effort */ }
    });
  }

  global.GuardioesSave = { createDefaultProfile, load, save, flushOnUnload, mulberry32, randomSeed, migrate };
})(window);
