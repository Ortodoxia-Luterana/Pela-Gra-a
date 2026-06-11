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
const GAME_VERSION = 'v3.21.0-luther-metch-combo-burst';
const GAME_ID = 'pela-graca-1904';
const CRONICAS_GAME_ID = 'cronicas-do-levante';
const LUTHER_MATCH_GAME_ID = 'luther-metch';
const RAW_PUBLIC_URL = 'https://cdn.jsdelivr.net/gh/Ortodoxia-Luterana/Pela-Gra-a@main/public';
const CRONICAS_SAVE_NAME = 'Crônicas do Levante';
const STATE_NAMES = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapa', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceara', DF: 'Distrito Federal', ES: 'Espirito Santo', GO: 'Goias',
  MA: 'Maranhao', MT: 'Mato Grosso', MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Para', PB: 'Paraiba', PR: 'Parana', PE: 'Pernambuco',
  PI: 'Piaui', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul', RO: 'Rondonia', RR: 'Roraima', SC: 'Santa Catarina',
  SP: 'Sao Paulo', SE: 'Sergipe', TO: 'Tocantins'
};
const STATE_ORDER = Object.keys(STATE_NAMES);
const REGION_STATES = {
  norte: ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  nordeste: ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  sudeste: ['ES', 'MG', 'RJ', 'SP'],
  sul: ['PR', 'RS', 'SC'],
  centroOeste: ['DF', 'GO', 'MT', 'MS']
};
const TITLE_TRACK = [
  { level: 1, title: 'Visitante', xp: 0, pointReward: 0, file: '/assets/title-badges/01-visitante.png' },
  { level: 2, title: 'Peregrino', xp: 300, pointReward: 50, file: '/assets/title-badges/02-peregrino.png' },
  { level: 3, title: 'Companheiro da Fé', xp: 800, pointReward: 100, file: '/assets/title-badges/03-companheiro-da-fe.png' },
  { level: 4, title: 'Servo da Palavra', xp: 1800, pointReward: 175, file: '/assets/title-badges/04-servo-da-palavra.png' },
  { level: 5, title: 'Guardião da Verdade', xp: 3200, pointReward: 250, file: '/assets/title-badges/05-guardiao-da-verdade.png' },
  { level: 6, title: 'Arauto da Graça', xp: 5400, pointReward: 350, file: '/assets/title-badges/06-arauto-da-graca.png' },
  { level: 7, title: 'Defensor da Confissão', xp: 8400, pointReward: 475, file: '/assets/title-badges/07-defensor-da-confissao.png' },
  { level: 8, title: 'Herdeiro da Reforma', xp: 12000, pointReward: 625, file: '/assets/title-badges/08-herdeiro-da-reforma.png' },
  { level: 9, title: 'Cavaleiro da Fé', xp: 16000, pointReward: 800, file: '/assets/title-badges/09-cavaleiro-da-fe.png' },
  { level: 10, title: 'Santificado', xp: 20000, pointReward: 1000, file: '/assets/title-badges/10-santificado.png' }
];
const ACHIEVEMENTS = [
  { id: 'primeiros-passos', title: 'Primeiros Passos', description: 'Comecou sua primeira campanha em Pela Graca 1904.', xp: 75, points: 25, file: '/assets/achievements/primeiros-passos.png', condition: stats => Boolean(stats.started || stats.hasSave) },
  { id: 'primeira-missao', title: 'Primeira Missao', description: 'Criou seu primeiro ponto de missao IELB.', xp: 120, points: 40, file: '/assets/achievements/primeira-missao.png', condition: stats => stats.missionChurches >= 1 },
  { id: 'rumo-alem-do-sul', title: 'Rumo Alem do Sul', description: 'Criou a primeira igreja ou missao IELB fora do Rio Grande do Sul.', xp: 180, points: 55, file: '/assets/achievements/rumo-alem-do-sul.png', condition: stats => (stats.statesWithChurches || []).some(code => code !== 'RS') },
  { id: 'dino-luterano', title: 'Dino Luterano', description: 'Criou uma igreja ou missao IELB no Acre.', xp: 500, points: 160, file: '/assets/achievements/dino-luterano.png', condition: stats => stateChurchCount(stats, 'AC') > 0 },
  { id: 'primeiros-pastores', title: 'Primeiros Pastores', description: 'Formou os primeiros pastores no Seminario Concordia.', xp: 220, points: 70, file: '/assets/achievements/primeiros-pastores.png', condition: stats => stats.formedPastors >= 1 },
  { id: 'catequista-atento', title: 'Catequista Atento', description: 'Acertou 10 perguntas doutrinarias.', xp: 180, points: 60, file: '/assets/achievements/catequista-atento.png', condition: stats => stats.doctrineCorrect >= 10 },
  { id: 'doutor-da-doutrina', title: 'Doutor da Doutrina', description: 'Acertou 20 perguntas doutrinarias.', xp: 320, points: 100, file: '/assets/achievements/doutor-da-doutrina.png', condition: stats => stats.doctrineCorrect >= 20 },
  { id: 'dez-igrejas', title: 'Dez Igrejas', description: 'Alcancou 10 igrejas e missoes IELB na campanha.', xp: 300, points: 90, file: '/assets/achievements/dez-igrejas.png', condition: stats => stats.totalChurches >= 10 },
  { id: 'centesima-igreja', title: 'Centesima Igreja', description: 'Alcancou 100 igrejas IELB na campanha.', xp: 500, points: 150, file: '/assets/achievements/centesima-igreja.png', condition: stats => stats.totalChurches >= 100 },
  { id: 'cem-membros', title: 'Cem Membros', description: 'Chegou a 100 membros IELB.', xp: 220, points: 70, file: '/assets/achievements/cem-membros.png', condition: stats => stats.totalMembers >= 100 },
  { id: 'mil-membros', title: 'Mil Membros', description: 'Chegou a 1000 membros IELB.', xp: 650, points: 210, file: '/assets/achievements/mil-membros.png', condition: stats => stats.totalMembers >= 1000 },
  { id: 'cem-pastores', title: 'Cem Pastores', description: 'Formou 100 pastores ao longo da historia da campanha.', xp: 750, points: 240, file: '/assets/achievements/cem-pastores.png', condition: stats => stats.formedPastors >= 100 },
  { id: 'brasil-ielb', title: 'Brasil de Norte a Sul', description: 'Manteve pelo menos uma igreja ou missao IELB em cada estado.', xp: 900, points: 300, file: '/assets/achievements/brasil-ielb.png', condition: stats => (stats.statesWithChurches || []).length >= STATE_ORDER.length },
  { id: 'centenario-ielb', title: 'Centenario IELB', description: 'Conduziu a IELB por 100 anos de historia no jogo.', xp: 900, points: 300, file: '/assets/achievements/centenario-ielb.png', condition: stats => stats.year >= 2004 },
  { id: 'ate-aqui-nos-ajudou', title: 'Ate Aqui nos Ajudou', description: 'Chegou ao ano final da campanha, 2026.', xp: 1200, points: 400, file: '/assets/achievements/ate-aqui-nos-ajudou.png', condition: stats => isFinalCampaign(stats) },
  { id: 'missionario-do-sertao', title: 'Missionario do Sertao', description: 'Chegou a 2026 com o Nordeste como a regiao com mais igrejas IELB.', xp: 850, points: 275, file: '/assets/achievements/missionario-do-sertao.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'nordeste') },
  { id: 'tribo-luterana', title: 'Tribo Luterana', description: 'Chegou a 2026 com o Norte como a regiao com mais igrejas IELB.', xp: 850, points: 275, file: '/assets/achievements/tribo-luterana.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'norte') },
  { id: 'culto-gauchesco', title: 'Culto Gauchesco', description: 'Chegou a 2026 mantendo igrejas IELB somente no Rio Grande do Sul.', xp: 700, points: 225, file: '/assets/achievements/culto-gauchesco.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'RS') === stats.totalChurches },
  { id: 'xique-xique-e-de-jesus', title: 'Xique-Xique e de Jesus', description: 'Chegou a 2026 com Xique-Xique, na Bahia, como a cidade com mais igrejas IELB.', xp: 1000, points: 350, file: '/assets/achievements/xique-xique-e-de-jesus.png', condition: stats => isFinalCampaign(stats) && dominantCity(stats, 'BA', 'Xique-Xique') },
  { id: 'igreja-urbana', title: 'Igreja Urbana', description: 'Chegou a 2026 com a maior parte das igrejas IELB no estado de Sao Paulo.', xp: 800, points: 250, file: '/assets/achievements/igreja-urbana.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'SP') > stats.totalChurches / 2 }
];
const CRONICAS_ACHIEVEMENTS = [
];
const LUTHER_MATCH_ACHIEVEMENTS = [
  { id: 'luther-match-primeiro-acesso', title: 'Primeiro Match', description: 'Entrou pela primeira vez em Luther Metch.', xp: 75, points: 25, file: `${RAW_PUBLIC_URL}/achievements/luther-match-primeiro-acesso-v2.png`, condition: stats => Boolean(stats.entered) },
  { id: 'luther-match-nivel-10', title: 'Dez Teses', description: 'Completou o nível 10 em Luther Metch.', xp: 180, points: 60, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-10-v2.png`, condition: stats => stats.completedLevels >= 10 },
  { id: 'luther-match-nivel-50', title: 'Cinco Dezenas', description: 'Completou o nível 50 em Luther Metch.', xp: 450, points: 150, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-50-v2.png`, condition: stats => stats.completedLevels >= 50 },
  { id: 'luther-match-nivel-100', title: 'Centúria da Reforma', description: 'Completou o nível 100 em Luther Metch.', xp: 900, points: 300, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-100-v2.png`, condition: stats => stats.completedLevels >= 100 },
  { id: 'luther-match-nivel-200', title: 'Mestre das Tr�s Solas', description: 'Completou o nível 200 em Luther Metch e dominou as Três Solas.', xp: 1600, points: 550, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-200-v2.png`, condition: stats => stats.completedLevels >= 200 }
];

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE, pin_hash TEXT NOT NULL, salt TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS saves (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, slot INTEGER NOT NULL CHECK (slot IN (1, 2)), name TEXT NOT NULL, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE (user_id, slot), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS rankings (save_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (save_id) REFERENCES saves(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS user_achievements (user_id TEXT NOT NULL, game_id TEXT NOT NULL, medal_id TEXT NOT NULL, unlocked_at TEXT NOT NULL, source_save_name TEXT, PRIMARY KEY (user_id, game_id, medal_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS game_rankings (user_id TEXT NOT NULL, game_id TEXT NOT NULL, user_name TEXT NOT NULL, save_name TEXT NOT NULL, year INTEGER NOT NULL, month INTEGER NOT NULL, total_churches INTEGER NOT NULL, total_members REAL NOT NULL, doctrine_correct INTEGER NOT NULL, reached_final INTEGER NOT NULL, state_churches_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, game_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS luther_match_rankings (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, level INTEGER NOT NULL, best_level INTEGER NOT NULL, completed_levels INTEGER NOT NULL, score INTEGER NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cronicas_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
`);
try { db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT'); } catch {}

const getUserByName = db.prepare('SELECT * FROM users WHERE name = ? COLLATE NOCASE');
const getUserById = db.prepare('SELECT * FROM users WHERE id = ?');
const getAllUsers = db.prepare('SELECT id, name, avatar_data, created_at FROM users ORDER BY created_at ASC');
const insertUser = db.prepare('INSERT INTO users (id, name, pin_hash, salt, created_at) VALUES (?, ?, ?, ?, ?)');
const updateUserProfile = db.prepare('UPDATE users SET name = ?, avatar_data = ? WHERE id = ?');
const updateRankingUserName = db.prepare('UPDATE rankings SET user_name = ? WHERE user_id = ?');
const updateLutherMatchUserName = db.prepare('UPDATE luther_match_rankings SET user_name = ? WHERE user_id = ?');
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
const getGameRankingRows = db.prepare('SELECT * FROM game_rankings ORDER BY updated_at DESC');
const getBestRankingForUser = db.prepare('SELECT * FROM game_rankings WHERE user_id = ? AND game_id = ?');
const upsertBestRanking = db.prepare(`
  INSERT INTO game_rankings (user_id, game_id, user_name, save_name, year, month, total_churches, total_members, doctrine_correct, reached_final, state_churches_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id, game_id) DO UPDATE SET user_name = excluded.user_name, save_name = excluded.save_name, year = excluded.year, month = excluded.month, total_churches = excluded.total_churches, total_members = excluded.total_members, doctrine_correct = excluded.doctrine_correct, reached_final = excluded.reached_final, state_churches_json = excluded.state_churches_json, updated_at = excluded.updated_at
`);
const updateBestRankingUserName = db.prepare('UPDATE game_rankings SET user_name = ? WHERE user_id = ?');
const getUserAchievementRows = db.prepare('SELECT * FROM user_achievements WHERE user_id = ? AND game_id = ?');
const getAllAchievementRows = db.prepare('SELECT user_achievements.*, users.name AS user_name FROM user_achievements JOIN users ON users.id = user_achievements.user_id WHERE game_id = ?');
const getLutherMatchRanking = db.prepare('SELECT * FROM luther_match_rankings WHERE user_id = ?');
const getLutherMatchRankings = db.prepare('SELECT * FROM luther_match_rankings ORDER BY best_level DESC, completed_levels DESC, score DESC, updated_at ASC');
const upsertLutherMatchRanking = db.prepare(`
  INSERT INTO luther_match_rankings (user_id, user_name, level, best_level, completed_levels, score, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    user_name = excluded.user_name,
    level = excluded.level,
    best_level = max(luther_match_rankings.best_level, excluded.best_level),
    completed_levels = max(luther_match_rankings.completed_levels, excluded.completed_levels),
    score = max(luther_match_rankings.score, excluded.score),
    updated_at = excluded.updated_at
`);
const insertUserAchievement = db.prepare(`
  INSERT OR IGNORE INTO user_achievements (user_id, game_id, medal_id, unlocked_at, source_save_name)
  VALUES (?, ?, ?, ?, ?)
`);
const getCronicasSave = db.prepare('SELECT * FROM cronicas_saves WHERE user_id = ?');
const upsertCronicasSave = db.prepare(`
  INSERT INTO cronicas_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteCronicasSave = db.prepare('DELETE FROM cronicas_saves WHERE user_id = ?');
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
function renderAchievementIcon(medal, className = 'achievement-icon') {
  return `<img class="${className}" src="${medal.file}?v=${GAME_VERSION}" alt="${escapeHtml(medal.title)}">`;
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

function savedAchievementMap(state) {
  const list = Array.isArray(state?.achievements) ? state.achievements : [];
  return new Map(list.map(item => [item.id, item]));
}
function permanentAchievementMap(userId, gameId = GAME_ID) {
  if (!userId) return new Map();
  return new Map(getUserAchievementRows.all(userId, gameId).map(item => [item.medal_id, item]));
}
function achievementsForState(state, stats, userId = '', gameId = GAME_ID, definitions = ACHIEVEMENTS) {
  const saved = savedAchievementMap(state);
  const permanent = permanentAchievementMap(userId, gameId);
  return definitions.map(def => {
    const stored = saved.get(def.id);
    const accountMedal = permanent.get(def.id);
    const unlocked = Boolean(accountMedal) || Boolean(stored) || Boolean(state && typeof def.condition === 'function' && def.condition(stats, state));
    return { ...def, unlocked, unlockedAt: accountMedal?.unlocked_at || stored?.unlockedAt || null };
  });
}
function achievementXp(medals) {
  return medals.filter(medal => medal.unlocked).reduce((sum, medal) => sum + medal.xp, 0);
}
function achievementPoints(medals) {
  return medals.filter(medal => medal.unlocked).reduce((sum, medal) => sum + medal.points, 0);
}
function rankPointBonus(rank) {
  return TITLE_TRACK.filter(title => title.level > 1 && title.level <= rank.current.level).reduce((sum, title) => sum + title.pointReward, 0);
}

function emptyRankingStats() {
  return { year: 1904, totalChurches: 0, totalMembers: 0, doctrineCorrect: 0, missionChurches: 0, formedPastors: 0, statesWithChurches: [], stateChurches: {}, cityChurches: {}, hasSave: false, started: false };
}

function playerStatsFromSave(save, userId = '') {
  const state = safeJsonParse(save?.state_json, null);
  const stats = state ? extractRankingStats(state) : emptyRankingStats();
  const medals = achievementsForState(state, stats, userId || save?.user_id || '');
  const xp = achievementXp(medals);
  const rank = titleProgress(xp);
  const points = achievementPoints(medals) + rankPointBonus(rank);
  const stickersOwned = 0;
  return { state, stats, xp, points, rank, medals, stickersOwned, stickersTotal: 0 };
}
function allAchievementDefinitions() {
  return [
    ...ACHIEVEMENTS.map(medal => ({ ...medal, gameId: GAME_ID })),
    ...CRONICAS_ACHIEVEMENTS.map(medal => ({ ...medal, gameId: CRONICAS_GAME_ID })),
    ...LUTHER_MATCH_ACHIEVEMENTS.map(medal => ({ ...medal, gameId: LUTHER_MATCH_GAME_ID }))
  ];
}
function accountAchievementSummary(userId) {
  const definitions = allAchievementDefinitions();
  const rows = [
    ...getUserAchievementRows.all(userId, GAME_ID),
    ...getUserAchievementRows.all(userId, CRONICAS_GAME_ID)
  ];
  const medals = rows.map(row => {
    const def = definitions.find(item => item.gameId === row.game_id && item.id === row.medal_id);
    if (!def) return null;
    return { ...def, unlocked: true, unlockedAt: row.unlocked_at };
  }).filter(Boolean);
  const xp = achievementXp(medals);
  const points = achievementPoints(medals);
  return { medals, xp, points };
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
function isFinalCampaign(stats) {
  return Number(stats?.year || 0) >= 2026;
}
function stateChurchCount(stats, stateCode) {
  return Number(stats?.stateChurches?.[stateCode] || 0);
}
function regionChurchCount(stats, regionKey) {
  return (REGION_STATES[regionKey] || []).reduce((sum, code) => sum + stateChurchCount(stats, code), 0);
}
function dominantRegion(stats, regionKey) {
  const target = regionChurchCount(stats, regionKey);
  if (target <= 0) return false;
  return Object.keys(REGION_STATES).every(key => key === regionKey || target > regionChurchCount(stats, key));
}
function cityKey(stateCode, city) {
  return `${stateCode}|${String(city || '').trim().toLowerCase()}`;
}
function cityChurchCount(stats, stateCode, city) {
  return Number(stats?.cityChurches?.[cityKey(stateCode, city)] || 0);
}
function dominantCity(stats, stateCode, city) {
  const target = cityChurchCount(stats, stateCode, city);
  if (target <= 0) return false;
  const counts = Object.entries(stats?.cityChurches || {});
  return counts.every(([key, value]) => key === cityKey(stateCode, city) || target > Number(value || 0));
}
function extractRankingStats(state) {
  const states = state?.states || {};
  const stateChurches = {};
  const cityChurches = {};
  const statesWithChurches = [];
  let totalChurches = 0;
  let totalMembers = 0;
  let missionChurches = 0;
  STATE_ORDER.forEach(code => {
    const slot = states[code]?.denomData?.IELB;
    const count = churchCountForState(states[code]);
    if (count > 0) {
      stateChurches[code] = count;
      statesWithChurches.push(code);
    }
    (slot?.churches || []).forEach(church => {
      if (church?.type === 'missao') missionChurches += 1;
      const city = String(church.city || '').trim();
      if (!city) return;
      const key = cityKey(code, city);
      cityChurches[key] = (cityChurches[key] || 0) + 1;
    });
    totalChurches += count;
    totalMembers += memberCountForState(states[code]);
  });
  const year = Math.max(1904, Math.floor(Number(state?.year) || 1904));
  const month = Math.max(0, Math.min(11, Math.floor(Number(state?.month) || 0)));
  const explicitDoctrineCorrect = Number(state?.doctrineCorrectCount ?? state?.doctrineStats?.correct);
  const usedQuestions = Array.isArray(state?.usedTheologyQuestions) ? state.usedTheologyQuestions.length : 0;
  const doctrineCorrect = Math.max(0, Math.floor(Number.isFinite(explicitDoctrineCorrect) ? explicitDoctrineCorrect : usedQuestions));
  const explicitFormedPastors = Number(state?.totalPastorsFormed);
  const rosterFormedPastors = Array.isArray(state?.pastors) ? state.pastors.filter(pastor => Number(pastor?.graduationYear || 0) > 1904).length : 0;
  const formedPastors = Math.max(0, Math.floor(Math.max(Number.isFinite(explicitFormedPastors) ? explicitFormedPastors : 0, rosterFormedPastors)));
  return { year, month, totalChurches, totalMembers, doctrineCorrect, missionChurches, formedPastors, reachedFinal: year >= 2026 ? 1 : 0, stateChurches, statesWithChurches, cityChurches, started: Boolean(state?.started), hasSave: true };
}
function rankingScoreParts(row) {
  return [
    Number(row.reached_final || row.reachedFinal || 0),
    Number(row.year || 1904),
    Number(row.month || 0),
    Number(row.total_churches ?? row.totalChurches ?? 0),
    Number(row.doctrine_correct ?? row.doctrineCorrect ?? 0),
    Number(row.total_members ?? row.totalMembers ?? 0)
  ];
}
function rankingBeats(current, previous) {
  if (!previous) return true;
  const a = rankingScoreParts(current);
  const b = rankingScoreParts(previous);
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}
function persistUserAchievements(userId, saveName, state, stats, now = new Date().toISOString()) {
  if (!userId || !state) return;
  achievementsForState(state, stats, userId).filter(medal => medal.unlocked).forEach(medal => {
    insertUserAchievement.run(userId, GAME_ID, medal.id, medal.unlockedAt || now, saveName || null);
  });
}
function persistCronicasAchievements(userId, achievements = [], now = new Date().toISOString()) {
  if (!userId || !CRONICAS_ACHIEVEMENTS.length) return;
  const known = new Map(CRONICAS_ACHIEVEMENTS.map(medal => [medal.id, medal]));
  achievements.forEach(item => {
    const id = typeof item === 'string' ? item : item?.id;
    if (!known.has(id)) return;
    insertUserAchievement.run(userId, CRONICAS_GAME_ID, id, item?.unlockedAt || now, CRONICAS_SAVE_NAME);
  });
}
function updateRankingForSave(save, userName, state) {
  if (!state) { deleteRanking.run(save.id); return; }
  const stats = extractRankingStats(state);
  const now = new Date().toISOString();
  persistUserAchievements(save.user_id, save.name, state, stats, now);
  upsertRanking.run(save.id, save.user_id, userName, save.name, stats.year, stats.month, stats.totalChurches, stats.totalMembers, stats.doctrineCorrect, stats.reachedFinal, JSON.stringify(stats.stateChurches), now);
  const candidate = { ...stats, user_id: save.user_id, game_id: GAME_ID };
  const previous = getBestRankingForUser.get(save.user_id, GAME_ID);
  if (rankingBeats(candidate, previous)) {
    upsertBestRanking.run(save.user_id, GAME_ID, userName, save.name, stats.year, stats.month, stats.totalChurches, stats.totalMembers, stats.doctrineCorrect, stats.reachedFinal, JSON.stringify(stats.stateChurches), now);
  }
}
function backfillRankings() {
  getAllSavedStates.all().forEach(save => updateRankingForSave(save, save.user_name, safeJsonParse(save.state_json)));
}
function publicRankingRow(row) {
  return { player: row.user_name, year: row.year, month: row.month, totalChurches: row.total_churches, totalMembers: Math.floor(row.total_members), doctrineCorrect: row.doctrine_correct, reachedFinal: Boolean(row.reached_final), updatedAt: row.updated_at };
}
function lutherMatchStats(rowOrPayload = {}) {
  const hasProgress = Boolean(rowOrPayload && (
    rowOrPayload.entered ||
    rowOrPayload.updated_at ||
    rowOrPayload.best_level ||
    rowOrPayload.bestLevel ||
    rowOrPayload.completed_levels ||
    rowOrPayload.completedLevels ||
    rowOrPayload.score
  ));
  return {
    entered: hasProgress,
    level: Number(rowOrPayload.level || 1),
    bestLevel: Number(rowOrPayload.best_level ?? rowOrPayload.bestLevel ?? rowOrPayload.level ?? 1),
    completedLevels: Number(rowOrPayload.completed_levels ?? rowOrPayload.completedLevels ?? 0),
    score: Number(rowOrPayload.score || 0)
  };
}
function persistLutherMatchAchievements(userId, stats, now = new Date().toISOString()) {
  if (!userId) return [];
  const newlyUnlocked = [];
  achievementsForState({}, stats, userId, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS).filter(medal => medal.unlocked).forEach(medal => {
    const result = insertUserAchievement.run(userId, LUTHER_MATCH_GAME_ID, medal.id, medal.unlockedAt || now, 'Luther Metch');
    if (result.changes > 0) newlyUnlocked.push({ ...medal, unlocked: true, unlockedAt: now });
  });
  return newlyUnlocked;
}
function publicLutherMatchRow(row) {
  return {
    player: row.user_name,
    level: Number(row.level || 1),
    bestLevel: Number(row.best_level || 1),
    completedLevels: Number(row.completed_levels || 0),
    score: Number(row.score || 0),
    updatedAt: row.updated_at
  };
}
function clampInt(value, min, max) {
  const number = Math.floor(Number(value));
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}
function rankingPayload() {
  backfillRankings();
  const rows = getGameRankingRows.all();
  const lutherMatch = getLutherMatchRankings.all().slice(0, 20).map(publicLutherMatchRow);
  const byYear = [...rows].sort((a, b) => b.year - a.year || b.month - a.month || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byChurches = [...rows].sort((a, b) => b.total_churches - a.total_churches || b.reached_final - a.reached_final || b.year - a.year).slice(0, 10).map(publicRankingRow);
  const byDoctrine = [...rows].sort((a, b) => b.doctrine_correct - a.doctrine_correct || b.year - a.year || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byState = STATE_ORDER.map(code => {
    const best = rows.map(row => ({ row, count: Number(safeJsonParse(row.state_churches_json, {})[code] || 0) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.row.year - a.row.year || b.row.total_churches - a.row.total_churches)[0];
    return best ? { state: code, stateName: STATE_NAMES[code], churches: best.count, ...publicRankingRow(best.row) } : { state: code, stateName: STATE_NAMES[code], churches: 0, player: '-', year: 1904, totalChurches: 0, doctrineCorrect: 0 };
  });
  const definitions = allAchievementDefinitions();
  const prestigeRows = [GAME_ID, CRONICAS_GAME_ID, LUTHER_MATCH_GAME_ID].flatMap(gameId => getAllAchievementRows.all(gameId));
  const prestige = prestigeRows.map(item => {
    const medal = definitions.find(def => def.gameId === item.game_id && def.id === item.medal_id);
    if (!medal) return null;
    return {
      player: item.user_name,
      medal: medal.title,
      medalId: medal.id,
      icon: medal.file,
      xp: medal.xp,
      points: medal.points,
      unlockedAt: item.unlocked_at
    };
  }).filter(Boolean).sort((a, b) => String(b.unlockedAt || '').localeCompare(String(a.unlockedAt || ''))).slice(0, 12);
  return { generatedAt: new Date().toISOString(), byYear, byChurches, byState, byDoctrine, lutherMatch, prestige };
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
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    if (/^achievements\/luther-match-[a-z0-9-]+\.png$/i.test(relative)) {
      res.writeHead(302, { Location: `https://raw.githubusercontent.com/Ortodoxia-Luterana/Pela-Gra-a/main/public/${relative}` });
      res.end();
      return;
    }
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const type = ext === '.css' ? 'text/css; charset=utf-8' : ext === '.js' ? 'text/javascript; charset=utf-8' : ext === '.html' ? 'text/html; charset=utf-8' : ext === '.svg' ? 'image/svg+xml; charset=utf-8' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.mp3' ? 'audio/mpeg' : ext === '.ogg' ? 'audio/ogg' : ext === '.wav' ? 'audio/wav' : 'application/octet-stream';
  const headers = { 'Content-Type': type };
  if (['.css', '.js', '.html'].includes(ext)) headers['Cache-Control'] = 'no-store, max-age=0';
  res.writeHead(200, headers);
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
    const summary = playerStatsFromSave(mainSave, user.id);
    json(res, 200, {
      user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
      xp: summary.xp,
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
        },
        {
          id: 'cronicas-do-levante',
          title: 'Cronicas do Levante',
          status: 'prototype',
          playUrl: '/cronicas-do-levante',
          rankingUrl: null
        },
        {
          id: 'luther-metch',
          title: 'Luther Metch',
          status: 'prototype',
          playUrl: '/luther-metch',
          rankingUrl: '/?section=ranking&game=luther-metch'
        },
        {
          id: 'peregrino-confessional',
          title: 'Peregrino Confessional',
          status: 'prototype',
          playUrl: '/peregrino-confessional',
          rankingUrl: null
        },
        {
          id: 'quiz-ortodoxia',
          title: 'Quiz Ortodoxia',
          status: 'prototype',
          playUrl: '/quiz-ortodoxia',
          rankingUrl: null
        }
      ]
    });
    return;
  }
  if (url.pathname === '/api/luther-metch/progress') {
    const row = getLutherMatchRanking.get(user.id);
    if (req.method === 'GET') {
      const stats = lutherMatchStats(row || {});
      json(res, 200, {
        gameId: LUTHER_MATCH_GAME_ID,
        progress: row ? publicLutherMatchRow(row) : { player: user.name, level: 1, bestLevel: 1, completedLevels: 0, score: 0, updatedAt: null },
        medals: achievementsForState({}, stats, user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const level = clampInt(payload.level, 1, 200);
      const bestLevel = clampInt(payload.bestLevel ?? level, 1, 200);
      const completedLevels = clampInt(payload.completedLevels ?? Math.max(0, bestLevel - 1), 0, 200);
      const score = clampInt(payload.score, 0, 999999999);
      const now = new Date().toISOString();
      upsertLutherMatchRanking.run(user.id, user.name, level, bestLevel, completedLevels, score, now);
      const saved = getLutherMatchRanking.get(user.id);
      const newlyUnlocked = persistLutherMatchAchievements(user.id, lutherMatchStats(saved), now);
      json(res, 200, { ok: true, progress: publicLutherMatchRow(saved), newlyUnlocked });
      return;
    }
  }
  if (url.pathname === '/api/cronicas/save') {
    const save = getCronicasSave.get(user.id);
    const savedState = safeJsonParse(save?.state_json, null);
    if (req.method === 'GET') {
      json(res, 200, {
        gameId: CRONICAS_GAME_ID,
        name: CRONICAS_SAVE_NAME,
        state: savedState,
        updatedAt: save?.updated_at || null,
        medals: achievementsForState(savedState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const state = payload?.state || null;
      const now = new Date().toISOString();
      upsertCronicasSave.run(user.id, JSON.stringify(state), save?.created_at || now, now);
      persistCronicasAchievements(user.id, payload?.achievements || state?.achievements || [], now);
      json(res, 200, { ok: true, updatedAt: now });
      return;
    }
    if (req.method === 'DELETE') {
      deleteCronicasSave.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    json(res, 405, { error: 'Método não permitido' });
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
  const activeSection = ['inicio', 'jogos', 'ranking', 'medalhas', 'album', 'loja', 'configuracoes'].includes(section) ? section : 'inicio';
  const saves = new Map(getSavesByUser.all(user.id).map(save => [save.slot, save]));
  const mainSave = saves.get(1);
  const cronicasSave = getCronicasSave.get(user.id);
  const player = playerStatsFromSave(mainSave, user.id);
  const stats = player.stats;
  const cronicasState = safeJsonParse(cronicasSave?.state_json, null);
  const cronicasMedals = achievementsForState(cronicasState, {}, user.id, CRONICAS_GAME_ID, CRONICAS_ACHIEVEMENTS);
  const lutherMatchRow = getLutherMatchRanking.get(user.id);
  const lutherMatchMedals = achievementsForState({}, lutherMatchStats(lutherMatchRow || {}), user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS);
  const medals = [...player.medals, ...cronicasMedals, ...lutherMatchMedals];
  const xp = achievementXp(medals);
  const rank = titleProgress(xp);
  const points = achievementPoints(medals) + rankPointBonus(rank);
  const unlockedMedals = medals.filter(medal => medal.unlocked).length;
  const stickers = [];
  const ranking = rankingPayload();
  const rankingRows = (items, score, suffix = '') => items.length ? items.slice(0, 8).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${escapeHtml(score(item))}${suffix}</strong></div>`).join('') : '<p>Nenhum registro ainda.</p>';
  const generalRankingRows = getAllUsers.all().map(rankUser => {
    const userSave = getSaveSlot.get(rankUser.id, 1);
    const userSummary = playerStatsFromSave(userSave, rankUser.id);
    const lutherMatch = getLutherMatchRanking.get(rankUser.id);
    const lutherMedals = achievementsForState({}, lutherMatchStats(lutherMatch || {}), rankUser.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS).filter(medal => medal.unlocked).length;
    return {
      user: rankUser,
      summary: userSummary,
      medals: userSummary.medals.filter(medal => medal.unlocked).length + lutherMedals,
      lutherMatch: lutherMatch ? publicLutherMatchRow(lutherMatch) : { bestLevel: 1, completedLevels: 0, score: 0 }
    };
  }).sort((a, b) => b.lutherMatch.bestLevel - a.lutherMatch.bestLevel || b.medals - a.medals || b.summary.points - a.summary.points || b.summary.xp - a.summary.xp || a.user.name.localeCompare(b.user.name)).map((item, index) => {
    const userRank = item.summary.rank.current;
    return `<div class="hub-rank-row hub-rank-player"><b>${index + 1}</b><span>${escapeHtml(item.user.name)}<small>Luther Metch: nível ${item.lutherMatch.bestLevel} · ${item.lutherMatch.completedLevels} fases vencidas</small><img class="mini-rank-badge" src="${userRank.file}?v=${GAME_VERSION}" alt="${escapeHtml(userRank.title)}"></span><strong>${item.medals} medalhas · ${item.summary.points} pontos · ${item.summary.xp} XP</strong></div>`;
  }).join('');
  const prestigeItems = ranking.prestige.slice(0, 6);
  const liveRows = prestigeItems.length ? prestigeItems.map(item => `<article><img class="feed-avatar achievement-feed-icon" src="${escapeHtml(item.icon)}?v=${GAME_VERSION}" alt="${escapeHtml(item.medal)}"><span>${escapeHtml(item.player)} conquistou ${escapeHtml(item.medal)}</span><small>+${item.xp} XP · +${item.points} pontos</small></article>`).join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestigio conquistado ainda. As novas medalhas vao aparecer aqui.</span></article>';
  const eventPanel = `<section class="ol-panel ol-event"><p>Evento em destaque</p><h3>Desafio da Reforma</h3><span>Espaço reservado para temporadas especiais da comunidade.</span><button disabled>Em breve</button></section>`;
  const gameRankingList = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Rankings por jogo</h3></div><div class="game-rank-list"><a href="/?section=ranking&game=pela-graca-1904"><span>Pela Graça 1904</span><strong>Ver ranking</strong></a><a href="/?section=ranking&game=luther-metch"><span>Luther Metch</span><strong>Níveis vencidos</strong></a></div></section>`;
  const generalRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Ranking geral</h3></div>${generalRankingRows || '<p>Nenhum jogador cadastrado ainda.</p>'}</section>${gameRankingList}`;
  const ielbRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Pela Graça 1904</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Mais anos jogados</h4>${rankingRows(ranking.byYear, item => item.year)}<h4>Mais igrejas até 2026</h4>${rankingRows(ranking.byChurches, item => item.totalChurches, ' igrejas')}</section>`;
  const lutherRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Luther Metch</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Quem chegou mais longe</h4>${rankingRows(ranking.lutherMatch, item => `Nível ${item.bestLevel} · ${item.completedLevels} fases · ${item.score} pts`)}</section>`;
  const rankingSection = selectedGame === 'pela-graca-1904' ? ielbRanking : selectedGame === 'luther-metch' ? lutherRanking : generalRanking;
  const nav = [
    ['inicio', 'Início', '/', 'inicio'],
    ['jogos', 'Jogos', '/?section=jogos', 'jogos'],
    ['ranking', 'Ranking', '/?section=ranking', 'ranking'],
    ['medalhas', 'Medalhas', '/?section=medalhas', 'medalhas'],
    ['album', 'Álbum', '/?section=album', 'album'],
    ['loja', 'Loja', '/?section=loja', 'loja'],
    ['configuracoes', 'Configurações', '/?section=configuracoes', 'configuracoes']
  ].map(([key, label, href, icon]) => `<a class="${activeSection === key ? 'active' : ''}" href="${href}"><img class="nav-icon" src="/assets/nav-icons/nav-${icon}.png?v=${GAME_VERSION}" alt="">${label}</a>`).join('');
  const gameCard = `<section class="ol-panel ol-games">
    <article class="ol-game-card pela-cover"><div><h4>Pela Graça 1904</h4><p>Gerencie igrejas, forme pastores, responda perguntas doutrinárias e acompanhe a história da IELB no Brasil.</p></div><a href="/play">Jogar</a></article>
    <article class="ol-game-card cronicas-cover"><div><h4>Crônicas do Levante</h4><p>Uma narrativa bíblica interativa nos dias do rei Davi, com escolhas, descobertas, relações e consequências pelo caminho.</p></div><a href="/cronicas-do-levante">${cronicasSave ? 'Continuar' : 'Jogar'}</a></article>
    <article class="ol-game-card match3-cover"><div><h4>Luther Metch</h4><p>Junte 3 ou mais peças iguais para cumprir objetivos e avançar de fase.</p></div><a href="/luther-metch">Jogar</a></article>
    <article class="ol-game-card peregrino-cover"><div><h4>Peregrino Confessional</h4><p>Jornada curta de formação sobre Escritura, confissão, culto e vida comunitária, com escolhas e anotações salvas no navegador.</p></div><a href="/peregrino-confessional">Jogar</a></article>
    <article class="ol-game-card quiz-cover"><div><h4>Quiz Ortodoxia</h4><p>Perguntas de Bíblia, Reforma e luteranismo em modo solo, contra robô ou sala local para 2 a 4 jogadores.</p></div><a href="/quiz-ortodoxia">Jogar</a></article>
  </section>`;
  const rankCard = `<aside class="ol-panel ol-rank"><p>Seu rank geral</p><img class="rank-badge" src="${rank.current.file}?v=${GAME_VERSION}" alt="${escapeHtml(rank.current.title)}"><div class="rank-xp"><strong>${xp} XP</strong><span>${rank.next ? `${Math.max(0, rank.next.xp - rank.currentXp)} XP para ${escapeHtml(rank.next.title)}` : 'Rank maximo alcancado'}</span><div class="rank-bar"><span style="width:${Math.round(rank.progress)}%"></span></div></div><a href="/?section=ranking">Ver ranking geral</a></aside>`;
  const sections = {
    inicio: `<section class="ol-intro">Escolha um jogo, acompanhe seu rank geral e veja os prestígios conquistados.</section>${gameCard}${rankCard}<section class="ol-panel ol-live"><div class="panel-head"><h3>Prestígios</h3></div><div id="hub-live-feed">${liveRows}</div></section>${eventPanel}`,
    jogos: `${gameCard}`,
    ranking: rankingSection,
    medalhas: `<section class="ol-panel" id="medalhas"><div class="panel-head"><h3>Medalhas</h3><span>${unlockedMedals}/${medals.length}</span></div><div class="medal-grid">${medals.map(medal => `<article class="${medal.unlocked ? '' : 'locked'}">${renderAchievementIcon(medal)}<span>${escapeHtml(medal.title)}</span><p>${escapeHtml(medal.description)}</p><small>+${medal.xp} XP · +${medal.points} pontos</small></article>`).join('')}</div></section>`,
    album: `<section class="ol-panel" id="album"><div class="panel-head"><h3>Álbum</h3><span>0/0 figurinhas</span></div><p>Nenhuma figurinha foi criada ainda.</p></section>`,
    loja: `<section class="ol-panel" id="loja"><div class="panel-head"><h3>Loja</h3></div><div class="shop-grid"><article><h4>Pacote Comum</h4><p>100 pontos</p><small>Maior chance de figurinhas comuns.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Raro</h4><p>250 pontos</p><small>Chance melhor de raras e especiais.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Lendario</h4><p>600 pontos</p><small>Chance alta de figurinhas raras e lendarias.</small><button disabled>Comprar em breve</button></article></div><div class="daily-wheel"><h4>Roleta diaria</h4><p>A cada 24h, o jogador podera tentar ganhar um pacote comum, raro ou lendario de graca.</p><button disabled>Disponivel em breve</button></div></section>`,
    configuracoes: `<section class="ol-panel ol-settings" id="configuracoes"><div class="panel-head"><h3>Configurações</h3></div><form method="POST" action="/profile" class="profile-edit"><div class="profile-box">${renderAvatar(user, 'profile-avatar')}<div><label>Nome público<input name="name" maxlength="40" value="${escapeHtml(user.name)}" required></label><label>Foto do perfil<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label><input id="avatar-data" type="hidden" name="avatar_data" value="${escapeHtml(user.avatar_data || '')}"><button type="submit">Salvar perfil</button></div></div></form><hr><div class="saved-games-head"><h4>Campanhas por jogo</h4><p>Medalhas e melhor ranking ficam salvos na conta. Os protótipos novos usam save local automático no navegador.</p></div><div class="saved-game-list"><article class="saved-game-row"><div><span>Pela Graça 1904</span><strong>${mainSave ? escapeHtml(mainSave.name) : 'Nenhuma campanha atual'}</strong><small>${mainSave ? 'Apaga só esta campanha atual.' : 'Crie uma campanha para jogar novamente.'}</small></div>${mainSave ? `<form method="POST" action="/saves/${encodeURIComponent(mainSave.id)}/delete" onsubmit="return confirm('Apagar a campanha atual de Pela Graça 1904? Medalhas e melhor ranking serão mantidos.')"><button>Apagar campanha</button></form>` : '<a href="/play">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Crônicas do Levante</span><strong>${cronicasSave ? 'Campanha em andamento' : 'Nenhuma campanha atual'}</strong><small>${cronicasSave ? 'Apaga só o progresso narrativo. Medalhas futuras serão mantidas.' : 'Comece uma jornada para criar o save automático.'}</small></div>${cronicasSave ? `<form method="POST" action="/cronicas-do-levante/delete" onsubmit="return confirm('Apagar a campanha atual de Crônicas do Levante? Medalhas futuras serão mantidas.')"><button>Apagar campanha</button></form>` : '<a href="/cronicas-do-levante">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Luther Metch</span><strong>Save local automático</strong><small>Fase, objetivos, pontos, boosters e tabuleiro ficam salvos neste navegador.</small></div><a href="/luther-metch">Abrir</a></article><article class="saved-game-row"><div><span>Peregrino Confessional</span><strong>Save local automático</strong><small>Etapas, virtudes e anotações ficam salvas neste navegador.</small></div><a href="/peregrino-confessional">Abrir</a></article><article class="saved-game-row"><div><span>Quiz Ortodoxia</span><strong>Save local automático</strong><small>Modo, melhor pontuação e histórico da sala ficam salvos neste navegador.</small></div><a href="/quiz-ortodoxia">Abrir</a></article></div></section>`
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
      <div class="ol-stats"><article><span>Pontos</span><b>${points}</b></article><article><span>XP</span><b>${xp}</b></article><article><span>Medalhas</span><b>${unlockedMedals}</b></article></div>
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
    const rows = (data.prestige || []).slice(0, 6);
    feed.innerHTML = rows.length ? rows.map(item => '<article><img class="feed-avatar achievement-feed-icon" src="' + esc(item.icon) + '?v=${GAME_VERSION}" alt="' + esc(item.medal) + '"><span>' + esc(item.player) + ' conquistou ' + esc(item.medal) + '</span><small>+' + esc(item.xp) + ' XP · +' + esc(item.points || 0) + ' pontos</small></article>').join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestigio conquistado ainda. As novas medalhas vao aparecer aqui.</span></article>';
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
      updateBestRankingUserName.run(name, user.id);
      updateLutherMatchUserName.run(name, user.id);
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
    if (req.method === 'GET' && url.pathname === '/cronicas-do-levante') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'cronicas-do-levante.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && (url.pathname === '/luther-metch' || url.pathname === '/match3-luterano')) {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'match3-luterano.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/peregrino-confessional') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'peregrino-confessional.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'GET' && url.pathname === '/quiz-ortodoxia') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'quiz-ortodoxia.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/cronicas-do-levante/delete') {
      deleteCronicasSave.run(user.id);
      redirect(res, '/?section=configuracoes');
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
    if (req.method === 'POST' && deleteMatch) { deleteSave.run(deleteMatch[1], user.id); redirect(res, '/'); return; }
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
