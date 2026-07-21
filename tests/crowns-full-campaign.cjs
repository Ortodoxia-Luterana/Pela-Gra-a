const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'crowns-full-campaign-'));
const databasePath = path.join(tempRoot, 'campaign.sqlite');
const port = 34000 + Math.floor(Math.random() * 1500);
const origin = `http://127.0.0.1:${port}`;
const gameDayMs = Math.max(250, Number(process.env.CROWNS_QA_DAY_MS || 300));
const server = spawn(process.execPath, ['--no-warnings', 'server.js'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    DB_PATH: databasePath,
    CROWNS_LOCAL_PREVIEW: '1',
    CROWNS_GAME_DAY_MS: String(gameDayMs),
    CROWNS_ACTION_MS: String(Math.max(250, Math.min(700, Math.floor(gameDayMs / 2)))),
    CROWNS_RESET_DELAY_MS: '60000',
    CROWNS_REVOLT_CHECK_MS: '250',
    CROWNS_FORCE_REVOLTS: '1'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});
let serverLog = '';
server.stdout.on('data', chunk => { serverLog += chunk; });
server.stderr.on('data', chunk => { serverLog += chunk; });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitForServer() {
  const started = Date.now();
  while (Date.now() - started < 10_000) {
    if (server.exitCode !== null) throw new Error(`Servidor encerrou.\n${serverLog}`);
    try { if ((await fetch(`${origin}/crowns-and-councils`)).ok) return; } catch {}
    await sleep(80);
  }
  throw new Error(`Servidor não iniciou.\n${serverLog}`);
}
async function api(pathname, body) {
  const response = await fetch(`${origin}/api/crowns-and-councils${pathname}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${pathname}: ${payload.error || response.status}`);
  return payload;
}
async function bootstrap() { return api('/bootstrap?serverId=cc-world-1'); }
const voted = new Set();
const received = new Set();
async function attendCouncils(state) {
  for (const council of state.councils || []) {
    if (council.status === 'voting' && !council.vote && !voted.has(council.id)) {
      await api('/council/vote', { serverId: 'cc-world-1', councilId: council.id, vote: council.kind === 'historical' ? 'accept' : 'abstain' });
      voted.add(council.id);
    }
    if (council.status === 'decided' && !council.reception && !received.has(council.id)) {
      await api('/religion/receive', { serverId: 'cc-world-1', councilId: council.id, reception: council.result === 'accept' ? 'receive' : 'resist' });
      received.add(council.id);
    }
  }
}
async function waitUntil(predicate, timeoutMs, label) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const state = await bootstrap();
    await attendCouncils(state);
    if (await predicate(state)) return state;
    await sleep(Math.min(500, Math.max(100, Math.floor(gameDayMs / 4))));
  }
  throw new Error(`Tempo excedido: ${label}`);
}
async function waitActions() { return waitUntil(state => state.actions.length === 0, 12_000, 'conclusão da ordem'); }

