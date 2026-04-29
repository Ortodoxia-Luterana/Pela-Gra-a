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

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pin_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS saves (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    slot INTEGER NOT NULL CHECK (slot IN (1, 2)),
    name TEXT NOT NULL,
    state_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (user_id, slot),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );
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

function hashPin(pin, salt) {
  return crypto.createHash('sha256').update(`${salt}:${pin}`).digest('hex');
}

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

function setSessionCookie(res, sessionId) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5_000_000) {
        req.destroy();
        reject(new Error('Payload grande demais'));
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function readForm(req) {
  const raw = await readBody(req);
  return new URLSearchParams(raw);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function pageShell(title, body) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<link rel="stylesheet" href="/assets/site.css">
</head>
<body class="site-page">
${body}
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
</main>`);
}

function renderDashboard(user, error = '') {
  const saves = new Map(getSavesByUser.all(user.id).map(save => [save.slot, save]));
  const slots = [1, 2].map(slot => {
    const save = saves.get(slot);
    if (save) {
      return `<section class="slot-card">
  <div>
    <h2>Slot ${slot}</h2>
    <strong>${escapeHtml(save.name)}</strong>
    <span>${save.state_json ? 'Jogo salvo' : 'História nova'} · atualizado em ${new Date(save.updated_at).toLocaleString('pt-BR')}</span>
  </div>
  <div class="slot-actions">
    <a class="primary" href="/game?save=${encodeURIComponent(save.id)}">Jogar</a>
    <form method="POST" action="/saves/${encodeURIComponent(save.id)}/delete" onsubmit="return confirm('Apagar este save?')">
      <button class="icon-danger" title="Apagar save" aria-label="Apagar save">×</button>
    </form>
  </div>
</section>`;
    }
    return `<section class="slot-card empty">
  <div>
    <h2>Slot ${slot}</h2>
    <span>Vazio</span>
  </div>
  <a class="create-link" href="/saves/new?slot=${slot}">Criar nova história</a>
</section>`;
  }).join('');

  return pageShell('Minhas histórias', `
<main class="dashboard">
  <header class="dash-head">
    <div>
      <h1>Minhas histórias</h1>
      <p>Jogador: ${escapeHtml(user.name)}</p>
    </div>
    <form method="POST" action="/logout"><button>Sair</button></form>
  </header>
  ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
  <div class="slot-grid">${slots}</div>
</main>`);
}

function renderNewSave(user, slot, error = '') {
  return pageShell('Nova história', `
<main class="auth-wrap">
  <section class="auth-card">
    <h1>Nova história</h1>
    <p>Slot ${slot} · Jogador: ${escapeHtml(user.name)}</p>
    ${error ? `<div class="form-error">${escapeHtml(error)}</div>` : ''}
    <form method="POST" action="/saves" class="auth-form">
      <input type="hidden" name="slot" value="${slot}">
      <label>Nome da história
        <input name="name" maxlength="40" autocomplete="off" required>
      </label>
      <button type="submit">Criar e jogar</button>
    </form>
    <a class="auth-link" href="/">Voltar para slots</a>
  </section>
</main>`);
}

function renderGame(save, user) {
  const body = fs.readFileSync(path.join(PUBLIC_DIR, 'game-body.html'), 'utf8');
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">
<title>${escapeHtml(save.name)} — Pela Graça</title>
<link rel="stylesheet" href="/assets/game.css">
<link rel="stylesheet" href="/assets/site.css">
<script>
window.__SAVE_ID__ = ${JSON.stringify(save.id)};
window.__SAVE_NAME__ = ${JSON.stringify(save.name)};
</script>
</head>
<body>
<div id="campaign-bar">
  <a href="/" class="bar-link">← Histórias</a>
  <strong>${escapeHtml(save.name)}</strong>
  <span>${escapeHtml(user.name)}</span>
  <span id="save-status">Salvando no SQLite...</span>
</div>
${body}
<script src="/assets/persistence.js"></script>
<script src="/assets/game.js"></script>
</body>
</html>`;
}

function serveAsset(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const relative = decodeURIComponent(url.pathname.replace(/^\/assets\//, ''));
  const filePath = path.resolve(PUBLIC_DIR, relative);

  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const type = ext === '.css' ? 'text/css; charset=utf-8'
    : ext === '.js' ? 'text/javascript; charset=utf-8'
      : 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': type });
  fs.createReadStream(filePath).pipe(res);
}

async function handleAuth(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/login') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAuth('login'));
    return true;
  }
  if (req.method === 'GET' && url.pathname === '/register') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(renderAuth('register'));
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/register') {
    const form = await readForm(req);
    const name = String(form.get('name') || '').trim();
    const pin = String(form.get('pin') || '');
    const confirm = String(form.get('confirm_pin') || '');
    if (!name || !/^\d{4}$/.test(pin) || pin !== confirm) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAuth('register', 'Confira o nome e a senha de 4 dígitos.'));
      return true;
    }
    if (getUserByName.get(name)) {
      res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAuth('register', 'Esse nome já está cadastrado.'));
      return true;
    }
    const id = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString('hex');
    const now = new Date().toISOString();
    insertUser.run(id, name, hashPin(pin, salt), salt, now);
    const sessionId = crypto.randomUUID();
    insertSession.run(sessionId, id, now);
    setSessionCookie(res, sessionId);
    redirect(res, '/');
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/login') {
    const form = await readForm(req);
    const name = String(form.get('name') || '').trim();
    const pin = String(form.get('pin') || '');
    const user = getUserByName.get(name);
    if (!user || !/^\d{4}$/.test(pin) || hashPin(pin, user.salt) !== user.pin_hash) {
      res.writeHead(401, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderAuth('login', 'Nome ou senha inválidos.'));
      return true;
    }
    const sessionId = crypto.randomUUID();
    insertSession.run(sessionId, user.id, new Date().toISOString());
    setSessionCookie(res, sessionId);
    redirect(res, '/');
    return true;
  }
  if (req.method === 'POST' && url.pathname === '/logout') {
    const sessionId = parseCookies(req)[COOKIE_NAME];
    if (sessionId) deleteSession.run(sessionId);
    clearSessionCookie(res);
    redirect(res, '/login');
    return true;
  }
  return false;
}

