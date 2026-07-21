const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
const { io } = require('socket.io-client');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pela-graca-crowns-'));
const port = 32000 + Math.floor(Math.random() * 2000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DB_PATH: path.join(tempRoot, 'crowns-test.sqlite'), CROWNS_ACTION_MS: '300', CROWNS_REVOLT_CHECK_MS: '250', CROWNS_FORCE_REVOLTS: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });

const cookies = new Map();
function absorbCookies(response) {
  const values = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [response.headers.get('set-cookie')].filter(Boolean);
  values.forEach(value => {
    const [pair] = value.split(';');
    const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  });
}
function cookieHeader() { return [...cookies].map(([key, value]) => `${key}=${value}`).join('; '); }
async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    redirect: 'manual',
    ...options,
    headers: { ...(options.headers || {}), ...(cookies.size ? { Cookie: cookieHeader() } : {}) }
  });
  absorbCookies(response);
  return response;
}
async function jsonRequest(pathname, options = {}) {
  const response = await request(pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const payload = await response.json();
  return { response, payload };
}
function waitForServer(timeoutMs = 8_000) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const probe = async () => {
      if (server.exitCode !== null) return reject(new Error(`Servidor encerrou antes do teste.\n${serverLog}`));
      try {
        const response = await fetch(`${origin}/login`);
        if (response.ok) return resolve();
      } catch {}
      if (Date.now() - started > timeoutMs) return reject(new Error(`Servidor não iniciou.\n${serverLog}`));
      setTimeout(probe, 80);
    };
    probe();
  });
}
function waitSocket(socket, event, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Evento ${event} não chegou.`)), timeoutMs);
    socket.once(event, payload => { clearTimeout(timer); resolve(payload); });
    socket.once('connect_error', error => { clearTimeout(timer); reject(error); });
  });
}

(async () => {
  let socket;
  try {
    await waitForServer();

    const unauthenticated = await fetch(`${origin}/api/crowns-and-councils/bootstrap`);
    assert.equal(unauthenticated.status, 401);

    const form = new URLSearchParams({ name: 'Rainha Teste', pin: '4831', confirm_pin: '4831' });
    const registered = await request('/register', { method: 'POST', body: form, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    assert.equal(registered.status, 302);
    assert.ok(cookies.has('cultivando_session'));

    const gamePage = await request('/crowns-and-councils');
    assert.equal(gamePage.status, 200);
    assert.ok(cookies.has('cultivando_cc_launch'));
    assert.match(await gamePage.text(), /Crowns and Councils/);

    let result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.map.regionCount, 801);
    assert.equal(result.payload.regions.length, 801);
    assert.equal(result.payload.map.countryCount, 59);
    assert.match(result.payload.map.theatre, /Norte da África/);
    assert.ok(result.payload.regions.some(region => region.name === 'Jerusalém' && region.iso3Code === 'ISR'));
    assert.ok(result.payload.regions.some(region => region.countryCode === 'UK'));
    assert.ok(result.payload.regions.some(region => region.iso3Code === 'RUS'));
    assert.ok(result.payload.regions.some(region => region.iso3Code === 'EGY'));
    assert.ok(!result.payload.regions.some(region => region.id === 'FRY3' || region.name === 'Guyane'));
    assert.ok(result.payload.regions.every(region => region.neighborIds.length > 0));
    assert.equal(result.payload.world.aiRealmCount, 10);
    assert.equal(result.payload.world.realmCount, 10);
    assert.equal(result.payload.customization.availableColors.length, 20);
    assert.equal(result.payload.regions.find(region => region.id === 'EL30').name, 'Ática');
    assert.equal(result.payload.regions.find(region => region.id === 'BG31').name, 'Noroeste da Bulgária');
    assert.ok(result.payload.regions.find(region => region.id === 'IS00').routeNeighborIds.includes('UKM6'));
    assert.ok(result.payload.regions.find(region => region.id === 'IS00').routeNeighborIds.includes('IE04'));
    assert.equal(result.payload.realm, null);
    const capital = result.payload.regions.find(region => !region.ownerRealmId && region.neighborIds.length > 2);
    assert.ok(capital);

    result = await jsonRequest('/api/crowns-and-councils/realm/create', {
      method: 'POST',
      body: JSON.stringify({ name: 'Reino do Teste', houseName: 'Casa Veritas', color: result.payload.customization.availableColors[0], regionId: capital.id })
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.payload.realm.capitalRegionId, capital.id);

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const adjacentId = result.payload.regions.find(region => capital.neighborIds.includes(region.id) && !region.ownerRealmId)?.id;
    assert.ok(adjacentId, 'capital deve possuir ao menos uma região neutra adjacente');
    assert.equal(result.payload.regions.find(region => region.id === capital.id).ownerRealmId, result.payload.realm.id);
    assert.equal(result.payload.realm.court.diplomacy.aiRealmCount, 10);
    assert.equal(result.payload.realm.court.diplomacy.knownRealms.length, 10);
    assert.equal(result.payload.realm.court.internal.canRevolt, false);

    socket = io(`${origin}/crowns-and-councils`, {
      transports: ['websocket'],
      extraHeaders: { Cookie: cookieHeader() },
      forceNew: true
    });
    await waitSocket(socket, 'world.ready');
    const completed = waitSocket(socket, 'action.completed');

    result = await jsonRequest('/api/crowns-and-councils/territory/claim', { method: 'POST', body: JSON.stringify({ regionId: adjacentId }) });
    assert.equal(result.response.status, 202);
    assert.ok(result.payload.action.id.startsWith('action_'));
    const completedPayload = await completed;
    assert.equal(completedPayload.regionId, adjacentId);

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const claimed = result.payload.regions.find(region => region.id === adjacentId);
    assert.equal(claimed.ownerRealmId, result.payload.realm.id);
    assert.equal(result.payload.realm.treasury, 1080);
    assert.equal(result.payload.realm.provisions, 720);
    assert.equal(result.payload.realm.prestige, 17);
    assert.equal(result.payload.actions.length, 0);

    const secondAdjacent = result.payload.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
    assert.ok(secondAdjacent, 'o reino deve ter uma segunda fronteira disponível');
    const secondCompleted = waitSocket(socket, 'action.completed');
    result = await jsonRequest('/api/crowns-and-councils/territory/claim', { method: 'POST', body: JSON.stringify({ regionId: secondAdjacent.id }) });
    assert.equal(result.response.status, 202);
    await secondCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.realm.regionCount, 3);

    const revoltEvent = waitSocket(socket, 'world.patch', 5_000);
    const testDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    testDb.prepare('UPDATE cc_realms SET stability = 25 WHERE id = ?').run(result.payload.realm.id);
    testDb.close();
    const revoltPayload = await revoltEvent;
    assert.equal(revoltPayload.type, 'revolution.separatist');
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.world.aiRealmCount, 11);
    assert.equal(result.payload.realm.regionCount, 2);
    assert.ok(result.payload.journal.some(item => item.eventType === 'revolution.separatist'));

    const published = waitSocket(socket, 'journal.published');
    result = await jsonRequest('/api/crowns-and-councils/journal/articles', {
      method: 'POST',
      body: JSON.stringify({ title: 'Carta aos reinos vizinhos', body: 'Nossa casa anuncia que as fronteiras permanecem abertas ao diálogo.' })
    });
    assert.equal(result.response.status, 201);
    assert.equal(result.payload.article.headline, 'Carta aos reinos vizinhos');
    assert.equal((await published).article.id, result.payload.article.id);

    result = await jsonRequest('/api/crowns-and-councils/journal');
    assert.ok(result.payload.items.some(item => item.eventType === 'realm.created'));
    assert.ok(result.payload.items.some(item => item.eventType === 'territory.claim.completed'));
    assert.ok(result.payload.items.some(item => item.kind === 'article' && item.headline === 'Carta aos reinos vizinhos'));

    result = await jsonRequest('/api/games');
    assert.ok(result.payload.games.some(game => game.id === 'crowns-and-councils' && game.playUrl === '/crowns-and-councils'));
    console.log('Crowns and Councils integration: PASS');
  } finally {
    socket?.disconnect();
    server.kill('SIGTERM');
    await new Promise(resolve => setTimeout(resolve, 120));
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
});