let qaDb;
(async () => {
  try {
    await waitForServer();
    let state = await bootstrap();
    assert.equal(state.season.phase, 'waiting');
    assert.equal(state.season.day, 1);
    const regionsById = new Map(state.regions.map(region => [region.id, region]));
    const capital = state.regions.find(region => {
      if (region.ownerRealmId || region.status !== 'neutral') return false;
      const neighbors = region.neighborIds.map(id => regionsById.get(id)).filter(Boolean);
      return neighbors.filter(item => !item.ownerRealmId).length >= 2 && neighbors.some(item => item.ownerRealmId);
    }) || state.regions.find(region => !region.ownerRealmId && region.neighborIds.length >= 3);
    assert.ok(capital, 'capital adequada não encontrada');
    await api('/realm/create', { serverId: 'cc-world-1', name: 'Reino da Campanha Total', houseName: 'Casa Veritas', religion: 'Cristianismo latino', color: state.customization.availableColors[0], regionId: capital.id });
    state = await bootstrap();
    assert.equal(state.season.phase, 'open');
    console.log(`QA: temporada iniciada no dia ${state.season.day}; 1 dia = ${gameDayMs}ms.`);

    qaDb = new DatabaseSync(databasePath);
    qaDb.exec('PRAGMA busy_timeout = 5000');
    qaDb.prepare('UPDATE cc_realms SET treasury = 20000, provisions = 20000, prestige = 50 WHERE id = ?').run(state.realm.id);
    const sameFaith = state.realm.court.diplomacy.knownRealms.find(item => item.religion === state.realm.religion) || state.realm.court.diplomacy.knownRealms[0];
    const treaty = await api('/diplomacy/propose', { serverId: 'cc-world-1', targetRealmId: sameFaith.id, treatyType: 'alliance' });
    assert.equal(treaty.treaty.status, 'accepted');
    const marriage = await api('/marriage/propose', { serverId: 'cc-world-1', targetRealmId: sameFaith.id, dowry: 180, childReligion: state.realm.religion });
    assert.equal(marriage.marriage.status, 'accepted');
    console.log('QA: aliança e casamento dinástico aceitos.');

    for (let count = 0; count < 2; count += 1) {
      state = await bootstrap();
      const target = state.regions.find(region => region.isAdjacentToRealm && !region.ownerRealmId && region.status === 'neutral');
      assert.ok(target, 'fronteira neutra ausente');
      await api('/territory/claim', { serverId: 'cc-world-1', regionId: target.id });
      await waitActions();
    }
    state = await bootstrap();
    assert.ok(state.realm.regionCount >= 3);
    console.log(`QA: colonização concluída; ${state.realm.regionCount} regiões.`);

    await api('/buildings/queue', { serverId: 'cc-world-1', regionId: state.realm.capitalRegionId, buildingType: 'mercado' });
    await waitActions();
    await api('/armies/recruit', { serverId: 'cc-world-1', regionId: state.realm.capitalRegionId });
    await waitActions();
    await api('/armies/defend', { serverId: 'cc-world-1', regionId: state.realm.capitalRegionId });
    await waitActions();
    await api('/religion/mission', { serverId: 'cc-world-1', regionId: state.realm.capitalRegionId });
    await waitActions();
    qaDb.prepare("UPDATE cc_region_religions SET heresy_share = 35, heresy_name = 'Seita dos Dois Altares' WHERE season_id = 'cc-world-1' AND region_id = ?").run(state.realm.capitalRegionId);
    qaDb.prepare("UPDATE cc_realms SET heresy_pressure = 35 WHERE id = ?").run(state.realm.id);
    await api('/religion/suppress', { serverId: 'cc-world-1', regionId: state.realm.capitalRegionId });
    await waitActions();
    console.log('QA: construção, recrutamento, defesa, missão e combate à heresia concluídos.');

    await api('/journal/articles', { serverId: 'cc-world-1', title: 'Proclamação da Campanha Total', body: 'A Casa Veritas anuncia suas alianças, sua missão religiosa e a defesa das fronteiras.' });
    state = await waitUntil(item => item.season.day >= 5, Math.max(12_000, gameDayMs * 7), 'dia 5');
    const hostile = state.attackTargets.find(item => item.realmId !== sameFaith.id);
    if (hostile) {
      state = await waitUntil(item => !item.wars.some(war => war.status === 'active'), Math.max(12_000, gameDayMs * 5), 'fim de guerra anterior');
      await api('/war/declare', { serverId: 'cc-world-1', regionId: hostile.regionId });
      await waitActions();
      console.log(`QA: campanha militar resolvida contra ${hostile.realmName}.`);
    }

    qaDb.prepare('UPDATE cc_realms SET stability = 25 WHERE id = ?').run(state.realm.id);
    const revoltAudit = qaDb.prepare("SELECT r.id, r.realm_kind, r.stability, COUNT(sr.region_id) AS regions, (SELECT COUNT(*) FROM cc_realms child WHERE child.season_id = r.season_id AND child.origin_realm_id = r.id) AS children FROM cc_realms r JOIN cc_season_regions sr ON sr.season_id = r.season_id AND sr.owner_realm_id = r.id WHERE r.id = ? GROUP BY r.id").get(state.realm.id);
    console.log(`QA: candidato à revolta com ${revoltAudit.regions} regiões, estabilidade ${revoltAudit.stability}, filhos ${revoltAudit.children}.`);
    state = await waitUntil(item => item.world.aiRealmCount > 10, Math.max(10_000, gameDayMs * 8), 'revolta separatista');
    const separatist = state.attackTargets.find(target => state.regions.find(region => region.id === target.regionId)?.ownerRealmKind === 'separatist');
    assert.ok(separatist, 'o novo reino separatista deveria tocar a fronteira');
    qaDb.prepare('UPDATE cc_realms SET treasury = 20000, provisions = 20000 WHERE id = ?').run(state.realm.id);
    state = await waitUntil(item => !item.wars.some(war => war.status === 'active'), Math.max(12_000, gameDayMs * 5), 'fim de guerra antes dos separatistas');
    await api('/war/declare', { serverId: 'cc-world-1', regionId: separatist.regionId });
    await waitActions();
    console.log(`QA: separatistas de ${separatist.regionName} foram atacados.`);

    let lastReported = 0;
    while (true) {
      state = await bootstrap();
      if (state.season.day >= lastReported + 10) {
        lastReported = state.season.day;
        console.log(`QA: dia ${state.season.day}/60; concílios ${state.councils.length}; IAs ${state.world.aiRealmCount}.`);
      }
      await attendCouncils(state);
      if (state.season.phase === 'ended') break;
      await sleep(Math.min(750, Math.max(120, Math.floor(gameDayMs / 5))));
    }
    qaDb.close();
    qaDb = null;
    assert.equal(state.season.day, 60);
    assert.ok(state.winners.length >= 1);
    assert.equal(state.councils.length, 8);
    assert.ok(voted.size >= 7, `votos registrados: ${voted.size}`);
    assert.ok(received.size >= 7, `recepções registradas: ${received.size}`);
    const journal = (await api('/journal?serverId=cc-world-1')).items;
    for (const eventType of ['alliance.formed', 'marriage.celebrated', 'territory.claim.completed', 'army.defended', 'religion.mission_completed', 'religion.heresy_suppressed', 'revolution.separatist', 'council.decided']) assert.ok(journal.some(item => item.eventType === eventType), `jornal sem ${eventType}`);
    assert.ok(journal.some(item => item.kind === 'article'));
    assert.ok(journal.some(item => ['war.victory', 'war.defeat'].includes(item.eventType)));
    console.log(`Crowns full campaign: PASS (${state.councils.length} concílios, ${voted.size} votos, ${received.size} recepções, ${state.winners.length} vencedores).`);
  } finally {
    try { qaDb?.close(); } catch {}
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), sleep(1500)]);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try { fs.rmSync(tempRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); break; } catch { await sleep(250); }
    }
  }
})().catch(error => {
  console.error(error);
  console.error(serverLog);
  process.exitCode = 1;
});
