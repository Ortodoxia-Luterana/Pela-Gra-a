const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { io } = require('socket.io-client');

const root = path.resolve(__dirname, '..');
const port = 34000 + Math.floor(Math.random() * 900);
const dbPath = path.join(root, 'data', `cores-da-rosa-test-${process.pid}.sqlite`);
const server = spawn(process.execPath, ['--no-warnings', 'tools/preview-cores-da-rosa.cjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(port), DB_PATH: dbPath, CORES_DA_ROSA_LOCAL_PREVIEW: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

function waitForServer() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Servidor de teste não iniciou.')), 12_000);
    server.stdout.on('data', chunk => {
      if (!String(chunk).includes(`localhost:${port}`)) return;
      clearTimeout(timer);
      resolve();
    });
    server.stderr.on('data', chunk => {
      const message = String(chunk);
      if (message.trim()) console.error(message);
    });
    server.once('exit', code => reject(new Error(`Servidor encerrou com código ${code}.`)));
  });
}

function once(socket, event, predicate = () => true, timeout = 7000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`Tempo esgotado esperando ${event}.`));
    }, timeout);
    const handler = payload => {
      if (!predicate(payload)) return;
      clearTimeout(timer);
      socket.off(event, handler);
      resolve(payload);
    };
    socket.on(event, handler);
  });
}

function emitAck(socket, event, payload = {}) {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error, response) => {
      if (error) return reject(error);
      resolve(response);
    });
  });
}

function connect(player) {
  return io(`http://localhost:${port}/cores-da-rosa`, {
    transports: ['websocket'],
    forceNew: true,
    query: { localPlayer: String(player) }
  });
}

(async () => {
  const sockets = [];
  try {
    await waitForServer();
    const player1 = connect(1);
    const player2 = connect(2);
    const player3 = connect(3);
    const player4 = connect(4);
    sockets.push(player1, player2, player3, player4);
    await Promise.all(sockets.map(socket => once(socket, 'lobby:state')));

    const waitingOne = once(player1, 'game:state', state => state.table.id === 'dupla-1' && !state.game);
    assert.equal((await emitAck(player1, 'lobby:join', { roomId: 'dupla-1' })).ok, true);
    await waitingOne;

    const startedOne = once(player1, 'game:state', state => state.table.id === 'dupla-1' && state.game?.status === 'playing');
    const startedTwo = once(player2, 'game:state', state => state.table.id === 'dupla-1' && state.game?.status === 'playing');
    assert.equal((await emitAck(player2, 'lobby:join', { roomId: 'dupla-1' })).ok, true);
    const [state1, state2] = await Promise.all([startedOne, startedTwo]);
    assert.equal(state1.game.hand.length, 6);
    assert.equal(state2.game.hand.length, 6);
    assert.equal('hands' in state1.game, false, 'o cliente não pode receber todas as mãos');
    assert.equal(state1.game.players.every(player => Number.isInteger(player.cardCount)), true);

    const currentSocket = state1.game.isMyTurn ? player1 : player2;
    const currentState = state1.game.isMyTurn ? state1 : state2;
    const illegal = currentState.game.hand.find(card => !card.playable);
    if (illegal) {
      const rejected = await emitAck(currentSocket, 'game:play', { cardId: illegal.id });
      assert.equal(rejected.ok, false, 'o servidor deve recusar carta ilegal');
    }
    const playable = currentState.game.hand.find(card => card.playable && card.kind !== 'rosa' && card.kind !== 'concilio');
    if (playable) {
      const updated = once(currentSocket === player1 ? player2 : player1, 'game:state', state => state.game?.topCard?.id === playable.id);
      assert.equal((await emitAck(currentSocket, 'game:play', { cardId: playable.id })).ok, true);
      await updated;
    } else {
      assert.equal((await emitAck(currentSocket, 'game:draw')).ok, true);
    }

    const waitingThree = once(player3, 'game:state', state => state.table.id === 'comunidade-1' && !state.game);
    await emitAck(player3, 'lobby:join', { roomId: 'comunidade-1' });
    await waitingThree;
    const inviteReceived = once(player4, 'invite:new', invite => invite.roomId === 'comunidade-1');
    assert.equal((await emitAck(player3, 'invite:send', { toUserId: 'cores-da-rosa-local-4', roomId: 'comunidade-1' })).ok, true);
    const invite = await inviteReceived;
    const afterAccept = once(player4, 'game:state', state => state.table.id === 'comunidade-1' && state.table.playerCount === 2 && !state.game);
    assert.equal((await emitAck(player4, 'invite:accept', { inviteId: invite.id })).ok, true);
    await afterAccept;

    await emitAck(player1, 'lobby:leave');
    await emitAck(player2, 'lobby:leave');
    const fourStarted = once(player3, 'game:state', state => state.table.id === 'comunidade-1' && state.game?.status === 'playing');
    await emitAck(player1, 'lobby:join', { roomId: 'comunidade-1' });
    await emitAck(player2, 'lobby:join', { roomId: 'comunidade-1' });
    const fourState = await fourStarted;
    assert.equal(fourState.game.players.length, 4);
    assert.equal(fourState.game.hand.length, 6);

    console.log('Cores da Rosa: mesas, início cheio, mãos privadas, validação e convites OK.');
  } finally {
    sockets.forEach(socket => socket.disconnect());
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
