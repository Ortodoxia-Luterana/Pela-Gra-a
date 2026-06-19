(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
  const MOVE_SPEED = 22;
  const SEND_EVERY_MS = 80;
  const PLAYER_COLORS = ["#d94f3d", "#3d7bd9", "#45a857", "#d8a629", "#8a5bd9", "#d95f9f"];

  const shell = document.querySelector(".gba-shell");
  const overlay = document.getElementById("gba-overlay");
  const startButton = document.getElementById("gba-start");
  const statusEl = document.getElementById("gba-status");
  const multiplayerLayer = document.getElementById("gba-multiplayer");
  const onlineCount = document.getElementById("gba-online-count");
  const onlineStatus = document.getElementById("gba-online-status");
  const panel = document.getElementById("gba-panel");
  const panelToggle = document.getElementById("gba-panel-toggle");
  const panelClose = document.getElementById("gba-panel-close");
  const dpad = document.querySelector(".gba-dpad");

  let emulatorLoaded = false;
  let socket = null;
  let myId = "";
  let playerName = "Jogador";
  let lastFrameAt = 0;
  let lastSentAt = 0;
  let moving = false;

  const pressed = { up: false, down: false, left: false, right: false };
  const playerNodes = new Map();
  const players = new Map();
  const me = { id: "", name: "Voce", x: 50, y: 72, dir: "down", color: PLAYER_COLORS[0] };

  panelToggle.addEventListener("click", () => panel.classList.add("open"));
  panelClose.addEventListener("click", () => panel.classList.remove("open"));

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function setOnlineStatus(text) {
    onlineStatus.textContent = text;
  }

  function updateOnlineCount() {
    const count = Math.max(players.size, myId ? players.size : 0);
    onlineCount.textContent = `Online: ${count}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }

  function safeName(value) {
    return String(value || "Jogador").replace(/[<>]/g, "").trim().slice(0, 24) || "Jogador";
  }

  async function romStatus() {
    const response = await fetch("/api/concordium/rom-status", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Nao foi possivel verificar a ROM.");
    return response.json();
  }

  async function loadAccountName() {
    try {
      const response = await fetch("/api/me", { cache: "no-store", credentials: "same-origin" });
      if (!response.ok) return;
      const payload = await response.json();
      playerName = safeName(payload?.user?.name || "Jogador");
      me.name = playerName;
    } catch {}
  }

  function configureEmulator() {
    window.EJS_player = "#game";
    window.EJS_core = "mgba";
    window.EJS_gameUrl = ROM_URL;
    window.EJS_gameName = "Concordium";
    window.EJS_color = "#f1c75d";
    window.EJS_backgroundColor = "#05080b";
    window.EJS_startOnLoaded = false;
    window.EJS_fullscreenOnLoaded = false;
    window.EJS_pathtodata = EMULATOR_DATA_URL;
    window.EJS_biosUrl = "";
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

  async function startEmulator() {
    if (emulatorLoaded) {
      overlay.classList.add("hidden");
      return;
    }
    startButton.disabled = true;
    setStatus("Verificando ROM nativa...");
    try {
      const status = await romStatus();
      if (!status.available) {
        setStatus("ROM nativa nao encontrada neste servidor.");
        startButton.disabled = false;
        return;
      }
      setStatus(`ROM encontrada (${Math.round(status.size / 1024 / 1024)} MB). Carregando core GBA...`);
      await loadAccountName();
      configureEmulator();
      await loadScript(LOADER_URL);
      emulatorLoaded = true;
      shell.classList.add("is-playing");
      overlay.classList.add("hidden");
      await startMultiplayer();
      requestAnimationFrame(tick);
    } catch (error) {
      setStatus(error.message || "Falha ao iniciar o emulador.");
      startButton.disabled = false;
    }
  }

  function loadSocketIo() {
    if (window.io) return Promise.resolve();
    return loadScript("/socket.io/socket.io.js");
  }

  function renderPlayer(id, player, isSelf = false) {
    let node = playerNodes.get(id);
    if (!node) {
      node = document.createElement("div");
      node.className = `gba-player${isSelf ? " self" : ""}`;
      node.dataset.playerId = id;
      multiplayerLayer.appendChild(node);
      playerNodes.set(id, node);
    }
    node.classList.toggle("self", isSelf);
    node.dataset.name = isSelf ? "voce" : safeName(player.name);
    node.dataset.dir = player.dir || "down";
    node.style.left = `${clamp(player.x, 4, 96)}%`;
    node.style.top = `${clamp(player.y, 12, 96)}%`;
    node.style.setProperty("--player-shirt", player.color || PLAYER_COLORS[1]);
  }

  function upsertPlayer(player, isSelf = false) {
    if (!player?.id) return;
    const normalized = {
      id: player.id,
      name: safeName(player.name),
      x: clamp(player.x, 4, 96),
      y: clamp(player.y, 12, 96),
      dir: player.dir || "down",
      color: player.color || PLAYER_COLORS[1]
    };
    players.set(player.id, normalized);
    renderPlayer(player.id, normalized, isSelf);
    updateOnlineCount();
  }

  function removePlayer(id) {
    players.delete(id);
    playerNodes.get(id)?.remove();
    playerNodes.delete(id);
    updateOnlineCount();
  }

  async function startMultiplayer() {
    if (socket) return;
    setOnlineStatus("Conectando online...");
    await loadSocketIo();
    socket = window.io({ transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      const color = PLAYER_COLORS[Math.abs(hashCode(playerName)) % PLAYER_COLORS.length];
      socket.emit("concordium-gba:join", { name: playerName, x: me.x, y: me.y, dir: me.dir, color });
      setOnlineStatus("Online conectado");
    });

    socket.on("disconnect", () => {
      setOnlineStatus("Reconectando online...");
      players.clear();
      playerNodes.forEach(node => node.remove());
      playerNodes.clear();
      myId = "";
      updateOnlineCount();
    });

    socket.on("connect_error", () => setOnlineStatus("Online indisponivel"));

    socket.on("concordium-gba:init", payload => {
      myId = payload.id;
      me.id = myId;
      const own = (payload.players || []).find(player => player.id === myId);
      if (own) {
        me.name = safeName(own.name);
        me.color = own.color || me.color;
      }
      (payload.players || []).forEach(player => upsertPlayer(player, player.id === myId));
      sendMyPosition(true);
    });

    socket.on("concordium-gba:player-joined", player => upsertPlayer(player));
    socket.on("concordium-gba:player-update", player => upsertPlayer(player));
    socket.on("concordium-gba:player-left", removePlayer);
  }

  function hashCode(value) {
    return String(value).split("").reduce((hash, char) => ((hash << 5) - hash) + char.charCodeAt(0), 0);
  }

  function setDirection(dir, active) {
    if (!Object.hasOwn(pressed, dir)) return;
    pressed[dir] = active;
  }

  function keyDirection(key) {
    const normalized = key.toLowerCase();
    if (normalized === "arrowup" || normalized === "w") return "up";
    if (normalized === "arrowdown" || normalized === "s") return "down";
    if (normalized === "arrowleft" || normalized === "a") return "left";
    if (normalized === "arrowright" || normalized === "d") return "right";
    return "";
  }

  function sendMyPosition(force = false) {
    if (!socket?.connected || !myId) return;
    const now = performance.now();
    if (!force && now - lastSentAt < SEND_EVERY_MS) return;
    lastSentAt = now;
    socket.emit("concordium-gba:move", { x: me.x, y: me.y, dir: me.dir });
  }

  function tick(now) {
    if (!emulatorLoaded) return;
    const dt = Math.min(.05, (now - (lastFrameAt || now)) / 1000);
    lastFrameAt = now;

    let dx = 0;
    let dy = 0;
    if (pressed.left) dx -= 1;
    if (pressed.right) dx += 1;
    if (pressed.up) dy -= 1;
    if (pressed.down) dy += 1;

    moving = Boolean(dx || dy);
    if (moving) {
      if (dx && dy) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      me.x = clamp(me.x + dx * MOVE_SPEED * dt, 4, 96);
      me.y = clamp(me.y + dy * MOVE_SPEED * dt, 12, 96);
      me.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
      upsertPlayer(me, true);
      sendMyPosition();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("keydown", event => {
    const dir = keyDirection(event.key);
    if (dir) setDirection(dir, true);
  }, true);

  window.addEventListener("keyup", event => {
    const dir = keyDirection(event.key);
    if (dir) setDirection(dir, false);
  }, true);

  window.addEventListener("blur", () => {
    Object.keys(pressed).forEach(dir => { pressed[dir] = false; });
    if (moving) sendMyPosition(true);
  });

  dpad.addEventListener("pointerdown", event => {
    const button = event.target.closest("button[data-dir]");
    if (!button) return;
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    setDirection(button.dataset.dir, true);
  });

  dpad.addEventListener("pointerup", event => {
    const button = event.target.closest("button[data-dir]");
    if (!button) return;
    event.preventDefault();
    setDirection(button.dataset.dir, false);
    sendMyPosition(true);
  });

  dpad.addEventListener("pointercancel", event => {
    const button = event.target.closest("button[data-dir]");
    if (button) setDirection(button.dataset.dir, false);
    sendMyPosition(true);
  });

  startButton.addEventListener("click", startEmulator);

  romStatus()
    .then(status => {
      setStatus(status.available ? "ROM nativa pronta. Toque para carregar." : "ROM nativa nao encontrada neste servidor.");
    })
    .catch(() => setStatus("Nao foi possivel verificar a ROM nativa."));
})();
