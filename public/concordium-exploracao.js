(() => {
  const TILE = 32;
  const SOURCE_TILE = 16;
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
  const menuBtn = document.getElementById("menu");
  const talkBtn = document.getElementById("talk");
  const playerDialog = document.getElementById("player-dialog");
  const gameMenu = document.getElementById("game-menu");
  const playerNameEl = document.getElementById("player-name");
  const playerMapEl = document.getElementById("player-map");
  const playerTeamEl = document.getElementById("player-team");
  const playerBadgesEl = document.getElementById("player-badges");
  const playerSyncEl = document.getElementById("player-sync");
  const menuMapEl = document.getElementById("menu-map");
  const menuTeamEl = document.getElementById("menu-team");
  const menuBadgesEl = document.getElementById("menu-badges");

  const state = {
    data: null,
    atlas: null,
    sprites: null,
    objectSprites: null,
    user: { name: "Jogador" },
    world: null,
    keys: new Set(),
    moveCooldown: 0,
    socket: null,
    id: "",
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    players: new Map()
  };

  function safeName(value) {
    return String(value || "Jogador").replace(/[<>]/g, "").trim().slice(0, 24) || "Jogador";
  }

  function maps() {
    return state.data?.maps || {};
  }

  function startWorld() {
    const start = state.data?.start || { map: "b0_m9", x: 10, y: 10, dir: "down" };
    return {
      map: start.map,
      x: start.x,
      y: start.y,
      dir: start.dir || "down",
      party: [],
      badges: [],
      flags: { startedInTruck: true },
      updatedAt: Date.now()
    };
  }

  function normalizeWorld(value) {
    const world = value && typeof value === "object" ? value : {};
    const base = startWorld();
    const map = maps()[world.map] ? world.map : base.map;
    const current = maps()[map] || maps()[base.map];
    const rawX = Math.max(0, Math.min(current.width - 1, Number.isFinite(Number(world.x)) ? Number(world.x) : base.x));
    const rawY = Math.max(0, Math.min(current.height - 1, Number.isFinite(Number(world.y)) ? Number(world.y) : base.y));
    const savedOnBlockedTile = map === base.map && (current.collision?.[rawY]?.[rawX] ?? 0) !== 0;
    return {
      ...base,
      map,
      x: savedOnBlockedTile ? base.x : rawX,
      y: savedOnBlockedTile ? base.y : rawY,
      dir: ["up", "down", "left", "right"].includes(world.dir) ? world.dir : base.dir,
      party: Array.isArray(world.party) ? world.party.slice(0, 6).map(safeName) : [],
      badges: Array.isArray(world.badges) ? world.badges.slice(0, 12).map(safeName) : [],
      flags: world.flags && typeof world.flags === "object" ? world.flags : base.flags,
      updatedAt: Number(world.updatedAt) || Date.now()
    };
  }

  async function loadRomData() {
    const dataResponse = await fetch("/assets/concordium-rom-data.json?v=rom-20260629b", { cache: "no-store" });
    if (!dataResponse.ok) throw new Error("dados do ROM indisponiveis");
    state.data = await dataResponse.json();
    state.atlas = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = state.data.atlas.src;
    });
    if (state.data.sprites?.src) {
      state.sprites = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = state.data.sprites.src;
      });
    }
    if (state.data.objectSprites?.src) {
      state.objectSprites = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = state.data.objectSprites.src;
      });
    }
  }

  async function loadProfile() {
    const response = await fetch("/api/concordium/profile", { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error("perfil indisponivel");
    const payload = await response.json();
    state.user = payload.user || state.user;
    state.world = normalizeWorld(payload.profile?.world);
    if (!payload.profile?.world || !maps()[payload.profile?.world?.map]) saveWorld(true);
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
    else saveWorld.timer = setTimeout(run, 120);
  }

  function currentMap() {
    return maps()[state.world?.map] || maps()[state.data.start.map];
  }

  function isWarpAt(map, x, y) {
    return (map.warps || []).find(warp => warp.x === x && warp.y === y && maps()[warp.target]);
  }

  function fallbackExitAt(x, y) {
    return (state.data.fallbackExits || []).find(exit => exit.from === state.world.map && exit.x === x && exit.y === y && maps()[exit.to]);
  }

  function connectionFor(map, x, y) {
    if (x < 0) return (map.connections || []).find(item => item.direction === "west");
    if (x >= map.width) return (map.connections || []).find(item => item.direction === "east");
    if (y < 0) return (map.connections || []).find(item => item.direction === "north");
    if (y >= map.height) return (map.connections || []).find(item => item.direction === "south");
    return null;
  }

  function targetFromWarp(sourceMapId, warp) {
    const source = maps()[sourceMapId];
    const target = maps()[warp.target];
    if (!target) return null;
    const returnWarp = (target.warps || []).find(item => item.target === sourceMapId && item.warpId === warp.warpId)
      || (target.warps || []).find(item => item.target === sourceMapId);
    if (returnWarp) {
      const leavingInterior = source?.mapType === 8 && target.mapType !== 8;
      const enteringInterior = source?.mapType !== 8 && target.mapType === 8;
      const y = leavingInterior ? returnWarp.y + 1 : enteringInterior ? returnWarp.y - 1 : returnWarp.y;
      return { map: target.id, x: returnWarp.x, y };
    }
    return { map: target.id, x: Math.floor(target.width / 2), y: Math.floor(target.height / 2) };
  }

  function enterMap(mapId, x, y) {
    const map = maps()[mapId];
    if (!map) return;
    state.world.map = mapId;
    state.world.x = Math.max(0, Math.min(map.width - 1, x));
    state.world.y = Math.max(0, Math.min(map.height - 1, y));
    if (blocked(map, state.world.x, state.world.y)) {
      const open = findNearestOpenTile(map, state.world.x, state.world.y);
      state.world.x = open.x;
      state.world.y = open.y;
    }
    saveWorld();
    publish();
  }

  function findNearestOpenTile(map, x, y) {
    for (let radius = 0; radius <= 3; radius += 1) {
      for (let yy = y - radius; yy <= y + radius; yy += 1) {
        for (let xx = x - radius; xx <= x + radius; xx += 1) {
          if (xx >= 0 && yy >= 0 && xx < map.width && yy < map.height && (map.collision?.[yy]?.[xx] ?? 0) === 0) {
            return { x: xx, y: yy };
          }
        }
      }
    }
    return { x, y };
  }

  function blocked(map, x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return true;
    if (isWarpAt(map, x, y) || fallbackExitAt(x, y)) return false;
    const collision = map.collision?.[y]?.[x] ?? 0;
    return collision !== 0;
  }

  function tryConnection(map, nx, ny) {
    const connection = connectionFor(map, nx, ny);
    const target = connection && maps()[connection.target];
    if (!target) return false;
    const offset = Number(connection.offset) || 0;
    if (connection.direction === "north") enterMap(target.id, state.world.x + offset, target.height - 1);
    if (connection.direction === "south") enterMap(target.id, state.world.x + offset, 0);
    if (connection.direction === "west") enterMap(target.id, target.width - 1, state.world.y + offset);
    if (connection.direction === "east") enterMap(target.id, 0, state.world.y + offset);
    return true;
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
    const currentWarp = isWarpAt(map, state.world.x, state.world.y);
    const currentFallback = fallbackExitAt(state.world.x, state.world.y);
    if (currentWarp && ["up", "down", "left", "right"].includes(dir)) {
      const target = targetFromWarp(state.world.map, currentWarp);
      if (target) enterMap(target.map, target.x, target.y);
      return;
    }
    if (currentFallback && ["up", "down", "left", "right"].includes(dir)) {
      enterMap(currentFallback.to, currentFallback.tx, currentFallback.ty);
      return;
    }
    if (tryConnection(map, nx, ny)) return;
    const warp = isWarpAt(map, nx, ny);
    if (warp) {
      const target = targetFromWarp(state.world.map, warp);
      if (target) enterMap(target.map, target.x, target.y);
      return;
    }
    const fallback = fallbackExitAt(nx, ny);
    if (fallback) {
      enterMap(fallback.to, fallback.tx, fallback.ty);
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
    const object = (map.objects || []).find(item => item.x === front.x && item.y === front.y)
      || (map.objects || []).find(item => Math.abs(item.x - state.world.x) + Math.abs(item.y - state.world.y) <= 1);
    if (object) {
      openDialog(object.graphicsId === 215 ? "Placa" : "Morador", dialogFor(map, object));
    }
  }

  function dialogFor(map, object) {
    if (object.graphicsId === 215) return `${map.name}.`;
    if (map.id === "b25_m40") return "As caixas balancam enquanto a mudanca chega ao destino.";
    if (map.id === "b0_m9") return "Bem-vindo a Vila Raiz. A rota ao norte leva para a Rota 101.";
    if (map.id === "b0_m16") return "A grama alta guarda encontros. Siga com cuidado.";
    if (map.mapType === 8) return "Esta casa ainda esta sendo organizada.";
    return "Que bom te ver por aqui.";
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
      bank: map.bank,
      map: map.map,
      x: Math.max(6, Math.min(94, (state.world.x / Math.max(1, map.width - 1)) * 88 + 6)),
      y: Math.max(12, Math.min(92, (state.world.y / Math.max(1, map.height - 1)) * 80 + 12)),
      tileX: state.world.x,
      tileY: state.world.y,
      team: state.world.party,
      badges: state.world.badges,
      source: "native-rom-map",
      saveKind: "profile",
      saveUpdatedAt: new Date(state.world.updatedAt).toISOString()
    };
  }

  function publish() {
    if (!state.socket?.connected) return;
    const metadata = details();
    state.socket.emit("concordium-gba:details", { metadata });
    state.socket.emit("concordium-gba:move", { x: metadata.x, y: metadata.y, dir: state.world.dir });
  }

  function drawMetatile(pair, metatile, sx, sy) {
    const atlas = state.data.atlas;
    const srcX = (metatile % atlas.columns) * SOURCE_TILE;
    const srcY = (pair * atlas.rowsPerTilesetPair + Math.floor(metatile / atlas.columns)) * SOURCE_TILE;
    ctx.drawImage(state.atlas, srcX, srcY, SOURCE_TILE, SOURCE_TILE, sx, sy, TILE, TILE);
  }

  function drawObjectSprite(object) {
    const meta = state.data.objectSprites;
    if (!state.objectSprites || !meta) {
      drawSprite(object.x, object.y, "", "");
      return;
    }
    const sx = object.x * TILE;
    const sy = object.y * TILE;
    const srcX = (object.graphicsId % meta.columns) * meta.width;
    const srcY = Math.floor(object.graphicsId / meta.columns) * meta.height;
    ctx.fillStyle = "rgba(0,0,0,.26)";
    ctx.fillRect(sx + 7, sy + 27, 18, 4);
    ctx.drawImage(state.objectSprites, srcX, srcY, meta.width, meta.height, sx - 8, sy - 16, 48, 48);
  }

  function drawSprite(x, y, color, name, dir = "down") {
    const sx = x * TILE;
    const sy = y * TILE;
    const spriteMeta = state.data.sprites || { width: 32, height: 32, frames: 8, directionFrames: { down: [0], left: [5], right: [7], up: [3] } };
    const frameSet = spriteMeta.directionFrames?.[dir] || spriteMeta.directionFrames?.down || [0];
    const frame = frameSet[Math.floor(Date.now() / 180) % frameSet.length];
    const srcX = frame * spriteMeta.width;
    ctx.fillStyle = "rgba(0,0,0,.28)";
    ctx.fillRect(sx + 7, sy + 27, 18, 4);
    if (state.sprites) {
      ctx.drawImage(state.sprites, srcX, 0, spriteMeta.width, spriteMeta.height, sx, sy, 32, 32);
    }
    if (name) {
      ctx.font = "10px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffe06e";
      ctx.fillText(name, sx + 16, sy - 2);
    }
  }

  function render() {
    if (!state.data || !state.world) {
      requestAnimationFrame(render);
      return;
    }
    const map = currentMap();
    const worldW = map.width * TILE;
    const worldH = map.height * TILE;
    const camX = Math.max(0, Math.min(Math.max(0, worldW - canvas.width), state.world.x * TILE - canvas.width / 2));
    const camY = Math.max(0, Math.min(Math.max(0, worldH - canvas.height), state.world.y * TILE - canvas.height / 2));
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#030505";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(Math.floor((canvas.width - Math.min(canvas.width, worldW)) / 2) - camX, Math.floor((canvas.height - Math.min(canvas.height, worldH)) / 2) - camY);
    for (let y = 0; y < map.height; y += 1) {
      for (let x = 0; x < map.width; x += 1) {
        drawMetatile(map.tilesetPair, map.tiles[y][x], x * TILE, y * TILE);
      }
    }
    (map.warps || []).forEach(warp => {
      if (!maps()[warp.target] && !fallbackExitAt(warp.x, warp.y)) return;
      ctx.fillStyle = "rgba(255, 230, 110, .38)";
      ctx.fillRect(warp.x * TILE + 8, warp.y * TILE + 24, 16, 5);
    });
    (map.objects || []).forEach(object => {
      if (Math.abs(object.x - state.world.x) + Math.abs(object.y - state.world.y) < 18) {
        drawObjectSprite(object);
      }
    });
    drawSprite(state.world.x, state.world.y, state.color, safeName(state.user.name), state.world.dir);
    ctx.restore();
    renderOnlineLayer(camX, camY, worldW, worldH);
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
      const d = details();
      state.socket.emit("concordium-gba:join", { name: safeName(state.user.name), color: state.color, x: d.x, y: d.y, dir: state.world.dir });
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
    [...state.players.values()].forEach(player => {
      const button = document.createElement("button");
      button.className = "player-pill";
      button.innerHTML = `<i style="--c:${player.color || "#d94f3d"}"></i><span>${safeName(player.name)}${player.id === state.id ? " (voce)" : ""}</span>`;
      button.addEventListener("click", () => openPlayer(player));
      playerList.appendChild(button);
    });
  }

  function renderOnlineLayer(camX, camY, worldW, worldH) {
    onlineLayer.innerHTML = "";
    const map = currentMap();
    const offsetX = Math.floor((canvas.width - Math.min(canvas.width, worldW)) / 2);
    const offsetY = Math.floor((canvas.height - Math.min(canvas.height, worldH)) / 2);
    [...state.players.values()].filter(p => p.id !== state.id).forEach(player => {
      const d = player.details || {};
      if (d.mapId !== state.world.map) return;
      const tx = Number.isFinite(Number(d.tileX)) ? Number(d.tileX) : ((Number(d.x) - 6) / 88 * Math.max(1, map.width - 1));
      const ty = Number.isFinite(Number(d.tileY)) ? Number(d.tileY) : ((Number(d.y) - 12) / 80 * Math.max(1, map.height - 1));
      const left = ((tx * TILE - camX + offsetX + 16) / canvas.width) * 100;
      const top = ((ty * TILE - camY + offsetY) / canvas.height) * 100;
      if (left < -5 || left > 105 || top < -5 || top > 105) return;
      const el = document.createElement("div");
      el.className = "online-avatar";
      el.textContent = safeName(player.name);
      el.style.left = `${left}%`;
      el.style.top = `${top}%`;
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

  function openMenu() {
    const d = details();
    menuMapEl.textContent = d.mapName;
    menuTeamEl.textContent = d.team?.length ? d.team.join(", ") : "Sem equipe ainda";
    menuBadgesEl.textContent = d.badges?.length ? d.badges.join(", ") : "Nenhuma insignia ainda";
    if (gameMenu.showModal) gameMenu.showModal();
    else gameMenu.setAttribute("open", "open");
  }

  function bindInput() {
    window.addEventListener("keydown", event => {
      const key = event.key.toLowerCase();
      if (key === "m") {
        openMenu();
        return;
      }
      state.keys.add(key);
      const dir = key === "arrowup" || key === "w" ? "up"
        : key === "arrowdown" || key === "s" ? "down"
          : key === "arrowleft" || key === "a" ? "left"
            : key === "arrowright" || key === "d" ? "right" : "";
      if (dir && !event.repeat) {
        tryMove(dir);
        state.moveCooldown = performance.now() + 145;
      }
      if ([" ", "enter", "e"].includes(key)) interact();
    });
    window.addEventListener("keyup", event => state.keys.delete(event.key.toLowerCase()));
    document.querySelectorAll("[data-dir]").forEach(button => {
      const dir = button.dataset.dir;
      const key = dir === "up" ? "arrowup" : dir === "down" ? "arrowdown" : dir === "left" ? "arrowleft" : "arrowright";
      const down = event => { event.preventDefault(); state.keys.add(key); tryMove(dir); state.moveCooldown = performance.now() + 145; };
      const up = event => { event.preventDefault(); state.keys.delete(key); };
      button.addEventListener("pointerdown", down);
      button.addEventListener("pointerup", up);
      button.addEventListener("pointerleave", up);
      button.addEventListener("pointercancel", up);
    });
    talkBtn.addEventListener("click", interact);
    document.getElementById("dialog-close").addEventListener("click", () => playerDialog.close());
    document.getElementById("menu-close").addEventListener("click", () => gameMenu.close());
    menuBtn.addEventListener("click", openMenu);
    fullscreenBtn.addEventListener("click", () => document.documentElement.requestFullscreen?.());
  }

  async function init() {
    try {
      await loadRomData();
      await loadProfile();
      saveStatus.textContent = "Save automatico ativo";
    } catch (error) {
      console.error(error);
      saveStatus.textContent = "Falha ao carregar ROM";
      state.world = startWorld();
    }
    bindInput();
    connectSocket();
    render();
    requestAnimationFrame(gameLoop);
  }

  init();
})();
