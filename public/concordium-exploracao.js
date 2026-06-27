(() => {
  const TILE = 32;
  const COLORS = ["#d94f3d", "#3d7bd9", "#45a857", "#d8a629", "#8a5bd9", "#d95f9f"];
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const saveStatus = document.getElementById("save-status");
  const playerList = document.getElementById("player-list");
  const onlineLayer = document.getElementById("online-layer");
  const dialog = document.getElementById("dialog");
  const dialogName = document.getElementById("dialog-name");
  const dialogText = document.getElementById("dialog-text");
  const fullscreenBtn = document.getElementById("fullscreen");
  const talkBtn = document.getElementById("talk");
  const playerDialog = document.getElementById("player-dialog");
  const playerNameEl = document.getElementById("player-name");
  const playerMapEl = document.getElementById("player-map");
  const playerTeamEl = document.getElementById("player-team");
  const playerBadgesEl = document.getElementById("player-badges");
  const playerSyncEl = document.getElementById("player-sync");

  const maps = {
    truck: {
      name: "Caminhao de Mudanca",
      w: 12, h: 9, bg: "#6b5f52",
      start: { x: 5, y: 5 },
      exits: [{ x: 5, y: 8, to: "vila-raiz", tx: 13, ty: 15 }],
      npcs: [],
      solid: new Set(["W", "B"]),
      rows: [
        "WWWWWWWWWWWW",
        "WBBBBBBBBBBW",
        "WB........BW",
        "WB..BBBB..BW",
        "W.........BW",
        "WB........BW",
        "WB....BB..BW",
        "W..........W",
        "WWWWW..WWWWW"
      ]
    },
    "vila-raiz": {
      name: "Vila Raiz",
      w: 28, h: 20, bg: "#5dac63",
      start: { x: 13, y: 15 },
      exits: [
        { x: 13, y: 0, to: "rota-101", tx: 10, ty: 25 },
        { x: 9, y: 10, to: "casa-inicial", tx: 6, ty: 7 }
      ],
      npcs: [
        { id: "mae", name: "Mae", x: 11, y: 14, text: "Bem-vindo, {player}. O professor quer te ver antes de seguir para a Rota 101." },
        { id: "vizinho", name: "Morador", x: 20, y: 12, text: "Esta e a Vila Raiz. O caminho ao norte leva para a Rota 101." }
      ],
      solid: new Set(["T", "W", "H", "R"]),
      rows: [
        "TTTTTTTTTTTTT..TTTTTTTTTTTTT",
        "T..........................T",
        "T..........................T",
        "T....HHHHHH........HHHHHH..T",
        "T....HRRRRH........HRRRRH..T",
        "T....H....H........H....H..T",
        "T....H.D..H........H.D..H..T",
        "T..........................T",
        "T..........PPPPPPPP........T",
        "T..........P......P........T",
        "T....HHHHH.P......P.HHHHH..T",
        "T....H...H.P......P.H...H..T",
        "T....H.D.H.P......P.H.D.H..T",
        "T..........P......P........T",
        "T..........P......P........T",
        "T..........PPPPPPPP........T",
        "T..........................T",
        "T..FFFF..............FFFF..T",
        "T..FFFF..............FFFF..T",
        "TTTTTTTTTTTTTTTTTTTTTTTTTTTT"
      ]
    },
    "rota-101": {
      name: "Rota 101",
      w: 22, h: 28, bg: "#559c5c",
      start: { x: 10, y: 25 },
      exits: [{ x: 10, y: 27, to: "vila-raiz", tx: 13, ty: 1 }],
      npcs: [
        { id: "professor", name: "Professor", x: 12, y: 20, text: "{player}, esta rota ainda esta em teste. Em breve vamos colocar os primeiros companheiros aqui." }
      ],
      solid: new Set(["T", "W"]),
      rows: [
        "TTTTTTTTTTTTTTTTTTTTTT",
        "T....................T",
        "T...GGGG.......GGGG..T",
        "T...GGGG.......GGGG..T",
        "T........PP..........T",
        "TTTTTT...PP...TTTTTTTT",
        "T........PP..........T",
        "T..GGG...PP....GGG...T",
        "T..GGG...PP....GGG...T",
        "T........PP..........T",
        "T........PP..........T",
        "T..TTT...PP...TTT....T",
        "T........PP..........T",
        "T........PP.....GGG..T",
        "T...GGG..PP.....GGG..T",
        "T...GGG..PP..........T",
        "T........PP..........T",
        "T........PP....TTT...T",
        "T........PP..........T",
        "T..GGG...PP..........T",
        "T..GGG...PP..........T",
        "T........PP....GGG...T",
        "T........PP....GGG...T",
        "T........PP..........T",
        "T........PP..........T",
        "T........PP..........T",
        "T........PP..........T",
        "TTTTTTTTTT..TTTTTTTTTT"
      ]
    },
    "casa-inicial": {
      name: "Casa da Familia",
      w: 12, h: 9, bg: "#c99b60",
      start: { x: 6, y: 7 },
      exits: [{ x: 6, y: 8, to: "vila-raiz", tx: 9, ty: 11 }],
      npcs: [{ id: "caixa", name: "Caixa", x: 3, y: 3, text: "Caixas da mudanca. Ainda tem muita coisa para organizar." }],
      solid: new Set(["W", "B"]),
      rows: [
        "WWWWWWWWWWWW",
        "W..........W",
        "W.BB...BB..W",
        "W.BB.......W",
        "W..........W",
        "W....BB....W",
        "W..........W",
        "W..........W",
        "WWWWWW..WWWW"
      ]
    }
  };

  const defaultWorld = () => ({
    map: "truck",
    x: maps.truck.start.x,
    y: maps.truck.start.y,
    dir: "down",
    party: [],
    badges: [],
    flags: { startedInTruck: true },
    updatedAt: Date.now()
  });

  const state = {
    user: { name: "Jogador" },
    world: defaultWorld(),
    keys: new Set(),
    moving: false,
    moveCooldown: 0,
    socket: null,
    id: "",
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    players: new Map()
  };

  function safeName(value) {
    return String(value || "Jogador").replace(/[<>]/g, "").trim().slice(0, 24) || "Jogador";
  }

  function normalizeWorld(value) {
    const world = value && typeof value === "object" ? value : {};
    const map = maps[world.map] ? world.map : "truck";
    return {
      ...defaultWorld(),
      map,
      x: Math.max(0, Math.min(maps[map].w - 1, Number(world.x) || maps[map].start.x)),
      y: Math.max(0, Math.min(maps[map].h - 1, Number(world.y) || maps[map].start.y)),
      dir: ["up", "down", "left", "right"].includes(world.dir) ? world.dir : "down",
      party: Array.isArray(world.party) ? world.party.slice(0, 6).map(safeName) : [],
      badges: Array.isArray(world.badges) ? world.badges.slice(0, 12).map(safeName) : [],
      flags: world.flags && typeof world.flags === "object" ? world.flags : {},
      updatedAt: Number(world.updatedAt) || Date.now()
    };
  }

  async function loadProfile() {
    const response = await fetch("/api/concordium/profile", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("perfil indisponivel");
    const payload = await response.json();
    state.user = payload.user || state.user;
    state.world = normalizeWorld(payload.profile?.world);
    if (!payload.profile?.world) saveWorld(true);
  }

  function saveWorld(immediate = false) {
    state.world.updatedAt = Date.now();
    clearTimeout(saveWorld.timer);
    const run = async () => {
      try {
        const current = await fetch("/api/concordium/profile", { cache: "no-store", credentials: "same-origin" }).then(r => r.json());
        await fetch("/api/concordium/profile", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile: { ...(current.profile || {}), created: true, world: state.world } })
        });
        saveStatus.textContent = "Save automatico salvo agora";
      } catch {
        saveStatus.textContent = "Falha no save automatico";
      }
    };
    if (immediate) run();
    else saveWorld.timer = setTimeout(run, 180);
  }

  function currentMap() {
    return maps[state.world.map] || maps.truck;
  }

  function tileAt(map, x, y) {
    if (x < 0 || y < 0 || x >= map.w || y >= map.h) return "W";
    return map.rows[y]?.[x] || ".";
  }

  function blocked(map, x, y) {
    return map.solid.has(tileAt(map, x, y));
  }

  function tryMove(dir) {
    if (!dialog.classList.contains("hidden")) {
      closeDialog();
      return;
    }
    const delta = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
    if (!delta) return;
    state.world.dir = dir;
    const map = currentMap();
    const nx = state.world.x + delta[0];
    const ny = state.world.y + delta[1];
    const exit = map.exits.find(item => item.x === nx && item.y === ny);
    if (exit) {
      state.world.map = exit.to;
      state.world.x = exit.tx;
      state.world.y = exit.ty;
      saveWorld();
      publish();
      return;
    }
    if (!blocked(map, nx, ny)) {
      state.world.x = nx;
      state.world.y = ny;
      saveWorld();
      publish();
    }
  }

  function facingTile() {
    const d = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[state.world.dir];
    return { x: state.world.x + d[0], y: state.world.y + d[1] };
  }

  function interact() {
    if (!dialog.classList.contains("hidden")) {
      closeDialog();
      return;
    }
    const map = currentMap();
    const front = facingTile();
    const npc = map.npcs.find(item => item.x === front.x && item.y === front.y)
      || map.npcs.find(item => Math.abs(item.x - state.world.x) + Math.abs(item.y - state.world.y) <= 1);
    if (npc) openDialog(npc.name, npc.text.replaceAll("{player}", safeName(state.user.name)));
  }

  function openDialog(name, text) {
    dialogName.textContent = name;
    dialogText.textContent = text;
    dialog.classList.remove("hidden");
  }
  function closeDialog() {
    dialog.classList.add("hidden");
  }

  function details() {
    const map = currentMap();
    return {
      mapName: `${map.name} - X ${state.world.x}, Y ${state.world.y}`,
      mapId: state.world.map,
      x: Math.max(6, Math.min(94, (state.world.x / Math.max(1, map.w - 1)) * 88 + 6)),
      y: Math.max(12, Math.min(92, (state.world.y / Math.max(1, map.h - 1)) * 80 + 12)),
      team: state.world.party,
      badges: state.world.badges,
      source: "native-web",
      saveKind: "profile",
      saveUpdatedAt: new Date(state.world.updatedAt).toISOString()
    };
  }

  function publish() {
    if (!state.socket?.connected) return;
    state.socket.emit("concordium-gba:details", { metadata: details() });
    state.socket.emit("concordium-gba:move", { x: details().x, y: details().y, dir: state.world.dir });
  }

  function drawTile(ch, sx, sy) {
    const palettes = {
      ".": ["#60ad67", "#4f985b"],
      "P": ["#d6bf83", "#bfa66d"],
      "T": ["#1f6a3a", "#3e9b54"],
      "H": ["#e4c079", "#8e5a32"],
      "R": ["#b84b3f", "#7d2f2a"],
      "F": ["#66c06d", "#318944"],
      "G": ["#75ca65", "#358845"],
      "W": ["#314238", "#223128"],
      "B": ["#9b7654", "#6f4f37"]
    };
    const [base, shade] = palettes[ch] || palettes["."];
    ctx.fillStyle = base;
    ctx.fillRect(sx, sy, TILE, TILE);
    ctx.fillStyle = shade;
    if (ch === "T") {
      ctx.fillRect(sx, sy + 20, TILE, 12);
      ctx.beginPath(); ctx.arc(sx + 16, sy + 13, 15, 0, Math.PI * 2); ctx.fill();
    } else if (ch === "R") {
      for (let y = 5; y < TILE; y += 8) ctx.fillRect(sx, sy + y, TILE, 3);
    } else if (ch === "P") {
      for (let x = 7; x < TILE; x += 13) ctx.fillRect(sx + x, sy + 7, 5, 5);
    } else if (ch === "F" || ch === "G") {
      for (let x = 4; x < TILE; x += 8) ctx.fillRect(sx + x, sy + 7, 3, 21);
    } else if (ch === "B") {
      ctx.fillRect(sx + 5, sy + 5, 22, 22);
    }
  }

  function drawSprite(x, y, color, name, dir = "down") {
    const sx = x * TILE;
    const sy = y * TILE;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(sx + 8, sy + 26, 16, 4);
    ctx.fillStyle = "#f2c490";
    ctx.fillRect(sx + 11, sy + 6, 10, 9);
    ctx.fillStyle = color;
    ctx.fillRect(sx + 9, sy + 15, 14, 12);
    ctx.fillStyle = "#233047";
    ctx.fillRect(sx + 8, sy + 26, 16, 4);
    ctx.fillStyle = "#2b1a12";
    ctx.fillRect(sx + 9, sy + 3, 14, 5);
    if (dir === "left") ctx.fillRect(sx + 7, sy + 8, 4, 3);
    if (dir === "right") ctx.fillRect(sx + 21, sy + 8, 4, 3);
    if (name) {
      ctx.font = "10px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe06e";
      ctx.fillText(name, sx + 16, sy - 2);
    }
  }

  function render() {
    const map = currentMap();
    const camX = Math.max(0, Math.min(map.w * TILE - canvas.width, state.world.x * TILE - canvas.width / 2));
    const camY = Math.max(0, Math.min(map.h * TILE - canvas.height, state.world.y * TILE - canvas.height / 2));
    ctx.fillStyle = map.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(-camX, -camY);
    for (let y = 0; y < map.h; y += 1) {
      for (let x = 0; x < map.w; x += 1) drawTile(tileAt(map, x, y), x * TILE, y * TILE);
    }
    map.exits.forEach(exit => {
      ctx.fillStyle = "rgba(255, 230, 110, .65)";
      ctx.fillRect(exit.x * TILE + 8, exit.y * TILE + 22, 16, 6);
    });
    map.npcs.forEach(npc => drawSprite(npc.x, npc.y, "#487ab8", npc.name));
    drawSprite(state.world.x, state.world.y, state.color, safeName(state.user.name), state.world.dir);
    ctx.restore();
    renderOnlineLayer(camX, camY);
    requestAnimationFrame(render);
  }

  function gameLoop(time) {
    if (time >= state.moveCooldown) {
      const dir = state.keys.has("arrowup") || state.keys.has("w") ? "up"
        : state.keys.has("arrowdown") || state.keys.has("s") ? "down"
          : state.keys.has("arrowleft") || state.keys.has("a") ? "left"
            : state.keys.has("arrowright") || state.keys.has("d") ? "right" : "";
      if (dir) {
        tryMove(dir);
        state.moveCooldown = time + 145;
      }
    }
    requestAnimationFrame(gameLoop);
  }

  function connectSocket() {
    state.socket = window.io?.({ transports: ["websocket", "polling"] });
    if (!state.socket) return;
    state.socket.on("connect", () => {
      state.socket.emit("concordium-gba:join", { name: safeName(state.user.name), color: state.color, x: details().x, y: details().y, dir: state.world.dir });
      publish();
    });
    state.socket.on("concordium-gba:init", payload => {
      state.id = payload.id;
      state.players = new Map((payload.players || []).map(player => [player.id, player]));
      renderRoster();
    });
    state.socket.on("concordium-gba:player-joined", player => { state.players.set(player.id, player); renderRoster(); });
    state.socket.on("concordium-gba:player-update", player => { state.players.set(player.id, player); renderRoster(); });
    state.socket.on("concordium-gba:player-left", id => { state.players.delete(id); renderRoster(); });
  }

  function renderRoster() {
    playerList.innerHTML = "";
    const all = [...state.players.values()];
    all.forEach(player => {
      const button = document.createElement("button");
      button.className = "player-pill";
      button.innerHTML = `<i style="--c:${player.color || "#d94f3d"}"></i><span>${safeName(player.name)}${player.id === state.id ? " (voce)" : ""}</span>`;
      button.addEventListener("click", () => openPlayer(player));
      playerList.appendChild(button);
    });
  }

  function renderOnlineLayer(camX, camY) {
    onlineLayer.innerHTML = "";
    [...state.players.values()].filter(p => p.id !== state.id).forEach(player => {
      const d = player.details || {};
      if (d.mapId !== state.world.map) return;
      const map = currentMap();
      const tx = (Number(d.x) - 6) / 88 * Math.max(1, map.w - 1);
      const ty = (Number(d.y) - 12) / 80 * Math.max(1, map.h - 1);
      const el = document.createElement("div");
      el.className = "online-avatar";
      el.textContent = safeName(player.name);
      el.style.left = `${((tx * TILE - camX + 16) / canvas.width) * 100}%`;
      el.style.top = `${((ty * TILE - camY) / canvas.height) * 100}%`;
      onlineLayer.appendChild(el);
    });
  }

  function openPlayer(player) {
    const d = player.id === state.id ? details() : (player.details || {});
    playerNameEl.textContent = `${safeName(player.name)}${player.id === state.id ? " (voce)" : ""}`;
    playerMapEl.textContent = d.mapName || "Concordium";
    playerTeamEl.textContent = d.team?.length ? d.team.join(", ") : "Sem equipe ainda";
    playerBadgesEl.textContent = d.badges?.length ? d.badges.join(", ") : "Nenhuma insignia ainda";
    playerSyncEl.textContent = d.saveUpdatedAt ? `atualizado ${new Date(d.saveUpdatedAt).toLocaleTimeString("pt-BR")}` : "online";
    if (playerDialog.showModal) playerDialog.showModal();
    else playerDialog.setAttribute("open", "open");
  }

  function bindInput() {
    window.addEventListener("keydown", event => {
      const key = event.key.toLowerCase();
      state.keys.add(key);
      if ([" ", "enter", "e"].includes(key)) interact();
    });
    window.addEventListener("keyup", event => state.keys.delete(event.key.toLowerCase()));
    document.querySelectorAll("[data-dir]").forEach(button => {
      const dir = button.dataset.dir;
      const down = event => { event.preventDefault(); state.keys.add(dir === "up" ? "arrowup" : dir === "down" ? "arrowdown" : dir === "left" ? "arrowleft" : "arrowright"); };
      const up = event => { event.preventDefault(); state.keys.clear(); };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
    });
    talkBtn.addEventListener("click", interact);
    document.getElementById("dialog-close").addEventListener("click", () => playerDialog.close());
    fullscreenBtn.addEventListener("click", () => document.documentElement.requestFullscreen?.());
  }

  async function init() {
    try {
      await loadProfile();
      saveStatus.textContent = "Save automatico ativo";
    } catch {
      saveStatus.textContent = "Perfil indisponivel";
    }
    bindInput();
    connectSocket();
    render();
    requestAnimationFrame(gameLoop);
    if (state.world.map === "truck") openDialog("Mudanca", `${safeName(state.user.name)}, voce chegou. Saia do caminhao para entrar na Vila Raiz.`);
  }

  init();
})();
