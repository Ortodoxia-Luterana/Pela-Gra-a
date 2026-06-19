(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const SAVE_STATE_URL = "/api/concordium/gba-save/state";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
  const STATE_CAPTURE_MS = 1500;
  const PLAYER_COLORS = ["#d94f3d", "#3d7bd9", "#45a857", "#d8a629", "#8a5bd9", "#d95f9f"];

  const loading = document.getElementById("gba-loading");
  const saveStatus = document.getElementById("gba-save-status");
  const playerList = document.getElementById("gba-player-list");
  const playerDialog = document.getElementById("gba-player-dialog");
  const playerNameEl = document.getElementById("gba-player-name");
  const playerMapEl = document.getElementById("gba-player-map");
  const playerTeamEl = document.getElementById("gba-player-team");
  const playerBadgesEl = document.getElementById("gba-player-badges");

  let socket = null;
  let myId = "";
  let playerName = "Jogador";
  let myDetails = defaultDetails();
  let hasServerState = false;
  let lastSaveBody = null;
  let saveTimer = 0;
  let lastSaveAt = 0;
  const players = new Map();

  function defaultDetails() {
    return {
      mapName: "Mapa atual ainda nao lido da ROM",
      mapId: "",
      x: 0,
      y: 0,
      team: [],
      badges: [],
      playTime: ""
    };
  }

  function setSaveStatus(text) {
    saveStatus.textContent = text;
  }

  function safeName(value) {
    return String(value || "Jogador").replace(/[<>]/g, "").trim().slice(0, 24) || "Jogador";
  }

  function cleanDetails(details) {
    const value = details && typeof details === "object" ? details : {};
    return {
      mapName: String(value.mapName || "Mapa atual ainda nao lido da ROM").replace(/[<>]/g, "").slice(0, 64),
      mapId: String(value.mapId || "").replace(/[<>]/g, "").slice(0, 32),
      x: Math.max(0, Math.min(9999, Number(value.x) || 0)),
      y: Math.max(0, Math.min(9999, Number(value.y) || 0)),
      team: Array.isArray(value.team) ? value.team.slice(0, 6).map(item => String(item || "").replace(/[<>]/g, "").slice(0, 24)).filter(Boolean) : [],
      badges: Array.isArray(value.badges) ? value.badges.slice(0, 12).map(item => String(item || "").replace(/[<>]/g, "").slice(0, 24)).filter(Boolean) : [],
      playTime: String(value.playTime || "").replace(/[<>]/g, "").slice(0, 32)
    };
  }

  function hashCode(value) {
    return String(value).split("").reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
  }

  async function loadAccount() {
    try {
      const response = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      playerName = safeName(payload?.user?.name || "Jogador");
    } catch {}
  }

  async function loadServerSave() {
    try {
      const response = await fetch("/api/concordium/gba-save", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      myDetails = cleanDetails(payload?.save?.metadata);
      hasServerState = Boolean(payload?.save?.save && payload?.save?.saveKind === "state");
      lastSaveBody = {
        metadata: myDetails,
        save: payload?.save?.save || "",
        saveKind: payload?.save?.saveKind || "",
        hash: payload?.save?.hash || "",
        format: payload?.save?.format || "server"
      };
      setSaveStatus(payload.updatedAt ? "Save automatico ativo" : "Save automatico pronto");
    } catch {
      setSaveStatus("Save automatico indisponivel");
    }
  }

  async function romStatus() {
    const response = await fetch("/api/concordium/rom-status", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Nao foi possivel verificar a ROM.");
    return response.json();
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("Nao foi possivel carregar o emulador."));
      document.body.appendChild(script);
    });
  }

  function toBase64(value) {
    if (!value) return "";
    if (typeof value === "string") return value.slice(0, 8_000_000);
    const source = value instanceof ArrayBuffer
      ? new Uint8Array(value)
      : ArrayBuffer.isView(value)
        ? new Uint8Array(value.buffer, value.byteOffset, value.byteLength)
        : null;
    if (!source) return "";
    let binary = "";
    const chunkSize = 0x8000;
    for (let i = 0; i < source.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, source.subarray(i, i + chunkSize));
    }
    return btoa(binary).slice(0, 8_000_000);
  }

  function saveBodyFromEvent(eventData, saveKind = "state") {
    const payload = Array.isArray(eventData) ? eventData[0] || eventData[1] : eventData;
    const save = payload && typeof payload === "object" ? payload.save || payload.state || payload.data || payload : payload;
    const encoded = toBase64(save);
    if (saveKind !== "state" && lastSaveBody?.saveKind === "state") {
      return {
        ...lastSaveBody,
        metadata: myDetails,
        hash: payload?.hash || lastSaveBody.hash || "",
        format: payload?.format || lastSaveBody.format || "emulatorjs-state"
      };
    }
    return {
      metadata: myDetails,
      save: encoded,
      saveKind,
      hash: payload?.hash || "",
      format: payload?.format || "emulatorjs"
    };
  }

  function scheduleSave(body, immediate = false) {
    lastSaveBody = {
      metadata: cleanDetails(body?.metadata || myDetails),
      save: typeof body?.save === "string" ? body.save : "",
      saveKind: String(body?.saveKind || ""),
      hash: String(body?.hash || ""),
      format: String(body?.format || "emulatorjs")
    };
    if (saveTimer) clearTimeout(saveTimer);
    const delay = immediate ? 0 : 250;
    saveTimer = setTimeout(() => persistSaveNow(), delay);
  }

  async function persistSaveNow() {
    if (!lastSaveBody) return;
    const body = lastSaveBody;
    saveTimer = 0;
    try {
      const response = await fetch("/api/concordium/gba-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      lastSaveAt = Date.now();
      setSaveStatus(response.ok ? "Save automatico salvo agora" : "Falha no save automatico");
    } catch {
      setSaveStatus("Falha no save automatico");
    }
  }

  function persistSave(eventData, saveKind = "state") {
    scheduleSave(saveBodyFromEvent(eventData, saveKind), true);
  }

  function persistMetadata(immediate = false) {
    scheduleSave({
      metadata: myDetails,
      save: lastSaveBody?.save || "",
      saveKind: lastSaveBody?.saveKind || "metadata",
      hash: lastSaveBody?.hash || "",
      format: lastSaveBody?.format || "metadata"
    }, immediate);
  }

  function configureEmulator() {
    window.EJS_player = "#game";
    window.EJS_core = "mgba";
    window.EJS_gameUrl = ROM_URL;
    window.EJS_gameName = "Concordium";
    window.EJS_color = "#f1c75d";
    window.EJS_backgroundColor = "#000";
    window.EJS_startOnLoaded = true;
    window.EJS_fullscreenOnLoaded = false;
    window.EJS_pathtodata = EMULATOR_DATA_URL;
    window.EJS_biosUrl = "";
    window.EJS_fixedSaveInterval = 1000;
    if (hasServerState) {
      window.EJS_loadStateURL = `${SAVE_STATE_URL}?t=${Date.now()}`;
    }
    window.EJS_Buttons = {
      playPause: false,
      play: false,
      pause: false,
      restart: false,
      mute: false,
      unmute: false,
      settings: false,
      fullscreen: true,
      enterFullscreen: true,
      exitFullscreen: true,
      saveState: false,
      loadState: false,
      screenRecord: false,
      gamepad: false,
      cheat: false,
      volume: false,
      saveSavFiles: false,
      loadSavFiles: false,
      quickSave: false,
      quickLoad: false,
      screenshot: false,
      cacheManager: false,
      exitEmulation: false
    };
    window.EJS_onGameStart = () => {
      loading.classList.add("hidden");
      setSaveStatus(hasServerState ? "Save restaurado da conta" : "Save automatico ativo");
      setTimeout(captureAnySaveNow, 800);
    };
    window.EJS_ready = () => {
      loading.classList.add("hidden");
      hideEmulatorChrome();
    };
    window.EJS_onSaveUpdate = data => persistSave(data, "savefile");
    window.EJS_onSaveState = data => persistSave(data, "state");
    window.EJS_onSaveSaveFiles = data => persistSave(data, "savefile");
  }

  async function captureStateNow() {
    const manager = window.EJS_emulator?.gameManager;
    if (!manager || typeof manager.getState !== "function") return false;
    try {
      const state = await manager.getState();
      const encoded = toBase64(state);
      if (!encoded) return false;
      scheduleSave({
        metadata: myDetails,
        save: encoded,
        saveKind: "state",
        hash: `state-${Date.now()}`,
        format: "emulatorjs-state"
      }, true);
      return true;
    } catch {
      return false;
    }
  }

  function captureSaveFileNow() {
    if (lastSaveBody?.saveKind === "state" && lastSaveBody.save) return false;
    const manager = window.EJS_emulator?.gameManager;
    if (!manager) return false;
    try {
      if (typeof manager.saveSaveFiles === "function") manager.saveSaveFiles();
      const saveFile = typeof manager.getSaveFile === "function" ? manager.getSaveFile(false) : null;
      const encoded = toBase64(saveFile);
      if (!encoded) return false;
      scheduleSave({
        metadata: myDetails,
        save: encoded,
        saveKind: "savefile",
        hash: `savefile-${Date.now()}`,
        format: "emulatorjs-savefile"
      }, true);
      return true;
    } catch {
      return false;
    }
  }

  async function captureAnySaveNow() {
    const savedState = await captureStateNow();
    if (savedState) return true;
    return captureSaveFileNow();
  }

  function startInstantStateCapture() {
    setInterval(() => captureAnySaveNow(), STATE_CAPTURE_MS);
  }

  function hideEmulatorChrome() {
    const root = document.getElementById("game");
    if (!root) return;
    const forbidden = [
      "cheat", "pause", "play", "restart", "settings", "gamepad", "cache",
      "screenshot", "record", "mute", "volume", "upload", "file",
      "save state", "load state", "quick save", "quick load", "save files", "load files"
    ];
    root.querySelectorAll("button, [role='button'], input, label, a").forEach(node => {
      const text = `${node.textContent || ""} ${node.title || ""} ${node.getAttribute("aria-label") || ""}`.toLowerCase();
      if (text.includes("fullscreen")) return;
      if (!forbidden.some(key => text.includes(key))) return;
      node.style.display = "none";
      node.style.pointerEvents = "none";
    });
  }

  function upsertPlayer(player, isSelf = false) {
    if (!player?.id) return;
    players.set(player.id, {
      id: player.id,
      name: safeName(player.name),
      color: player.color || PLAYER_COLORS[1],
      details: cleanDetails(player.details),
      self: isSelf
    });
    renderRoster();
  }

  function removePlayer(id) {
    players.delete(id);
    renderRoster();
  }

  function renderRoster() {
    if (!players.size) {
      playerList.innerHTML = '<span class="gba-roster-empty">Conectando jogadores...</span>';
      return;
    }
    playerList.innerHTML = "";
    [...players.values()].sort((a, b) => Number(b.self) - Number(a.self) || a.name.localeCompare(b.name)).forEach(player => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `gba-player-pill${player.self ? " self" : ""}`;
      button.style.setProperty("--player-color", player.color);
      button.innerHTML = `<i></i><span>${player.self ? "voce" : player.name}</span>`;
      button.addEventListener("click", () => openPlayer(player));
      playerList.appendChild(button);
    });
  }

  function openPlayer(player) {
    const details = cleanDetails(player.details);
    playerNameEl.textContent = player.self ? `${player.name} (voce)` : player.name;
    playerMapEl.textContent = details.mapName;
    playerTeamEl.textContent = details.team.length ? details.team.join(", ") : "Equipe ainda nao lida do save";
    playerBadgesEl.textContent = details.badges.length ? details.badges.join(", ") : "Insignias ainda nao lidas do save";
    if (typeof playerDialog.showModal === "function") playerDialog.showModal();
    else playerDialog.setAttribute("open", "open");
  }

  async function startMultiplayer() {
    await loadScript("/socket.io/socket.io.js");
    socket = window.io({ transports: ["websocket", "polling"] });
    socket.on("connect", () => {
      const color = PLAYER_COLORS[Math.abs(hashCode(playerName)) % PLAYER_COLORS.length];
      socket.emit("concordium-gba:join", { name: playerName, x: 50, y: 72, dir: "down", color });
      socket.emit("concordium-gba:details", { metadata: myDetails });
    });
    socket.on("disconnect", () => {
      players.clear();
      renderRoster();
    });
    socket.on("concordium-gba:init", payload => {
      myId = payload.id;
      (payload.players || []).forEach(player => upsertPlayer(player, player.id === myId));
    });
    socket.on("concordium-gba:player-joined", player => upsertPlayer(player));
    socket.on("concordium-gba:player-update", player => upsertPlayer(player, player.id === myId));
    socket.on("concordium-gba:player-left", removePlayer);
  }

  function updateBridgeDetails(nextDetails) {
    myDetails = cleanDetails({ ...myDetails, ...(nextDetails || {}) });
    if (socket?.connected) socket.emit("concordium-gba:details", { metadata: myDetails });
    persistMetadata(true);
    const self = players.get(myId);
    if (self) {
      self.details = myDetails;
      players.set(myId, self);
      renderRoster();
    }
  }

  window.ConcordiumBridge = {
    update: updateBridgeDetails,
    getDetails: () => ({ ...myDetails }),
    saveNow: () => persistMetadata(true),
    markMap: (mapName, x = 0, y = 0) => updateBridgeDetails({ mapName, x, y }),
    setTeam: team => updateBridgeDetails({ team }),
    setBadges: badges => updateBridgeDetails({ badges })
  };

  document.addEventListener("fullscreenchange", () => {
    setTimeout(hideEmulatorChrome, 250);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") captureAnySaveNow().then(saved => {
      if (!saved) persistMetadata(true);
    });
  });

  window.addEventListener("pagehide", () => {
    captureAnySaveNow();
    persistMetadata(true);
    if (lastSaveBody) {
      const blob = new Blob([JSON.stringify(lastSaveBody)], { type: "application/json" });
      navigator.sendBeacon?.("/api/concordium/gba-save", blob);
    }
  });

  async function boot() {
    try {
      renderRoster();
      const status = await romStatus();
      if (!status.available) {
        loading.textContent = "ROM nativa nao encontrada.";
        return;
      }
      await loadAccount();
      await loadServerSave();
      await startMultiplayer();
      configureEmulator();
      await loadScript(LOADER_URL);
      setTimeout(hideEmulatorChrome, 1200);
      setInterval(hideEmulatorChrome, 3000);
      startInstantStateCapture();
    } catch (error) {
      loading.textContent = error.message || "Falha ao iniciar Concordium.";
    }
  }

  boot();
})();