async function handleApi(req, res, url, user) {
  if (!user) {
    json(res, 401, { error: 'Login necessário' });
    return;
  }

  const match = url.pathname.match(/^\/api\/saves\/([^/]+)$/);
  if (!match) {
    json(res, 404, { error: 'API não encontrada' });
    return;
  }

  const id = match[1];
  const save = getSave.get(id, user.id);
  if (!save) {
    json(res, 404, { error: 'Save não encontrado' });
    return;
  }

  if (req.method === 'GET') {
    json(res, 200, {
      id: save.id,
      name: save.name,
      slot: save.slot,
      state: save.state_json ? JSON.parse(save.state_json) : null
    });
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const payload = JSON.parse(await readBody(req) || '{}');
    updateSaveState.run(JSON.stringify(payload.state || null), new Date().toISOString(), id, user.id);
    json(res, 200, { ok: true });
    return;
  }

  json(res, 405, { error: 'Método não permitido' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname.startsWith('/assets/')) {
      serveAsset(req, res);
      return;
    }

    if (await handleAuth(req, res, url)) return;

    const user = currentUser(req);

    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url, user);
      return;
    }

    if (!user) {
      redirect(res, '/login');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderDashboard(user));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/saves/new') {
      const slot = Number(url.searchParams.get('slot'));
      if (![1, 2].includes(slot) || getSaveSlot.get(user.id, slot)) {
        redirect(res, '/');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderNewSave(user, slot));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/saves') {
      const form = await readForm(req);
      const slot = Number(form.get('slot'));
      const name = String(form.get('name') || '').trim();
      if (![1, 2].includes(slot) || !name) {
        res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end([1, 2].includes(slot) ? renderNewSave(user, slot, 'Digite um nome para a história.') : renderDashboard(user, 'Escolha um slot válido.'));
        return;
      }
      if (getSaveSlot.get(user.id, slot)) {
        res.writeHead(409, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(renderDashboard(user, 'Esse slot já tem uma história salva.'));
        return;
      }
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      insertSave.run(id, user.id, slot, name, now, now);
      redirect(res, `/game?save=${encodeURIComponent(id)}`);
      return;
    }

    const deleteMatch = url.pathname.match(/^\/saves\/([^/]+)\/delete$/);
    if (req.method === 'POST' && deleteMatch) {
      deleteSave.run(deleteMatch[1], user.id);
      redirect(res, '/');
      return;
    }

    if (req.method === 'GET' && url.pathname === '/game') {
      const id = url.searchParams.get('save');
      const save = id ? getSave.get(id, user.id) : null;
      if (!save) {
        redirect(res, '/');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(renderGame(save, user));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Página não encontrada');
  } catch (error) {
    console.error(error);
    json(res, 500, { error: error.message || 'Erro interno' });
  }
});

server.listen(PORT, () => {
  console.log(`Cultivando SSR rodando em http://localhost:${PORT}`);
});
