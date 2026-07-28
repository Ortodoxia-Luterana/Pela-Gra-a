const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const port = 32900 + Math.floor(Math.random() * 300);
const base = `http://127.0.0.1:${port}`;
const dbPath = path.join(root, 'data', `hub-game-catalog-${process.pid}.sqlite`);
const server = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DB_PATH: dbPath },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
let cookie = '';
server.stdout.on('data', chunk => { logs += String(chunk); });
server.stderr.on('data', chunk => { logs += String(chunk); });

function absorbCookies(response) {
  for (const item of response.headers.getSetCookie?.() || []) {
    const pair = item.split(';', 1)[0];
    const key = pair.split('=', 1)[0];
    const parts = cookie.split('; ').filter(Boolean).filter(entry => !entry.startsWith(`${key}=`));
    parts.push(pair);
    cookie = parts.join('; ');
  }
}

async function request(pathname, init = {}) {
  const response = await fetch(`${base}${pathname}`, {
    redirect: 'manual',
    ...init,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) }
  });
  absorbCookies(response);
  return response;
}

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`${base}/login`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou.\n${logs}`);
}

(async () => {
  try {
    await waitForServer();
    const form = new URLSearchParams({ name: 'Catálogo QA', pin: '1234', confirm_pin: '1234' });
    const registration = await request('/register', {
      method: 'POST',
      body: form,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    assert.equal(registration.status, 302);
    assert.match(cookie, /cultivando_session=/);

    const hubResponse = await request('/');
    assert.equal(hubResponse.status, 200);
    const hub = await hubResponse.text();
    assert.equal((hub.match(/<h4>Uno Luterano<\/h4>/g) || []).length, 1);
    assert.match(hub, /href="\/cores-da-rosa">Jogar<\/a>/);
    assert.doesNotMatch(hub, /Lutheran Idle|lutheran-idle|Cores da Rosa/);

    const game = await request('/cores-da-rosa');
    assert.equal(game.status, 200);
    assert.match(cookie, /cultivando_cdr_launch=/);
    const gameHtml = await game.text();
    assert.match(gameHtml, /Uno Luterano/);
    assert.doesNotMatch(gameHtml, /Cores da Rosa/);

    const gameAsset = await request('/assets/cores-da-rosa/assets/environment/game-room-v2.webp');
    assert.equal(gameAsset.status, 200);
    assert.equal(gameAsset.headers.get('content-type'), 'image/webp');

    const removedPage = await request('/lutheran-idle');
    assert.equal(removedPage.status, 404);
    const removedApi = await request('/api/lutheran-idle/bootstrap');
    assert.equal(removedApi.status, 404);
    const removedAsset = await request('/assets/lutheran-idle/index.html');
    assert.equal(removedAsset.status, 404);

    console.log('Hub: Uno Luterano substitui Lutheran Idle; rota, API e assets antigos removidos.');
  } finally {
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    for (const suffix of ['', '-shm', '-wal']) {
      const file = `${dbPath}${suffix}`;
      if (fs.existsSync(file)) fs.rmSync(file);
    }
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
