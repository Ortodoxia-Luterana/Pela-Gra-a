const assert = require('node:assert/strict');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { io } = require('socket.io-client');

const baseUrl = process.env.BABEL_TEST_URL || 'http://127.0.0.1:3000';
const testNames = [`Teste Babel RT A ${Date.now()}`, `Teste Babel RT B ${Date.now()}`];
const pin = '7391';

function waitEvent(socket, event, predicate = () => true, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Timeout waiting for ${event}`));
    }, timeoutMs);
    const handler = payload => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

async function authenticate(name) {
  const form = new URLSearchParams({ name, pin, confirm_pin: pin });
  let response = await fetch(`${baseUrl}/register`, { method: 'POST', body: form, redirect: 'manual' });
  if (response.status === 409) {
    response = await fetch(`${baseUrl}/login`, {
      method: 'POST',
      body: new URLSearchParams({ name, pin }),
      redirect: 'manual'
    });
  }
  assert.equal(response.status, 302, `Authentication failed for ${name}`);
  const cookie = response.headers.get('set-cookie')?.split(';')[0];
  assert.ok(cookie?.startsWith('cultivando_session='), 'Session cookie was not issued');
  return cookie;
}

function connect(cookie) {
  return io(baseUrl, {
    transports: ['websocket'],
    extraHeaders: { Cookie: cookie },
    forceNew: true,
    reconnection: false,
    timeout: 4000
  });
}

function joinPayload(body, x) {
  return {
    regionId: 'campos-fronteiras',
    body,
    weapon: body === 'female' ? 'staff' : 'sword',
    x,
    y: 1950,
    facing: 'down',
    moving: false,
    frame: 0,
    level: 3,
    power: 280
  };
}

function cleanupAccounts() {
  const db = new DatabaseSync(path.join(__dirname, '..', 'data', 'cultivando.sqlite'));
  db.exec('PRAGMA foreign_keys = ON');
  const rows = db.prepare("SELECT id FROM users WHERE name LIKE 'Teste Babel RT %'").all();
  const remove = db.prepare('DELETE FROM users WHERE id = ?');
  db.exec('BEGIN');
  try {
    rows.forEach(row => remove.run(row.id));
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    db.close();
  }
}

async function run() {
  let anonymous;
  let first;
  let second;
  let replacement;
  try {
    anonymous = io(baseUrl, { transports: ['websocket'], forceNew: true, reconnection: false, timeout: 4000 });
    await waitEvent(anonymous, 'connect');
    const anonymousAck = await anonymous.timeout(4000).emitWithAck('babel:join', joinPayload('male', 690));
    assert.equal(anonymousAck.ok, false);
    assert.equal(anonymousAck.error, 'authentication_required');
    anonymous.disconnect();

    const [firstCookie, secondCookie] = await Promise.all(testNames.map(authenticate));
    first = connect(firstCookie);
    second = connect(secondCookie);
    await Promise.all([waitEvent(first, 'connect'), waitEvent(second, 'connect')]);

    const firstInit = waitEvent(first, 'babel:init');
    const firstAck = await first.timeout(4000).emitWithAck('babel:join', joinPayload('male', 690));
    assert.equal(firstAck.ok, true);
    assert.equal((await firstInit).players.length, 0);

    const joinedOnFirst = waitEvent(first, 'babel:player-joined', player => player.name === testNames[1]);
    const secondInit = waitEvent(second, 'babel:init');
    const secondAck = await second.timeout(4000).emitWithAck('babel:join', joinPayload('female', 730));
    const [joined, init] = await Promise.all([joinedOnFirst, secondInit]);
    assert.equal(secondAck.ok, true);
    assert.equal(joined.body, 'female');
    assert.equal(init.players[0].name, testNames[0]);

    await new Promise(resolve => setTimeout(resolve, 50));
    const movement = waitEvent(first, 'babel:player-update', player => player.id === second.id && player.sequence > 0);
    second.emit('babel:move', { x: 790, y: 1950, facing: 'right', moving: true, frame: 1, sequence: 1 });
    const moved = await movement;
    assert.equal(moved.facing, 'right');
    assert.ok(moved.x > 730 && moved.x <= 790, 'Validated movement was not broadcast');

    await new Promise(resolve => setTimeout(resolve, 50));
    const guardedMove = waitEvent(first, 'babel:player-update', player => player.id === second.id && player.sequence > moved.sequence);
    second.emit('babel:move', { x: 99999, y: -99999, facing: 'up', moving: true, frame: 2, sequence: 2 });
    const guarded = await guardedMove;
    assert.ok(guarded.x >= 35 && guarded.x <= 1365);
    assert.ok(guarded.y >= 55 && guarded.y <= 2200);
    assert.ok(Math.hypot(guarded.x - moved.x, guarded.y - moved.y) < 160, 'Teleport guard did not limit the movement');

    const profileUpdate = waitEvent(first, 'babel:player-update', player => player.id === second.id && player.level === 7);
    second.emit('babel:profile', { body: 'female', weapon: 'staff', level: 7, power: 999 });
    const profile = await profileUpdate;
    assert.equal(profile.power, 999);

    const secondId = second.id;
    const left = waitEvent(first, 'babel:player-left', payload => payload.id === secondId);
    second.disconnect();
    assert.equal((await left).name, testNames[1]);

    const replaced = waitEvent(first, 'babel:session-replaced');
    replacement = connect(firstCookie);
    await waitEvent(replacement, 'connect');
    const replacementInit = waitEvent(replacement, 'babel:init');
    const replacementAck = await replacement.timeout(4000).emitWithAck('babel:join', joinPayload('male', 690));
    assert.equal(replacementAck.ok, true);
    assert.equal((await replacementInit).players.length, 0);
    assert.match((await replaced).message, /outra aba/i);

    console.log(JSON.stringify({
      joinedPlayers: 2,
      movement: { x: Math.round(moved.x), y: Math.round(moved.y), facing: moved.facing },
      teleportGuard: { x: Math.round(guarded.x), y: Math.round(guarded.y) },
      profile: { level: profile.level, power: profile.power },
      authenticationGuard: true,
      duplicateSessionGuard: true,
      disconnectBroadcast: true
    }, null, 2));
  } finally {
    anonymous?.disconnect();
    first?.disconnect();
    second?.disconnect();
    replacement?.disconnect();
    await new Promise(resolve => setTimeout(resolve, 80));
    cleanupAccounts();
  }
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
