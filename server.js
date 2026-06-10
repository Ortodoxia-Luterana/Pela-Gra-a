const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_PATH = path.join(ROOT, 'data', 'cultivando.sqlite');
const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'cultivando_session';
const LAUNCH_COOKIE_NAME = 'cultivando_game_launch';
const LAUNCH_SECRET = process.env.LAUNCH_SECRET || crypto.createHash('sha256').update(`pela-graca:${DB_PATH}`).digest('hex');
const LAUNCH_MAX_AGE_SECONDS = 5 * 60;
const GAME_VERSION = 'v3.8.5-mobile';
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana', PE: 'Pernambuco',
  PI: 'Piaui', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'Sao Paulo', SE: 'Sergipe', TO: 'Tocantins'
};
const STATE_ORDER = Object.keys(STATE_NAMES);
const TITLE_TRACK = [
  { level: 1, title: 'Visitante', xp: 0, file: '/assets/title-badges/01-visitante.png' },
  { level: 2, title: 'Peregrino', xp: 300, file: '/assets/title-badges/02-peregrino.png' },
  { level: 3, title: 'Companheiro da Fé', xp: 800, file: '/assets/title-badges/03-companheiro-da-fe.png' },
  { level: 4, title: 'Servo da Palavra', xp: 1800, file: '/assets/title-badges/04-servo-da-palavra.png' },
  { level: 5, title: 'Guardião da Verdade', xp: 3200, file: '/assets/title-badges/05-guardiao-da-verdade.png' },
  { level: 6, title: 'Arauto da Graça', xp: 5400, file: '/assets/title-badges/06-arauto-da-graca.png' },
  { level: 7, title: 'Defensor da Confissão', xp: 8400, file: '/assets/title-badges/07-defensor-da-confissao.png' },
  { level: 8, title: 'Herdeiro da Reforma', xp: 12000, file: '/assets/title-badges/08-herdeiro-da-reforma.png' },
  { level: 9, title: 'Cavaleiro da Fé', xp: 16000, file: '/assets/title-badges/09-cavaleiro-da-fe.png' },
  { level: 10, title: 'Santificado', xp: 20000, file: '/assets/title-badges/10-santificado.png' }
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pin_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, slot INTEGER NOT NULL CHECK (slot IN (1, 2)), name TEXT NOT NULL, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (user_id, slot), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS rankings (save_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
`);
try { db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT'); } catch {}

const getUserByName = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getAllUsers = db.prepare('SELECT id, name, avatar_data, created_at FROM users ORDER BY created_at ASC');
const insertUser = db.prepare('INSERT INTO users (id, name, pin_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)');
const updateUserProfile = db.prepare('UPDATE users SET name = ?, avatar_data = ? WHERE id = ?');
const updateRankingUserName = db.prepare('UPDATE rankings SET user_name = ? WHERE user_id = ?');
const insertSession = db.prepare('INSERT INTO sessions (id, user_id, created_at) VALUES (?, ?, ?)');
const getSession = db.prepare('SELECT * FROM sessions WHERE id = ?');
const deleteSession = db.prepare('DELETE FROM sessions WHERE id = ?');
const getSavesByUser = db.prepare('SELECT * FROM saves WHERE user_id = ? ORDER BY slot ASC');
const getSave = db.prepare('SELECT * FROM saves WHERE id = ? AND user_id = ?');
const getSaveSlot = db.prepare('SELECT * FROM saves WHERE user_id = ? AND slot = ?');
const insertSave = db.prepare('INSERT INTO saves (id, user_id, slot, name, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, NULL, ?, ?)');
const updateSaveState = db.prepare('UPDATE saves SET state_json = ?, updated_at = ? WHERE id = ? AND user_id = ?');
const deleteSave = db.prepare('DELETE FROM saves WHERE id = ? AND user_id = ?');
const deleteRanking = db.prepare('DELETE FROM rankings WHERE save_id = ?');
const getAllSavedStates = db.prepare('SELECT saves.*, users.name AS user_name FROM saves JOIN users ON users.id = saves.user_id WHERE saves.state_json IS NOT NULL');
const getRankingRows = db.prepare('SELECT * FROM rankings ORDER BY updated_at DESC');
const upsertRanking = db.prepare(`
  INSERT INTO rankings (save_id, user_id, user_name, save_name, year, month, total_churches, total_members, doctrine_correct, reached_final, state_churches_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(save_id) DO UPDATE SET user_name = excluded.user_name, save_name = excluded.save_name, year = excluded.year, month = excluded.month, total_churches = excluded.total_churches, total_members = excluded.total_members, doctrine_correct = excluded.doctrine_correct, reached_final = excluded.reached_final, state_churches_json = excluded.state_churches_json, updated_at = excluded.updated_at
`);

function hashPin(pin, salt) { return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex'); }
function parseCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map(part => {
    const [key, ...rest] = part.trim().split('=');
    return [key, decodeURIComponent(rest.join('='))];
  }));
}
function currentUser(req) {
  const sessionId = parseCookies(req)[COOKIE_NAME];
  if (!sessionId) return null;
  const session = getSession.get(sessionId);
  return session ? getUserById.get(session.user_id) : null;
}
function setSessionCookie(res, sessionId) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/`); }
function clearSessionCookie(res) { res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`); }
function signLaunch(userId, expiresAt) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`${userId}:${expiresAt}`).digest('hex');
}
function setLaunchCookie(res, userId) {
  const expiresAt = Date.now() + LAUNCH_MAX_AGE_SECONDS * 1000;
  const token = `${userId}.${expiresAt}.${signLaunch(userId, expiresAt)}`;
  res.setHeader('Set-Cookie', `${LAUNCH_COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/game; Max-Age=${LAUNCH_MAX_AGE_SECONDS}`);
}
function hasValidLaunch(req, userId) {
  const token = parseCookies(req)[LAUNCH_COOKIE_NAME];
  if (!token) return false;
  const [tokenUserId, rawExpiresAt, signature] = token.split('.');
  const expiresAt = Number(rawExpiresAt);
  if (tokenUserId !== userId || !Number.isFinite(expiresAt) || expiresAt < Date.now() || !signature) return false;
  const expected = signLaunch(tokenUserId, expiresAt);
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
function redirect(res, location) { res.writeHead(302, { Location: location }); res.end(); }
function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5_000_000) { req.destroy(); reject(new Error('Payload grande demais')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}
async function readForm(req) { return new URLSearchParams(await readBody(req)); }
function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function safeJsonParse(raw, fallback = null) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function isSafeAvatarData(value) {
  return !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
function renderAvatar(user, className = 'avatar') {
  const initials = escapeHtml(user.name).slice(0, 2).toUpperCase();
  return user.avatar_data ? `<img class="${className}" src="${escapeHtml(user.avatar_data)}" alt="${escapeHtml(user.name)}">` : `<b class="${className}">${initials}</b>`;
}
function titleProgress(xp) {
  const currentXp = Math.max(0, Math.floor(Number(xp) || 0));
  const current = [...TITLE_TRACK].reverse().find(rank => currentXp >= rank.xp) || TITLE_TRACK[0];
  const next = TITLE_TRACK.find(rank => rank.xp > currentXp) || null;
  const baseXp = current.xp;
  const nextXp = next ? next.xp : current.xp;
  const progress = next ? Math.max(0, Math.min(100, ((currentXp - baseXp) / (nextXp - baseXp)) * 100)) : 100;
  return { currentXp, current, next, progress };
}

function playerStatsFromSave(save) {
  const state = safeJsonParse(save?.state_json, null);
  const stats = state ? extractRankingStats(state) : { year: 1904, totalChurches: 1, totalMembers: 20, doctrineCorrect: 0 };
  const points = Math.max(0, stats.totalChurches * 15 + stats.doctrineCorrect * 50);
  const rank = titleProgress(points);
  const medals = [
    { id: 'fiel-estudo', title: 'Fiel no Estudo', unlocked: stats.doctrineCorrect >= 10 },
    { id: 'missionario-digital', title: 'Missionario Digital', unlocked: stats.totalChurches >= 10 },
    { id: 'guardiao-confessional', title: 'Guardiao Confessional', unlocked: state?.doc >= 85 && stats.year >= 2026 },
    { id: 'finalista-2026', title: 'Finalista de 2026', unlocked: Boolean(stats.reachedFinal) }
  ];
  const stickersOwned = Math.min(12, 3 + medals.filter(medal => medal.unlocked).length);
  return { state, stats, points, rank, medals, stickersOwned, stickersTotal: 12 };
}

function pageShell(title, body, musicMode = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">
${musicMode ? `<script>window.__MUSIC_MODE__ = ${JSON.stringify(musicMode)};</script>` : ''}
</head>
<body class="site-page">
${body}
<script src="/assets/audio.js?v=${GAME_VERSION}"></script>
</body>
</html>`;
}

function churchCountForState(stateData) { return stateData?.denomData?.IELB?.churches?.length || 0; }
function memberCountForState(stateData) {
  const slot = stateData?.denomData?.IELB;
  if (!slot) return 0;
  if (Number.isFinite(Number(slot.members))) return Number(slot.members);
  return (slot.churches || []).reduce((sum, church) => sum + Math.max(0, Number(church.members) || 0), 0);
}
function extractRankingStats(state) {
  const states = state?.states || {};
  const stateChurches = {};
  let totalChurches = 0;
  let totalMembers = 0;
  STATE_ORDER.forEach(code => {
    const count = churchCountForState(states[code]);
    if (count > 0) stateChurches[code] = count;
    totalChurches += count;
    totalMembers += memberCountForState(states[code]);
  });
  const year = Math.max(1904, Math.floor(Number(state?.year) || 1904));
  const month = Math.max(0, Math.min(11, Math.floor(Number(state?.month) || 0)));
  const explicitDoctrineCorrect = Number(state?.doctrineCorrectCount ?? state?.doctrineStats?.correct);
  const usedQuestions = Array.isArray(state?.usedTheologyQuestions) ? state.usedTheologyQuestions.length : 0;
  const doctrineCorrect = Math.max(0, Math.floor(Number.isFinite(explicitDoctrineCorrect) ? explicitDoctrineCorrect : usedQuestions));
  return { year, month, totalChurches, totalMembers, doctrineCorrect, reachedFinal: year >= 2026 ? 1 : 0, stateChurches };
}
function updateRankingForSave(save, userName, state) {
  if (!state) { deleteRanking.run(save.id); return; }
  const stats = extractRankingStats(state);
  upsertRanking.run(save.id, save.user_id, userName, save.name, stats.year, stats.month, stats.totalChurches, stats.totalMembers, stats.doctrineCorrect, stats.reachedFinal, JSON.stringify(stats.stateChurches), new Date().toISOString());
}
function backfillRankings() {
  getAllSavedStates.all().forEach(save => updateRankingForSave(save, save.user_name, safeJsonParse(save.state_json)));
}
function publicRankingRow(row) {
  return { player: row.user_name, year: row.year, month: row.month, totalChurches: row.total_churches, totalMembers: Math.floor(row.total_members), doctrineCorrect: row.doctrine_correct, reachedFinal: Boolean(row.reached_final), updatedAt: row.updated_at };
}
function rankingPayload() {
  backfillRankings();
  const rows = getRankingRows.all();
  const byYear = [...rows].sort((a, b) => b.year - a.year || b.month - a.month || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byChurches = [...rows].sort((a, b) => b.total_churches - a.total_churches || b.reached_final - a.reached_final || b.year - a.year).slice(0, 10).map(publicRankingRow);
  const byDoctrine = [...rows].sort((a, b) => b.doctrine_correct - a.doctrine_correct || b.year - a.year || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byState = STATE_ORDER.map(code => {
    const best = rows.map(row => ({ row, count: Number(safeJsonParse(row.state_churches_json, {})[code] || 0) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.row.year - a.row.year || b.row.total_churches - a.row.total_churches)[0];
    return best ? { state: code, stateName: STATE_NAMES[code], churches: best.count, ...publicRankingRow(best.row) } : { state: code, stateName: STATE_NAMES[code], churches: 0, player: '-', year: 1904, totalChurches: 0, doctrineCorrect: 0 };
  });
  return { generatedAt: new Date().toISOString(), byYear, byChurches, byState, byDoctrine };
}
function hubSaveForUser(user) {
  const existing = getSaveSlot.get(user.id, 1);
  if (existing) return existing;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  insertSave.run(id, user.id, 1, 'Pela Graça', now, now);
  return getSave.get(id, user.id);
}

function renderNewSave(user, slot, error = '') {
  return pageShell('Nova história', `
<main class="auth-wrap"><section class="auth-card"><h1>Nova história</h1><p>Slot ${slot} · Jogador: ${escapeHtml(user.name)}</p>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<form method="POST" action="/saves" class="auth-form"><input type="hidden" name="slot" value="${slot}"><label>Nome da história<input name="name" maxlength="40" autocomplete="off" required></label><button type="submit">Criar e jogar</button></form><a class="auth-link" href="/">Voltar para slots</a></section></main>`);
}
function renderGame(save, user) {
  const body = fs.readFileSync(path.join(PUBLIC_DIR, 'game-body.html'), 'utf8').replace(/id="version-tag">v[0-9.]+<\/span>/, `id="version-tag">${GAME_VERSION}</span>`);
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${escapeHtml(save.name)} — Pela Graça</title>
<link rel="stylesheet" href="/assets/game.css?v=${GAME_VERSION}">
<link rel="stylesheet" href="/assets/site.css?v=${GAME_VERSION}">
<script>window.__SAVE_ID__ = ${JSON.stringify(save.id)}; window.__SAVE_NAME__ = ${JSON.stringify(save.name)}; window.__MUSIC_MODE__ = 'game';</script>
</head>
<body>
<div id="campaign-bar"><a href="/" class="bar-link">← Histórias</a><a href="/ranking" class="bar-link">Ranking</a><strong>${escapeHtml(save.name)}</strong><span>${escapeHtml(user.name)}</span><span id="save-status">Salvando no SQLite...</span></div>
${body}
<script src="/assets/audio.js?v=${GAME_VERSION}"></script>
<script src="/assets/persistence.js?v=${GAME_VERSION}"></script>
</body>
</html>`;
}
function serveAsset(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const relative = decodeURIComponent(url.pathname.replace(/^\/assets\//, ''));
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.html' ? 'text/html; charset=utf-8' : ext === '.svg' ? 'image/svg+xml; charset=utf-8' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : ext === '.wav' ? 'audio/wav' : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

async function handleAuth(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/login') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('login')); return true; }
  if (req.method === 'GET' && url.pathname === '/register') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register')); return true; }
  if (req.method === 'POST' && url.pathname === '/register') {
    const form = await readForm(req); const name = String(form.get('name') || '').trim(); const pin = String(form.get('pin') || ''); const confirm = String(form.get('confirm_pin') || '');
    if (!name || !/^\d{4}$/.test(pin) || pin !== confirm) { res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register', 'Confira o nome e a senha de 4 dígitos.')); return true; }
    if (getUserByName.get(name)) { res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('register', 'Esse nome já está cadastrado.')); return true; }
    const id = crypto.randomUUID(); const salt = crypto.randomBytes(16).toString('hex'); const now = new Date().toISOString(); insertUser.run(id, name, hashPin(pin, salt), salt, now); const sessionId = crypto.randomUUID(); insertSession.run(sessionId, id, now); setSessionCookie(res, sessionId); redirect(res, '/'); return true;
  }
  if (req.method === 'POST' && url.pathname === '/login') {
    const form = await readForm(req); const name = String(form.get('name') || '').trim(); const pin = String(form.get('pin') || ''); const user = getUserByName.get(name);
    if (!user || !/^\d{4}$/.test(pin) || hashPin(pin, user.salt) !== user.pin_hash) { res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderAuth('login', 'Nome ou senha inválidos.')); return true; }
    const sessionId = crypto.randomUUID(); insertSession.run(sessionId, user.id, new Date().toISOString()); setSessionCookie(res, sessionId); redirect(res, '/'); return true;
  }
  if (req.method === 'POST' && url.pathname === '/logout') { const sessionId = parseCookies(req)[COOKIE_NAME]; if (sessionId) deleteSession.run(sessionId); clearSessionCookie(res); redirect(res, '/login'); return true; }
  return false;
}

async function handleApi(req, res, url, user) {
  if (!user) { json(res, 401, { error: 'Login necessário' }); return; }
  if (req.method === 'GET' && url.pathname === '/api/ranking') { json(res, 200, rankingPayload()); return; }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const mainSave = getSaveSlot.get(user.id, 1);
    const summary = playerStatsFromSave(mainSave);
    json(res, 200, {
      user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
      points: summary.points,
      rank: summary.rank.current.title,
      nextRank: summary.rank.next?.title || null,
      progress: Math.round(summary.rank.progress),
      medals: summary.medals,
      stickers: { owned: summary.stickersOwned, total: summary.stickersTotal }
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/games') {
    json(res, 200, {
      games: [
        {
          id: 'pela-graca-1904',
          title: 'Pela Graca 1904',
          status: 'playable',
          playUrl: '/play',
          rankingUrl: '/?section=ranking&game=pela-graca-1904'
        }
      ]
    });
    return;
  }
  const match = url.pathname.match(/^\/api\/saves\/([^/]+)$/);
  if (!match) { json(res, 404, { error: 'API não encontrada' }); return; }
  const id = match[1]; const save = getSave.get(id, user.id);
  if (!save) { json(res, 404, { error: 'Save não encontrado' }); return; }
  if (req.method === 'GET') { json(res, 200, { id: save.id, name: save.name, slot: save.slot, state: safeJsonParse(save.state_json) }); return; }
  if (req.method === 'PUT' || req.method === 'POST') {
    const payload = safeJsonParse(await readBody(req) || '{}', {}); const state = payload?.state || null; const now = new Date().toISOString();
    updateSaveState.run(JSON.stringify(state), now, id, user.id);
    updateRankingForSave({ ...save, state_json: JSON.stringify(state), updated_at: now }, user.name, state);
    json(res, 200, { ok: true }); return;
  }
  json(res, 405, { error: 'Método não permitido' });
}

function renderAuth(mode, error = '') {
  const isRegister = mode === 'register';
  return pageShell(isRegister ? 'Registrar' : 'Entrar', `
<main class="ol-auth-screen">
  <section class="ol-auth-brand">
    <div class="ol-brand-lockup">
      <img src="/assets/ortodoxia-luterana-selo-v2.png?v=${GAME_VERSION}" alt="Ortodoxia Luterana" class="ol-seal">
      <div class="ol-title"><span>Ortodoxia</span><span>Luterana</span><strong>Gaming</strong></div>
    </div>
    <blockquote>"Portanto, quer comais, quer bebais, ou facais outra coisa qualquer, fazei tudo para a gloria de Deus."<cite>1 Corintios 10:31</cite></blockquote>
  </section>
  <section class="ol-auth-card">
    <nav class="ol-auth-tabs"><a class="${isRegister ? '' : 'active'}" href="/login">Entrar</a><a class="${isRegister ? 'active' : ''}" href="/register">Registrar</a></nav>
    <h1>${isRegister ? 'Registrar' : 'Entrar'}</h1>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="${isRegister ? '/register' : '/login'}" class="auth-form">
      <label>Nome de usuário
        <input name="name" maxlength="40" autocomplete="username" placeholder="Digite seu nome de usuário" required>
      </label>
      <label>Senha
        <input name="pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="${isRegister ? 'new-password' : 'current-password'}" placeholder="Senha de 4 digitos" required>
      </label>
      ${isRegister ? `<label>Confirmar senha
        <input name="confirm_pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="new-password" placeholder="Repita a senha" required>
      </label>` : ''}
      <div class="auth-options"><label><input type="checkbox"> Lembrar de mim</label><span>Esqueci minha senha</span></div>
      <button type="submit">${isRegister ? 'Registrar' : 'Entrar'}</button>
    </form>
    <div class="ol-auth-footer"><span>+</span><p>${isRegister ? 'Ja tem uma conta?' : 'Ainda nao tem uma conta?'}</p><a class="auth-link" href="${isRegister ? '/login' : '/register'}">${isRegister ? 'Entrar' : 'Registrar'}</a></div>
  </section>
</main>`, 'login');
}

function renderDashboard(user, error = '', section = 'inicio', selectedGame = '') {
  const activeSection = ['inicio', 'jogos', 'ranking', 'medalhas', 'missoes', 'album', 'loja', 'configuracoes'].includes(section) ? section : 'inicio';
  const saves = new Map(getSavesByUser.all(user.id).map(save => [save.slot, save]));
  const mainSave = saves.get(1);
  const player = playerStatsFromSave(mainSave);
  const stats = player.stats;
  const points = player.points;
  const rank = player.rank;
  const medals = player.medals;
  const unlockedMedals = medals.filter(medal => medal.unlocked).length;
  const stickers = ['Rosa de Lutero','Confissao de Augsburgo','Seminario Concordia','Hora Luterana','Sola Scriptura','Soli Deo Gloria'];
  const ranking = rankingPayload();
  const rankingRows = (items, score, suffix = '') => items.length ? items.slice(0, 8).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${escapeHtml(score(item))}${suffix}</strong></div>`).join('') : '<p>Nenhum registro ainda.</p>';
  const generalRankingRows = getAllUsers.all().map((rankUser, index) => {
    const userRank = titleProgress(0).current;
    return `<div class="hub-rank-row hub-rank-player"><b>${index + 1}</b><span>${escapeHtml(rankUser.name)}<img class="mini-rank-badge" src="${userRank.file}?v=${GAME_VERSION}" alt="${escapeHtml(userRank.title)}"></span><strong>0 medalhas</strong></div>`;
  }).join('');
  const prestigeItems = [];
  const liveRows = prestigeItems.length ? prestigeItems.map(item => `<article>${renderAvatar(item, 'feed-avatar')}<span>${escapeHtml(item.player)} conquistou a medalha ${escapeHtml(item.medal)}</span><small>agora</small></article>`).join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestígio conquistado ainda. Quando as medalhas reais forem criadas, os ganhos aparecerão aqui.</span></article>';
  const missionsPanel = `<section class="ol-panel ol-missions"><div class="panel-head"><h3>Missões diárias</h3><a href="/?section=missoes">Ver todas</a></div><article><b>1</b><span>Entrar no hub hoje</span></article><article><b>2</b><span>Jogar Pela Graça 1904</span></article><article><b>3</b><span>Responder uma pergunta doutrinária</span></article><p>As recompensas serão ativadas quando o sistema de XP estiver pronto.</p></section>`;
  const eventPanel = `<section class="ol-panel ol-event"><p>Evento em destaque</p><h3>Desafio da Reforma</h3><span>Espaço reservado para temporadas especiais da comunidade.</span><button disabled>Em breve</button></section>`;
  const ielbRanking = selectedGame === 'pela-graca-1904' ? `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Pela Graça 1904</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Mais anos jogados</h4>${rankingRows(ranking.byYear, item => item.year)}<h4>Mais igrejas até 2026</h4>${rankingRows(ranking.byChurches, item => item.totalChurches, ' igrejas')}</section>` : '';
  const nav = [
    ['inicio', 'Início', '/', 'inicio'],
    ['jogos', 'Jogos', '/?section=jogos', 'jogos'],
    ['ranking', 'Ranking', '/?section=ranking', 'ranking'],
    ['medalhas', 'Medalhas', '/?section=medalhas', 'medalhas'],
    ['missoes', 'Missões', '/?section=missoes', 'missoes'],
    ['album', 'Álbum', '/?section=album', 'album'],
    ['loja', 'Loja', '/?section=loja', 'loja'],
    ['configuracoes', 'Configurações', '/?section=configuracoes', 'configuracoes']
  ].map(([key, label, href, icon]) => `<a class="${activeSection === key ? 'active' : ''}" href="${href}"><img class="nav-icon" src="/assets/nav-icons/nav-${icon}.png?v=${GAME_VERSION}" alt="">${label}</a>`).join('');
  const gameCard = `<section class="ol-panel ol-games">
    <article class="ol-game-card pela-cover"><div><span>Jogável</span><h4>Pela Graça 1904</h4><p>Gerencie igrejas, forme pastores, responda perguntas doutrinárias e acompanhe a história da IELB no Brasil.</p></div><a href="/play">Jogar</a></article>
  </section>`;
  const rankCard = `<aside class="ol-panel ol-rank"><p>Seu rank geral</p><img class="rank-badge" src="${rank.current.file}?v=${GAME_VERSION}" alt="${escapeHtml(rank.current.title)}"><div class="rank-xp"><span>Sistema de XP em preparação</span></div><a href="/?section=ranking">Ver ranking geral</a></aside>`;
  const sections = {
    inicio: `<section class="ol-intro">Escolha um jogo, acompanhe seu rank geral e veja os prestígios conquistados.</section>${gameCard}${rankCard}<section class="ol-panel ol-live"><div class="panel-head"><h3>Prestígios</h3></div><div id="hub-live-feed">${liveRows}</div></section>${eventPanel}${missionsPanel}`,
    jogos: `${gameCard}<section class="ol-panel"><div class="panel-head"><h3>Futuros jogos</h3></div><div class="future-games"><article>Espaço reservado para o próximo jogo da comunidade.</article><article>Espaço reservado para outro modo ou desafio.</article></div></section>`,
    ranking: `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Ranking geral</h3></div>${generalRankingRows || '<p>Nenhum jogador cadastrado ainda.</p>'}</section><section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Rankings por jogo</h3></div><div class="game-rank-list"><a href="/?section=ranking&game=pela-graca-1904"><span>Pela Graça 1904</span><strong>Ver ranking</strong></a></div></section>${ielbRanking}`,
    medalhas: `<section class="ol-panel" id="medalhas"><div class="panel-head"><h3>Medalhas</h3></div><div class="medal-grid">${medals.map(medal => `<article class="${medal.unlocked ? '' : 'locked'}"><b>+</b><span>${medal.title}</span></article>`).join('')}</div></section>`,
    missoes: missionsPanel,
    album: `<section class="ol-panel" id="album"><div class="panel-head"><h3>Álbum</h3><span>3/12 figurinhas</span></div><div class="album-grid">${stickers.map((name, i) => `<article class="${i < 3 ? '' : 'locked'}"><b>${i < 3 ? name.slice(0,2).toUpperCase() : '?'}</b><span>${i < 3 ? name : 'Figurinha bloqueada'}</span></article>`).join('')}</div></section>`,
    loja: `<section class="ol-panel" id="loja"><div class="panel-head"><h3>Loja</h3></div><div class="shop-grid"><article><h4>Pacote Comum</h4><p>100 pontos</p><small>Maior chance de figurinhas comuns.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Raro</h4><p>250 pontos</p><small>Chance melhor de raras e especiais.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Lendario</h4><p>600 pontos</p><small>Chance alta de figurinhas raras e lendarias.</small><button disabled>Comprar em breve</button></article></div><div class="daily-wheel"><h4>Roleta diaria</h4><p>A cada 24h, o jogador podera tentar ganhar um pacote comum, raro ou lendario de graca.</p><button disabled>Disponivel em breve</button></div></section>`,
    configuracoes: `<section class="ol-panel ol-settings" id="configuracoes"><div class="panel-head"><h3>Configurações</h3></div><form method="POST" action="/profile" class="profile-edit"><div class="profile-box">${renderAvatar(user, 'profile-avatar')}<div><label>Nome público<input name="name" maxlength="40" value="${escapeHtml(user.name)}" required></label><label>Foto do perfil<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label><input id="avatar-data" type="hidden" name="avatar_data" value="${escapeHtml(user.avatar_data || '')}"><button type="submit">Salvar perfil</button></div></div></form><hr><p>Gerencie dados salvos por jogo.</p>${mainSave ? `<form method="POST" action="/saves/${encodeURIComponent(mainSave.id)}/delete" onsubmit="return confirm('Apagar o histórico de Pela Graça 1904?')"><button>Apagar histórico de Pela Graça 1904</button></form>` : '<a href="/play">Criar histórico de Pela Graça 1904</a>'}</section>`
  };
  return pageShell('Ortodoxia Luterana Gaming', `
<main class="ol-hub">
  <aside class="ol-sidebar">
    <img src="/assets/ortodoxia-luterana-selo-v2.png?v=${GAME_VERSION}" alt="Ortodoxia Luterana">
    <h1>Ortodoxia Luterana <span>Gaming</span></h1>
    <nav>${nav}</nav>
  </aside>
  <section class="ol-hub-main">
    <header class="ol-topbar">
      <div><p>Painel de acesso</p><h2>Bem-vindo, ${escapeHtml(user.name)}</h2></div>
      <div class="ol-stats"><article><span>Pontos</span><b>${points}</b></article><article><span>Medalhas</span><b>${unlockedMedals}</b></article><article><span>Figurinhas</span><b>3/12</b></article></div>
      <a class="top-profile" href="/?section=configuracoes">${renderAvatar(user, 'top-avatar')}<span>${escapeHtml(user.name)}<small>Ver perfil</small></span></a>
      <form method="POST" action="/logout"><button>Sair</button></form>
    </header>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <div class="ol-hub-grid">
      ${sections[activeSection]}
    </div>
  </section>
</main>
<script>
async function refreshHubFeed() {
  const feed = document.getElementById('hub-live-feed');
  if (!feed) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  try {
    const response = await fetch('/api/ranking', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const rows = [];
    feed.innerHTML = rows.length ? rows.map(item => '<article><b class="feed-avatar">' + esc(item.player).slice(0, 2).toUpperCase() + '</b><span>' + esc(item.player) + ' conquistou a medalha ' + esc(item.medal) + '</span><small>agora</small></article>').join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestígio conquistado ainda. Quando as medalhas reais forem criadas, os ganhos aparecerão aqui.</span></article>';
  } catch {}
}
refreshHubFeed();
setInterval(refreshHubFeed, 30000);
const avatarFile = document.getElementById('avatar-file');
if (avatarFile) {
  avatarFile.addEventListener('change', () => {
    const file = avatarFile.files && avatarFile.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 256;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(size / image.width, size / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        ctx.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
        document.getElementById('avatar-data').value = canvas.toDataURL('image/jpeg', .82);
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
</script>`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/assets/')) { serveAsset(req, res); return; }
    if (await handleAuth(req, res, url)) return;
    const user = currentUser(req);
    if (url.pathname.startsWith('/api/')) { await handleApi(req, res, url, user); return; }
    if (!user) { redirect(res, '/login'); return; }
    if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user, '', url.searchParams.get('section') || 'inicio', url.searchParams.get('game') || '')); return; }
    if (req.method === 'POST' && url.pathname === '/profile') {
      const form = await readForm(req);
      const name = String(form.get('name') || '').trim();
      const avatarData = String(form.get('avatar_data') || '').trim();
      const existing = name ? getUserByName.get(name) : null;
      if (!name || (existing && existing.id !== user.id) || !isSafeAvatarData(avatarData)) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboard(user, 'Confira o nome e a foto do perfil.', 'configuracoes'));
        return;
      }
      updateUserProfile.run(name, avatarData || null, user.id);
      updateRankingUserName.run(name, user.id);
      redirect(res, '/?section=configuracoes');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/play') {
      const requestedSaveId = url.searchParams.get('save');
      const save = requestedSaveId ? getSave.get(requestedSaveId, user.id) : hubSaveForUser(user);
      if (!save) { redirect(res, '/'); return; }
      setLaunchCookie(res, user.id);
      redirect(res, `/game?save=${encodeURIComponent(save.id)}`);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/ranking') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user, '', 'ranking', url.searchParams.get('game') || '')); return; }
    if (req.method === 'GET' && url.pathname === '/saves/new') {
      const slot = Number(url.searchParams.get('slot'));
      if (![1, 2].includes(slot) || getSaveSlot.get(user.id, slot)) { redirect(res, '/'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderNewSave(user, slot)); return;
    }
    if (req.method === 'POST' && url.pathname === '/saves') {
      const form = await readForm(req); const slot = Number(form.get('slot')); const name = String(form.get('name') || '').trim();
      if (![1, 2].includes(slot) || !name) { res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' }); res.end([1, 2].includes(slot) ? renderNewSave(user, slot, 'Digite um nome para a história.') : renderDashboard(user, 'Escolha um slot válido.')); return; }
      if (getSaveSlot.get(user.id, slot)) { res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user, 'Esse slot já tem uma história salva.')); return; }
      const now = new Date().toISOString(); const id = crypto.randomUUID(); insertSave.run(id, user.id, slot, name, now, now); redirect(res, `/game?save=${encodeURIComponent(id)}`); return;
    }
    const deleteMatch = url.pathname.match(/^\/saves\/([^/]+)\/delete$/);
    if (req.method === 'POST' && deleteMatch) { deleteSave.run(deleteMatch[1], user.id); deleteRanking.run(deleteMatch[1]); redirect(res, '/'); return; }
    if (req.method === 'GET' && url.pathname === '/game') {
      const id = url.searchParams.get('save'); const save = id ? getSave.get(id, user.id) : null;
      if (!save) { redirect(res, '/'); return; }
      if (!hasValidLaunch(req, user.id)) { redirect(res, '/'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderGame(save, user)); return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página não encontrada');
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || 'Erro interno' });
  }
});

server.listen(PORT, () => console.log(`Cultivando SSR rodando em http://localhost:${PORT}`));
