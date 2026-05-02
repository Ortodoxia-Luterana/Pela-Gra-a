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
const GAME_VERSION = 'v1.4';
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana', PE: 'Pernambuco',
  PI: 'Piaui', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'Sao Paulo', SE: 'Sergipe', TO: 'Tocantins'
};
const STATE_ORDER = Object.keys(STATE_NAMES);

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pin_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, slot INTEGER NOT NULL CHECK (slot IN (1, 2)), name TEXT NOT NULL, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (user_id, slot), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS rankings (save_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
`);

const getUserByName = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const insertUser = db.prepare('INSERT INTO users (id, name, pin_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)');
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

function pageShell(title, body, musicMode = '') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css">
${musicMode ? `<script>window.__MUSIC_MODE__ = ${JSON.stringify(musicMode)};</script>` : ''}
</head>
<body class="site-page">
${body}
<script src="/assets/audio.js"></script>
</body>
</html>`;
}

function renderAuth(mode, error = '') {
  const isRegister = mode === 'register';
  return pageShell(isRegister ? 'Cadastrar' : 'Login', `
<main class="auth-wrap">
  <section class="auth-card">
    <h1>Pela Graça</h1>
    <p>${isRegister ? 'Crie seu acesso para salvar suas histórias.' : 'Entre para continuar suas histórias salvas.'}</p>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="${isRegister ? '/register' : '/login'}" class="auth-form">
      <label>Nome
        <input name="name" maxlength="40" autocomplete="username" required>
      </label>
      <label>Senha de 4 dígitos
        <input name="pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="${isRegister ? 'new-password' : 'current-password'}" required>
      </label>
      ${isRegister ? `<label>Confirmar senha
        <input name="confirm_pin" inputmode="numeric" pattern="\\d{4}" maxlength="4" autocomplete="new-password" required>
      </label>` : ''}
      <button type="submit">${isRegister ? 'Cadastrar' : 'Entrar'}</button>
    </form>
    <a class="auth-link" href="${isRegister ? '/login' : '/register'}">${isRegister ? 'Já tenho cadastro' : 'Cadastrar novo jogador'}</a>
  </section>
</main>`, 'login');
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
  const doctrineCorrect = Math.max(0, Math.floor(Number(state?.doctrineCorrectCount || state?.doctrineStats?.correct || 0)));
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
  return { player: row.user_name, story: row.save_name, year: row.year, month: row.month, totalChurches: row.total_churches, totalMembers: Math.floor(row.total_members), doctrineCorrect: row.doctrine_correct, reachedFinal: Boolean(row.reached_final), updatedAt: row.updated_at };
}
function rankingPayload() {
  backfillRankings();
  const rows = getRankingRows.all();
  const byYear = [...rows].sort((a, b) => b.year - a.year || b.month - a.month || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byChurches = [...rows].sort((a, b) => b.total_churches - a.total_churches || b.reached_final - a.reached_final || b.year - a.year).slice(0, 10).map(publicRankingRow);
  const byDoctrine = [...rows].sort((a, b) => b.doctrine_correct - a.doctrine_correct || b.year - a.year || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byState = STATE_ORDER.map(code => {
    const best = rows.map(row => ({ row, count: Number(safeJsonParse(row.state_churches_json, {})[code] || 0) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.row.year - a.row.year || b.row.total_churches - a.row.total_churches)[0];
    return best ? { state: code, stateName: STATE_NAMES[code], churches: best.count, ...publicRankingRow(best.row) } : { state: code, stateName: STATE_NAMES[code], churches: 0, player: '-', story: '-', year: 1904, totalChurches: 0, doctrineCorrect: 0 };
  });
  return { generatedAt: new Date().toISOString(), byYear, byChurches, byState, byDoctrine };
}

function renderDashboard(user, error = '') {
  const saves = new Map(getSavesByUser.all(user.id).map(save => [save.slot, save]));
  const slots = [1, 2].map(slot => {
    const save = saves.get(slot);
    if (save) return `<section class="slot-card">
  <div><h2>Slot ${slot}</h2><strong>${escapeHtml(save.name)}</strong><span>${save.state_json ? 'Jogo salvo' : 'História nova'} · atualizado em ${new Date(save.updated_at).toLocaleString('pt-BR')}</span></div>
  <div class="slot-actions"><a class="primary" href="/game?save=${encodeURIComponent(save.id)}">Jogar</a><form method="POST" action="/saves/${encodeURIComponent(save.id)}/delete" onsubmit="return confirm('Apagar este save?')"><button class="icon-danger" title="Apagar save" aria-label="Apagar save">×</button></form></div>
</section>`;
    return `<section class="slot-card empty"><div><h2>Slot ${slot}</h2><span>Vazio</span></div><a class="create-link" href="/saves/new?slot=${slot}">Criar nova história</a></section>`;
  }).join('');
  return pageShell('Minhas histórias', `
<main class="dashboard">
  <header class="dash-head"><div><h1>Minhas histórias</h1><p>Jogador: ${escapeHtml(user.name)}</p></div><nav class="dash-actions"><a class="primary" href="/ranking">Ranking</a><form method="POST" action="/logout"><button>Sair</button></form></nav></header>
  ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
  <div class="slot-grid">${slots}</div>
</main>`);
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
<link rel="stylesheet" href="/assets/game.css">
<link rel="stylesheet" href="/assets/site.css">
<script>window.__SAVE_ID__ = ${JSON.stringify(save.id)}; window.__SAVE_NAME__ = ${JSON.stringify(save.name)}; window.__MUSIC_MODE__ = 'game';</script>
</head>
<body>
<div id="campaign-bar"><a href="/" class="bar-link">← Histórias</a><a href="/ranking" class="bar-link">Ranking</a><strong>${escapeHtml(save.name)}</strong><span>${escapeHtml(user.name)}</span><span id="save-status">Salvando no SQLite...</span></div>
${body}
<script src="/assets/audio.js"></script>
<script src="/assets/persistence.js"></script>
<script src="/assets/game.js"></script>
</body>
</html>`;
}
function renderRankingPage(user) {
  return pageShell('Ranking', `
<main class="ranking-page">
<style>.ranking-page{max-width:1180px;margin:0 auto;padding:28px 16px 44px;color:#2b2114}.ranking-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.ranking-head h1{margin:0 0 6px;font-size:28px}.ranking-head p{margin:0;color:#6d604c}.ranking-back{display:inline-flex;align-items:center;border:1px solid #b79250;color:#5c3700;text-decoration:none;padding:8px 12px;background:#fff8ea;font-weight:700}.ranking-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.ranking-card{border:1px solid #d7c29b;background:#fffdf8;border-radius:6px;overflow:hidden}.ranking-card h2{font-size:14px;letter-spacing:.08em;text-transform:uppercase;margin:0;padding:12px 14px;border-bottom:1px solid #ead8b4;color:#805200}.ranking-list{display:grid}.ranking-row{display:grid;grid-template-columns:32px 1fr auto;gap:10px;align-items:center;padding:10px 14px;border-bottom:1px solid #f0e5cf}.ranking-row:last-child{border-bottom:0}.ranking-pos{font-weight:800;color:#9d6a16}.ranking-name{font-weight:800}.ranking-meta{font-size:12px;color:#7a6a55}.ranking-score{font-weight:900;color:#1b5e20;text-align:right}.state-board{margin-top:14px}.state-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0}.state-item{display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;padding:9px 12px;border-bottom:1px solid #f0e5cf}.state-code{font-weight:900;color:#805200}.ranking-updated{font-size:12px;color:#7a6a55;margin-top:12px}@media(max-width:900px){.ranking-grid{grid-template-columns:1fr}.state-grid{grid-template-columns:1fr}.ranking-head{display:block}.ranking-back{margin-top:12px}}</style>
<header class="ranking-head"><div><h1>Ranking dos cadastrados</h1><p>Atualiza sozinho enquanto os jogadores salvam suas campanhas.</p><p>Jogador: ${escapeHtml(user.name)}</p></div><a class="ranking-back" href="/">Voltar</a></header>
<section class="ranking-grid"><div class="ranking-card"><h2>Mais anos jogados</h2><div id="rank-years" class="ranking-list"></div></div><div class="ranking-card"><h2>Mais igrejas ate 2026</h2><div id="rank-churches" class="ranking-list"></div></div><div class="ranking-card"><h2>Mais acertos doutrinarios</h2><div id="rank-doctrine" class="ranking-list"></div></div></section>
<section class="ranking-card state-board"><h2>Recorde de igrejas por estado</h2><div id="rank-states" class="state-grid"></div></section><div id="ranking-updated" class="ranking-updated"></div>
<script>
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function row(item, index, score, suffix = '') { return '<div class="ranking-row"><div class="ranking-pos">'+(index+1)+'</div><div><div class="ranking-name">'+esc(item.player)+'</div><div class="ranking-meta">'+esc(item.story)+' · ano '+esc(item.year)+(item.reachedFinal?' · finalista':'')+'</div></div><div class="ranking-score">'+esc(score)+suffix+'</div></div>'; }
function emptyRow(text) { return '<div class="ranking-row"><div></div><div class="ranking-meta">'+esc(text)+'</div><div></div></div>'; }
async function loadRanking() { const response = await fetch('/api/ranking', { cache: 'no-store' }); if (!response.ok) return; const data = await response.json(); document.getElementById('rank-years').innerHTML = data.byYear.length ? data.byYear.map((item, index) => row(item, index, item.year)).join('') : emptyRow('Sem campanhas salvas ainda.'); document.getElementById('rank-churches').innerHTML = data.byChurches.length ? data.byChurches.map((item, index) => row(item, index, item.totalChurches, ' igrejas')).join('') : emptyRow('Sem igrejas registradas ainda.'); document.getElementById('rank-doctrine').innerHTML = data.byDoctrine.length ? data.byDoctrine.map((item, index) => row(item, index, item.doctrineCorrect, ' acertos')).join('') : emptyRow('Os acertos passam a contar na versao ${GAME_VERSION}.'); document.getElementById('rank-states').innerHTML = data.byState.map(item => '<div class="state-item"><div class="state-code">'+esc(item.state)+'</div><div><div class="ranking-name">'+esc(item.stateName)+'</div><div class="ranking-meta">'+esc(item.player)+' · '+esc(item.story)+'</div></div><div class="ranking-score">'+esc(item.churches)+'</div></div>').join(''); document.getElementById('ranking-updated').textContent = 'Atualizado em ' + new Date(data.generatedAt).toLocaleString('pt-BR'); }
loadRanking(); setInterval(loadRanking, 5000);
</script>
</main>`);
}

function serveAsset(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const relative = decodeURIComponent(url.pathname.replace(/^\/assets\//, ''));
  const filePath = path.resolve(PUBLIC_DIR, relative);
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) { res.writeHead(404); res.end('Not found'); return; }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.html' ? 'text/html; charset=utf-8' : ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : ext === '.wav' ? 'audio/wav' : 'application/octet-stream';
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

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname.startsWith('/assets/')) { serveAsset(req, res); return; }
    if (await handleAuth(req, res, url)) return;
    const user = currentUser(req);
    if (url.pathname.startsWith('/api/')) { await handleApi(req, res, url, user); return; }
    if (!user) { redirect(res, '/login'); return; }
    if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderDashboard(user)); return; }
    if (req.method === 'GET' && url.pathname === '/ranking') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderRankingPage(user)); return; }
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
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(renderGame(save, user)); return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end('Página não encontrada');
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || 'Erro interno' });
  }
});

server.listen(PORT, () => console.log(`Cultivando SSR rodando em http://localhost:${PORT}`));
