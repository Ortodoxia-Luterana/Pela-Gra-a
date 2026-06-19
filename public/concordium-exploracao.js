(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
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
  const players = new Map();

  function defaultDetails() {
    return {
      mapName: "Mapa atual ainda nao lido da ROM",
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
    if (typeof value === "string") return value.slice(0, 1_500_000);
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
    return btoa(binary).slice(0, 1_500_000);
  }

  async function persistSave(eventData) {
    const payload = Array.isArray(eventData) ? eventData[0] || eventData[1] : eventData;
    const save = payload && typeof payload === "object" ? payload.save || payload.state || payload.data || payload : payload;
    const body = {
      metadata: myDetails,
      save: toBase64(save),
      hash: payload?.hash || "",
      format: payload?.format || "emulatorjs"
    };
    try {
      const response = await fetch("/api/concordium/gba-save", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      setSaveStatus(response.ok ? "Save automatico salvo" : "Falha no save automatico");
    } catch {
      setSaveStatus("Falha no save automatico");
    }
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
    window.EJS_fixedSaveInterval = 8000;
    window.EJS_Buttons = {
      playPause: false,
      play: false,
      pause: false,
      restart: false,
      mute: false,
      unmute: false,
      settings: false,
      fullscreen: false,
      enterFullscreen: false,
      exitFullscreen: false,
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
      setSaveStatus("Save automatico ativo");
    };
    window.EJS_ready = () => {
      loading.classList.add("hidden");
      hideEmulatorChrome();
    };
    window.EJS_onSaveUpdate = persistSave;
    window.EJS_onSaveState = persistSave;
  }

  function hideEmulatorChrome() {
    const root = document.getElementById("game");
    if (!root) return;
    const forbidden = ["cheat", "pause", "save", "load", "restart", "upload", "file", "menu"];
    root.querySelectorAll("button, [role='button'], input, label, a, div").forEach(node => {
      const text = `${node.textContent || ""} ${node.title || ""} ${node.getAttribute("aria-label") || ""} ${node.className || ""}`.toLowerCase();
      if (forbidden.some(key => text.includes(key))) {
        node.style.display = "none";
        node.style.pointerEvents = "none";
      }
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
    } catch (error) {
      loading.textContent = error.message || "Falha ao iniciar Concordium.";
    }
  }

  boot();
})();
