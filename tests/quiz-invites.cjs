const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = path.resolve(__dirname, '..');
const PORT = 3380 + Math.floor(Math.random() * 200);
const BASE = `http://127.0.0.1:${PORT}`;
const DB_PATH = path.join(os.tmpdir(), `quiz-invites-${process.pid}-${Date.now()}.sqlite`);
const child = spawn(process.execPath, ['server.js'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(PORT), DB_PATH },
  stdio: ['ignore', 'pipe', 'pipe']
});

let logs = '';
child.stdout.on('data', chunk => { logs += chunk; });
child.stderr.on('data', chunk => { logs += chunk; });

function createClient() {
  let cookie = '';

  function absorbCookies(response) {
    const next = response.headers.getSetCookie?.() || [];
    for (const item of next) {
      const pair = item.split(';', 1)[0];
      const key = pair.split('=', 1)[0];
      const parts = cookie.split('; ').filter(Boolean).filter(entry => !entry.startsWith(`${key}=`));
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

  return { request, json };
}

async function waitForServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${BASE}/login`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Servidor não iniciou.\n${logs}`);
}

async function register(client, name, pin) {
  const form = new URLSearchParams({ name, pin, confirm_pin: pin });
  const response = await client.request('/register', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  assert.equal(response.status, 302);
  const lobby = await client.json('/api/quiz/lobby');
  assert.equal(lobby.response.status, 200);
  return lobby.payload.user;
}

async function run() {
  await waitForServer();
  const alice = createClient();
  const bruno = createClient();
  const aliceUser = await register(alice, 'Alice Quiz QA', '4321');
  const brunoUser = await register(bruno, 'Bruno Quiz QA', '5678');

  await bruno.json('/api/quiz/lobby');
  const aliceLobby = await alice.json('/api/quiz/lobby');
  assert.ok(aliceLobby.payload.online.some(player => player.id === brunoUser.id));

  const firstInvite = await alice.json('/api/quiz/invite', {
    method: 'POST',
    body: JSON.stringify({ toUserId: brunoUser.id })
  });
  assert.equal(firstInvite.response.status, 200);
  assert.equal(firstInvite.payload.duplicate, false);
  assert.match(firstInvite.payload.code, /^[A-F0-9]{6}$/);

  const duplicateInvite = await alice.json('/api/quiz/invite', {
    method: 'POST',
    body: JSON.stringify({ toUserId: brunoUser.id })
  });
  assert.equal(duplicateInvite.response.status, 200);
  assert.equal(duplicateInvite.payload.duplicate, true);
  assert.equal(duplicateInvite.payload.direction, 'outgoing');
  assert.equal(duplicateInvite.payload.inviteId, firstInvite.payload.inviteId);

  const reverseDuplicate = await bruno.json('/api/quiz/invite', {
    method: 'POST',
    body: JSON.stringify({ toUserId: aliceUser.id })
  });
  assert.equal(reverseDuplicate.response.status, 200);
  assert.equal(reverseDuplicate.payload.duplicate, true);
  assert.equal(reverseDuplicate.payload.direction, 'incoming');
  assert.equal(reverseDuplicate.payload.inviteId, firstInvite.payload.inviteId);

  const receiverLobby = await bruno.json('/api/quiz/lobby');
  assert.equal(receiverLobby.payload.invites.length, 1);
  assert.equal(receiverLobby.payload.invites[0].id, firstInvite.payload.inviteId);
  assert.equal(receiverLobby.payload.invites[0].code, firstInvite.payload.code);

  const senderLobby = await alice.json('/api/quiz/lobby');
  assert.equal(senderLobby.payload.outgoingInvites.length, 1);
  assert.equal(senderLobby.payload.outgoingInvites[0].id, firstInvite.payload.inviteId);

  const accepted = await bruno.json('/api/quiz/invite/respond', {
    method: 'POST',
    body: JSON.stringify({ inviteId: firstInvite.payload.inviteId, accept: true })
  });
  assert.equal(accepted.response.status, 200);
  assert.equal(accepted.payload.match.mode, 'invite');
  assert.equal(accepted.payload.match.players.length, 2);
  assert.match(accepted.payload.match.roomCode, /^[A-F0-9]{6}$/);

  const acceptedReplay = await bruno.json('/api/quiz/invite/respond', {
    method: 'POST',
    body: JSON.stringify({ inviteId: firstInvite.payload.inviteId, accept: true })
  });
  assert.equal(acceptedReplay.response.status, 200);
  assert.equal(acceptedReplay.payload.duplicate, true);
  assert.equal(acceptedReplay.payload.match.id, accepted.payload.match.id);

  const inviterMatched = await alice.json('/api/quiz/lobby');
  assert.equal(inviterMatched.payload.activeMatch.id, accepted.payload.match.id);
  assert.equal(inviterMatched.payload.activeMatch.roomCode, accepted.payload.match.roomCode);

  const aliceAnswer = await alice.json('/api/quiz/answer', {
    method: 'POST',
    body: JSON.stringify({ matchId: accepted.payload.match.id, answerIndex: 0 })
  });
  assert.equal(aliceAnswer.response.status, 200);
  assert.equal(aliceAnswer.payload.match.players.find(player => player.id === aliceUser.id).answered, true);

  const brunoView = await bruno.json(`/api/quiz/match?id=${encodeURIComponent(accepted.payload.match.id)}`);
  assert.equal(brunoView.response.status, 200);
  assert.equal(brunoView.payload.match.players.find(player => player.id === aliceUser.id).answered, true);
  assert.equal(brunoView.payload.match.players.find(player => player.id === brunoUser.id).answered, false);
  assert.equal(brunoView.payload.match.players.find(player => player.id === aliceUser.id).online, true);
  assert.equal(brunoView.payload.match.players.find(player => player.id === brunoUser.id).online, true);

  const brunoAnswer = await bruno.json('/api/quiz/answer', {
    method: 'POST',
    body: JSON.stringify({ matchId: accepted.payload.match.id, answerIndex: 1 })
  });
  assert.equal(brunoAnswer.response.status, 200);
  assert.equal(brunoAnswer.payload.match.reveal, true);
  assert.ok(brunoAnswer.payload.match.players.every(player => player.answered));

  const database = new DatabaseSync(DB_PATH);
  const inviteCount = database.prepare('SELECT count(*) AS total FROM quiz_invites').get().total;
  const pendingCount = database.prepare("SELECT count(*) AS total FROM quiz_invites WHERE status = 'pending'").get().total;
  const matchCount = database.prepare('SELECT count(*) AS total FROM quiz_matches').get().total;
  const playerCount = database.prepare('SELECT count(*) AS total FROM quiz_match_players WHERE match_id = ?').get(accepted.payload.match.id).total;
  database.close();
  assert.equal(inviteCount, 1);
  assert.equal(pendingCount, 0);
  assert.equal(matchCount, 1);
  assert.equal(playerCount, 2);

  console.log(JSON.stringify({
    ok: true,
    inviteId: firstInvite.payload.inviteId,
    roomCode: accepted.payload.match.roomCode,
    duplicateInviteBlocked: true,
    duplicateAcceptIdempotent: true,
    simultaneousAnswersVisible: true
  }, null, 2));
}

run().catch(error => {
  console.error(error);
  console.error(logs);
  process.exitCode = 1;
}).finally(() => {
  child.kill('SIGTERM');
  setTimeout(() => {
    for (const target of [DB_PATH, `${DB_PATH}-shm`, `${DB_PATH}-wal`]) {
      try { fs.rmSync(target, { force: true }); } catch {}
    }
  }, 100);
});
