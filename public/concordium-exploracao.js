(function () {
  const ROM_URL = "/concordium-exploracao/rom";
  const EMULATOR_DATA_URL = "https://cdn.emulatorjs.org/stable/data/";
  const LOADER_URL = `${EMULATOR_DATA_URL}loader.js`;
  const overlay = document.getElementById("gba-overlay");
  const startButton = document.getElementById("gba-start");
  const statusEl = document.getElementById("gba-status");
  const multiplayerLayer = document.getElementById("gba-multiplayer");
  const panel = document.getElementById("gba-panel");
  const panelToggle = document.getElementById("gba-panel-toggle");
  const panelClose = document.getElementById("gba-panel-close");

  let emulatorLoaded = false;
  let socket = null;
  let myId = "";
  const players = new Map();
  const myAvatar = { x: 50, y: 72, name: "Voce", shirt: "#d94f3d" };

  panelToggle.addEventListener("click", () => panel.classList.add("open"));
  panelClose.addEventListener("click", () => panel.classList.remove("open"));

  async function romStatus() {
    const response = await fetch("/api/concordium/rom-status", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("Nao foi possivel verificar a ROM.");
    return response.json();
  }

  function setStatus(text) {
    statusEl.textContent = text;
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
      configureEmulator();
      await loadScript(LOADER_URL);
      emulatorLoaded = true;
      overlay.classList.add("hidden");
      startMultiplayer();
    } catch (error) {
      setStatus(error.message || "Falha ao iniciar o emulador.");
      startButton.disabled = false;
    }
  }

  startButton.addEventListener("click", startEmulator);

  romStatus()
    .then((status) => {
      setStatus(status.available ? "ROM nativa pronta. Toque para carregar." : "ROM nativa nao encontrada neste servidor.");
    })
    .catch(() => setStatus("Nao foi possivel verificar a ROM nativa."));

  function loadSocketIo() {
    if (window.io) return Promise.resolve();
    return loadScript("/socket.io/socket.io.js");
  }

  function renderPlayer(id, player) {
    let node = multiplayerLayer.querySelector(`[data-player-id="${CSS.escape(id)}"]`);
    if (!node) {
      node = document.createElement("div");
      node.className = "gba-player";
      node.dataset.playerId = id;
      multiplayerLayer.appendChild(node);
    }
    node.dataset.name = player.name || "Jogador";
    node.style.left = `${Math.max(4, Math.min(96, player.x || 50))}%`;
    node.style.top = `${Math.max(8, Math.min(96, player.y || 72))}%`;
    node.style.setProperty("--player-shirt", player.shirt || "#3d7bd9");
  }

  function removePlayer(id) {
    multiplayerLayer.querySelector(`[data-player-id="${CSS.escape(id)}"]`)?.remove();
  }

  function updateMyPosition(dx, dy) {
    if (!socket || !myId) return;
    myAvatar.x = Math.max(4, Math.min(96, myAvatar.x + dx));
    myAvatar.y = Math.max(12, Math.min(96, myAvatar.y + dy));
    renderPlayer(myId, myAvatar);
    socket.emit("concordium:move", { x: myAvatar.x * 14, y: myAvatar.y * 9.2, dir: "down" });
  }

  async function startMultiplayer() {
    if (socket) return;
    try {
      await loadSocketIo();
      socket = window.io();
      socket.emit("concordium:join", { name: "Jogador", sprite: "gba", appearance: "red" });
      socket.on("concordium:init", (payload) => {
        myId = payload.id;
        renderPlayer(myId, myAvatar);
        (payload.players || []).forEach((player) => {
          if (player.id !== myId) {
            players.set(player.id, player);
            renderPlayer(player.id, {
              name: player.name,
              x: (player.x || 700) / 14,
              y: (player.y || 520) / 9.2,
              shirt: "#3d7bd9"
            });
          }
        });
      });
      socket.on("concordium:player-joined", (player) => {
        if (player.id !== myId) renderPlayer(player.id, { name: player.name, x: 50, y: 72, shirt: "#3d7bd9" });
      });
      socket.on("concordium:player-update", (player) => {
        if (!player || player.id === myId) return;
        renderPlayer(player.id, {
          name: player.name,
          x: (player.x || 700) / 14,
          y: (player.y || 520) / 9.2,
          shirt: "#3d7bd9"
        });
      });
      socket.on("concordium:player-left", removePlayer);
    } catch {
      setStatus("ROM carregada. Multiplayer online indisponivel agora.");
    }
  }

  window.addEventListener("keydown", (event) => {
    if (!emulatorLoaded) return;
    if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") updateMyPosition(-1.2, 0);
    if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") updateMyPosition(1.2, 0);
    if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") updateMyPosition(0, -1.2);
    if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") updateMyPosition(0, 1.2);
  }, { passive: true });
})();
