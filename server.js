const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { Server: SocketIOServer } = require('socket.io');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const DB_PATH = path.join(ROOT, 'data', 'cultivando.sqlite');
const QUIZ_QUESTIONS_PATH = path.join(ROOT, 'data', 'quiz-questions.json');
const PORT = Number(process.env.PORT || 3000);
const COOKIE_NAME = 'cultivando_session';
const LAUNCH_COOKIE_NAME = 'cultivando_game_launch';
const LAUNCH_SECRET = process.env.LAUNCH_SECRET || crypto.createHash('sha256').update(`pela-graca:${DB_PATH}`).digest('hex');
const LAUNCH_MAX_AGE_SECONDS = 5 * 60;
const GAME_VERSION = 'v3.27.0-quiz-online';
const GAME_ID = 'pela-graca-1904';
const CRONICAS_GAME_ID = 'cronicas-do-levante';
const LUTHER_MATCH_GAME_ID = 'luther-metch';
const QUIZ_GAME_ID = 'quiz-ortodoxia';
const CONCORDIUM_GAME_ID = 'concordium-first-age';
const CONCORDIUM_EXPLORACAO_GAME_ID = 'concordium-exploracao';
const CONCORDIUM_ACCESS_COOKIE = 'concordium_access';
const CONCORDIUM_ACCESS_PIN = process.env.CONCORDIUM_ACCESS_PIN || '5892';
const CONCORDIUM_ROM_PATH = process.env.CONCORDIUM_ROM_PATH || path.join(PUBLIC_DIR, 'concordium.gba');
const LUTHER_MATCH_MAX_LEVEL = 500;
const QUIZ_ROUND_SECONDS = 20;
const QUIZ_QUESTION_COUNT = 8;
const QUIZ_GENERAL_WAIT_SECONDS = 15;
const QUIZ_ONLINE_SECONDS = 45;
const QUIZ_MATCH_ABANDON_SECONDS = 45;
const QUIZ_REVEAL_SECONDS = 2;
const QUIZ_WIN_POINTS = 10;
const QUIZ_WIN_XP = 15;
const PLATFORM_ONLINE_SECONDS = 90;
const CHAT_MESSAGE_LIMIT = 50;
const CHAT_MAX_LENGTH = 180;
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
  { level: 2, title: 'Peregrino', xp: 300, pointReward: 75, file: '/assets/title-badges/02-peregrino.png' },
  { level: 3, title: 'Companheiro da Fé', xp: 800, pointReward: 100, file: '/assets/title-badges/03-companheiro-da-fe.png' },
  { level: 4, title: 'Servo da Palavra', xp: 1800, pointReward: 150, file: '/assets/title-badges/04-servo-da-palavra.png' },
  { level: 5, title: 'Guardião da Verdade', xp: 3200, pointReward: 200, file: '/assets/title-badges/05-guardiao-da-verdade.png' },
  { level: 6, title: 'Arauto da Graça', xp: 5400, pointReward: 250, file: '/assets/title-badges/06-arauto-da-graca.png' },
  { level: 7, title: 'Defensor da Confissão', xp: 8400, pointReward: 350, file: '/assets/title-badges/07-defensor-da-confissao.png' },
  { level: 8, title: 'Herdeiro da Reforma', xp: 12000, pointReward: 450, file: '/assets/title-badges/08-herdeiro-da-reforma.png' },
  { level: 9, title: 'Cavaleiro da Fé', xp: 16000, pointReward: 600, file: '/assets/title-badges/09-cavaleiro-da-fe.png' },
  { level: 10, title: 'Santificado', xp: 20000, pointReward: 800, file: '/assets/title-badges/10-santificado.png' }
];
const ACHIEVEMENTS = [
  { id: 'primeiros-passos', title: 'Primeiros Passos', description: 'Comecou sua primeira campanha em Pela Graca 1904.', xp: 20, points: 5, file: '/assets/achievements/primeiros-passos.png', condition: stats => Boolean(stats.started || stats.hasSave) },
  { id: 'primeira-missao', title: 'Primeira Missao', description: 'Criou seu primeiro ponto de missao IELB.', xp: 30, points: 5, file: '/assets/achievements/primeira-missao.png', condition: stats => stats.missionChurches >= 1 },
  { id: 'rumo-alem-do-sul', title: 'Rumo Alem do Sul', description: 'Criou a primeira igreja ou missao IELB fora do Rio Grande do Sul.', xp: 45, points: 10, file: '/assets/achievements/rumo-alem-do-sul.png', condition: stats => (stats.statesWithChurches || []).some(code => code !== 'RS') },
  { id: 'dino-luterano', title: 'Dino Luterano', description: 'Criou uma igreja ou missao IELB no Acre.', xp: 125, points: 25, file: '/assets/achievements/dino-luterano.png', condition: stats => stateChurchCount(stats, 'AC') > 0 },
  { id: 'primeiros-pastores', title: 'Primeiros Pastores', description: 'Formou os primeiros pastores no Seminario Concordia.', xp: 55, points: 10, file: '/assets/achievements/primeiros-pastores.png', condition: stats => stats.formedPastors >= 1 },
  { id: 'catequista-atento', title: 'Catequista Atento', description: 'Acertou 10 perguntas doutrinarias.', xp: 45, points: 10, file: '/assets/achievements/catequista-atento.png', condition: stats => stats.doctrineCorrect >= 10 },
  { id: 'doutor-da-doutrina', title: 'Doutor da Doutrina', description: 'Acertou 20 perguntas doutrinarias.', xp: 80, points: 15, file: '/assets/achievements/doutor-da-doutrina.png', condition: stats => stats.doctrineCorrect >= 20 },
  { id: 'dez-igrejas', title: 'Dez Igrejas', description: 'Alcancou 10 igrejas e missoes IELB na campanha.', xp: 75, points: 15, file: '/assets/achievements/dez-igrejas.png', condition: stats => stats.totalChurches >= 10 },
  { id: 'centesima-igreja', title: 'Centesima Igreja', description: 'Alcancou 100 igrejas IELB na campanha.', xp: 125, points: 20, file: '/assets/achievements/centesima-igreja.png', condition: stats => stats.totalChurches >= 100 },
  { id: 'cem-membros', title: 'Cem Membros', description: 'Chegou a 100 membros IELB.', xp: 55, points: 10, file: '/assets/achievements/cem-membros.png', condition: stats => stats.totalMembers >= 100 },
  { id: 'mil-membros', title: 'Mil Membros', description: 'Chegou a 1000 membros IELB.', xp: 160, points: 30, file: '/assets/achievements/mil-membros.png', condition: stats => stats.totalMembers >= 1000 },
  { id: 'cem-pastores', title: 'Cem Pastores', description: 'Formou 100 pastores ao longo da historia da campanha.', xp: 190, points: 35, file: '/assets/achievements/cem-pastores.png', condition: stats => stats.formedPastors >= 100 },
  { id: 'brasil-ielb', title: 'Brasil de Norte a Sul', description: 'Manteve pelo menos uma igreja ou missao IELB em cada estado.', xp: 225, points: 45, file: '/assets/achievements/brasil-ielb.png', condition: stats => (stats.statesWithChurches || []).length >= STATE_ORDER.length },
  { id: 'centenario-ielb', title: 'Centenario IELB', description: 'Conduziu a IELB por 100 anos de historia no jogo.', xp: 225, points: 45, file: '/assets/achievements/centenario-ielb.png', condition: stats => stats.year >= 2004 },
  { id: 'ate-aqui-nos-ajudou', title: 'Ate Aqui nos Ajudou', description: 'Chegou ao ano final da campanha, 2026.', xp: 300, points: 60, file: '/assets/achievements/ate-aqui-nos-ajudou.png', condition: stats => isFinalCampaign(stats) },
  { id: 'missionario-do-sertao', title: 'Missionario do Sertao', description: 'Chegou a 2026 com o Nordeste como a regiao com mais igrejas IELB.', xp: 210, points: 40, file: '/assets/achievements/missionario-do-sertao.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'nordeste') },
  { id: 'tribo-luterana', title: 'Tribo Luterana', description: 'Chegou a 2026 com o Norte como a regiao com mais igrejas IELB.', xp: 210, points: 40, file: '/assets/achievements/tribo-luterana.png', condition: stats => isFinalCampaign(stats) && dominantRegion(stats, 'norte') },
  { id: 'culto-gauchesco', title: 'Culto Gauchesco', description: 'Chegou a 2026 mantendo igrejas IELB somente no Rio Grande do Sul.', xp: 175, points: 35, file: '/assets/achievements/culto-gauchesco.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'RS') === stats.totalChurches },
  { id: 'xique-xique-e-de-jesus', title: 'Xique-Xique e de Jesus', description: 'Chegou a 2026 com Xique-Xique, na Bahia, como a cidade com mais igrejas IELB.', xp: 250, points: 50, file: '/assets/achievements/xique-xique-e-de-jesus.png', condition: stats => isFinalCampaign(stats) && dominantCity(stats, 'BA', 'Xique-Xique') },
  { id: 'igreja-urbana', title: 'Igreja Urbana', description: 'Chegou a 2026 com a maior parte das igrejas IELB no estado de Sao Paulo.', xp: 200, points: 40, file: '/assets/achievements/igreja-urbana.png', condition: stats => isFinalCampaign(stats) && stats.totalChurches > 0 && stateChurchCount(stats, 'SP') > stats.totalChurches / 2 }
];
const CRONICAS_ACHIEVEMENTS = [
  { id: 'cronicas-primeira-jornada', title: 'Primeira Jornada', description: 'Entrou pela primeira vez em Crônicas do Levante.', xp: 25, points: 5, file: '/assets/achievements/cronicas-primeira-jornada-v1.png' },
  { id: 'cronicas-final-linha-interrompida', title: 'A Linha Interrompida', description: 'Alcançou o final A Linha Interrompida em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-linha-interrompida-v1.png' },
  { id: 'cronicas-final-reino-ferido', title: 'O Reino Ferido', description: 'Alcançou o final O Reino Ferido em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-reino-ferido-v1.png' },
  { id: 'cronicas-final-aviso-escandalo', title: 'O Aviso que Virou Escândalo', description: 'Alcançou o final O Aviso que Virou Escândalo em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-aviso-escandalo-v1.png' },
  { id: 'cronicas-final-semente-distante', title: 'A Semente Distante', description: 'Alcançou o final A Semente Distante em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-semente-distante-v1.png' },
  { id: 'cronicas-final-caminho-cuxe', title: 'O Caminho de Cuxe', description: 'Alcançou o final O Caminho de Cuxe em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-caminho-cuxe-v1.png' },
  { id: 'cronicas-final-sombra-dos-rios', title: 'À Sombra dos Rios', description: 'Alcançou o final À Sombra dos Rios em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-sombra-dos-rios-v1.png' },
  { id: 'cronicas-final-cedros-futuro', title: 'Cedros para o Futuro', description: 'Alcançou o final Cedros para o Futuro em Crônicas do Levante.', xp: 120, points: 25, file: '/assets/achievements/cronicas-cedros-futuro-v1.png' }
];
const LUTHER_MATCH_ACHIEVEMENTS = [
  { id: 'luther-match-primeiro-acesso', title: 'Primeiro Match', description: 'Entrou pela primeira vez em Luther Metch.', xp: 20, points: 5, file: `${RAW_PUBLIC_URL}/achievements/luther-match-primeiro-acesso-v2.png`, condition: stats => Boolean(stats.entered) },
  { id: 'luther-match-nivel-10', title: 'Dez Teses', description: 'Completou o nivel 10 em Luther Metch.', xp: 45, points: 10, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-10-v2.png`, condition: stats => stats.completedLevels >= 10 },
  { id: 'luther-match-nivel-50', title: 'Cinco Dezenas', description: 'Completou o nivel 50 em Luther Metch.', xp: 110, points: 20, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-50-v2.png`, condition: stats => stats.completedLevels >= 50 },
  { id: 'luther-match-nivel-100', title: 'Centuria da Reforma', description: 'Completou o nivel 100 em Luther Metch.', xp: 225, points: 45, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-100-v2.png`, condition: stats => stats.completedLevels >= 100 },
  { id: 'luther-match-nivel-200', title: 'Mestre das Tres Solas', description: 'Completou o nivel 200 em Luther Metch e dominou as Tres Solas.', xp: 400, points: 80, file: `${RAW_PUBLIC_URL}/achievements/luther-match-nivel-200-v2.png`, condition: stats => stats.completedLevels >= 200 },
  { id: 'luther-match-combo-3', title: 'Combo 3x', description: 'Fez uma cascata de combo 3x em Luther Metch.', xp: 60, points: 10, file: `${RAW_PUBLIC_URL}/achievements/luther-match-combo-3-v1.png`, condition: stats => stats.maxCombo >= 3 },
  { id: 'luther-match-combo-5', title: 'Combo 5x', description: 'Fez uma cascata de combo 5x em Luther Metch.', xp: 150, points: 30, file: `${RAW_PUBLIC_URL}/achievements/luther-match-combo-5-v1.png`, condition: stats => stats.maxCombo >= 5 },
  { id: 'luther-match-dois-luteros', title: 'Dois Luteros', description: 'Juntou duas pecas especiais de Lutero.', xp: 125, points: 25, file: `${RAW_PUBLIC_URL}/achievements/luther-match-dois-luteros-v1.png`, condition: stats => Boolean(stats.lutherPairUsed) },
  { id: 'luther-match-duas-tres-solas', title: 'Forca das Tres Solas', description: 'Juntou duas pecas especiais criadas por combos de 5.', xp: 190, points: 40, file: `${RAW_PUBLIC_URL}/achievements/luther-match-duas-tres-solas-v1.png`, condition: stats => Boolean(stats.solasPairUsed) }
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
  CREATE TABLE IF NOT EXISTS luther_match_rankings (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, level INTEGER NOT NULL, best_level INTEGER NOT NULL, completed_levels INTEGER NOT NULL, score INTEGER NOT NULL, max_combo INTEGER NOT NULL DEFAULT 0, luther_pair_used INTEGER NOT NULL DEFAULT 0, solas_pair_used INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS cronicas_saves (user_id TEXT PRIMARY KEY, state_json TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS concordium_profiles (user_id TEXT PRIMARY KEY, profile_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS concordium_gba_saves (user_id TEXT PRIMARY KEY, save_json TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS platform_presence (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, avatar_data TEXT, location TEXT NOT NULL, game_id TEXT NOT NULL, last_seen TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS hub_chat_messages (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, user_name TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_presence (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, last_seen TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_queue (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, mode TEXT NOT NULL, joined_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_matches (id TEXT PRIMARY KEY, mode TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT NOT NULL, question_ids_json TEXT NOT NULL, round_seconds INTEGER NOT NULL, finalized INTEGER NOT NULL DEFAULT 0, round_index INTEGER NOT NULL DEFAULT 0, round_started_at TEXT, reveal_until TEXT);
  CREATE TABLE IF NOT EXISTS quiz_match_players (match_id TEXT NOT NULL, user_id TEXT NOT NULL, user_name TEXT NOT NULL, score INTEGER NOT NULL DEFAULT 0, joined_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_presence (match_id TEXT NOT NULL, user_id TEXT NOT NULL, last_seen TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_leaves (match_id TEXT NOT NULL, user_id TEXT NOT NULL, left_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_match_eliminations (match_id TEXT NOT NULL, user_id TEXT NOT NULL, question_index INTEGER NOT NULL, eliminated_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_answers (match_id TEXT NOT NULL, user_id TEXT NOT NULL, question_index INTEGER NOT NULL, answer_index INTEGER NOT NULL, correct INTEGER NOT NULL, answered_at TEXT NOT NULL, PRIMARY KEY (match_id, user_id, question_index), FOREIGN KEY (match_id) REFERENCES quiz_matches(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_invites (id TEXT PRIMARY KEY, from_user_id TEXT NOT NULL, from_user_name TEXT NOT NULL, to_user_id TEXT NOT NULL, to_user_name TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, match_id TEXT, FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE);
  CREATE TABLE IF NOT EXISTS quiz_rankings (user_id TEXT PRIMARY KEY, user_name TEXT NOT NULL, best_score INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0, duel_wins INTEGER NOT NULL DEFAULT 0, general_wins INTEGER NOT NULL DEFAULT 0, invite_wins INTEGER NOT NULL DEFAULT 0, matches_played INTEGER NOT NULL DEFAULT 0, reward_points INTEGER NOT NULL DEFAULT 0, reward_xp INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
`);
try { db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN max_combo INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN luther_pair_used INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE luther_match_rankings ADD COLUMN solas_pair_used INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN round_index INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN round_started_at TEXT'); } catch {}
try { db.exec('ALTER TABLE quiz_matches ADD COLUMN reveal_until TEXT'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN duel_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN general_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN invite_wins INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN reward_points INTEGER NOT NULL DEFAULT 0'); } catch {}
try { db.exec('ALTER TABLE quiz_rankings ADD COLUMN reward_xp INTEGER NOT NULL DEFAULT 0'); } catch {}

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
  INSERT INTO luther_match_rankings (user_id, user_name, level, best_level, completed_levels, score, max_combo, luther_pair_used, solas_pair_used, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET
    user_name = excluded.user_name,
    level = excluded.level,
    best_level = max(luther_match_rankings.best_level, excluded.best_level),
    completed_levels = max(luther_match_rankings.completed_levels, excluded.completed_levels),
    score = max(luther_match_rankings.score, excluded.score),
    max_combo = max(luther_match_rankings.max_combo, excluded.max_combo),
    luther_pair_used = max(luther_match_rankings.luther_pair_used, excluded.luther_pair_used),
    solas_pair_used = max(luther_match_rankings.solas_pair_used, excluded.solas_pair_used),
    updated_at = excluded.updated_at
`);
const insertUserAchievement = db.prepare(`
  INSERT OR IGNORE INTO user_achievements (user_id, game_id, medal_id, unlocked_at, source_save_name)
  VALUES (?, ?, ?, ?, ?)
`);
const deleteSessionsForUser = db.prepare('DELETE FROM sessions WHERE user_id = ?');
const deleteSavesForUser = db.prepare('DELETE FROM saves WHERE user_id = ?');
const deleteRankingsForUser = db.prepare('DELETE FROM rankings WHERE user_id = ?');
const deleteGameRankingsForUser = db.prepare('DELETE FROM game_rankings WHERE user_id = ?');
const deleteAchievementsForUser = db.prepare('DELETE FROM user_achievements WHERE user_id = ?');
const deleteLutherRankingForUser = db.prepare('DELETE FROM luther_match_rankings WHERE user_id = ?');
const deleteCronicasForUser = db.prepare('DELETE FROM cronicas_saves WHERE user_id = ?');
const deleteConcordiumForUser = db.prepare('DELETE FROM concordium_profiles WHERE user_id = ?');
const deleteConcordiumGbaSaveForUser = db.prepare('DELETE FROM concordium_gba_saves WHERE user_id = ?');
const deletePlatformPresenceForUser = db.prepare('DELETE FROM platform_presence WHERE user_id = ?');
const deleteHubChatForUser = db.prepare('DELETE FROM hub_chat_messages WHERE user_id = ?');
const deleteUserById = db.prepare('DELETE FROM users WHERE id = ?');
const deleteQuizPresenceForUser = db.prepare('DELETE FROM quiz_presence WHERE user_id = ?');
const deleteQuizQueueForUser = db.prepare('DELETE FROM quiz_queue WHERE user_id = ?');
const deleteQuizRankingForUser = db.prepare('DELETE FROM quiz_rankings WHERE user_id = ?');
const deleteQuizMatchPresenceForUser = db.prepare('DELETE FROM quiz_match_presence WHERE user_id = ?');
const getCronicasSave = db.prepare('SELECT * FROM cronicas_saves WHERE user_id = ?');
const upsertCronicasSave = db.prepare(`
  INSERT INTO cronicas_saves (user_id, state_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
`);
const deleteCronicasSave = db.prepare('DELETE FROM cronicas_saves WHERE user_id = ?');
const getConcordiumProfile = db.prepare('SELECT * FROM concordium_profiles WHERE user_id = ?');
const upsertConcordiumProfile = db.prepare(`
  INSERT INTO concordium_profiles (user_id, profile_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET profile_json = excluded.profile_json, updated_at = excluded.updated_at
`);
const getConcordiumGbaSave = db.prepare('SELECT * FROM concordium_gba_saves WHERE user_id = ?');
const upsertConcordiumGbaSave = db.prepare(`
  INSERT INTO concordium_gba_saves (user_id, save_json, created_at, updated_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET save_json = excluded.save_json, updated_at = excluded.updated_at
`);
const upsertPlatformPresence = db.prepare(`
  INSERT INTO platform_presence (user_id, user_name, avatar_data, location, game_id, last_seen)
  VALUES (?, ?, ?, ?, ?, ?)
  ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, avatar_data = excluded.avatar_data, location = excluded.location, game_id = excluded.game_id, last_seen = excluded.last_seen
`);
const getPlatformOnlineUsers = db.prepare('SELECT user_id, user_name, avatar_data, location, game_id, last_seen FROM platform_presence WHERE last_seen >= ? ORDER BY last_seen DESC, user_name COLLATE NOCASE ASC LIMIT 60');
const deleteOldPlatformPresence = db.prepare('DELETE FROM platform_presence WHERE last_seen < ?');
const insertHubChatMessage = db.prepare('INSERT INTO hub_chat_messages (id, user_id, user_name, message, created_at) VALUES (?, ?, ?, ?, ?)');
const getHubChatMessages = db.prepare('SELECT id, user_id, user_name, message, created_at FROM hub_chat_messages ORDER BY created_at DESC LIMIT ?');
const deleteOldHubChatMessages = db.prepare('DELETE FROM hub_chat_messages WHERE id NOT IN (SELECT id FROM hub_chat_messages ORDER BY created_at DESC LIMIT 200)');
const upsertQuizPresence = db.prepare('INSERT INTO quiz_presence (user_id, user_name, last_seen) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, last_seen = excluded.last_seen');
const getQuizOnlineUsers = db.prepare('SELECT user_id, user_name, last_seen FROM quiz_presence WHERE last_seen >= ? ORDER BY user_name COLLATE NOCASE ASC');
const deleteOldQuizPresence = db.prepare('DELETE FROM quiz_presence WHERE last_seen < ?');
const upsertQuizQueue = db.prepare('INSERT INTO quiz_queue (user_id, user_name, mode, joined_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, mode = excluded.mode, joined_at = excluded.joined_at');
const getQuizQueueUser = db.prepare('SELECT * FROM quiz_queue WHERE user_id = ?');
const getQuizDuelOpponent = db.prepare('SELECT * FROM quiz_queue WHERE mode = ? AND user_id <> ? ORDER BY joined_at ASC LIMIT 1');
const getQuizGeneralQueue = db.prepare('SELECT * FROM quiz_queue WHERE mode = ? ORDER BY joined_at ASC');
const deleteQuizQueueUser = db.prepare('DELETE FROM quiz_queue WHERE user_id = ?');
const deleteOldQuizQueue = db.prepare('DELETE FROM quiz_queue WHERE joined_at < ?');
const insertQuizMatch = db.prepare('INSERT INTO quiz_matches (id, mode, status, created_at, started_at, question_ids_json, round_seconds, finalized, round_index, round_started_at, reveal_until) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, NULL)');
const getQuizMatch = db.prepare('SELECT * FROM quiz_matches WHERE id = ?');
const getActiveQuizMatchForUser = db.prepare("SELECT quiz_matches.* FROM quiz_matches JOIN quiz_match_players ON quiz_match_players.match_id = quiz_matches.id LEFT JOIN quiz_match_leaves ON quiz_match_leaves.match_id = quiz_matches.id AND quiz_match_leaves.user_id = quiz_match_players.user_id WHERE quiz_match_players.user_id = ? AND quiz_matches.status = 'active' AND quiz_match_leaves.user_id IS NULL ORDER BY quiz_matches.created_at DESC LIMIT 1");
const insertQuizMatchPlayer = db.prepare('INSERT OR IGNORE INTO quiz_match_players (match_id, user_id, user_name, score, joined_at) VALUES (?, ?, ?, 0, ?)');
const getQuizMatchPlayers = db.prepare('SELECT * FROM quiz_match_players WHERE match_id = ? ORDER BY joined_at ASC');
const upsertQuizMatchPresence = db.prepare('INSERT INTO quiz_match_presence (match_id, user_id, last_seen) VALUES (?, ?, ?) ON CONFLICT(match_id, user_id) DO UPDATE SET last_seen = excluded.last_seen');
const getQuizMatchPresenceRows = db.prepare('SELECT * FROM quiz_match_presence WHERE match_id = ?');
const getQuizMatchLeavers = db.prepare('SELECT * FROM quiz_match_leaves WHERE match_id = ?');
const getQuizMatchLeave = db.prepare('SELECT * FROM quiz_match_leaves WHERE match_id = ? AND user_id = ?');
const insertQuizMatchLeave = db.prepare('INSERT OR IGNORE INTO quiz_match_leaves (match_id, user_id, left_at) VALUES (?, ?, ?)');
const getQuizMatchEliminations = db.prepare('SELECT * FROM quiz_match_eliminations WHERE match_id = ?');
const getQuizMatchElimination = db.prepare('SELECT * FROM quiz_match_eliminations WHERE match_id = ? AND user_id = ?');
const insertQuizMatchElimination = db.prepare('INSERT OR IGNORE INTO quiz_match_eliminations (match_id, user_id, question_index, eliminated_at) VALUES (?, ?, ?, ?)');
const getQuizAnswers = db.prepare('SELECT * FROM quiz_answers WHERE match_id = ?');
const getQuizAnswer = db.prepare('SELECT * FROM quiz_answers WHERE match_id = ? AND user_id = ? AND question_index = ?');
const insertQuizAnswer = db.prepare('INSERT OR IGNORE INTO quiz_answers (match_id, user_id, question_index, answer_index, correct, answered_at) VALUES (?, ?, ?, ?, ?, ?)');
const updateQuizPlayerScore = db.prepare('UPDATE quiz_match_players SET score = ? WHERE match_id = ? AND user_id = ?');
const updateQuizMatchStatus = db.prepare('UPDATE quiz_matches SET status = ? WHERE id = ?');
const updateQuizMatchRound = db.prepare('UPDATE quiz_matches SET round_index = ?, round_started_at = ?, reveal_until = ? WHERE id = ?');
const updateQuizMatchReveal = db.prepare('UPDATE quiz_matches SET reveal_until = ? WHERE id = ?');
const finalizeQuizMatchRow = db.prepare('UPDATE quiz_matches SET finalized = 1 WHERE id = ?');
const insertQuizInvite = db.prepare('INSERT INTO quiz_invites (id, from_user_id, from_user_name, to_user_id, to_user_name, status, created_at, match_id) VALUES (?, ?, ?, ?, ?, ?, ?, NULL)');
const getQuizInvite = db.prepare('SELECT * FROM quiz_invites WHERE id = ?');
const getQuizIncomingInvites = db.prepare("SELECT * FROM quiz_invites WHERE to_user_id = ? AND status = 'pending' AND created_at >= ? ORDER BY created_at DESC");
const updateQuizInvite = db.prepare('UPDATE quiz_invites SET status = ?, match_id = ? WHERE id = ?');
const deleteOldQuizInvites = db.prepare("DELETE FROM quiz_invites WHERE created_at < ? OR status <> 'pending'");
const getQuizRanking = db.prepare('SELECT * FROM quiz_rankings WHERE user_id = ?');
const getQuizRankings = db.prepare('SELECT * FROM quiz_rankings ORDER BY wins DESC, general_wins DESC, duel_wins DESC, best_score DESC, matches_played ASC, updated_at ASC LIMIT 20');
const upsertQuizRanking = db.prepare('INSERT INTO quiz_rankings (user_id, user_name, best_score, wins, duel_wins, general_wins, invite_wins, matches_played, reward_points, reward_xp, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET user_name = excluded.user_name, best_score = max(quiz_rankings.best_score, excluded.best_score), wins = quiz_rankings.wins + excluded.wins, duel_wins = quiz_rankings.duel_wins + excluded.duel_wins, general_wins = quiz_rankings.general_wins + excluded.general_wins, invite_wins = quiz_rankings.invite_wins + excluded.invite_wins, matches_played = quiz_rankings.matches_played + excluded.matches_played, reward_points = quiz_rankings.reward_points + excluded.reward_points, reward_xp = quiz_rankings.reward_xp + excluded.reward_xp, updated_at = excluded.updated_at');
const upsertRanking = db.prepare(`
  INSERT INTO rankings (save_id, user_id, user_name, save_name, year, month, total_churches, total_members, doctrine_correct, reached_final, state_churches_json, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(save_id) DO UPDATE SET user_name = excluded.user_name, save_name = excluded.save_name, year = excluded.year, month = excluded.month, total_churches = excluded.total_churches, total_members = excluded.total_members, doctrine_correct = excluded.doctrine_correct, reached_final = excluded.reached_final, state_churches_json = excluded.state_churches_json, updated_at = excluded.updated_at
`);

let QUIZ_QUESTIONS = [];
try {
  QUIZ_QUESTIONS = JSON.parse(fs.readFileSync(QUIZ_QUESTIONS_PATH, 'utf8'));
} catch {
  QUIZ_QUESTIONS = [];
}

function isoNow() { return new Date().toISOString(); }
function isoSecondsAgo(seconds) { return new Date(Date.now() - seconds * 1000).toISOString(); }
function msUntil(iso) { return Math.max(0, new Date(iso).getTime() - Date.now()); }
function quizQuestionsReady() { return QUIZ_QUESTIONS.length >= QUIZ_QUESTION_COUNT; }
function quizQuestion(id) { return QUIZ_QUESTIONS[Number(id) % QUIZ_QUESTIONS.length]; }
function publicQuizQuestion(id) {
  const q = quizQuestion(id);
  return { id: Number(id), q: q.q, a: q.a };
}
function quizQuestionIds(count = QUIZ_QUESTION_COUNT) {
  const ids = [...Array(QUIZ_QUESTIONS.length)].map((_, index) => index);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, Math.min(count, ids.length));
}
function cleanQuizTables() {
  deleteOldQuizPresence.run(isoSecondsAgo(QUIZ_ONLINE_SECONDS));
  deleteOldQuizQueue.run(isoSecondsAgo(90));
  deleteOldQuizInvites.run(isoSecondsAgo(180));
}
function cleanPlatformTables() {
  deleteOldPlatformPresence.run(isoSecondsAgo(PLATFORM_ONLINE_SECONDS));
  deleteOldHubChatMessages.run();
}
function normalizeGamePresence(input) {
  const value = String(input || '').trim().toLowerCase();
  if (value === LUTHER_MATCH_GAME_ID) return { gameId: LUTHER_MATCH_GAME_ID, location: 'Luther Metch' };
  if (value === QUIZ_GAME_ID) return { gameId: QUIZ_GAME_ID, location: 'Quiz Ortodoxia' };
  if (value === CRONICAS_GAME_ID) return { gameId: CRONICAS_GAME_ID, location: 'Cronicas do Levante' };
  if (value === CONCORDIUM_EXPLORACAO_GAME_ID) return { gameId: CONCORDIUM_EXPLORACAO_GAME_ID, location: 'Concordium' };
  if (value === GAME_ID) return { gameId: GAME_ID, location: 'Pela Graca 1904' };
  return { gameId: 'hub', location: 'Hub' };
}
function presenceForPath(pathname) {
  if (pathname === '/luther-metch' || pathname === '/match3-luterano' || pathname.startsWith('/api/luther-metch')) return normalizeGamePresence(LUTHER_MATCH_GAME_ID);
  if (pathname === '/quiz-ortodoxia' || pathname.startsWith('/api/quiz')) return normalizeGamePresence(QUIZ_GAME_ID);
  if (pathname === '/cronicas-do-levante' || pathname.startsWith('/api/cronicas')) return normalizeGamePresence(CRONICAS_GAME_ID);
  if (pathname === '/concordium-exploracao' || pathname.startsWith('/api/concordium')) return normalizeGamePresence(CONCORDIUM_EXPLORACAO_GAME_ID);
  if (pathname === '/play' || pathname === '/game' || pathname.startsWith('/api/saves')) return normalizeGamePresence(GAME_ID);
  return normalizeGamePresence('hub');
}
function touchPlatformPresence(user, gameId = 'hub') {
  const info = normalizeGamePresence(gameId);
  upsertPlatformPresence.run(user.id, user.name, user.avatar_data || null, info.location, info.gameId, isoNow());
  cleanPlatformTables();
}
function touchQuizPresence(user) {
  upsertQuizPresence.run(user.id, user.name, isoNow());
  cleanQuizTables();
}
function createQuizMatch(mode, players) {
  const id = crypto.randomUUID();
  const now = isoNow();
  const questionCount = mode === 'general' ? QUIZ_QUESTIONS.length : QUIZ_QUESTION_COUNT;
  insertQuizMatch.run(id, mode, 'active', now, now, JSON.stringify(quizQuestionIds(questionCount)), QUIZ_ROUND_SECONDS, now);
  players.forEach(player => {
    const playerId = player.user_id || player.id;
    insertQuizMatchPlayer.run(id, playerId, player.user_name || player.name, now);
    upsertQuizMatchPresence.run(id, playerId, now);
  });
  return getQuizMatch.get(id);
}
function quizAnswerMap(matchId) {
  const map = new Map();
  getQuizAnswers.all(matchId).forEach(row => map.set(`${row.user_id}:${row.question_index}`, row));
  return map;
}
function quizActivePlayers(matchOrId) {
  const match = typeof matchOrId === 'string' ? getQuizMatch.get(matchOrId) : matchOrId;
  const matchId = match?.id || matchOrId;
  const leavers = new Set(getQuizMatchLeavers.all(matchId).map(row => row.user_id));
  const eliminated = match?.mode === 'general' ? new Set(getQuizMatchEliminations.all(matchId).map(row => row.user_id)) : new Set();
  return getQuizMatchPlayers.all(matchId).filter(player => !leavers.has(player.user_id) && !eliminated.has(player.user_id));
}
function touchQuizMatchHeartbeat(matchId, userId) {
  if (matchId && userId) upsertQuizMatchPresence.run(matchId, userId, isoNow());
}
function markAbandonedQuizPlayers(match) {
  if (!match || match.status !== 'active') return;
  const cutoff = Date.now() - QUIZ_MATCH_ABANDON_SECONDS * 1000;
  const heartbeats = new Map(getQuizMatchPresenceRows.all(match.id).map(row => [row.user_id, row.last_seen]));
  quizActivePlayers(match).forEach(player => {
    const seenAt = heartbeats.get(player.user_id) || player.joined_at || match.started_at;
    if (new Date(seenAt).getTime() < cutoff) {
      insertQuizMatchLeave.run(match.id, player.user_id, isoNow());
    }
  });
}
function quizRoundInfo(match) {
  const questionIds = safeJsonParse(match.question_ids_json, []);
  const index = Math.max(0, Math.min(Number(match.round_index || 0), Math.max(0, questionIds.length - 1)));
  const complete = Number(match.round_index || 0) >= questionIds.length;
  const startedAt = match.round_started_at || match.started_at;
  const roundEndsAt = new Date(new Date(startedAt).getTime() + (match.round_seconds * 1000)).toISOString();
  return { questionIds, index, complete, roundEndsAt, msLeft: complete ? 0 : msUntil(roundEndsAt), revealUntil: match.reveal_until || null };
}
function ensureQuizMatchProgress(match) {
  if (!match || match.status !== 'active') return match;
  let current = match;
  for (let guard = 0; guard < 3; guard += 1) {
    markAbandonedQuizPlayers(current);
    const round = quizRoundInfo(current);
    if (round.complete) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    let players = quizActivePlayers(current);
    const totalPlayers = getQuizMatchPlayers.all(current.id).length;
    if (!players.length) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    if (totalPlayers > 1 && players.length <= 1) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    const answers = quizAnswerMap(current.id);
    const allAnswered = players.length > 0 && players.every(player => answers.has(`${player.user_id}:${round.index}`));
    const timeExpired = round.msLeft <= 0;
    if (current.mode === 'general' && timeExpired) {
      players.filter(player => !answers.has(`${player.user_id}:${round.index}`)).forEach(player => {
        insertQuizMatchElimination.run(current.id, player.user_id, round.index, isoNow());
      });
      players = quizActivePlayers(current);
      if (players.length <= 1) {
        finalizeQuizMatch(current);
        return getQuizMatch.get(current.id);
      }
    }
    if (!allAnswered && !timeExpired) return current;
    if (!current.reveal_until) {
      updateQuizMatchReveal.run(new Date(Date.now() + QUIZ_REVEAL_SECONDS * 1000).toISOString(), current.id);
      return getQuizMatch.get(current.id);
    }
    if (msUntil(current.reveal_until) > 0) return current;
    const nextIndex = round.index + 1;
    if (nextIndex >= round.questionIds.length) {
      finalizeQuizMatch(current);
      return getQuizMatch.get(current.id);
    }
    updateQuizMatchRound.run(nextIndex, isoNow(), null, current.id);
    current = getQuizMatch.get(current.id);
  }
  return current;
}
function finalizeQuizMatch(match) {
  if (!match || match.finalized) return;
  const players = getQuizMatchPlayers.all(match.id);
  const activePlayers = quizActivePlayers(match);
  const activePlayerIds = new Set(activePlayers.map(player => player.user_id));
  const answers = getQuizAnswers.all(match.id);
  const scoreByUser = new Map(players.map(player => [player.user_id, 0]));
  answers.forEach(answer => scoreByUser.set(answer.user_id, (scoreByUser.get(answer.user_id) || 0) + (answer.correct ? 10 : 0)));
  let best = -1;
  activePlayers.forEach(player => {
    const score = scoreByUser.get(player.user_id) || 0;
    if (score > best) best = score;
  });
  const winners = activePlayers.length === 1 ? activePlayers : activePlayers.filter(player => (scoreByUser.get(player.user_id) || 0) === best);
  const hasSingleMultiplayerWinner = players.length > 1 && winners.length === 1;
  players.forEach(player => {
    const score = scoreByUser.get(player.user_id) || 0;
    const won = activePlayerIds.has(player.user_id) && hasSingleMultiplayerWinner && winners[0].user_id === player.user_id;
    const duelWins = won && match.mode === 'duel' ? 1 : 0;
    const generalWins = won && match.mode === 'general' ? 1 : 0;
    const inviteWins = won && match.mode === 'invite' ? 1 : 0;
    const rewardPoints = won ? QUIZ_WIN_POINTS : 0;
    const rewardXp = won ? QUIZ_WIN_XP : 0;
    updateQuizPlayerScore.run(score, match.id, player.user_id);
    upsertQuizRanking.run(player.user_id, player.user_name, score, won ? 1 : 0, duelWins, generalWins, inviteWins, 1, rewardPoints, rewardXp, isoNow());
  });
  updateQuizMatchStatus.run('complete', match.id);
  finalizeQuizMatchRow.run(match.id);
}
function publicQuizMatch(match, userId, options = {}) {
  if (!match) return null;
  match = ensureQuizMatchProgress(match);
  if (match?.status === 'active' && getQuizMatchLeave.get(match.id, userId)) return null;
  if (options.heartbeat && match?.status === 'active') touchQuizMatchHeartbeat(match.id, userId);
  const round = quizRoundInfo(match);
  if (round.complete && match.status !== 'complete') {
    finalizeQuizMatch(match);
    match = getQuizMatch.get(match.id);
  }
  const players = getQuizMatchPlayers.all(match.id);
  const activePlayers = quizActivePlayers(match);
  const eliminatedPlayers = new Set(getQuizMatchEliminations.all(match.id).map(row => row.user_id));
  const answers = quizAnswerMap(match.id);
  const allAnswered = activePlayers.length > 0 && activePlayers.every(player => answers.has(`${player.user_id}:${round.index}`));
  const reveal = match.status === 'complete' || round.complete || Boolean(match.reveal_until) || round.msLeft <= 250 || allAnswered;
  const qid = round.questionIds[round.index];
  const question = qid === undefined ? null : publicQuizQuestion(qid);
  const userAnswer = answers.get(`${userId}:${round.index}`) || null;
  return {
    id: match.id,
    mode: match.mode,
    status: match.status,
    round: Math.min(round.index + 1, round.questionIds.length),
    totalRounds: round.questionIds.length,
    roundSeconds: match.round_seconds,
    roundEndsAt: round.roundEndsAt,
    revealUntil: match.reveal_until || null,
    msLeft: match.reveal_until ? msUntil(match.reveal_until) : round.msLeft,
    question,
    reveal,
    correctIndex: reveal && qid !== undefined ? quizQuestion(qid).c : null,
    answered: Boolean(userAnswer),
    userAnswer: userAnswer ? userAnswer.answer_index : null,
    eliminated: eliminatedPlayers.has(userId),
    players: players.map(player => {
      const answered = answers.has(`${player.user_id}:${round.index}`);
      const score = getQuizAnswers.all(match.id).filter(row => row.user_id === player.user_id && row.correct).length * 10;
      return { id: player.user_id, name: player.user_name, score, answered, eliminated: eliminatedPlayers.has(player.user_id), left: !activePlayers.some(active => active.user_id === player.user_id) && !eliminatedPlayers.has(player.user_id) };
    })
  };
}

function hashPin(pin, salt) { return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex'); }
const SYSTEM_PLAYER_NAMES = new Set(['leave', 'deploy', 'online.reviews', 'check', 'health', 'review', 'reviews']);
function isDisplayablePlayerName(name) {
  const value = String(name || '').trim().toLowerCase();
  if (!value) return false;
  if (SYSTEM_PLAYER_NAMES.has(value)) return false;
  if (value.includes('online.reviews')) return false;
  if (/^(test|teste|deploy|check|leave)(\b|\d|_|-|$)/.test(value)) return false;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return false;
  return true;
}
function isNonPlayerAccountName(name) {
  const value = String(name || '').trim().toLowerCase();
  if (!isDisplayablePlayerName(value)) return true;
  return /^codex/.test(value) ||
    /^teste/.test(value) ||
    /^direto(\b|\d|_|-)/.test(value) ||
    /^logo(\b|\d|_|-)/.test(value) ||
    value.includes('host') ||
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function cleanupNonPlayerAccounts() {
  const users = getAllUsers.all().filter(user => isNonPlayerAccountName(user.name));
  if (!users.length) return;
  db.exec('BEGIN');
  try {
    users.forEach(user => {
      deleteSessionsForUser.run(user.id);
      deleteRankingsForUser.run(user.id);
      deleteGameRankingsForUser.run(user.id);
      deleteAchievementsForUser.run(user.id);
      deleteLutherRankingForUser.run(user.id);
      deleteCronicasForUser.run(user.id);
      deleteConcordiumForUser.run(user.id);
      deleteConcordiumGbaSaveForUser.run(user.id);
      deletePlatformPresenceForUser.run(user.id);
      deleteHubChatForUser.run(user.id);
      deleteQuizPresenceForUser.run(user.id);
      deleteQuizQueueForUser.run(user.id);
      deleteQuizMatchPresenceForUser.run(user.id);
      deleteQuizRankingForUser.run(user.id);
      deleteSavesForUser.run(user.id);
      deleteUserById.run(user.id);
    });
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log(`[cleanup] removed ${users.length} non-player account(s): ${users.map(user => user.name).join(', ')}`);
}
cleanupNonPlayerAccounts();

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
function signConcordiumAccess(userId) {
  return crypto.createHmac('sha256', LAUNCH_SECRET).update(`concordium:${userId}`).digest('hex');
}
function hasConcordiumAccess(req, userId) {
  const token = parseCookies(req)[CONCORDIUM_ACCESS_COOKIE];
  if (!token) return false;
  const expected = signConcordiumAccess(userId);
  return token.length === expected.length && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}
function setConcordiumAccessCookie(res, userId) {
  const token = signConcordiumAccess(userId);
  res.setHeader('Set-Cookie', `${CONCORDIUM_ACCESS_COOKIE}=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${12 * 60 * 60}`);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 12_000_000) { req.destroy(); reject(new Error('Payload grande demais')); }
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
function defaultConcordiumProfile() {
  return {
    created: false,
    classId: 'rogue',
    coins: 60,
    owned: ['training-dagger', 'simple-bow', 'sellsword-cloak'],
    skin: 'sellsword-cloak',
    loadout: { rogue: 'training-dagger', archer: 'simple-bow' },
    options: { sensitivity: 50, music: 70, effects: 80 }
  };
}
function sanitizeConcordiumProfile(input) {
  const defaults = defaultConcordiumProfile();
  const value = input && typeof input === 'object' ? input : {};
  const allowedClasses = new Set(['rogue', 'archer']);
  const allowedItems = new Set(['training-dagger', 'long-sword', 'simple-bow', 'war-bow', 'sellsword-cloak', 'ash-cloak', 'forest-cloak']);
  const owned = Array.isArray(value.owned)
    ? [...new Set(value.owned.map(String).filter(id => allowedItems.has(id)))]
    : defaults.owned;
  for (const id of defaults.owned) if (!owned.includes(id)) owned.push(id);
  const classId = allowedClasses.has(String(value.classId)) ? String(value.classId) : defaults.classId;
  const loadout = value.loadout && typeof value.loadout === 'object' ? value.loadout : {};
  const rogueWeapon = owned.includes(String(loadout.rogue)) && ['training-dagger', 'long-sword'].includes(String(loadout.rogue)) ? String(loadout.rogue) : defaults.loadout.rogue;
  const archerWeapon = owned.includes(String(loadout.archer)) && ['simple-bow', 'war-bow'].includes(String(loadout.archer)) ? String(loadout.archer) : defaults.loadout.archer;
  const skin = owned.includes(String(value.skin)) && ['sellsword-cloak', 'ash-cloak', 'forest-cloak'].includes(String(value.skin)) ? String(value.skin) : defaults.skin;
  const options = value.options && typeof value.options === 'object' ? value.options : {};
  return {
    created: Boolean(value.created),
    classId,
    coins: clampInt(value.coins, 0, 999999),
    owned,
    skin,
    loadout: { rogue: rogueWeapon, archer: archerWeapon },
    options: {
      sensitivity: clampInt(options.sensitivity ?? defaults.options.sensitivity, 1, 100),
      music: clampInt(options.music ?? defaults.options.music, 0, 100),
      effects: clampInt(options.effects ?? defaults.options.effects, 0, 100)
    }
  };
}
function sanitizeConcordiumGbaSave(input) {
  const source = input && typeof input === 'object' ? input : {};
  const metadata = source.metadata && typeof source.metadata === 'object' ? source.metadata : {};
  const rawMapName = String(metadata.mapName || '').replace(/[<>]/g, '').trim();
  const hasInvalidMapCoordinates = /(?:^|[,\s])(?:x|y)\s*-/.test(rawMapName.toLowerCase());
  const mapName = !rawMapName || rawMapName === 'Mapa atual ainda nao lido da ROM' || hasInvalidMapCoordinates ? 'Concordium GBA em execucao' : rawMapName;
  const cleanList = (items, max) => Array.isArray(items)
    ? items.slice(0, max).map(item => String(item || '').replace(/[<>]/g, '').trim().slice(0, 24)).filter(Boolean)
    : [];
  return {
    metadata: {
      mapName: mapName.slice(0, 64),
      mapId: String(metadata.mapId || '').replace(/[<>]/g, '').trim().slice(0, 32),
      x: clampInt(metadata.x, 0, 9999),
      y: clampInt(metadata.y, 0, 9999),
      team: cleanList(metadata.team, 6),
      badges: cleanList(metadata.badges, 12),
      playTime: String(metadata.playTime || '').replace(/[<>]/g, '').trim().slice(0, 32),
      source: String(metadata.source || 'emulator').replace(/[<>]/g, '').trim().slice(0, 24),
      saveKind: String(metadata.saveKind || source.saveKind || '').replace(/[<>]/g, '').trim().slice(0, 24),
      saveUpdatedAt: String(metadata.saveUpdatedAt || '').replace(/[<>]/g, '').trim().slice(0, 40),
      frame: clampInt(metadata.frame, 0, 999999999)
    },
    save: typeof source.save === 'string' ? source.save.slice(0, 8_000_000) : '',
    saveKind: ['state', 'savefile', 'metadata'].includes(String(source.saveKind)) ? String(source.saveKind) : '',
    hash: String(source.hash || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80),
    format: String(source.format || '').replace(/[<>]/g, '').trim().slice(0, 24)
  };
}
function isSafeAvatarData(value) {
  return !value || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
function renderAvatar(user, className = 'avatar') {
  const initials = escapeHtml(user.name).slice(0, 2).toUpperCase();
  return user.avatar_data ? `<img class="${className}" src="${escapeHtml(user.avatar_data)}" alt="${escapeHtml(user.name)}">` : `<b class="${className}">${initials}</b>`;
}
function publicPresenceRow(row) {
  return {
    id: row.user_id,
    name: row.user_name,
    avatarData: row.avatar_data || null,
    location: row.location,
    gameId: row.game_id,
    lastSeen: row.last_seen
  };
}
function platformOnlinePlayers(gameId = '') {
  const rows = getPlatformOnlineUsers.all(isoSecondsAgo(PLATFORM_ONLINE_SECONDS))
    .filter(row => isDisplayablePlayerName(row.user_name));
  const normalized = String(gameId || '').trim();
  return normalized ? rows.filter(row => row.game_id === normalized).map(publicPresenceRow) : rows.map(publicPresenceRow);
}
function renderOnlinePlayers(players) {
  return players.length ? players.slice(0, 10).map(player => {
    const initials = escapeHtml(player.name).slice(0, 2).toUpperCase();
    const avatar = player.avatarData ? `<img class="online-avatar" src="${escapeHtml(player.avatarData)}" alt="${escapeHtml(player.name)}">` : `<b class="online-avatar">${initials}</b>`;
    return `<article>${avatar}<span>${escapeHtml(player.name)}<small>${escapeHtml(player.location || 'Hub')}</small></span></article>`;
  }).join('') : '<p class="online-empty">Ninguem online agora.</p>';
}
function publicChatRow(row) {
  return { id: row.id, userId: row.user_id, player: row.user_name, message: row.message, createdAt: row.created_at };
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
function renderConcordiumAccess(error = '') {
  return pageShell('Concordium', `
<main class="auth-wrap"><section class="auth-card"><h1>Concordium</h1><p>Uma jornada estilo Pokemon percorrendo a historia da igreja apostolica.</p>${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}<form method="POST" action="/concordium-exploracao/unlock" class="auth-form"><label>Senha de acesso<input name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="12" autocomplete="off" required autofocus></label><button type="submit">Entrar</button></form><a class="auth-link" href="/">Voltar ao hub</a></section></main>`);
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
function lutherMatchChestRewards(completedLevels = 0) {
  const chests = Math.floor(Math.max(0, Math.min(LUTHER_MATCH_MAX_LEVEL, Number(completedLevels) || 0)) / 10);
  let xp = 0;
  let points = 0;
  for (let chest = 1; chest <= chests; chest += 1) {
    xp += 120 + Math.floor(chest / 5) * 45;
    points += 90 + Math.floor(chest / 5) * 25;
  }
  return { chests, xp, points };
}
function quizRewards(row = {}) {
  return {
    xp: Math.max(0, Number(row?.reward_xp || 0)),
    points: Math.max(0, Number(row?.reward_points || 0)),
    duelWins: Math.max(0, Number(row?.duel_wins || 0)),
    generalWins: Math.max(0, Number(row?.general_wins || 0)),
    inviteWins: Math.max(0, Number(row?.invite_wins || 0)),
    wins: Math.max(0, Number(row?.wins || 0))
  };
}
function lutherMatchStats(rowOrPayload = {}) {
  const hasProgress = Boolean(rowOrPayload && (
    rowOrPayload.entered ||
    rowOrPayload.updated_at ||
    rowOrPayload.best_level ||
    rowOrPayload.bestLevel ||
    rowOrPayload.completed_levels ||
    rowOrPayload.completedLevels ||
    rowOrPayload.score ||
    rowOrPayload.max_combo ||
    rowOrPayload.maxCombo ||
    rowOrPayload.luther_pair_used ||
    rowOrPayload.lutherPairUsed ||
    rowOrPayload.solas_pair_used ||
    rowOrPayload.solasPairUsed
  ));
  return {
    entered: hasProgress,
    level: Number(rowOrPayload.level || 1),
    bestLevel: Number(rowOrPayload.best_level ?? rowOrPayload.bestLevel ?? rowOrPayload.level ?? 1),
    completedLevels: Number(rowOrPayload.completed_levels ?? rowOrPayload.completedLevels ?? 0),
    score: Number(rowOrPayload.score || 0),
    maxCombo: Number(rowOrPayload.max_combo ?? rowOrPayload.maxCombo ?? 0),
    lutherPairUsed: Boolean(rowOrPayload.luther_pair_used ?? rowOrPayload.lutherPairUsed ?? false),
    solasPairUsed: Boolean(rowOrPayload.solas_pair_used ?? rowOrPayload.solasPairUsed ?? false)
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
    maxCombo: Number(row.max_combo || 0),
    lutherPairUsed: Boolean(row.luther_pair_used),
    solasPairUsed: Boolean(row.solas_pair_used),
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
  const rows = getGameRankingRows.all().filter(row => isDisplayablePlayerName(row.user_name));
  const lutherMatch = getLutherMatchRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).slice(0, 20).map(publicLutherMatchRow);
  const quizOrtodoxia = getQuizRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).map((row, index) => ({
    position: index + 1,
    player: row.user_name,
    duelWins: Number(row.duel_wins || 0),
    generalWins: Number(row.general_wins || 0),
    inviteWins: Number(row.invite_wins || 0),
    wins: Number(row.wins || 0),
    matchesPlayed: Number(row.matches_played || 0)
  }));
  const byYear = [...rows].sort((a, b) => b.year - a.year || b.month - a.month || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byChurches = [...rows].sort((a, b) => b.total_churches - a.total_churches || b.reached_final - a.reached_final || b.year - a.year).slice(0, 10).map(publicRankingRow);
  const byDoctrine = [...rows].sort((a, b) => b.doctrine_correct - a.doctrine_correct || b.year - a.year || b.total_churches - a.total_churches).slice(0, 10).map(publicRankingRow);
  const byState = STATE_ORDER.map(code => {
    const best = rows.map(row => ({ row, count: Number(safeJsonParse(row.state_churches_json, {})[code] || 0) })).filter(item => item.count > 0).sort((a, b) => b.count - a.count || b.row.year - a.row.year || b.row.total_churches - a.row.total_churches)[0];
    return best ? { state: code, stateName: STATE_NAMES[code], churches: best.count, ...publicRankingRow(best.row) } : { state: code, stateName: STATE_NAMES[code], churches: 0, player: '-', year: 1904, totalChurches: 0, doctrineCorrect: 0 };
  });
  const definitions = allAchievementDefinitions();
  const prestigeRows = [GAME_ID, CRONICAS_GAME_ID, LUTHER_MATCH_GAME_ID].flatMap(gameId => getAllAchievementRows.all(gameId)).filter(row => isDisplayablePlayerName(row.user_name));
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
  return { generatedAt: new Date().toISOString(), byYear, byChurches, byState, byDoctrine, lutherMatch, quizOrtodoxia, prestige };
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
  if (relative === 'concordium.gba') {
    const user = currentUser(req);
    if (!user || !hasConcordiumAccess(req, user.id)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Concordium bloqueado');
      return;
    }
  }
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
  if (user && url.pathname === '/api/presence') {
    if (req.method === 'GET') {
      const game = String(url.searchParams.get('game') || '').trim();
      json(res, 200, { online: platformOnlinePlayers(game) });
      return;
    }
    if (req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const gameId = String(payload.gameId || payload.game || 'hub');
      touchPlatformPresence(user, gameId);
      const filterGame = normalizeGamePresence(gameId).gameId;
      json(res, 200, { ok: true, online: platformOnlinePlayers(filterGame === 'hub' ? '' : filterGame) });
      return;
    }
  }
  if (user && url.pathname === '/api/chat') {
    if (req.method === 'GET') {
      const messages = getHubChatMessages.all(CHAT_MESSAGE_LIMIT).reverse().filter(row => isDisplayablePlayerName(row.user_name)).map(publicChatRow);
      json(res, 200, { messages });
      return;
    }
    if (req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const message = String(payload.message || '').replace(/\s+/g, ' ').trim().slice(0, CHAT_MAX_LENGTH);
      if (!message) { json(res, 400, { error: 'Mensagem vazia.' }); return; }
      insertHubChatMessage.run(crypto.randomUUID(), user.id, user.name, message, isoNow());
      cleanPlatformTables();
      const messages = getHubChatMessages.all(CHAT_MESSAGE_LIMIT).reverse().filter(row => isDisplayablePlayerName(row.user_name)).map(publicChatRow);
      json(res, 200, { ok: true, messages });
      return;
    }
  }
  if (!user) { json(res, 401, { error: 'Login necessário' }); return; }
  if (req.method === 'GET' && url.pathname === '/api/ranking') { json(res, 200, rankingPayload()); return; }
  if (req.method === 'GET' && url.pathname === '/api/me') {
    const mainSave = getSaveSlot.get(user.id, 1);
    const summary = playerStatsFromSave(mainSave, user.id);
    const lutherMatch = getLutherMatchRanking.get(user.id);
    const lutherStats = lutherMatchStats(lutherMatch || {});
    const lutherMedals = achievementsForState({}, lutherStats, user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS);
    const lutherChest = lutherMatchChestRewards(lutherStats.completedLevels);
    const quizReward = quizRewards(getQuizRanking.get(user.id));
    const medals = [...summary.medals, ...lutherMedals];
    const xp = achievementXp(medals) + lutherChest.xp + quizReward.xp;
    const rank = titleProgress(xp);
    const points = achievementPoints(medals) + rankPointBonus(rank) + lutherChest.points + quizReward.points;
    json(res, 200, {
      user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
      xp,
      points,
      rank: rank.current.title,
      nextRank: rank.next?.title || null,
      progress: Math.round(rank.progress),
      medals,
      lutherChest,
      quizReward,
      stickers: { owned: summary.stickersOwned, total: summary.stickersTotal }
    });
    return;
  }  if (req.method === 'GET' && url.pathname === '/api/games') {
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
          id: 'quiz-ortodoxia',
          title: 'Quiz Ortodoxia',
          status: 'prototype',
          playUrl: '/quiz-ortodoxia',
          rankingUrl: '/?section=ranking&game=quiz-ortodoxia'
        },
        {
          id: CONCORDIUM_EXPLORACAO_GAME_ID,
          title: 'Concordium',
          description: 'Uma jornada estilo Pokemon percorrendo a historia da igreja apostolica.',
          status: 'private',
          playUrl: '/concordium-exploracao',
          rankingUrl: null
        }
      ]
    });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/concordium/rom-status') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { available: false, error: 'locked' });
      return;
    }
    const available = fs.existsSync(CONCORDIUM_ROM_PATH) && fs.statSync(CONCORDIUM_ROM_PATH).isFile();
    json(res, 200, { available, size: available ? fs.statSync(CONCORDIUM_ROM_PATH).size : 0 });
    return;
  }
  if (url.pathname === '/api/concordium/profile') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { ok: false, error: 'locked' });
      return;
    }
    const row = getConcordiumProfile.get(user.id);
    const profile = sanitizeConcordiumProfile(safeJsonParse(row?.profile_json, null));
    if (req.method === 'GET') {
      json(res, 200, {
        user: { id: user.id, name: user.name, hasAvatar: Boolean(user.avatar_data) },
        profile,
        updatedAt: row?.updated_at || null
      });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const nextProfile = sanitizeConcordiumProfile(payload.profile || payload);
      const now = new Date().toISOString();
      upsertConcordiumProfile.run(user.id, JSON.stringify(nextProfile), row?.created_at || now, now);
      json(res, 200, { ok: true, profile: nextProfile, updatedAt: now });
      return;
    }
  }
  if (url.pathname === '/api/concordium/gba-save') {
    if (!hasConcordiumAccess(req, user.id)) {
      json(res, 403, { ok: false, error: 'locked' });
      return;
    }
    const row = getConcordiumGbaSave.get(user.id);
    const save = sanitizeConcordiumGbaSave(safeJsonParse(row?.save_json, null));
    if (req.method === 'GET') {
      json(res, 200, {
        user: { id: user.id, name: user.name },
        save,
        updatedAt: row?.updated_at || null
      });
      return;
    }
    if (req.method === 'POST' || req.method === 'PUT') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const nextSave = sanitizeConcordiumGbaSave(payload);
      const now = new Date().toISOString();
      upsertConcordiumGbaSave.run(user.id, JSON.stringify(nextSave), row?.created_at || now, now);
      json(res, 200, { ok: true, save: nextSave, updatedAt: now });
      return;
    }
  }
  if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/api/concordium/gba-save/state') {
    if (!hasConcordiumAccess(req, user.id)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Concordium bloqueado');
      return;
    }
    const row = getConcordiumGbaSave.get(user.id);
    const save = sanitizeConcordiumGbaSave(safeJsonParse(row?.save_json, null));
    if (!save.save || save.saveKind !== 'state') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Sem save automatico.');
      return;
    }
    try {
      const bytes = Buffer.from(save.save, 'base64');
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bytes.length,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'inline; filename="concordium.state"'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(bytes);
      return;
    } catch {
      res.writeHead(422, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end('Save automatico invalido.');
      return;
    }
  }
  if (url.pathname.startsWith('/api/quiz')) {
    touchQuizPresence(user);
    if (req.method === 'GET' && url.pathname === '/api/quiz/lobby') {
      const active = getActiveQuizMatchForUser.get(user.id);
      const queue = getQuizQueueUser.get(user.id);
      const online = getQuizOnlineUsers.all(isoSecondsAgo(QUIZ_ONLINE_SECONDS)).filter(item => item.user_id !== user.id);
      const generalQueued = getQuizGeneralQueue.all('general');
      const generalFirst = generalQueued[0] || null;
      const generalSecondsLeft = generalFirst ? Math.max(0, QUIZ_GENERAL_WAIT_SECONDS - Math.floor((Date.now() - new Date(generalFirst.joined_at).getTime()) / 1000)) : 0;
      json(res, 200, {
        user: { id: user.id, name: user.name },
        online: online.map(item => ({ id: item.user_id, name: item.user_name, lastSeen: item.last_seen })),
        queue: queue ? { mode: queue.mode, joinedAt: queue.joined_at } : null,
        generalQueue: generalFirst ? {
          starter: { id: generalFirst.user_id, name: generalFirst.user_name },
          joinedAt: generalFirst.joined_at,
          size: generalQueued.length,
          secondsLeft: generalSecondsLeft,
          waitSeconds: QUIZ_GENERAL_WAIT_SECONDS,
          joined: generalQueued.some(item => item.user_id === user.id)
        } : null,
        activeMatch: active ? publicQuizMatch(active, user.id) : null,
        invites: getQuizIncomingInvites.all(user.id, isoSecondsAgo(180)).map(item => ({ id: item.id, from: { id: item.from_user_id, name: item.from_user_name }, createdAt: item.created_at }))
      });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/solo') {
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      deleteQuizQueueUser.run(user.id);
      const match = createQuizMatch('solo', [user]);
      json(res, 200, { match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/queue') {
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const mode = payload.mode === 'general' ? 'general' : 'duel';
      deleteQuizQueueUser.run(user.id);
      if (mode === 'duel') {
        const opponent = getQuizDuelOpponent.get('duel', user.id);
        if (opponent) {
          const match = createQuizMatch('duel', [opponent, user]);
          deleteQuizQueueUser.run(opponent.user_id);
          deleteQuizQueueUser.run(user.id);
          json(res, 200, { status: 'matched', match: publicQuizMatch(match, user.id) });
          return;
        }
      }
      upsertQuizQueue.run(user.id, user.name, mode, isoNow());
      if (mode === 'general') {
        const queued = getQuizGeneralQueue.all('general');
        const first = queued[0];
        const waitedEnough = first && (Date.now() - new Date(first.joined_at).getTime()) >= QUIZ_GENERAL_WAIT_SECONDS * 1000;
        if (queued.length >= 2 && waitedEnough) {
          const match = createQuizMatch('general', queued);
          queued.forEach(item => deleteQuizQueueUser.run(item.user_id));
          json(res, 200, { status: 'matched', match: publicQuizMatch(match, user.id) });
          return;
        }
      }
      if (mode === 'general') {
        const queued = getQuizGeneralQueue.all('general');
        const first = queued[0];
        const secondsLeft = first ? Math.max(0, QUIZ_GENERAL_WAIT_SECONDS - Math.floor((Date.now() - new Date(first.joined_at).getTime()) / 1000)) : QUIZ_GENERAL_WAIT_SECONDS;
        json(res, 200, { status: 'waiting', queue: getQuizQueueUser.get(user.id), queueSize: queued.length, waitSeconds: QUIZ_GENERAL_WAIT_SECONDS, secondsLeft, starter: first ? { id: first.user_id, name: first.user_name } : null });
        return;
      }
      json(res, 200, { status: 'waiting', queue: getQuizQueueUser.get(user.id), queueSize: 1, waitSeconds: null });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/cancel-queue') {
      deleteQuizQueueUser.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/leave') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const match = getQuizMatch.get(String(payload.matchId || ''));
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || !players.some(player => player.user_id === user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      insertQuizMatchLeave.run(match.id, user.id, isoNow());
      deleteQuizQueueUser.run(user.id);
      json(res, 200, { ok: true });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/invite') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const target = getUserById.get(String(payload.toUserId || ''));
      if (!target || target.id === user.id) { json(res, 400, { error: 'Jogador inválido.' }); return; }
      const id = crypto.randomUUID();
      insertQuizInvite.run(id, user.id, user.name, target.id, target.name, 'pending', isoNow());
      json(res, 200, { ok: true, inviteId: id });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/invite/respond') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const invite = getQuizInvite.get(String(payload.inviteId || ''));
      if (!invite || invite.to_user_id !== user.id || invite.status !== 'pending') { json(res, 404, { error: 'Convite não encontrado.' }); return; }
      if (!payload.accept) {
        updateQuizInvite.run('declined', null, invite.id);
        json(res, 200, { ok: true });
        return;
      }
      if (!quizQuestionsReady()) { json(res, 409, { error: 'Banco de perguntas em revisão. Aguarde as novas perguntas aprovadas.' }); return; }
      const match = createQuizMatch('invite', [
        { user_id: invite.from_user_id, user_name: invite.from_user_name },
        { user_id: invite.to_user_id, user_name: invite.to_user_name }
      ]);
      updateQuizInvite.run('accepted', match.id, invite.id);
      deleteQuizQueueUser.run(invite.from_user_id);
      deleteQuizQueueUser.run(invite.to_user_id);
      json(res, 200, { ok: true, match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/quiz/match') {
      const match = getQuizMatch.get(url.searchParams.get('id') || '');
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || !players.some(player => player.user_id === user.id) || getQuizMatchLeave.get(match.id, user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      const publicMatch = publicQuizMatch(match, user.id, { heartbeat: true });
      if (!publicMatch) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      json(res, 200, { match: publicMatch });
      return;
    }
    if (req.method === 'POST' && url.pathname === '/api/quiz/answer') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      let match = getQuizMatch.get(String(payload.matchId || ''));
      const players = match ? getQuizMatchPlayers.all(match.id) : [];
      if (!match || match.status !== 'active' || !players.some(player => player.user_id === user.id) || getQuizMatchLeave.get(match.id, user.id)) { json(res, 404, { error: 'Partida não encontrada.' }); return; }
      match = ensureQuizMatchProgress(match);
      if (!match || match.status !== 'active' || getQuizMatchLeave.get(match.id, user.id)) { json(res, 409, { error: 'Você foi marcado como desistente.', match: match ? publicQuizMatch(match, user.id) : null }); return; }
      touchQuizMatchHeartbeat(match.id, user.id);
      if (match.mode === 'general' && getQuizMatchElimination.get(match.id, user.id)) { json(res, 409, { error: 'Você já foi desclassificado.', match: publicQuizMatch(match, user.id) }); return; }
      const round = quizRoundInfo(match);
      if (round.complete || round.msLeft <= 0) { json(res, 409, { error: 'Tempo esgotado.', match: publicQuizMatch(match, user.id) }); return; }
      if (getQuizAnswer.get(match.id, user.id, round.index)) { json(res, 200, { ok: true, match: publicQuizMatch(match, user.id) }); return; }
      const answerIndex = clampInt(payload.answerIndex, 0, 3);
      const qid = round.questionIds[round.index];
      const correct = answerIndex === quizQuestion(qid).c ? 1 : 0;
      insertQuizAnswer.run(match.id, user.id, round.index, answerIndex, correct, isoNow());
      if (match.mode === 'general' && !correct) {
        insertQuizMatchElimination.run(match.id, user.id, round.index, isoNow());
      }
      json(res, 200, { ok: true, correct: Boolean(correct), match: publicQuizMatch(match, user.id) });
      return;
    }
    if (req.method === 'GET' && url.pathname === '/api/quiz/ranking') {
      json(res, 200, { rows: getQuizRankings.all().filter(row => isDisplayablePlayerName(row.user_name)).map((row, index) => ({ position: index + 1, player: row.user_name, duelWins: row.duel_wins, generalWins: row.general_wins, inviteWins: row.invite_wins, wins: row.wins, matchesPlayed: row.matches_played })) });
      return;
    }
    json(res, 404, { error: 'API do quiz não encontrada' });
    return;
  }
  if (url.pathname === '/api/luther-metch/progress') {
    const row = getLutherMatchRanking.get(user.id);
    if (req.method === 'GET') {
      const stats = lutherMatchStats(row || {});
      json(res, 200, {
        gameId: LUTHER_MATCH_GAME_ID,
        progress: row ? publicLutherMatchRow(row) : { player: user.name, level: 1, bestLevel: 1, completedLevels: 0, score: 0, maxCombo: 0, lutherPairUsed: false, solasPairUsed: false, updatedAt: null },
        medals: achievementsForState({}, stats, user.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS)
      });
      return;
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const payload = safeJsonParse(await readBody(req) || '{}', {});
      const level = clampInt(payload.level, 1, LUTHER_MATCH_MAX_LEVEL);
      const bestLevel = clampInt(payload.bestLevel ?? level, 1, LUTHER_MATCH_MAX_LEVEL);
      const completedLevels = clampInt(payload.completedLevels ?? Math.max(0, bestLevel - 1), 0, LUTHER_MATCH_MAX_LEVEL);
      const score = clampInt(payload.score, 0, 999999999);
      const maxCombo = clampInt(payload.maxCombo, 0, 999);
      const lutherPairUsed = payload.lutherPairUsed ? 1 : 0;
      const solasPairUsed = payload.solasPairUsed ? 1 : 0;
      const now = new Date().toISOString();
      upsertLutherMatchRanking.run(user.id, user.name, level, bestLevel, completedLevels, score, maxCombo, lutherPairUsed, solasPairUsed, now);
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
  const lutherChest = lutherMatchChestRewards(lutherMatchStats(lutherMatchRow || {}).completedLevels);
  const quizReward = quizRewards(getQuizRanking.get(user.id));
  const xp = achievementXp(medals) + lutherChest.xp + quizReward.xp;
  const rank = titleProgress(xp);
  const points = achievementPoints(medals) + rankPointBonus(rank) + lutherChest.points + quizReward.points;
  const unlockedMedals = medals.filter(medal => medal.unlocked).length;
  const stickers = [];
  const ranking = rankingPayload();
  const rankingRows = (items, score, suffix = '') => items.length ? items.slice(0, 8).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${escapeHtml(score(item))}${suffix}</strong></div>`).join('') : '<p>Nenhum registro ainda.</p>';
  const onlinePlayers = platformOnlinePlayers();
  const generalRankingRows = getAllUsers.all().filter(rankUser => isDisplayablePlayerName(rankUser.name)).map(rankUser => {
    const userSave = getSaveSlot.get(rankUser.id, 1);
    const userSummary = playerStatsFromSave(userSave, rankUser.id);
    const lutherMatch = getLutherMatchRanking.get(rankUser.id);
    const lutherMedals = achievementsForState({}, lutherMatchStats(lutherMatch || {}), rankUser.id, LUTHER_MATCH_GAME_ID, LUTHER_MATCH_ACHIEVEMENTS).filter(medal => medal.unlocked).length;
    return {
      user: rankUser,
      summary: userSummary,
      medals: userSummary.medals.filter(medal => medal.unlocked).length + lutherMedals
    };
  }).sort((a, b) => b.medals - a.medals || a.user.name.localeCompare(b.user.name)).map((item, index) => {
    const userRank = item.summary.rank.current;
    return `<div class="hub-rank-row hub-rank-player"><b>${index + 1}</b><span>${escapeHtml(item.user.name)}<img class="mini-rank-badge" src="${userRank.file}?v=${GAME_VERSION}" alt="${escapeHtml(userRank.title)}"></span><strong>${item.medals} medalhas</strong></div>`;
  }).join('');
  const prestigeItems = ranking.prestige.slice(0, 6);
  const liveRows = prestigeItems.length ? prestigeItems.map(item => `<article><img class="feed-avatar achievement-feed-icon" src="${escapeHtml(item.icon)}?v=${GAME_VERSION}" alt="${escapeHtml(item.medal)}"><span>${escapeHtml(item.player)} conquistou ${escapeHtml(item.medal)}</span><small>+${item.xp} XP · +${item.points} pontos</small></article>`).join('') : '<article><b class="feed-avatar">OL</b><span>Nenhum prestigio conquistado ainda. As novas medalhas vao aparecer aqui.</span></article>';
  const eventPanel = `<section class="ol-panel ol-event"><p>Evento em destaque</p><h3>Desafio da Reforma</h3><span>Espaço reservado para temporadas especiais da comunidade.</span><button disabled>Em breve</button></section>`;
  const gameRankingList = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Rankings por jogo</h3></div><div class="game-rank-list"><a href="/?section=ranking&game=pela-graca-1904"><span>Pela Graça 1904</span><strong>Ver ranking</strong></a><a href="/?section=ranking&game=luther-metch"><span>Luther Metch</span><strong>Ver ranking</strong></a><a href="/?section=ranking&game=quiz-ortodoxia"><span>Quiz Ortodoxia</span><strong>Ver ranking</strong></a></div></section>`;
  const generalRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><h3>Ranking geral</h3></div>${generalRankingRows || '<p>Nenhum jogador cadastrado ainda.</p>'}</section>${gameRankingList}`;
  const ielbRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Pela Graça 1904</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Mais anos jogados</h4>${rankingRows(ranking.byYear, item => item.year)}<h4>Mais igrejas até 2026</h4>${rankingRows(ranking.byChurches, item => item.totalChurches, ' igrejas')}</section>`;
  const lutherRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Luther Metch</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Quem chegou mais longe</h4>${rankingRows(ranking.lutherMatch, item => `Nivel ${item.bestLevel}`)}</section>`;
  const quizRankingRows = ranking.quizOrtodoxia.length ? ranking.quizOrtodoxia.slice(0, 12).map((item, index) => `<div class="hub-rank-row"><b>${index + 1}</b><span>${escapeHtml(item.player)}</span><strong>${item.duelWins} duelo · ${item.generalWins} geral</strong></div>`).join('') : '<p>Nenhuma vitória ranqueada ainda.</p>';
  const quizRanking = `<section class="ol-panel ol-ranking-hub"><div class="panel-head"><div><p>Ranking do jogo</p><h3>Quiz Ortodoxia</h3></div><a href="/?section=ranking">Voltar</a></div><h4>Vitórias online</h4>${quizRankingRows}</section>`;
  const rankingSection = selectedGame === 'pela-graca-1904' ? ielbRanking : selectedGame === 'luther-metch' ? lutherRanking : selectedGame === 'quiz-ortodoxia' ? quizRanking : generalRanking;
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
    <article class="ol-game-card quiz-cover"><div><h4>Quiz Ortodoxia</h4><p>Dispute perguntas de Bíblia, Reforma e luteranismo em modo solo, duelo online, convite ou competição geral.</p></div><a href="/quiz-ortodoxia">Jogar</a></article>
    <article class="ol-game-card concordium-exploracao-cover"><div><h4>Concordium</h4><p>Uma jornada estilo Pokemon percorrendo a historia da igreja apostolica.</p></div><a href="/concordium-exploracao">Jogar</a></article>
  </section>`;
  const rankCard = `<aside class="ol-panel ol-rank"><p>Seu rank geral</p><img class="rank-badge" src="${rank.current.file}?v=${GAME_VERSION}" alt="${escapeHtml(rank.current.title)}"><div class="rank-xp"><strong>${xp} XP</strong><span>${rank.next ? `${Math.max(0, rank.next.xp - rank.currentXp)} XP para ${escapeHtml(rank.next.title)}` : 'Rank maximo alcancado'}</span><div class="rank-bar"><span style="width:${Math.round(rank.progress)}%"></span></div></div><a href="/?section=ranking">Ver ranking geral</a><div class="hub-online-panel"><div class="panel-head"><h3>Online agora</h3></div><div id="hub-online-list" class="hub-online-list">${renderOnlinePlayers(onlinePlayers)}</div></div></aside>`;
  const chatWidget = `<section class="hub-chat" id="hub-chat" aria-label="Chat geral"><div class="hub-chat-head"><strong>Chat geral</strong><button type="button" id="hub-chat-toggle" aria-label="Minimizar chat">-</button></div><div class="hub-chat-messages" id="hub-chat-messages"></div><form id="hub-chat-form" class="hub-chat-form"><input id="hub-chat-input" name="message" maxlength="${CHAT_MAX_LENGTH}" autocomplete="off" placeholder="Mensagem"><button type="submit">Enviar</button></form></section>`;
  const sections = {
    inicio: `<section class="ol-intro">Escolha um jogo, acompanhe seu rank geral e veja os prestígios conquistados.</section>${gameCard}${rankCard}<section class="ol-panel ol-live"><div class="panel-head"><h3>Prestígios</h3></div><div id="hub-live-feed">${liveRows}</div></section>${eventPanel}`,
    jogos: `${gameCard}`,
    ranking: rankingSection,
    medalhas: `<section class="ol-panel" id="medalhas"><div class="panel-head"><h3>Medalhas</h3><span>${unlockedMedals}/${medals.length}</span></div><div class="medal-grid">${medals.map(medal => `<article class="${medal.unlocked ? '' : 'locked'}">${renderAchievementIcon(medal)}<span>${escapeHtml(medal.title)}</span><p>${escapeHtml(medal.description)}</p><small>+${medal.xp} XP · +${medal.points} pontos</small></article>`).join('')}</div></section>`,
    album: `<section class="ol-panel" id="album"><div class="panel-head"><h3>Álbum</h3><span>0/0 figurinhas</span></div><p>Nenhuma figurinha foi criada ainda.</p></section>`,
    loja: `<section class="ol-panel" id="loja"><div class="panel-head"><h3>Loja</h3></div><div class="shop-grid"><article><h4>Pacote Comum</h4><p>100 pontos</p><small>Maior chance de figurinhas comuns.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Raro</h4><p>250 pontos</p><small>Chance melhor de raras e especiais.</small><button disabled>Comprar em breve</button></article><article><h4>Pacote Lendario</h4><p>600 pontos</p><small>Chance alta de figurinhas raras e lendarias.</small><button disabled>Comprar em breve</button></article></div><div class="daily-wheel"><h4>Roleta diaria</h4><p>A cada 24h, o jogador podera tentar ganhar um pacote comum, raro ou lendario de graca.</p><button disabled>Disponivel em breve</button></div></section>`,
    configuracoes: `<section class="ol-panel ol-settings" id="configuracoes"><div class="panel-head"><h3>Configurações</h3></div><form method="POST" action="/profile" class="profile-edit"><div class="profile-box">${renderAvatar(user, 'profile-avatar')}<div><label>Nome público<input name="name" maxlength="40" value="${escapeHtml(user.name)}" required></label><label>Foto do perfil<input id="avatar-file" type="file" accept="image/png,image/jpeg,image/webp"></label><input id="avatar-data" type="hidden" name="avatar_data" value="${escapeHtml(user.avatar_data || '')}"><button type="submit">Salvar perfil</button></div></div></form><hr><div class="saved-games-head"><h4>Campanhas por jogo</h4><p>Medalhas e melhor ranking ficam salvos na conta. Os protótipos novos usam save local automático no navegador.</p></div><div class="saved-game-list"><article class="saved-game-row"><div><span>Pela Graça 1904</span><strong>${mainSave ? escapeHtml(mainSave.name) : 'Nenhuma campanha atual'}</strong><small>${mainSave ? 'Apaga só esta campanha atual.' : 'Crie uma campanha para jogar novamente.'}</small></div>${mainSave ? `<form method="POST" action="/saves/${encodeURIComponent(mainSave.id)}/delete" onsubmit="return confirm('Apagar a campanha atual de Pela Graça 1904? Medalhas e melhor ranking serão mantidos.')"><button>Apagar campanha</button></form>` : '<a href="/play">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Crônicas do Levante</span><strong>${cronicasSave ? 'Campanha em andamento' : 'Nenhuma campanha atual'}</strong><small>${cronicasSave ? 'Apaga só o progresso narrativo. Medalhas futuras serão mantidas.' : 'Comece uma jornada para criar o save automático.'}</small></div>${cronicasSave ? `<form method="POST" action="/cronicas-do-levante/delete" onsubmit="return confirm('Apagar a campanha atual de Crônicas do Levante? Medalhas futuras serão mantidas.')"><button>Apagar campanha</button></form>` : '<a href="/cronicas-do-levante">Criar campanha</a>'}</article><article class="saved-game-row"><div><span>Luther Metch</span><strong>Save local automático</strong><small>Fase, objetivos, pontos e tabuleiro ficam salvos neste navegador.</small></div><a href="/luther-metch">Abrir</a></article><article class="saved-game-row"><div><span>Quiz Ortodoxia</span><strong>Multiplayer online</strong><small>Duelo, convite e competição geral rodam com pareamento pelo servidor.</small></div><a href="/quiz-ortodoxia">Abrir</a></article></div></section>`
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
${chatWidget}
<script>
const hubEsc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function onlineAvatar(player) {
  return player.avatarData ? '<img class="online-avatar" src="' + hubEsc(player.avatarData) + '" alt="' + hubEsc(player.name) + '">' : '<b class="online-avatar">' + hubEsc(String(player.name || 'OL').slice(0, 2).toUpperCase()) + '</b>';
}
async function refreshPresence() {
  const list = document.getElementById('hub-online-list');
  try {
    const response = await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ gameId: 'hub' }), cache: 'no-store' });
    if (!response.ok || !list) return;
    const data = await response.json();
    const rows = (data.online || []).slice(0, 10);
    list.innerHTML = rows.length ? rows.map(player => '<article>' + onlineAvatar(player) + '<span>' + hubEsc(player.name) + '<small>' + hubEsc(player.location || 'Hub') + '</small></span></article>').join('') : '<p class="online-empty">Ninguem online agora.</p>';
  } catch {}
}
function renderChatMessages(messages) {
  const box = document.getElementById('hub-chat-messages');
  if (!box) return;
  box.innerHTML = (messages || []).map(item => '<article><strong>' + hubEsc(item.player) + '</strong><span>' + hubEsc(item.message) + '</span></article>').join('');
  box.scrollTop = box.scrollHeight;
}
async function refreshChat() {
  try {
    const response = await fetch('/api/chat', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    renderChatMessages(data.messages || []);
  } catch {}
}
const chatForm = document.getElementById('hub-chat-form');
if (chatForm) {
  chatForm.addEventListener('submit', async event => {
    event.preventDefault();
    const input = document.getElementById('hub-chat-input');
    const message = String(input?.value || '').trim();
    if (!message) return;
    input.value = '';
    try {
      const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
      if (response.ok) renderChatMessages((await response.json()).messages || []);
    } catch {}
  });
}
const chatToggle = document.getElementById('hub-chat-toggle');
if (chatToggle) chatToggle.addEventListener('click', () => document.getElementById('hub-chat')?.classList.toggle('is-minimized'));
refreshPresence();
refreshChat();
setInterval(refreshPresence, 20000);
setInterval(refreshChat, 5000);
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
    if (user) touchPlatformPresence(user, presenceForPath(url.pathname).gameId);
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
      redirect(res, '/concordium');
      return;
    }
    if (req.method === 'GET' && url.pathname === '/concordium') {
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'concordium.html'), 'utf8');
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
    if (req.method === 'GET' && url.pathname === '/concordium-exploracao') {
      if (!hasConcordiumAccess(req, user.id)) {
        const body = renderConcordiumAccess();
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(body);
        return;
      }
      const body = fs.readFileSync(path.join(PUBLIC_DIR, 'concordium-exploracao.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
      return;
    }
    if ((req.method === 'GET' || req.method === 'HEAD') && url.pathname === '/concordium-exploracao/rom') {
      if (!hasConcordiumAccess(req, user.id)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end('Concordium bloqueado');
        return;
      }
      if (!fs.existsSync(CONCORDIUM_ROM_PATH) || !fs.statSync(CONCORDIUM_ROM_PATH).isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('ROM nativa nao encontrada no servidor.');
        return;
      }
      const stat = fs.statSync(CONCORDIUM_ROM_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size,
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Disposition': 'inline; filename="concordium.gba"'
      });
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      fs.createReadStream(CONCORDIUM_ROM_PATH).pipe(res);
      return;
    }
    if (req.method === 'POST' && url.pathname === '/concordium-exploracao/unlock') {
      const form = await readForm(req);
      const pin = String(form.get('pin') || '').trim();
      if (pin !== CONCORDIUM_ACCESS_PIN) {
        res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderConcordiumAccess('Senha incorreta.'));
        return;
      }
      setConcordiumAccessCookie(res, user.id);
      redirect(res, '/concordium-exploracao');
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

function initConcordiumMultiplayer(httpServer) {
  const io = new SocketIOServer(httpServer, { cors: { origin: false } });
  const players = new Map();
  const gbaPlayers = new Map();
  const gbaBattleInvites = new Map();
  const gbaBattles = new Map();
  const mapBounds = { minX: 70, minY: 80, maxX: 1430, maxY: 920 };
  const dummy = { id: 'training-dummy', x: 760, y: 520, hp: 80, maxHp: 80 };
  const weaponPower = {
    sword: 8,
    staff: 5,
    spear: 7,
    bow: 6,
    book: 4,
    hammer: 11,
    'Espada curta': 8,
    Cajado: 5,
    Lanca: 7,
    'Arco simples': 6,
    Livro: 4,
    Martelo: 11,
    'Espada longa': 11,
    Machado: 12,
    'Arco e flecha': 9
  };
  const weaponRange = {
    sword: 72,
    staff: 78,
    spear: 96,
    bow: 170,
    book: 90,
    hammer: 68,
    'Espada curta': 72,
    Cajado: 78,
    Lanca: 96,
    'Arco simples': 170,
    Livro: 90,
    Martelo: 68,
    'Espada longa': 78,
    Machado: 70,
    'Arco e flecha': 180
  };

  function safeText(value, fallback = '') {
    return String(value || fallback).replace(/[<>]/g, '').trim().slice(0, 48);
  }
  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
  }
  function publicPlayer(player) {
    return {
      id: player.id,
      name: player.name,
      origin: player.origin,
      appearance: player.appearance,
      avatar: player.avatar,
      sprite: player.sprite,
      weapon: player.weapon,
      x: player.x,
      y: player.y,
      attrs: player.attrs,
      hp: player.hp,
      maxHp: player.maxHp,
      energy: player.energy,
      maxEnergy: player.maxEnergy,
      level: player.level,
      xp: player.xp,
      coins: player.coins,
      lastMessage: player.lastMessage || ''
    };
  }
  function publicGbaPlayer(player) {
    return {
      id: player.id,
      userId: player.userId,
      name: player.name,
      x: player.x,
      y: player.y,
      dir: player.dir,
      color: player.color,
      details: player.details,
      updatedAt: player.updatedAt
    };
  }
  function publicGbaBattle(battle, message = '') {
    return {
      battleId: battle.id,
      message,
      ended: Boolean(battle.ended),
      players: battle.players.map(player => ({
        id: player.id,
        name: player.name,
        hp: player.hp,
        maxHp: player.maxHp,
        team: player.team
      }))
    };
  }
  function emitGbaBattle(battle, event, message = '') {
    const payload = publicGbaBattle(battle, message);
    battle.players.forEach(player => io.to(player.id).emit(event, payload));
  }
  function gbaBattlePlayer(socketId, player) {
    const details = player?.details || {};
    const team = Array.isArray(details.team) ? details.team.slice(0, 6) : [];
    return {
      id: socketId,
      name: player.name,
      hp: 100,
      maxHp: 100,
      team,
      lastActionAt: 0
    };
  }
  function nextLevelXp(level) {
    return 60 + Math.max(0, Number(level || 1) - 1) * 35;
  }
  function addXp(player, amount) {
    player.xp += Math.max(0, Math.floor(Number(amount) || 0));
    let leveled = false;
    while (player.xp >= nextLevelXp(player.level)) {
      player.xp -= nextLevelXp(player.level);
      player.level += 1;
      player.attrPoints += 2;
      player.maxHp += 6;
      player.hp = player.maxHp;
      leveled = true;
    }
    return leveled;
  }

  io.on('connection', socket => {
    socket.on('concordium-gba:join', payload => {
      const user = currentUser(socket.request);
      const fallbackName = user?.name || `Jogador ${socket.id.slice(0, 4)}`;
      const saveRow = user ? getConcordiumGbaSave.get(user.id) : null;
      const saved = sanitizeConcordiumGbaSave(safeJsonParse(saveRow?.save_json, null));
      const player = {
        id: socket.id,
        userId: user?.id || null,
        name: safeText(payload?.name, fallbackName) || fallbackName,
        x: clamp(saved.metadata?.x || payload?.x || 50, 4, 96),
        y: clamp(saved.metadata?.y || payload?.y || 72, 12, 96),
        dir: safeText(payload?.dir, 'down') || 'down',
        color: safeText(payload?.color, '#d94f3d') || '#d94f3d',
        details: saved.metadata,
        updatedAt: Date.now()
      };
      gbaPlayers.set(socket.id, player);
      socket.join('concordium-gba');
      socket.emit('concordium-gba:init', {
        id: socket.id,
        players: [...gbaPlayers.values()].map(publicGbaPlayer)
      });
      socket.to('concordium-gba').emit('concordium-gba:player-joined', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:move', payload => {
      const player = gbaPlayers.get(socket.id);
      if (!player) return;
      player.x = clamp(payload?.x, 4, 96);
      player.y = clamp(payload?.y, 12, 96);
      player.dir = safeText(payload?.dir, player.dir || 'down') || 'down';
      player.updatedAt = Date.now();
      socket.to('concordium-gba').emit('concordium-gba:player-update', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:details', payload => {
      const player = gbaPlayers.get(socket.id);
      if (!player) return;
      const details = sanitizeConcordiumGbaSave({ metadata: payload?.metadata || payload }).metadata;
      player.details = details;
      if (details.x || details.y) {
        player.x = clamp(details.x || player.x, 4, 96);
        player.y = clamp(details.y || player.y, 12, 96);
      }
      player.updatedAt = Date.now();
      io.to('concordium-gba').emit('concordium-gba:player-update', publicGbaPlayer(player));
    });

    socket.on('concordium-gba:battle-invite', payload => {
      const challenger = gbaPlayers.get(socket.id);
      const target = gbaPlayers.get(String(payload?.targetId || ''));
      if (!challenger || !target || target.id === socket.id) return;
      const challengerTeam = Array.isArray(challenger.details?.team) ? challenger.details.team : [];
      const targetTeam = Array.isArray(target.details?.team) ? target.details.team : [];
      if (!challengerTeam.length || !targetTeam.length) {
        socket.emit('concordium-gba:battle-error', 'Os dois jogadores precisam ter Pokemon lidos no save.');
        return;
      }
      if (challenger.details?.mapId && target.details?.mapId && challenger.details.mapId !== target.details.mapId) {
        socket.emit('concordium-gba:battle-error', 'O outro jogador precisa estar no mesmo mapa.');
        return;
      }
      const battleId = crypto.randomUUID();
      const invite = { battleId, fromId: socket.id, toId: target.id, createdAt: Date.now() };
      gbaBattleInvites.set(battleId, invite);
      io.to(target.id).emit('concordium-gba:battle-invite', { battleId, from: publicGbaPlayer(challenger) });
    });

    socket.on('concordium-gba:battle-response', payload => {
      const battleId = String(payload?.battleId || '');
      const invite = gbaBattleInvites.get(battleId);
      if (!invite || invite.toId !== socket.id) return;
      gbaBattleInvites.delete(battleId);
      const challenger = gbaPlayers.get(invite.fromId);
      const target = gbaPlayers.get(invite.toId);
      if (!payload?.accept) {
        io.to(invite.fromId).emit('concordium-gba:battle-error', 'Convite recusado.');
        return;
      }
      if (!challenger || !target) return;
      const battle = {
        id: battleId,
        players: [gbaBattlePlayer(invite.fromId, challenger), gbaBattlePlayer(invite.toId, target)],
        createdAt: Date.now(),
        ended: false
      };
      gbaBattles.set(battleId, battle);
      emitGbaBattle(battle, 'concordium-gba:battle-start', 'Batalha iniciada. Ambos podem agir.');
    });

    socket.on('concordium-gba:battle-action', payload => {
      const battle = gbaBattles.get(String(payload?.battleId || ''));
      if (!battle || battle.ended) return;
      const actor = battle.players.find(player => player.id === socket.id);
      const target = battle.players.find(player => player.id !== socket.id);
      if (!actor || !target) return;
      const now = Date.now();
      if (now - actor.lastActionAt < 900) return;
      actor.lastActionAt = now;
      if (payload?.action === 'flee') {
        battle.ended = true;
        emitGbaBattle(battle, 'concordium-gba:battle-end', `${actor.name} saiu da batalha.`);
        gbaBattles.delete(battle.id);
        return;
      }
      const damage = 8 + Math.floor(Math.random() * 9);
      target.hp = Math.max(0, target.hp - damage);
      const message = `${actor.name} atacou e causou ${damage} de dano.`;
      if (target.hp <= 0) {
        battle.ended = true;
        emitGbaBattle(battle, 'concordium-gba:battle-update', `${message} ${actor.name} venceu.`);
        gbaBattles.delete(battle.id);
        return;
      }
      emitGbaBattle(battle, 'concordium-gba:battle-update', message);
    });

    socket.on('concordium:join', payload => {
      const attrs = payload?.attrs && typeof payload.attrs === 'object' ? payload.attrs : {};
      const baseRes = clamp(attrs.resistencia || 3, 1, 20);
      const player = {
        id: socket.id,
        name: safeText(payload?.name, `Viajante ${socket.id.slice(0, 4)}`) || `Viajante ${socket.id.slice(0, 4)}`,
        origin: safeText(payload?.origin, 'Roma'),
        appearance: safeText(payload?.appearance, 'blue'),
        avatar: payload?.avatar && typeof payload.avatar === 'object' ? {
          gender: safeText(payload.avatar.gender, 'male'),
          skin: safeText(payload.avatar.skin, '#c58b63'),
          hair: safeText(payload.avatar.hair, '#2c1a12'),
          tunic: safeText(payload.avatar.tunic, '#9a4b33')
        } : null,
        sprite: safeText(payload?.sprite, 'player_red'),
        weapon: safeText(payload?.weapon, 'sword'),
        attrs: {
          forca: clamp(attrs.forca || 3, 1, 20),
          resistencia: baseRes,
          agilidade: clamp(attrs.agilidade || 3, 1, 20),
          inteligencia: clamp(attrs.inteligencia || 3, 1, 20),
          fe: clamp(attrs.fe || 3, 1, 20),
          carisma: clamp(attrs.carisma || 3, 1, 20),
          lideranca: clamp(attrs.lideranca || 3, 1, 20),
          comercio: clamp(attrs.comercio || 3, 1, 20),
          exploracao: clamp(attrs.exploracao || 3, 1, 20)
        },
        x: 610 + Math.random() * 80,
        y: 420 + Math.random() * 60,
        hp: 100 + baseRes * 8,
        maxHp: 100 + baseRes * 8,
        energy: 80,
        maxEnergy: 80,
        level: 1,
        xp: 0,
        attrPoints: 0,
        coins: 12,
        lastAttack: 0,
        lastMessage: ''
      };
      players.set(socket.id, player);
      socket.emit('concordium:init', { id: socket.id, players: [...players.values()].map(publicPlayer), dummy });
      socket.broadcast.emit('concordium:player-joined', publicPlayer(player));
    });

    socket.on('concordium:move', payload => {
      const player = players.get(socket.id);
      if (!player) return;
      player.x = clamp(payload?.x, mapBounds.minX, mapBounds.maxX);
      player.y = clamp(payload?.y, mapBounds.minY, mapBounds.maxY);
      player.dir = safeText(payload?.dir, player.dir || 'down');
      io.emit('concordium:player-update', publicPlayer(player));
    });

    socket.on('concordium:chat', text => {
      const player = players.get(socket.id);
      if (!player) return;
      const message = safeText(text, '').slice(0, 140);
      if (!message) return;
      player.lastMessage = message.slice(0, 56);
      const payload = { id: player.id, name: player.name, message, at: Date.now() };
      io.emit('concordium:chat', payload);
      io.emit('concordium:player-bubble', { id: player.id, message: player.lastMessage });
      setTimeout(() => {
        const current = players.get(player.id);
        if (current && current.lastMessage === player.lastMessage) {
          current.lastMessage = '';
          io.emit('concordium:player-bubble', { id: player.id, message: '' });
        }
      }, 4200);
    });

    socket.on('concordium:attack', () => {
      const player = players.get(socket.id);
      if (!player) return;
      const now = Date.now();
      if (now - player.lastAttack < 650) return;
      player.lastAttack = now;
      const dx = player.x - dummy.x;
      const dy = player.y - dummy.y;
      const range = weaponRange[player.weapon] || 72;
      if (Math.hypot(dx, dy) > range) {
        socket.emit('concordium:notice', 'Aproxime-se do alvo de treino.');
        return;
      }
      const damage = Math.max(3, Math.floor((weaponPower[player.weapon] || 6) + player.attrs.forca * 1.4 + (player.weapon === 'book' ? player.attrs.inteligencia : 0) + (player.weapon === 'staff' ? player.attrs.fe : 0)));
      dummy.hp = Math.max(0, dummy.hp - damage);
      let leveled = false;
      if (dummy.hp <= 0) {
        leveled = addXp(player, 24);
        player.coins += 2;
        setTimeout(() => {
          dummy.hp = dummy.maxHp;
          io.emit('concordium:dummy-update', dummy);
        }, 1200);
      }
      io.emit('concordium:dummy-update', dummy);
      io.emit('concordium:player-update', publicPlayer(player));
      socket.emit('concordium:combat', { damage, xp: player.xp, level: player.level, attrPoints: player.attrPoints, coins: player.coins, leveled });
    });

    socket.on('concordium:allocate-attr', attr => {
      const player = players.get(socket.id);
      const key = safeText(attr, '');
      if (!player || player.attrPoints <= 0 || !Object.hasOwn(player.attrs, key)) return;
      player.attrs[key] += 1;
      player.attrPoints -= 1;
      if (key === 'resistencia') {
        player.maxHp += 8;
        player.hp = player.maxHp;
      }
      socket.emit('concordium:progress', { attrs: player.attrs, attrPoints: player.attrPoints, hp: player.hp, maxHp: player.maxHp, level: player.level, xp: player.xp, coins: player.coins });
      io.emit('concordium:player-update', publicPlayer(player));
    });

    socket.on('disconnect', () => {
      if (gbaPlayers.has(socket.id)) {
        gbaPlayers.delete(socket.id);
        [...gbaBattleInvites.entries()].forEach(([id, invite]) => {
          if (invite.fromId === socket.id || invite.toId === socket.id) gbaBattleInvites.delete(id);
        });
        [...gbaBattles.entries()].forEach(([id, battle]) => {
          if (!battle.players.some(player => player.id === socket.id)) return;
          battle.ended = true;
          emitGbaBattle(battle, 'concordium-gba:battle-end', 'Batalha encerrada: jogador desconectou.');
          gbaBattles.delete(id);
        });
        socket.to('concordium-gba').emit('concordium-gba:player-left', socket.id);
      }
      if (!players.has(socket.id)) return;
      players.delete(socket.id);
      io.emit('concordium:player-left', socket.id);
    });
  });
}

initConcordiumMultiplayer(server);
server.listen(PORT, () => console.log(`Cultivando SSR rodando em http://localhost:${PORT}`));
