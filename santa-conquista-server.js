const crypto = require('node:crypto');
const SANTA_DATA = require('./public/santa-conquista-data.js');

const SANTA_CONQUISTA_GAME_ID = 'santa-conquista';
const SANTA_CONQUISTA_ACCESS_COOKIE = 'santa_conquista_access';
const SANTA_CONQUISTA_RESET_DAYS = 7;
const SANTA_CONQUISTA_MAP_VERSION = 3;
const RESET_AFTER_MS = SANTA_CONQUISTA_RESET_DAYS * 24 * 60 * 60 * 1000;
const ROOM_DEFS = [
  { id: 'sc-mapa-1', name: 'Mapa I - Mesa de Acre', flavor: 'Campanha equilibrada no Mediterraneo e Levante.' },
  { id: 'sc-mapa-2', name: 'Mapa II - Conselho de Roma', flavor: 'Campanha com foco em diplomacia europeia.' },
  { id: 'sc-mapa-3', name: 'Mapa III - Portoes de Constantinopla', flavor: 'Campanha com pressao forte na Anatolia.' }
];

const ACHIEVEMENTS = [
  { id: 'santa-primeiro-conselho', title: 'Primeiro Conselho', description: 'Entrou em um mapa de Santa Conquista e escolheu uma nacao.', xp: 30, points: 5, file: '/assets/santa-conquista-card.webp' },
  { id: 'santa-primeira-obra', title: 'Pedra Fundamental', description: 'Construiu o primeiro edificio em uma provincia.', xp: 45, points: 10, file: '/assets/santa-conquista-card.webp' },
  { id: 'santa-primeira-campanha', title: 'Primeira Campanha', description: 'Ocupou uma provincia inimiga em guerra.', xp: 80, points: 15, file: '/assets/santa-conquista-card.webp' },
  { id: 'santa-cidade-santa', title: 'Guardiao de Cidade Santa', description: 'Controlou uma das grandes cidades sagradas do mapa.', xp: 120, points: 25, file: '/assets/santa-conquista-card.webp' }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isoNow() {
  return new Date().toISOString();
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function cleanText(value, max = 160) {
  return String(value || '').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function monthName(month) {
  return ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][Math.max(0, Math.min(11, Number(month || 1) - 1))];
}

function setupSantaConquista(options) {
  const {
    db,
    secret,
    accessPin = '5892',
    currentUser,
    readForm,
    json,
    redirect,
    parseCookies,
    pageShell,
    escapeHtml
  } = options;
  const escape = escapeHtml || (value => String(value ?? ''));
  const roomCache = new Map();
  const roomSockets = new Map();
  let ioRef = null;
  let ticker = null;

  db.exec(`
    CREATE TABLE IF NOT EXISTS santa_conquista_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      state_json TEXT NOT NULL,
      generation INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_access_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS santa_conquista_room_players (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      nation_id TEXT,
      joined_at TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      PRIMARY KEY (room_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS santa_conquista_rankings (
      user_id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      nation_id TEXT NOT NULL,
      nation_name TEXT NOT NULL,
      best_score INTEGER NOT NULL DEFAULT 0,
      best_provinces INTEGER NOT NULL DEFAULT 0,
      best_year INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  const getRoom = db.prepare('SELECT * FROM santa_conquista_rooms WHERE id = ?');
  const getRooms = db.prepare('SELECT * FROM santa_conquista_rooms ORDER BY id ASC');
  const upsertRoom = db.prepare(`
    INSERT INTO santa_conquista_rooms (id, name, state_json, generation, created_at, updated_at, last_access_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      state_json = excluded.state_json,
      generation = excluded.generation,
      updated_at = excluded.updated_at,
      last_access_at = excluded.last_access_at
  `);
  const upsertRoomPlayer = db.prepare(`
    INSERT INTO santa_conquista_room_players (room_id, user_id, user_name, nation_id, joined_at, last_seen)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(room_id, user_id) DO UPDATE SET user_name = excluded.user_name, nation_id = excluded.nation_id, last_seen = excluded.last_seen
  `);
  const getRoomPlayers = db.prepare('SELECT * FROM santa_conquista_room_players WHERE room_id = ? ORDER BY joined_at ASC');
  const upsertRanking = db.prepare(`
    INSERT INTO santa_conquista_rankings (user_id, user_name, nation_id, nation_name, best_score, best_provinces, best_year, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      user_name = excluded.user_name,
      nation_id = excluded.nation_id,
      nation_name = excluded.nation_name,
      best_score = max(santa_conquista_rankings.best_score, excluded.best_score),
      best_provinces = max(santa_conquista_rankings.best_provinces, excluded.best_provinces),
      best_year = max(santa_conquista_rankings.best_year, excluded.best_year),
      updated_at = excluded.updated_at
  `);
  const getRankings = db.prepare('SELECT * FROM santa_conquista_rankings ORDER BY best_score DESC, best_provinces DESC, best_year DESC, updated_at ASC LIMIT 20');
  const insertAchievement = db.prepare(`
    INSERT OR IGNORE INTO user_achievements (user_id, game_id, medal_id, unlocked_at, source_save_name)
    VALUES (?, ?, ?, ?, ?)
  `);
  const getUserAchievements = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND game_id = ?');

  function roomDef(roomId) {
    return ROOM_DEFS.find(room => room.id === roomId) || ROOM_DEFS[0];
  }

  function signAccess(userId) {
    return crypto.createHmac('sha256', secret).update(`${SANTA_CONQUISTA_GAME_ID}:${userId}`).digest('hex');
  }

  function hasAccess(req, userId) {
    const token = parseCookies(req)[SANTA_CONQUISTA_ACCESS_COOKIE];
    if (!token || !userId) return false;
    const expected = signAccess(userId);
    return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  }

  function setAccessCookie(res, userId) {
    const token = signAccess(userId);
    res.setHeader('Set-Cookie', `${SANTA_CONQUISTA_ACCESS_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 60 * 60}`);
  }

  function renderAccessPage(error = '') {
    return pageShell('Santa Conquista', `
<main class="auth-wrap"><section class="auth-card"><h1>Santa Conquista</h1><p>Beta fechado: tres mapas multiplayer persistentes para testar a campanha medieval.</p>${error ? `<div class="form-error">${escape(error)}</div>` : ''}<form method="POST" action="/santa-conquista/unlock" class="auth-form"><label>Senha de acesso<input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="off" required autofocus></label><button type="submit">Entrar</button></form><a class="auth-link" href="/">Voltar ao hub</a></section></main>`, 'game');
  }

  async function unlock(req, res, user) {
    const form = await readForm(req);
    const pin = String(form.get('pin') || '').trim();
    if (!user || pin !== accessPin) {
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAccessPage('Senha incorreta.'));
      return;
    }
    setAccessCookie(res, user.id);
    redirect(res, '/santa-conquista');
  }

  function defaultState(roomId, generation = 1) {
    const def = roomDef(roomId);
    const now = isoNow();
    const nations = clone(SANTA_DATA.nations);
    const provinces = clone(SANTA_DATA.provinces);
    Object.values(provinces).forEach(province => {
      province.originalOwner = province.owner;
      province.occupier = null;
      province.conversionProgress = 0;
    });
    Object.values(nations).forEach(nation => {
      nation.playerId = null;
      nation.provinces = Object.values(provinces).filter(province => province.owner === nation.id).map(province => province.id);
      nation.resources = { ...nation.resources };
      nation.diplomacy = clone(nation.diplomacy || { allies: [], enemies: [], truces: {}, vassals: [] });
    });
    const armies = {};
    Object.values(nations).forEach(nation => {
      armies[nation.id] = {
        id: `army-${nation.id}`,
        nationId: nation.id,
        provinceId: nation.capital,
        size: Math.max(180, Math.floor(Number(nation.resources.manpower || 500) * 0.34)),
        morale: 70,
        status: 'standing',
        commander: nation.ruler
      };
    });
    return {
      gameId: SANTA_CONQUISTA_GAME_ID,
      mapVersion: SANTA_CONQUISTA_MAP_VERSION,
      roomId,
      roomName: def.name,
      generation,
      createdAt: now,
      updatedAt: now,
      lastAccessAt: now,
      year: SANTA_DATA.startYear,
      month: SANTA_DATA.startMonth,
      speed: 1,
      paused: false,
      halfTick: false,
      players: {},
      nations,
      provinces,
      armies,
      wars: [],
      treaties: [],
      events: [],
      chat: [],
      log: [`${def.name} iniciou a campanha em ${SANTA_DATA.startYear}.`]
    };
  }

  function saveState(state) {
    const now = isoNow();
    state.updatedAt = now;
    const def = roomDef(state.roomId);
    upsertRoom.run(state.roomId, def.name, JSON.stringify(state), Number(state.generation || 1), state.createdAt || now, now, state.lastAccessAt || now);
    roomCache.set(state.roomId, state);
  }

  function loadState(roomId, options = {}) {
    const def = roomDef(roomId);
    const row = getRoom.get(def.id);
    const now = isoNow();
    let state = row ? normalizeState(safeJson(row.state_json, null)) : null;
    const stale = row && new Date(row.last_access_at || row.updated_at || row.created_at).getTime() <= Date.now() - RESET_AFTER_MS;
    const outdatedMap = state && Number(state.mapVersion || 0) !== SANTA_CONQUISTA_MAP_VERSION;
    if (!state || outdatedMap || (options.resetStale && stale)) {
      state = defaultState(def.id, row ? Number(row.generation || 1) + 1 : 1);
      state.log.unshift(outdatedMap ? 'Mapa reiniciado para a nova topologia historica.' : stale ? 'Mapa reiniciado apos 7 dias sem acesso.' : 'Mapa criado ao primeiro acesso.');
    }
    if (options.touch) state.lastAccessAt = now;
    saveState(state);
    return state;
  }

  function safeJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  function normalizeState(state) {
    if (!state) return state;
    state.events = (state.events || []).filter(event => event.type !== 'historical' || event.title !== 'O chamado por uma nova Cruzada');
    return state;
  }

  function listRooms() {
    const rows = new Map(getRooms.all().map(row => [row.id, row]));
    return ROOM_DEFS.map(def => {
      const row = rows.get(def.id);
      const state = row ? safeJson(row.state_json, null) : null;
      const last = row?.last_access_at || state?.lastAccessAt || null;
      const stale = last ? new Date(last).getTime() <= Date.now() - RESET_AFTER_MS : false;
      const sockets = roomSockets.get(def.id);
      return {
        id: def.id,
        name: def.name,
        flavor: def.flavor,
        generation: Number(row?.generation || state?.generation || 1),
        year: state?.year || SANTA_DATA.startYear,
        month: state?.month || SANTA_DATA.startMonth,
        monthName: monthName(state?.month || SANTA_DATA.startMonth),
        players: Object.keys(state?.players || {}).length,
        online: sockets ? sockets.size : 0,
        stale,
        lastAccessAt: last
      };
    });
  }

  function publicState(state, user = null) {
    const rankings = rankingRows();
    return {
      dataVersion: 2,
      roomId: state.roomId,
      roomName: state.roomName,
      generation: state.generation,
      year: state.year,
      month: state.month,
      monthName: monthName(state.month),
      speed: state.speed,
      paused: state.paused,
      players: state.players,
      me: user ? { id: user.id, name: user.name, nationId: state.players[user.id]?.nationId || null } : null,
      nations: state.nations,
      provinces: state.provinces,
      armies: state.armies,
      wars: state.wars,
      treaties: state.treaties.filter(treaty => treaty.status === 'pending'),
      events: state.events.slice(-3),
      chat: state.chat.slice(-40),
      log: state.log.slice(-80),
      ranking: rankings
    };
  }

  function rankingRows() {
    return getRankings.all().map((row, index) => ({
      position: index + 1,
      player: row.user_name,
      nation: row.nation_name,
      score: row.best_score,
      provinces: row.best_provinces,
      year: row.best_year,
      updatedAt: row.updated_at
    }));
  }

  function medalsForUser(userId) {
    const rows = new Map(getUserAchievements.all(userId, SANTA_CONQUISTA_GAME_ID).map(row => [row.medal_id, row]));
    return ACHIEVEMENTS.map(def => {
      const row = rows.get(def.id);
      return { ...def, unlocked: Boolean(row), unlockedAt: row?.unlocked_at || null, gameId: SANTA_CONQUISTA_GAME_ID };
    });
  }

  function unlockAchievement(userId, medalId) {
    if (!userId || !ACHIEVEMENTS.some(item => item.id === medalId)) return;
    insertAchievement.run(userId, SANTA_CONQUISTA_GAME_ID, medalId, isoNow(), 'Santa Conquista');
  }

  function controlledNation(state, userId) {
    const player = state.players[userId];
    if (!player?.nationId) return null;
    const nation = state.nations[player.nationId];
    return nation?.playerId === userId ? nation : null;
  }

  function provinceOwner(state, provinceId) {
    const province = state.provinces[provinceId];
    return province ? state.nations[province.owner] : null;
  }

  function recalcNationProvinces(state) {
    Object.values(state.nations).forEach(nation => { nation.provinces = []; });
    Object.values(state.provinces).forEach(province => {
      if (state.nations[province.owner]) state.nations[province.owner].provinces.push(province.id);
    });
  }

  function addLog(state, message) {
    state.log.unshift(`${state.year}.${String(state.month).padStart(2, '0')} - ${message}`);
    state.log = state.log.slice(0, 100);
  }

  function calculateScore(state, nation) {
    const provinceCount = nation.provinces.length;
    const holy = nation.provinces.filter(id => SANTA_DATA.holySites.includes(id)).length;
    const resources = nation.resources;
    return Math.round(provinceCount * 120 + holy * 180 + resources.prestige * 2 + resources.piety * 2 + resources.stability + resources.authority + resources.gold * 0.4 + (state.year - SANTA_DATA.startYear) * 2);
  }

  function updateRankingForUser(state, user) {
    const nation = controlledNation(state, user.id);
    if (!nation) return;
    const score = calculateScore(state, nation);
    upsertRanking.run(user.id, user.name, nation.id, nation.name, score, nation.provinces.length, state.year, isoNow());
    unlockAchievement(user.id, 'santa-primeiro-conselho');
    if (nation.provinces.some(id => SANTA_DATA.holySites.includes(id))) unlockAchievement(user.id, 'santa-cidade-santa');
    if (nation.provinces.some(id => state.provinces[id]?.originalOwner && state.provinces[id].originalOwner !== nation.id)) unlockAchievement(user.id, 'santa-primeira-campanha');
  }

  function buildInProvince(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const province = state.provinces[String(payload?.provinceId || '')];
    const buildingId = String(payload?.building || '');
    const building = SANTA_DATA.buildings[buildingId];
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!province || province.owner !== nation.id) return 'A provincia nao pertence a sua nacao.';
    if (!building) return 'Construcao invalida.';
    if (province.buildings.includes(buildingId)) return 'Esta provincia ja possui essa construcao.';
    if (nation.resources.gold < building.costGold || nation.resources.piety < (building.costPiety || 0)) return 'Recursos insuficientes.';
    nation.resources.gold -= building.costGold;
    nation.resources.piety -= building.costPiety || 0;
    province.buildings.push(buildingId);
    if (building.effect === 'wealth') province.wealth += 2;
    if (building.effect === 'fortress' || building.effect === 'defense') province.fortress += 1;
    if (building.effect === 'supply') province.supply += 2;
    if (building.effect === 'manpower') province.localTroops.infantry += 80;
    if (building.effect === 'conversion' || building.effect === 'piety') province.heresyRisk = Math.max(0, province.heresyRisk - 5);
    addLog(state, `${nation.shortName} construiu ${building.name} em ${province.name}.`);
    unlockAchievement(user.id, 'santa-primeira-obra');
    return null;
  }

  function trainArmy(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const province = state.provinces[String(payload?.provinceId || '')];
    const amount = Math.round(clamp(payload?.amount || 120, 60, 500));
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!province || province.owner !== nation.id) return 'Treine tropas em uma provincia sua.';
    const goldCost = Math.ceil(amount / 18);
    if (nation.resources.gold < goldCost || nation.resources.manpower < amount) return 'Ouro ou homens insuficientes.';
    nation.resources.gold -= goldCost;
    nation.resources.manpower -= amount;
    const army = state.armies[nation.id];
    if (army.provinceId !== province.id) army.provinceId = province.id;
    army.size += amount;
    army.morale = Math.min(100, army.morale + 4);
    province.localTroops.infantry += Math.floor(amount * 0.3);
    addLog(state, `${nation.shortName} treinou ${amount} homens em ${province.name}.`);
    return null;
  }

  function activeWarBetween(state, a, b) {
    return state.wars.find(war => war.status === 'active' && ((war.attacker === a && war.defender === b) || (war.attacker === b && war.defender === a)));
  }

  function declareWar(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const targetId = String(payload?.targetNationId || '');
    const target = state.nations[targetId];
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!target || target.id === nation.id) return 'Alvo invalido.';
    if (nation.diplomacy?.allies?.includes(target.id)) return 'Rompa a alianca antes de declarar guerra.';
    if (activeWarBetween(state, nation.id, target.id)) return 'Ja existe uma guerra ativa.';
    const id = `war-${crypto.randomUUID()}`;
    state.wars.push({
      id,
      attacker: nation.id,
      defender: target.id,
      casusBelli: cleanText(payload?.casusBelli || 'fronteira', 40),
      objective: cleanText(payload?.objective || '', 60),
      startYear: state.year,
      warScore: 0,
      participants: { attackers: [nation.id], defenders: [target.id] },
      occupiedProvinces: [],
      status: 'active'
    });
    nation.resources.prestige = Math.max(0, nation.resources.prestige - 4);
    addLog(state, `${nation.shortName} declarou guerra contra ${target.shortName}.`);
    return null;
  }

  function moveArmy(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const targetId = String(payload?.provinceId || '');
    const target = state.provinces[targetId];
    if (!nation) return 'Escolha uma nacao primeiro.';
    const army = state.armies[nation.id];
    const current = state.provinces[army.provinceId];
    if (!target || !current || !current.neighbors.includes(target.id)) return 'O exercito so pode mover para provincia vizinha.';
    if (target.owner === nation.id) {
      army.provinceId = target.id;
      army.morale = Math.min(100, army.morale + 1);
      addLog(state, `${nation.shortName} moveu seu exercito para ${target.name}.`);
      return null;
    }
    const war = activeWarBetween(state, nation.id, target.owner);
    if (!war) return 'Declare guerra antes de atacar.';
    const defender = state.nations[target.owner];
    const defenseTroops = target.localTroops.infantry + target.localTroops.archers + target.localTroops.cavalry + target.fortress * 95;
    const attack = army.size * (army.morale / 100) * (nation.bonuses?.cavalry || 1);
    const defense = defenseTroops * (target.terrain === 'mountains' ? 1.2 : target.terrain === 'hills' ? 1.1 : 1);
    const roll = 0.85 + Math.random() * 0.3;
    if (attack * roll >= defense * 0.72) {
      const loss = Math.max(25, Math.round(defense * 0.14));
      army.size = Math.max(80, army.size - loss);
      army.morale = Math.max(35, army.morale - 8);
      army.provinceId = target.id;
      target.occupier = nation.id;
      war.occupiedProvinces = Array.from(new Set([...(war.occupiedProvinces || []), target.id]));
      war.warScore += war.attacker === nation.id ? 18 : -18;
      addLog(state, `${nation.shortName} ocupou ${target.name} em campanha contra ${defender.shortName}.`);
      unlockAchievement(user.id, 'santa-primeira-campanha');
      if (!defender.playerId && Math.abs(war.warScore) >= 36) {
        cedeProvince(state, target.id, nation.id);
        war.status = 'ended';
        addLog(state, `${defender.shortName} aceitou a cessao de ${target.name}.`);
      }
    } else {
      const loss = Math.max(35, Math.round(army.size * 0.18));
      army.size = Math.max(60, army.size - loss);
      army.morale = Math.max(20, army.morale - 16);
      war.warScore += war.attacker === nation.id ? -8 : 8;
      addLog(state, `${nation.shortName} falhou no cerco de ${target.name}.`);
    }
    return null;
  }

  function cedeProvince(state, provinceId, newOwnerId) {
    const province = state.provinces[provinceId];
    if (!province || !state.nations[newOwnerId]) return false;
    province.owner = newOwnerId;
    province.occupier = null;
    province.loyalty = Math.max(28, Math.floor(province.loyalty * 0.72));
    recalcNationProvinces(state);
    return true;
  }

  function offerPeace(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const war = state.wars.find(item => item.id === String(payload?.warId || '') && item.status === 'active');
    const provinceId = String(payload?.cedeProvince || '');
    const province = state.provinces[provinceId];
    if (!nation || !war) return 'Guerra invalida.';
    if (![war.attacker, war.defender].includes(nation.id)) return 'Sua nacao nao participa dessa guerra.';
    if (!province || province.occupier !== nation.id) return 'A paz simples exige uma provincia ocupada por voce.';
    const otherId = war.attacker === nation.id ? war.defender : war.attacker;
    const other = state.nations[otherId];
    if (!other.playerId || Math.abs(war.warScore) >= 25) {
      cedeProvince(state, province.id, nation.id);
      war.status = 'ended';
      addLog(state, `${nation.shortName} firmou paz e recebeu ${province.name}.`);
      return null;
    }
    state.treaties.push({
      id: `treaty-${crypto.randomUUID()}`,
      type: 'peace_offer',
      from: nation.id,
      to: other.id,
      warId: war.id,
      terms: { cedeProvince: province.id },
      status: 'pending',
      createdAt: isoNow()
    });
    addLog(state, `${nation.shortName} ofereceu paz a ${other.shortName}.`);
    return null;
  }

  function acceptPeace(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const treaty = state.treaties.find(item => item.id === String(payload?.treatyId || '') && item.status === 'pending');
    if (!nation || !treaty || treaty.to !== nation.id) return 'Tratado invalido.';
    const province = state.provinces[treaty.terms?.cedeProvince];
    const war = state.wars.find(item => item.id === treaty.warId);
    if (province && treaty.from) cedeProvince(state, province.id, treaty.from);
    if (war) war.status = 'ended';
    treaty.status = 'accepted';
    addLog(state, `${nation.shortName} aceitou um tratado de paz.`);
    return null;
  }

  function addAlliance(state, a, b) {
    const first = state.nations[a];
    const second = state.nations[b];
    if (!first || !second) return false;
    first.diplomacy = first.diplomacy || { allies: [], enemies: [], truces: {}, vassals: [] };
    second.diplomacy = second.diplomacy || { allies: [], enemies: [], truces: {}, vassals: [] };
    first.diplomacy.allies = Array.from(new Set([...(first.diplomacy.allies || []), b]));
    second.diplomacy.allies = Array.from(new Set([...(second.diplomacy.allies || []), a]));
    first.diplomacy.enemies = (first.diplomacy.enemies || []).filter(id => id !== b);
    second.diplomacy.enemies = (second.diplomacy.enemies || []).filter(id => id !== a);
    return true;
  }

  function proposeAlliance(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const targetId = String(payload?.targetNationId || '');
    const target = state.nations[targetId];
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!target || target.id === nation.id) return 'Alvo invalido.';
    if (nation.diplomacy?.allies?.includes(target.id)) return 'Essa nacao ja e aliada.';
    if (activeWarBetween(state, nation.id, target.id)) return 'Nao da para propor alianca durante uma guerra.';
    const pending = state.treaties.find(item => item.status === 'pending' && item.type === 'alliance_offer' && item.from === nation.id && item.to === target.id);
    if (pending) return 'Ja existe uma proposta de alianca enviada.';
    if (!target.playerId) {
      addAlliance(state, nation.id, target.id);
      nation.resources.prestige = Math.max(0, nation.resources.prestige - 2);
      addLog(state, `${nation.shortName} firmou alianca com ${target.shortName}.`);
      return null;
    }
    state.treaties.push({
      id: `treaty-${crypto.randomUUID()}`,
      type: 'alliance_offer',
      from: nation.id,
      to: target.id,
      terms: {},
      status: 'pending',
      createdAt: isoNow()
    });
    addLog(state, `${nation.shortName} ofereceu alianca a ${target.shortName}.`);
    return null;
  }

  function acceptAlliance(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const treaty = state.treaties.find(item => item.id === String(payload?.treatyId || '') && item.status === 'pending' && item.type === 'alliance_offer');
    if (!nation || !treaty || treaty.to !== nation.id) return 'Tratado invalido.';
    if (activeWarBetween(state, treaty.from, treaty.to)) return 'Nao da para aceitar alianca durante uma guerra.';
    if (!addAlliance(state, treaty.from, treaty.to)) return 'Alianca invalida.';
    treaty.status = 'accepted';
    addLog(state, `${nation.shortName} aceitou alianca com ${state.nations[treaty.from]?.shortName || treaty.from}.`);
    return null;
  }

  function changeReligionPolicy(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const province = state.provinces[String(payload?.provinceId || '')];
    const policy = String(payload?.policy || 'preach');
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!province || province.owner !== nation.id) return 'Escolha uma provincia sua.';
    if (policy === 'force' && nation.resources.piety < 18) return 'Piedade insuficiente.';
    if (policy === 'tolerate') {
      province.loyalty = Math.min(100, province.loyalty + 8);
      province.heresyRisk = Math.min(60, province.heresyRisk + 2);
      nation.resources.stability = Math.min(100, nation.resources.stability + 2);
      addLog(state, `${nation.shortName} aumentou tolerancia em ${province.name}.`);
      return null;
    }
    const cost = policy === 'force' ? 18 : 10;
    nation.resources.piety -= cost;
    province.conversionProgress = Math.min(100, (province.conversionProgress || 0) + (policy === 'force' ? 26 : 14));
    province.heresyRisk = Math.max(0, province.heresyRisk - (policy === 'force' ? 4 : 8));
    if (policy === 'force') province.loyalty = Math.max(0, province.loyalty - 7);
    if (province.conversionProgress >= 100) {
      province.religion = nation.religion;
      province.conversionProgress = 0;
      province.heresy = null;
      addLog(state, `${province.name} passou a seguir a religiao oficial de ${nation.shortName}.`);
    } else {
      addLog(state, `${nation.shortName} iniciou acao religiosa em ${province.name}.`);
    }
    return null;
  }

  function chooseEvent(state, user, payload) {
    const nation = controlledNation(state, user.id);
    const event = state.events.find(item => item.id === String(payload?.eventId || ''));
    const choice = event?.choices?.find(item => item.id === String(payload?.choiceId || ''));
    if (!nation) return 'Escolha uma nacao primeiro.';
    if (!event || !choice) return 'Evento invalido.';
    ['gold', 'manpower', 'prestige', 'piety', 'stability', 'authority'].forEach(key => {
      if (choice[key]) nation.resources[key] = clamp((nation.resources[key] || 0) + choice[key], 0, key === 'gold' || key === 'manpower' ? 99999 : 100);
    });
    event.resolvedBy = event.resolvedBy || {};
    event.resolvedBy[user.id] = choice.id;
    addLog(state, `${nation.shortName} respondeu ao evento: ${choice.label}.`);
    return null;
  }

  function advanceMonth(state) {
    state.month += 1;
    if (state.month > 12) {
      state.month = 1;
      state.year += 1;
    }
    Object.values(state.nations).forEach(nation => {
      const owned = nation.provinces.map(id => state.provinces[id]).filter(Boolean);
      const income = owned.reduce((sum, province) => sum + province.wealth + (province.buildings.includes('market') ? 2 : 0), 0);
      const manpower = owned.reduce((sum, province) => sum + province.population * 8 + (province.buildings.includes('barracks') ? 25 : 0), 0);
      nation.resources.gold = Math.min(9999, Math.round(nation.resources.gold + income * 0.22));
      nation.resources.manpower = Math.min(99999, Math.round(nation.resources.manpower + manpower * 0.12));
      nation.resources.stability = clamp(nation.resources.stability + (owned.some(p => p.heresy) ? -0.2 : 0.1), 0, 100);
      owned.forEach(province => {
        const pressure = province.religion !== nation.religion ? 0.4 : -0.2;
        province.heresyRisk = clamp(province.heresyRisk + pressure + (province.loyalty < 40 ? 0.5 : 0), 0, 80);
        if (!province.heresy && province.heresyRisk > 45 && Math.random() < 0.08) {
          province.heresy = province.religion === 'catholic' ? 'catarismo' : province.religion === 'orthodox' ? 'bogomilismo' : 'movimento reformista local';
          addLog(state, `Um movimento religioso surgiu em ${province.name}.`);
        }
      });
    });
    runAi(state);
    if (state.year > SANTA_DATA.startYear && !state.events.some(event => event.type === 'edessa-threat') && Math.random() < 0.04) {
      state.events.push({
        id: `event-${crypto.randomUUID()}`,
        type: 'edessa-threat',
        title: 'A ameaca sobre Edessa',
        body: 'Rumores de uma grande ofensiva chegam ao norte da Siria. Edessa pede apoio, ouro e homens.',
        choices: [
          { id: 'aid', label: 'Enviar socorro', gold: -18, manpower: -70, prestige: 12, piety: 10 },
          { id: 'pray', label: 'Apoiar com enviados', gold: -8, prestige: 5, piety: 8 },
          { id: 'wait', label: 'Esperar', gold: 4, prestige: -4, stability: 2 }
        ],
        createdAt: isoNow()
      });
    }
  }

  function runAi(state) {
    Object.values(state.nations).filter(nation => !nation.playerId).forEach(nation => {
      if (Math.random() < 0.35) {
        const province = nation.provinces.map(id => state.provinces[id]).find(item => item && !item.buildings.includes('market') && nation.resources.gold >= 40);
        if (province) {
          province.buildings.push('market');
          province.wealth += 1;
          nation.resources.gold -= 40;
        }
      }
      const army = state.armies[nation.id];
      if (!army || army.size < 160 || Math.random() > 0.08) return;
      const current = state.provinces[army.provinceId];
      const target = current?.neighbors.map(id => state.provinces[id]).find(province => province && province.owner !== nation.id && province.loyalty < 38 && !nation.diplomacy?.allies?.includes(province.owner));
      if (target && !activeWarBetween(state, nation.id, target.owner)) {
        state.wars.push({
          id: `war-${crypto.randomUUID()}`,
          attacker: nation.id,
          defender: target.owner,
          casusBelli: 'oportunidade de fronteira',
          objective: target.id,
          startYear: state.year,
          warScore: 0,
          participants: { attackers: [nation.id], defenders: [target.owner] },
          occupiedProvinces: [],
          status: 'active'
        });
        addLog(state, `${nation.shortName} iniciou uma guerra contra ${state.nations[target.owner]?.shortName || target.owner}.`);
      }
    });
  }

  function tickActiveRooms() {
    ROOM_DEFS.forEach(def => {
      const sockets = roomSockets.get(def.id);
      if (!sockets || sockets.size === 0) return;
      const state = roomCache.get(def.id) || loadState(def.id, { touch: false, resetStale: false });
      if (state.paused || Number(state.speed) <= 0) return;
      let months = Math.max(1, Math.round(Number(state.speed || 1)));
      if (Number(state.speed) === 0.5) {
        state.halfTick = !state.halfTick;
        months = state.halfTick ? 1 : 0;
      }
      for (let i = 0; i < months; i += 1) advanceMonth(state);
      state.lastAccessAt = isoNow();
      saveState(state);
      broadcastState(state);
    });
  }

  function attachIo(io) {
    ioRef = io;
    if (!ticker) ticker = setInterval(tickActiveRooms, 5000);
  }

  function broadcastState(state) {
    if (!ioRef) return;
    ioRef.to(`santa:${state.roomId}`).emit('sc:gameState', publicState(state));
  }

  function emitStateAfterMutation(socket, state, user) {
    if (!ioRef) return;
    socket.emit('sc:gameState', publicState(state, user));
    socket.to(`santa:${state.roomId}`).emit('sc:gameState', publicState(state));
  }

  function emitError(socket, message) {
    socket.emit('sc:error', { message });
  }

  function mutateRoom(socket, payload, action) {
    const user = currentUser(socket.request);
    if (!user || !hasAccess(socket.request, user.id)) { emitError(socket, 'Acesso bloqueado. Entre pela pagina com senha.'); return; }
    const roomId = socket.data.santaRoomId || String(payload?.roomId || '');
    const state = loadState(roomId, { touch: true, resetStale: true });
    if (!state.players[user.id]) {
      state.players[user.id] = { id: user.id, name: user.name, nationId: null, joinedAt: isoNow(), lastSeen: isoNow() };
    }
    state.players[user.id].lastSeen = isoNow();
    const error = action(state, user);
    if (error) { emitError(socket, error); return; }
    updateRankingForUser(state, user);
    saveState(state);
    emitStateAfterMutation(socket, state, user);
  }

  function attachSocket(io, socket) {
    socket.on('sc:joinRoom', payload => {
      const user = currentUser(socket.request);
      if (!user || !hasAccess(socket.request, user.id)) { emitError(socket, 'Acesso bloqueado. Entre pela pagina com senha.'); return; }
      const id = String(payload?.roomId || ROOM_DEFS[0].id);
      const def = roomDef(id);
      const state = loadState(def.id, { touch: true, resetStale: true });
      socket.data.santaRoomId = def.id;
      socket.join(`santa:${def.id}`);
      if (!roomSockets.has(def.id)) roomSockets.set(def.id, new Set());
      roomSockets.get(def.id).add(socket.id);
      const now = isoNow();
      state.players[user.id] = state.players[user.id] || { id: user.id, name: user.name, nationId: null, joinedAt: now, lastSeen: now };
      state.players[user.id].name = user.name;
      state.players[user.id].lastSeen = now;
      upsertRoomPlayer.run(def.id, user.id, user.name, state.players[user.id].nationId || null, state.players[user.id].joinedAt || now, now);
      saveState(state);
      socket.emit('sc:joined', { room: def, state: publicState(state, user) });
      broadcastState(state);
    });

    socket.on('sc:chooseNation', payload => mutateRoom(socket, payload, (state, user) => {
      const nationId = String(payload?.nationId || '');
      const nation = state.nations[nationId];
      if (!nation) return 'Nacao invalida.';
      if (nation.playerId && nation.playerId !== user.id) return 'Essa nacao ja foi escolhida.';
      const previous = state.players[user.id]?.nationId;
      if (previous && state.nations[previous]?.playerId === user.id) state.nations[previous].playerId = null;
      state.players[user.id].nationId = nation.id;
      nation.playerId = user.id;
      upsertRoomPlayer.run(state.roomId, user.id, user.name, nation.id, state.players[user.id].joinedAt || isoNow(), isoNow());
      addLog(state, `${user.name} assumiu ${nation.name}.`);
      return null;
    }));

    socket.on('sc:build', payload => mutateRoom(socket, payload, (state, user) => buildInProvince(state, user, payload)));
    socket.on('sc:trainArmy', payload => mutateRoom(socket, payload, (state, user) => trainArmy(state, user, payload)));
    socket.on('sc:moveArmy', payload => mutateRoom(socket, payload, (state, user) => moveArmy(state, user, payload)));
    socket.on('sc:declareWar', payload => mutateRoom(socket, payload, (state, user) => declareWar(state, user, payload)));
    socket.on('sc:proposeAlliance', payload => mutateRoom(socket, payload, (state, user) => proposeAlliance(state, user, payload)));
    socket.on('sc:acceptAlliance', payload => mutateRoom(socket, payload, (state, user) => acceptAlliance(state, user, payload)));
    socket.on('sc:offerPeace', payload => mutateRoom(socket, payload, (state, user) => offerPeace(state, user, payload)));
    socket.on('sc:acceptPeace', payload => mutateRoom(socket, payload, (state, user) => acceptPeace(state, user, payload)));
    socket.on('sc:changeReligionPolicy', payload => mutateRoom(socket, payload, (state, user) => changeReligionPolicy(state, user, payload)));
    socket.on('sc:triggerEventChoice', payload => mutateRoom(socket, payload, (state, user) => chooseEvent(state, user, payload)));
    socket.on('sc:pauseGame', payload => mutateRoom(socket, payload, state => {
      state.paused = Boolean(payload?.paused);
      addLog(state, state.paused ? 'A campanha foi pausada.' : 'A campanha voltou a andar.');
      return null;
    }));
    socket.on('sc:setSpeed', payload => mutateRoom(socket, payload, state => {
      state.speed = [0.5, 1, 2].includes(Number(payload?.speed)) ? Number(payload.speed) : 1;
      addLog(state, `Velocidade alterada para ${state.speed}x.`);
      return null;
    }));
    socket.on('sc:chatMessage', payload => mutateRoom(socket, payload, (state, user) => {
      const message = cleanText(payload?.message, 180);
      if (!message) return 'Mensagem vazia.';
      state.chat.push({ id: crypto.randomUUID(), userId: user.id, userName: user.name, message, at: isoNow() });
      state.chat = state.chat.slice(-80);
      return null;
    }));

    socket.on('disconnect', () => {
      const roomId = socket.data.santaRoomId;
      if (roomId && roomSockets.has(roomId)) roomSockets.get(roomId).delete(socket.id);
    });
  }

  async function handleApi(req, res, url, user) {
    if (!user || !hasAccess(req, user.id)) { json(res, 403, { error: 'locked' }); return true; }
    if (req.method === 'GET' && url.pathname === '/api/santa-conquista/rooms') {
      json(res, 200, { rooms: listRooms(), resetAfterDays: SANTA_CONQUISTA_RESET_DAYS });
      return true;
    }
    if (req.method === 'GET' && url.pathname === '/api/santa-conquista/ranking') {
      json(res, 200, { rows: rankingRows() });
      return true;
    }
    json(res, 404, { error: 'API Santa Conquista nao encontrada' });
    return true;
  }

  return {
    id: SANTA_CONQUISTA_GAME_ID,
    achievements: ACHIEVEMENTS,
    hasAccess,
    renderAccessPage,
    unlock,
    handleApi,
    attachIo,
    attachSocket,
    listRooms,
    rankingRows,
    medalsForUser
  };
}

module.exports = {
  SANTA_CONQUISTA_GAME_ID,
  setupSantaConquista
};
