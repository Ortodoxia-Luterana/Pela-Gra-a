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

    let result = await jsonRequest('/api/crowns-and-councils/servers');
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.servers.length, 3);
    assert.ok(result.payload.servers.every(item => item.day === 1 && item.totalDays === 60 && item.aiCount === 10));
    assert.ok(result.payload.servers.every(item => item.phase === 'waiting' && item.playerCount === 0));

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.map.regionCount, 801);
    assert.equal(result.payload.regions.length, 801);
    assert.equal(result.payload.map.countryCount, 59);
    assert.match(result.payload.map.contextTopologyUrl, /world-context/);
    assert.match(result.payload.map.theatre, /Norte da África/);
    assert.ok(result.payload.regions.some(region => region.name === 'Jerusalém' && region.iso3Code === 'ISR'));
    assert.ok(result.payload.regions.some(region => region.countryCode === 'UK'));
    assert.ok(result.payload.regions.some(region => region.iso3Code === 'RUS'));
    assert.ok(result.payload.regions.some(region => region.iso3Code === 'EGY'));
    assert.ok(!result.payload.regions.some(region => region.id === 'FRY3' || region.name === 'Guyane'));
    assert.ok(result.payload.regions.every(region => region.neighborIds.length > 0));
    assert.equal(result.payload.world.aiRealmCount, 10);
    assert.equal(result.payload.world.realmCount, 10);
    assert.equal(result.payload.expedition.capacity, 2);
    assert.deepEqual(Object.keys(result.payload.resourceCatalog).sort(), ['grain', 'stone', 'treasury', 'wood']);
    assert.deepEqual(Object.keys(result.payload.unitCatalog).sort(), ['archers', 'cavalry', 'siege', 'spearmen']);
    assert.ok(result.payload.regions.every(region => ['grain', 'wood', 'stone', 'treasury'].includes(region.resourceType)));
    assert.ok(result.payload.marketOrders.length >= 8);
    assert.ok(result.payload.customization.availableColors.length >= 30);
    const initialColorDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    initialColorDb.exec('PRAGMA busy_timeout = 5000');
    const initialColorAudit = initialColorDb.prepare("SELECT COUNT(*) AS total, COUNT(DISTINCT lower(color)) AS distinct_colors FROM cc_realms WHERE season_id = 'cc-world-1'").get();
    assert.equal(initialColorAudit.total, 10);
    assert.equal(initialColorAudit.distinct_colors, initialColorAudit.total);
    assert.ok(initialColorDb.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'cc_realms_season_color_unique_idx'").get());
    initialColorDb.close();
    assert.equal(result.payload.regions.find(region => region.id === 'EL30').name, 'Ática');
    assert.equal(result.payload.regions.find(region => region.id === 'BG31').name, 'Noroeste da Bulgária');
    assert.ok(result.payload.regions.find(region => region.id === 'IS00').routeNeighborIds.includes('UKM6'));
    assert.ok(result.payload.regions.find(region => region.id === 'IS00').routeNeighborIds.includes('IE04'));
    assert.equal(result.payload.realm, null);
    assert.equal(result.payload.season.day, 1);
    assert.equal(result.payload.season.totalDays, 60);
    assert.deepEqual(result.payload.customization.religions, ['Cristianismo', 'Paganismo nórdico', 'Paganismo romano', 'Islamismo']);
    assert.ok(result.payload.regions.every(region => result.payload.customization.religions.includes(region.suggestedReligion)));
    const capital = result.payload.regions.find(region => !region.ownerRealmId && region.neighborIds.length > 2);
    assert.ok(capital);
    const selectedColor = result.payload.customization.availableColors[0];

    result = await jsonRequest('/api/crowns-and-councils/realm/create', {
      method: 'POST',
      body: JSON.stringify({ name: 'Reino do Teste', houseName: 'Casa Veritas', religion: 'Islamismo', color: selectedColor, regionId: capital.id })
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
    assert.equal(result.payload.season.phase, 'open');
    assert.ok(!result.payload.customization.availableColors.includes(selectedColor));
    const conflictColorDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    conflictColorDb.exec('PRAGMA busy_timeout = 5000');
    const anotherRealm = conflictColorDb.prepare("SELECT id FROM cc_realms WHERE season_id = 'cc-world-1' AND id <> ? LIMIT 1").get(result.payload.realm.id);
    assert.throws(() => conflictColorDb.prepare('UPDATE cc_realms SET color = ? WHERE id = ?').run(selectedColor.toUpperCase(), anotherRealm.id), /UNIQUE constraint failed/);
    conflictColorDb.close();
    assert.equal(result.payload.realm.religion, 'Islamismo');
    assert.ok(new Set(result.payload.realm.court.diplomacy.knownRealms.map(realm => realm.religion)).size >= 2);
    assert.ok(result.payload.realm.court.diplomacy.knownRealms.every(realm => realm.houseName && realm.rulerName));
    assert.equal(result.payload.regionReligions[0].heresyShare, 0);
    assert.equal(result.payload.religiousMovements.length, 0);
    assert.equal(result.payload.buildings.length, 2);
    assert.equal(result.payload.armies.length, 1);
    assert.equal(result.payload.realm.wood, 650);
    assert.equal(result.payload.realm.stone, 520);
    assert.ok(result.payload.realm.economy.daily.provisions > 0);

    const diplomaticTarget = result.payload.realm.court.diplomacy.knownRealms[0];
    result = await jsonRequest('/api/crowns-and-councils/diplomacy/gift', {
      method: 'POST',
      body: JSON.stringify({ targetRealmId: diplomaticTarget.id, resourceType: 'wood', amount: 50 })
    });
    assert.equal(result.response.status, 201);
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.realm.wood, 600);
    assert.ok(result.payload.realm.court.diplomacy.knownRealms.find(realm => realm.id === diplomaticTarget.id).goodwill > 0);

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
    const reserved = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(reserved.payload.regions.find(region => region.id === adjacentId).reservedByName, 'Reino do Teste');
    const completedPayload = await completed;
    assert.equal(completedPayload.regionId, adjacentId);

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const claimed = result.payload.regions.find(region => region.id === adjacentId);
    assert.equal(claimed.ownerRealmId, result.payload.realm.id);
    assert.equal(result.payload.realm.treasury, 1080);
    assert.equal(result.payload.realm.provisions, 720);
    assert.equal(result.payload.realm.prestige, 18);
    assert.equal(result.payload.actions.length, 0);

    const secondAdjacent = result.payload.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
    assert.ok(secondAdjacent, 'o reino deve ter uma segunda fronteira disponível');
    const secondCompleted = waitSocket(socket, 'action.completed');
    result = await jsonRequest('/api/crowns-and-councils/territory/claim', { method: 'POST', body: JSON.stringify({ regionId: secondAdjacent.id }) });
    assert.equal(result.response.status, 202);
    await secondCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.realm.regionCount, 3);

    const sourceBeforeTransfer = result.payload.armies.find(army => army.regionId === capital.id);
    const transferredTroops = { spearmen: 120, archers: 10, cavalry: 0, siege: 0 };
    let orderCompleted = waitSocket(socket, 'action.completed');
    result = await jsonRequest('/api/crowns-and-councils/armies/transfer', {
      method: 'POST',
      body: JSON.stringify({ fromRegionId: capital.id, toRegionId: adjacentId, troops: transferredTroops })
    });
    assert.equal(result.response.status, 202);
    let troopState = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(troopState.payload.armies.find(army => army.regionId === capital.id).spearmen, sourceBeforeTransfer.spearmen - 120);
    assert.equal(troopState.payload.armies.find(army => army.regionId === capital.id).archers, sourceBeforeTransfer.archers - 10);
    assert.equal(troopState.payload.actions.filter(action => action.type === 'army.transfer').length, 1);
    await orderCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const transferredGarrison = result.payload.armies.find(army => army.regionId === adjacentId);
    assert.equal(transferredGarrison.spearmen, 120);
    assert.equal(transferredGarrison.archers, 10);

    const transferredTotal = transferredGarrison.total;
    const moraleBeforeDefense = transferredGarrison.morale;
    orderCompleted = waitSocket(socket, 'action.completed');
    result = await jsonRequest('/api/crowns-and-councils/armies/defend', {
      method: 'POST',
      body: JSON.stringify({ regionId: adjacentId })
    });
    assert.equal(result.response.status, 202);
    await orderCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const defendedGarrison = result.payload.armies.find(army => army.regionId === adjacentId);
    assert.equal(defendedGarrison.total, transferredTotal, 'preparar defesa não deve criar soldados gratuitos');
    assert.ok(defendedGarrison.morale > moraleBeforeDefense);

    const garrisonRegionIds = new Set(result.payload.armies.filter(army => army.spearmen >= 120).map(army => army.regionId));
    const invasionPlans = result.payload.regions
      .filter(region => !region.ownerRealmId && region.status === 'neutral')
      .map(region => ({ region, fromRegionId: region.neighborIds.find(id => garrisonRegionIds.has(id)) }))
      .filter(plan => plan.fromRegionId)
      .slice(0, 2);
    assert.equal(invasionPlans.length, 2, 'duas províncias inimigas devem tocar guarnições disponíveis');
    const enemyRealms = result.payload.realm.court.diplomacy.knownRealms.slice(0, 2);
    assert.equal(enemyRealms.length, 2);
    const warDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    warDb.exec('PRAGMA busy_timeout = 5000');
    const nowMs = Date.now();
    warDb.prepare("UPDATE cc_seasons SET starts_at = ?, ends_at = ? WHERE id = 'cc-world-1'").run(new Date(nowMs - 5 * 86400000).toISOString(), new Date(nowMs + 55 * 86400000).toISOString());
    enemyRealms.forEach(enemyRealm => {
      warDb.prepare('UPDATE cc_realms SET treasury = 10000, provisions = 10000, last_ai_action_at = ? WHERE id = ?').run(new Date(nowMs + 60000).toISOString(), enemyRealm.id);
    });
    for (const [index, plan] of invasionPlans.entries()) {
      const enemyRealm = enemyRealms[index];
      warDb.prepare("UPDATE cc_season_regions SET owner_realm_id = ?, status = 'controlled', version = version + 1 WHERE season_id = 'cc-world-1' AND region_id = ?").run(enemyRealm.id, plan.region.id);
      warDb.prepare("INSERT INTO cc_armies (id, season_id, realm_id, region_id, infantry, archers, cavalry, siege, morale, created_at, updated_at) VALUES (?, 'cc-world-1', ?, ?, 12, 0, 0, 0, 65, ?, ?)").run(`army_test_defender_${index}`, enemyRealm.id, plan.region.id, new Date(nowMs).toISOString(), new Date(nowMs).toISOString());
    }
    warDb.close();

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const beforeConcurrentAttack = new Map(result.payload.armies.map(army => [army.regionId, army.spearmen]));
    for (const plan of invasionPlans) {
      const declaration = await jsonRequest('/api/crowns-and-councils/war/declare', {
        method: 'POST',
        body: JSON.stringify({ fromRegionId: plan.fromRegionId, regionId: plan.region.id, troops: { spearmen: 60, archers: 0, cavalry: 0, siege: 0 } })
      });
      assert.equal(declaration.response.status, 202);
    }
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.actions.filter(action => action.type === 'army.attack').length, 2, 'os dois ataques devem marchar simultaneamente');
    const committedByOrigin = new Map();
    invasionPlans.forEach(plan => committedByOrigin.set(plan.fromRegionId, (committedByOrigin.get(plan.fromRegionId) || 0) + 60));
    committedByOrigin.forEach((committed, regionId) => {
      assert.equal(result.payload.armies.find(army => army.regionId === regionId).spearmen, beforeConcurrentAttack.get(regionId) - committed);
    });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 200));
      result = await jsonRequest('/api/crowns-and-councils/bootstrap');
      if (!result.payload.actions.some(action => action.type === 'army.attack')) break;
    }
    assert.equal(result.payload.actions.filter(action => action.type === 'army.attack').length, 0);
    const resolvedWars = result.payload.wars.filter(war => invasionPlans.some(plan => plan.region.id === war.objectiveRegionId));
    assert.equal(resolvedWars.length, 2);
    assert.ok(resolvedWars.every(war => war.status === 'ended' && war.result.attackers?.spearmen === 60 && war.result.defenders?.spearmen === 12), JSON.stringify(resolvedWars));
    assert.ok(invasionPlans.every(plan => result.payload.regions.find(region => region.id === plan.region.id).ownerRealmId === result.payload.realm.id));

    orderCompleted = waitSocket(socket, 'action.completed');
    result = await jsonRequest('/api/crowns-and-councils/buildings/queue', { method: 'POST', body: JSON.stringify({ regionId: capital.id, buildingType: 'mercado' }) });
    assert.equal(result.response.status, 202);
    await orderCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.ok(result.payload.buildings.some(item => item.regionId === capital.id && item.type === 'mercado' && item.level === 1));

    result = await jsonRequest('/api/crowns-and-councils/market/orders', {
      method: 'POST',
      body: JSON.stringify({ sellResource: 'wood', sellAmount: 50, buyResource: 'stone', buyAmount: 50 })
    });
    assert.equal(result.response.status, 201);
    const ownMarketOrderId = result.payload.order.id;
    result = await jsonRequest('/api/crowns-and-councils/market/cancel', {
      method: 'POST',
      body: JSON.stringify({ orderId: ownMarketOrderId })
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.order.status, 'cancelled');

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const aiOffer = result.payload.marketOrders.find(order => order.status === 'open' && order.realmId !== result.payload.realm.id);
    assert.ok(aiOffer);
    result = await jsonRequest('/api/crowns-and-councils/market/accept', {
      method: 'POST',
      body: JSON.stringify({ orderId: aiOffer.id })
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.payload.order.status, 'accepted');

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    orderCompleted = waitSocket(socket, 'action.completed');
    const armyBefore = result.payload.armies[0].total;
    result = await jsonRequest('/api/crowns-and-councils/armies/recruit', { method: 'POST', body: JSON.stringify({ regionId: capital.id, unitType: 'spearmen', groups: 1 }) });
    assert.equal(result.response.status, 202);
    await orderCompleted;
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.armies[0].total, armyBefore + 80);

    const revoltEvent = waitSocket(socket, 'world.patch', 5_000);
    const testDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    testDb.exec('PRAGMA busy_timeout = 5000');
    const regionsBeforeRevolt = result.payload.realm.regionCount;
    testDb.prepare('UPDATE cc_realms SET stability = 25 WHERE id = ?').run(result.payload.realm.id);
    testDb.close();
    const revoltPayload = await revoltEvent;
    assert.equal(revoltPayload.type, 'revolution.separatist');
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.world.aiRealmCount, 11);
    assert.equal(result.payload.realm.regionCount, regionsBeforeRevolt - 1);
    assert.ok(result.payload.journal.some(item => item.eventType === 'revolution.separatist'));
    const finalColorDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    finalColorDb.exec('PRAGMA busy_timeout = 5000');
    const finalColorAudit = finalColorDb.prepare("SELECT COUNT(*) AS total, COUNT(DISTINCT lower(color)) AS distinct_colors FROM cc_realms WHERE season_id = 'cc-world-1'").get();
    assert.equal(finalColorAudit.distinct_colors, finalColorAudit.total);
    finalColorDb.close();

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

    let lifecycleDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    lifecycleDb.exec('PRAGMA busy_timeout = 5000');
    lifecycleDb.prepare('UPDATE cc_seasons SET ends_at = ? WHERE id = ?').run(new Date(Date.now() - 1_000).toISOString(), 'cc-world-1');
    lifecycleDb.close();
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.season.phase, 'ended');
    assert.ok(result.payload.winners.length >= 1);

    lifecycleDb = new DatabaseSync(path.join(tempRoot, 'crowns-test.sqlite'));
    lifecycleDb.exec('PRAGMA busy_timeout = 5000');
    const lifecycleSeason = lifecycleDb.prepare('SELECT config_json FROM cc_seasons WHERE id = ?').get('cc-world-1');
    const lifecycleConfig = { ...JSON.parse(lifecycleSeason.config_json), resetDelayMs: 1 };
    lifecycleDb.prepare('UPDATE cc_seasons SET config_json = ? WHERE id = ?').run(JSON.stringify(lifecycleConfig), 'cc-world-1');
    lifecycleDb.close();
    result = await jsonRequest('/api/crowns-and-councils/servers');
    assert.equal(result.payload.servers[0].phase, 'waiting');
    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.realm, null);
    assert.equal(result.payload.world.aiRealmCount, 10);
    console.log('Crowns and Councils integration: PASS');
  } finally {
    socket?.disconnect();
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), new Promise(resolve => setTimeout(resolve, 1500))]);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try { fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); break; } catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
  }
})().catch(error => {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
});
