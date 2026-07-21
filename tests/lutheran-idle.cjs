const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { io } = require('socket.io-client');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3180 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(ROOT, `lutheran-idle-test-${process.pid}.sqlite`);
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), DB_PATH },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
child.stdout.on('data', (chunk) => { logs += chunk; });
child.stderr.on('data', (chunk) => { logs += chunk; });

let cookie = '';
function absorbCookies(response) {
  const next = response.headers.getSetCookie?.() || [];
  for (const item of next) {
    const pair = item.split(';', 1)[0];
    const key = pair.split('=', 1)[0];
    const parts = cookie.split('; ').filter(Boolean).filter((entry) => !entry.startsWith(`${key}=`));
    parts.push(pair);
    cookie = parts.join('; ');
  }
}

async function request(pathname, init = {}) {
  const response = await fetch(`${BASE}${pathname}`, {
    redirect: 'manual',
    ...init,
    headers: { ...(cookie ? { Cookie: cookie } : {}), ...(init.headers || {}) }
  });
  absorbCookies(response);
  return response;
}

async function json(pathname, init = {}) {
  const response = await request(pathname, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) }
  });
  const payload = await response.json();
  return { response, payload };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/login`);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou.\n${logs}`);
}

async function realtimeReady() {
  await new Promise((resolve, reject) => {
    const socket = io(`${BASE}/lutheran-idle`, { transports: ['websocket'], extraHeaders: { Cookie: cookie }, reconnection: false });
    const timer = setTimeout(() => { socket.close(); reject(new Error('Socket.IO não confirmou world:ready.')); }, 4000);
    socket.once('world:ready', (payload) => {
      clearTimeout(timer);
      assert.ok(payload.online >= 1);
      socket.close();
      resolve();
    });
    socket.once('connect_error', (error) => { clearTimeout(timer); socket.close(); reject(error); });
  });
}

async function run() {
  await waitForServer();
  const unauthorized = await fetch(`${BASE}/api/lutheran-idle/bootstrap`);
  assert.equal(unauthorized.status, 401);

  const form = new URLSearchParams({ name: 'Jogador Idle', pin: '1234', confirm_pin: '1234' });
  const registration = await request('/register', { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  assert.equal(registration.status, 302);
  assert.match(cookie, /cultivando_session=/);

  const launch = await request('/lutheran-idle');
  assert.equal(launch.status, 200);
  assert.match(cookie, /cultivando_li_launch=/);
  assert.match(await launch.text(), /Lutheran Idle/);

  const builtAsset = await request('/assets/lutheran-idle/assets/game/room_stage_01_background.webp');
  assert.equal(builtAsset.status, 200);
  assert.equal(builtAsset.headers.get('content-type'), 'image/webp');

  const bootstrap = await json('/api/lutheran-idle/bootstrap');
  assert.equal(bootstrap.response.status, 200);
  assert.equal(bootstrap.payload.gameId, 'lutheran-idle');
  assert.equal(bootstrap.payload.economy.offerings, 200);
  assert.equal(bootstrap.payload.stations.find((station) => station.id === 'pulpit').built, true);

  const key = crypto.randomUUID();
  const collectOne = await json('/api/lutheran-idle/collect', { method: 'POST', body: JSON.stringify({ stationId: 'pulpit', idempotencyKey: key }) });
  assert.equal(collectOne.response.status, 200);
  assert.ok(collectOne.payload.reward.offerings > 0);
  const collectReplay = await json('/api/lutheran-idle/collect', { method: 'POST', body: JSON.stringify({ stationId: 'pulpit', idempotencyKey: key }) });
  assert.deepEqual(collectReplay.payload.reward, collectOne.payload.reward);

  const upgrade = await json('/api/lutheran-idle/upgrade', { method: 'POST', body: JSON.stringify({ stationId: 'pulpit' }) });
  assert.equal(upgrade.payload.state.stations.find((station) => station.id === 'pulpit').level, 2);

  const build = await json('/api/lutheran-idle/build', { method: 'POST', body: JSON.stringify({ stationId: 'reception' }) });
  assert.equal(build.payload.state.stations.find((station) => station.id === 'reception').built, true);
  const assign = await json('/api/lutheran-idle/assign-worker', { method: 'POST', body: JSON.stringify({ workerId: 'voluntario-inicial', stationId: 'reception' }) });
  assert.equal(assign.payload.state.workers.find((worker) => worker.id === 'voluntario-inicial').assignedStation, 'reception');

  const district = await json('/api/lutheran-idle/district/create', { method: 'POST', body: JSON.stringify({ name: 'Distrito de Teste' }) });
  assert.equal(district.response.status, 200);
  assert.equal(district.payload.state.district.name, 'Distrito de Teste');

  const database = new DatabaseSync(DB_PATH);
  database.prepare('UPDATE lutheran_idle_profiles SET offline_pending_json = NULL, last_seen_at = ? WHERE user_id = ?').run(new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), bootstrap.payload.user.id);
  database.close();
  const offlineBootstrap = await json('/api/lutheran-idle/bootstrap');
  assert.ok(offlineBootstrap.payload.offlineClaim.offerings > 0);
  const offlineKey = crypto.randomUUID();
  const offline = await json('/api/lutheran-idle/offline-claim', { method: 'POST', body: JSON.stringify({ idempotencyKey: offlineKey }) });
  assert.equal(offline.response.status, 200);
  const offlineReplay = await json('/api/lutheran-idle/offline-claim', { method: 'POST', body: JSON.stringify({ idempotencyKey: offlineKey }) });
  assert.deepEqual(offlineReplay.payload.reward, offline.payload.reward);

  await realtimeReady();
  console.log(JSON.stringify({ ok: true, collect: collectOne.payload.reward, level: 2, district: 'Distrito de Teste', offline: offline.payload.reward }, null, 2));
}

run().catch((error) => {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
}).finally(() => {
  child.kill('SIGTERM');
  setTimeout(() => {
    try { fs.rmSync(DB_PATH, { force: true }); } catch {}
    try { fs.rmSync(`${DB_PATH}-shm`, { force: true }); } catch {}
    try { fs.rmSync(`${DB_PATH}-wal`, { force: true }); } catch {}
  }, 100);
});
