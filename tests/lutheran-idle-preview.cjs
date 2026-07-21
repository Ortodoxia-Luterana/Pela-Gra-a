const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pela-graca-lutheran-idle-preview-'));
const port = 35000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: path.join(tempRoot, 'preview.sqlite'),
    LUTHERAN_IDLE_LOCAL_PREVIEW: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });

async function waitForServer(timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (server.exitCode !== null) throw new Error(`Servidor encerrou antes do teste.\n${serverLog}`);
    try {
      const response = await fetch(`${origin}/lutheran-idle`, { redirect: 'manual' });
      if (response.status === 200) return response;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(`Servidor não iniciou.\n${serverLog}`);
}

(async () => {
  try {
    const gamePage = await waitForServer();
    assert.match(await gamePage.text(), /Lutheran Idle/);
    const launchCookie = gamePage.headers.get('set-cookie');
    assert.match(launchCookie || '', /cultivando_li_launch=/);

    const bootstrap = await fetch(`${origin}/api/lutheran-idle/bootstrap`, {
      headers: { Cookie: launchCookie.split(';')[0] }
    });
    assert.equal(bootstrap.status, 200);
    const payload = await bootstrap.json();
    assert.equal(payload.user.id, 'lutheran-idle-local-preview');
    assert.equal(payload.profile.congregationName, 'Comunidade de Jogador Local');
    assert.ok(payload.stations.some(station => station.id === 'pulpit' && station.built));

    const protectedBootstrap = await fetch(`${origin}/api/lutheran-idle/bootstrap`);
    assert.equal(protectedBootstrap.status, 403);
    console.log('Lutheran Idle local preview: PASS');
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 120));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
});
