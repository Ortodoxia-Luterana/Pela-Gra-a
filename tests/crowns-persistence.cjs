const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pela-graca-crowns-persistence-'));
const databasePath = path.join(tempRoot, 'crowns-persistence.sqlite');
const saveEpoch = '2026-07-28-provincial-realms-v1';
let portOffset = 0;

function startServer() {
  const port = 37000 + Math.floor(Math.random() * 1000) + portOffset++;
  const origin = `http://127.0.0.1:${port}`;
  const processHandle = spawn(process.execPath, ['--no-warnings', 'server.js'], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DB_PATH: databasePath,
      CROWNS_LOCAL_PREVIEW: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  processHandle.stdout.on('data', chunk => { log += chunk; });
  processHandle.stderr.on('data', chunk => { log += chunk; });
  return { processHandle, origin, getLog: () => log };
}

async function stopServer(server) {
  if (server.processHandle.exitCode === null) server.processHandle.kill('SIGTERM');
  await new Promise(resolve => setTimeout(resolve, 140));
}

async function openPreview(server, timeoutMs = 8_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (server.processHandle.exitCode !== null) throw new Error(`Servidor encerrou antes do teste.\n${server.getLog()}`);
    try {
      const response = await fetch(`${server.origin}/crowns-and-councils`, { redirect: 'manual' });
      if (response.status === 200) return response.headers.get('set-cookie').split(';')[0];
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 80));
  }
  throw new Error(`Servidor não iniciou.\n${server.getLog()}`);
}

async function bootstrap(server, cookie) {
  const response = await fetch(`${server.origin}/api/crowns-and-councils/bootstrap?serverId=cc-world-1`, {
    headers: { Cookie: cookie }
  });
  assert.equal(response.status, 200);
  return response.json();
}

async function createRealm(server, cookie, name) {
  const state = await bootstrap(server, cookie);
  const capital = state.regions.find(region => !region.ownerRealmId && region.neighborIds.length > 2);
  assert.ok(capital);
  const response = await fetch(`${server.origin}/api/crowns-and-councils/realm/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      serverId: 'cc-world-1',
      name,
      houseName: 'Casa Persistência',
      religion: 'Cristianismo',
      color: state.customization.availableColors[0],
      regionId: capital.id
    })
  });
  assert.equal(response.status, 201);
  return response.json();
}

(async () => {
  let server;
  try {
    server = startServer();
    let cookie = await openPreview(server);
    let created = await createRealm(server, cookie, 'Reino Antigo');
    assert.equal(created.realm.name, 'Reino Antigo');
    await stopServer(server);

    const legacyDatabase = new DatabaseSync(databasePath);
    legacyDatabase.prepare('DELETE FROM cc_save_epochs WHERE epoch = ?').run(saveEpoch);
    assert.equal(legacyDatabase.prepare("SELECT COUNT(*) AS total FROM cc_realms WHERE is_ai = 0").get().total, 1);
    legacyDatabase.close();

    server = startServer();
    cookie = await openPreview(server);
    let state = await bootstrap(server, cookie);
    assert.equal(state.realm, null, 'o marco novo deve remover o save humano antigo');
    assert.equal(state.world.aiRealmCount, 10);
    created = await createRealm(server, cookie, 'Reino Novo Persistente');
    assert.equal(created.realm.name, 'Reino Novo Persistente');
    await stopServer(server);

    server = startServer();
    cookie = await openPreview(server);
    state = await bootstrap(server, cookie);
    assert.equal(state.realm.name, 'Reino Novo Persistente', 'o save novo deve sobreviver ao reinício');
    await stopServer(server);

    const persistedDatabase = new DatabaseSync(databasePath);
    assert.equal(persistedDatabase.prepare('SELECT COUNT(*) AS total FROM cc_save_epochs WHERE epoch = ?').get(saveEpoch).total, 1);
    assert.equal(persistedDatabase.prepare("SELECT COUNT(*) AS total FROM cc_realms WHERE is_ai = 0").get().total, 1);
    persistedDatabase.close();
    console.log('Crowns save epoch and persistence: PASS');
  } finally {
    if (server) await stopServer(server);
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
