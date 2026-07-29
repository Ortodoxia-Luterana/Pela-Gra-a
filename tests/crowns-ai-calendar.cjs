const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pela-graca-crowns-ai-calendar-'));
const databasePath = path.join(tempRoot, 'crowns-ai-calendar.sqlite');
const port = 34000 + Math.floor(Math.random() * 1000);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: databasePath,
    CROWNS_ACTION_MS: '150',
    CROWNS_AI_TICK_MS: '100',
    CROWNS_REVOLT_CHECK_MS: '60000'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });

const cookies = new Map();
function absorbCookies(response) {
  const values = typeof response.headers.getSetCookie === 'function'
    ? response.headers.getSetCookie()
    : [response.headers.get('set-cookie')].filter(Boolean);
  values.forEach(value => {
    const [pair] = value.split(';');
    const index = pair.indexOf('=');
    if (index > 0) cookies.set(pair.slice(0, index), pair.slice(index + 1));
  });
}
async function request(pathname, options = {}) {
  const response = await fetch(`${origin}${pathname}`, {
    redirect: 'manual',
    ...options,
    headers: { ...(options.headers || {}), ...(cookies.size ? { Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; ') } : {}) }
  });
  absorbCookies(response);
  return response;
}
async function jsonRequest(pathname, options = {}) {
  const response = await request(pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  return { response, payload: await response.json() };
}
async function waitUntil(check, timeoutMs = 7_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Condição não atendida em ${timeoutMs}ms.\n${serverLog}`);
}

(async () => {
  let database;
  try {
    await waitUntil(async () => {
      if (server.exitCode !== null) throw new Error(`Servidor encerrou antes do teste.\n${serverLog}`);
      try { return (await fetch(`${origin}/login`)).ok; } catch { return false; }
    });

    const registration = new URLSearchParams({ name: 'Cronista da IA', pin: '4831', confirm_pin: '4831' });
    assert.equal((await request('/register', {
      method: 'POST',
      body: registration,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })).status, 302);
    assert.equal((await request('/crowns-and-councils')).status, 200);

    let result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    const capital = result.payload.regions.find(region => !region.ownerRealmId && region.neighborIds.length > 2);
    assert.ok(capital);
    result = await jsonRequest('/api/crowns-and-councils/realm/create', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Reino do Calendário',
        houseName: 'Casa da Meia-Noite',
        religion: 'Cristianismo',
        color: result.payload.customization.availableColors[0],
        regionId: capital.id
      })
    });
    assert.equal(result.response.status, 201);

    database = new DatabaseSync(databasePath);
    database.exec('PRAGMA busy_timeout = 5000');
    const aiRegionCount = () => database.prepare(`
      SELECT COUNT(*) AS total
      FROM cc_season_regions region
      JOIN cc_realms realm ON realm.id = region.owner_realm_id AND realm.season_id = region.season_id
      WHERE region.season_id = 'cc-world-1' AND realm.is_ai = 1
    `).get().total;
    const initialAiRegions = aiRegionCount();
    assert.equal(initialAiRegions, 10);
    const localParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date()).filter(part => part.type !== 'literal').map(part => [part.type, Number(part.value)]));
    const todayMidnight = Date.UTC(localParts.year, localParts.month - 1, localParts.day, 3, 0, 0);
    const previousDayDecision = new Date(todayMidnight - 5 * 60 * 1000).toISOString();
    database.prepare("UPDATE cc_seasons SET starts_at = ?, ends_at = ? WHERE id = 'cc-world-1'")
      .run(previousDayDecision, new Date(todayMidnight + 60 * 24 * 60 * 60 * 1000).toISOString());
    database.prepare("UPDATE cc_realms SET last_ai_action_at = ? WHERE season_id = 'cc-world-1' AND is_ai = 1")
      .run(previousDayDecision);

    result = await jsonRequest('/api/crowns-and-councils/bootstrap');
    assert.equal(result.payload.season.day, 2, 'a interface deve estar no segundo dia após a meia-noite');

    await waitUntil(() => database.prepare(`
      SELECT COUNT(*) AS total
      FROM cc_realms
      WHERE season_id = 'cc-world-1' AND is_ai = 1 AND last_ai_action_at <= ?
    `).get(previousDayDecision).total === 0);
    const expandedAiRegions = await waitUntil(() => {
      const pending = database.prepare(`
        SELECT COUNT(*) AS total
        FROM cc_actions action
        JOIN cc_realms realm ON realm.id = action.realm_id AND realm.season_id = action.season_id
        WHERE action.season_id = 'cc-world-1' AND realm.is_ai = 1 AND action.status = 'pending'
      `).get().total;
      return pending === 0 && aiRegionCount() > initialAiRegions ? aiRegionCount() : 0;
    });
    assert.ok(expandedAiRegions > initialAiRegions, 'as IAs devem expandir ao virar o dia do calendário');

    await new Promise(resolve => setTimeout(resolve, 1_300));
    const stableAiRegions = aiRegionCount();
    assert.equal(stableAiRegions, expandedAiRegions, 'cada IA só pode tomar uma decisão por dia do calendário');
    assert.equal(expandedAiRegions, 20, 'as dez IAs devem conquistar uma província no segundo dia');

    console.log(`Crowns AI calendar progression passed (${initialAiRegions} -> ${expandedAiRegions} AI provinces on day 2).`);
  } finally {
    database?.close();
    if (server.exitCode === null) {
      const exited = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await exited;
    }
    fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
