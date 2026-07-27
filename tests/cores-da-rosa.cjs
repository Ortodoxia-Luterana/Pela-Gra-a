const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { DatabaseSync } = require('node:sqlite');
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

function numberCard(id, color, value) {
  return { id, color, kind: 'numero', value };
}

function actionCard(id, color, kind) {
  return { id, color, kind, value: null };
}

(async () => {
  const sockets = [];
  let qaDb;
  try {
    await waitForServer();
    const player1 = connect(1);
    const player2 = connect(2);
    const player3 = connect(3);
    const player4 = connect(4);
    sockets.push(player1, player2, player3, player4);
    const lobbyStates = await Promise.all(sockets.map(socket => once(socket, 'lobby:state')));
    assert.equal(lobbyStates.every(state => state.localPreview === true), true);

    const waitingOne = once(player1, 'game:state', state => state.table.id === 'dupla-1' && !state.game);
    assert.equal((await emitAck(player1, 'lobby:join', { roomId: 'dupla-1' })).ok, true);
    await waitingOne;

    const startedOne = once(player1, 'game:state', state => state.table.id === 'dupla-1' && state.game?.status === 'playing');
    const startedTwo = once(player2, 'game:state', state => state.table.id === 'dupla-1' && state.game?.status === 'playing');
    assert.equal((await emitAck(player2, 'lobby:join', { roomId: 'dupla-1' })).ok, true);
    const [state1, state2] = await Promise.all([startedOne, startedTwo]);
    assert.equal(state1.game.hand.length, 7);
    assert.equal(state2.game.hand.length, 7);
    assert.equal(state1.game.deckCount + state1.game.players.reduce((sum, player) => sum + player.cardCount, 0) + 1, 108);
    assert.equal('hands' in state1.game, false, 'o cliente não pode receber todas as mãos');
    assert.equal(state1.game.players.every(player => Number.isInteger(player.cardCount)), true);

    qaDb = new DatabaseSync(dbPath);
    const readGame = qaDb.prepare('SELECT state_json FROM cdr_room_games WHERE room_id = ?');
    const writeGame = qaDb.prepare('UPDATE cdr_room_games SET state_json = ?, updated_at = ? WHERE room_id = ?');
    const setControlledState = mutate => {
      const state = JSON.parse(readGame.get('dupla-1').state_json);
      mutate(state);
      state.updatedAt = new Date().toISOString();
      writeGame.run(JSON.stringify(state), state.updatedAt, 'dupla-1');
      return state;
    };

    const p1 = 'cores-da-rosa-local-1';
    const p2 = 'cores-da-rosa-local-2';
    const fillerDeck = Array.from({ length: 24 }, (_, index) => numberCard(`deck-${index}`, 'branco', index % 10));
    setControlledState(state => {
      state.status = 'playing';
      state.turnIndex = state.players.findIndex(player => player.userId === p1);
      state.direction = 1;
      state.activeColor = 'vermelho';
      state.pendingDraw = 0;
      state.drawnCardId = null;
      state.discard = [numberCard('topo-5', 'vermelho', 5)];
      state.deck = fillerDeck;
      state.hands[p1] = [
        numberCard('vermelho-7', 'vermelho', 7),
        numberCard('verde-7', 'verde', 7),
        numberCard('roxo-7', 'roxo', 7),
        numberCard('verde-8', 'verde', 8)
      ];
      state.hands[p2] = [numberCard('p2-1', 'branco', 1), numberCard('p2-2', 'verde', 2)];
    });

    const invalidSequence = await emitAck(player1, 'game:play', { cardIds: ['vermelho-7', 'verde-8'] });
    assert.equal(invalidSequence.ok, false, 'números diferentes não podem formar sequência');

    const sequenceUpdate = once(player2, 'game:state', state => state.game?.topCard?.id === 'roxo-7');
    assert.equal((await emitAck(player1, 'game:play', {
      cardIds: ['vermelho-7', 'verde-7', 'roxo-7']
    })).ok, true);
    const sequenceState = await sequenceUpdate;
    assert.equal(sequenceState.game.activeColor, 'roxo');
    assert.equal(sequenceState.game.players.find(player => player.userId === p1).cardCount, 1);

    setControlledState(state => {
      state.status = 'playing';
      state.turnIndex = state.players.findIndex(player => player.userId === p1);
      state.direction = 1;
      state.activeColor = 'vermelho';
      state.pendingDraw = 2;
      state.drawnCardId = null;
      state.discard = [actionCard('topo-mais2', 'vermelho', 'mais2')];
      state.deck = Array.from({ length: 24 }, (_, index) => numberCard(`penalidade-${index}`, 'branco', index % 10));
      state.hands[p1] = [
        actionCard('p1-mais4', null, 'mais4'),
        numberCard('p1-reserva', 'roxo', 3)
      ];
      state.hands[p2] = [
        actionCard('p2-mais2', 'verde', 'mais2'),
        numberCard('p2-reserva', 'branco', 6)
      ];
    });

    const stackedFour = once(player2, 'game:state', state => state.game?.pendingDraw === 6);
    assert.equal((await emitAck(player1, 'game:play', {
      cardIds: ['p1-mais4'],
      chosenColor: 'verde'
    })).ok, true);
    const plusSixState = await stackedFour;
    assert.equal(plusSixState.game.activeColor, 'verde');
    assert.equal(plusSixState.game.topCard.kind, 'mais4');

    const stackedTwo = once(player1, 'game:state', state => state.game?.pendingDraw === 8);
    assert.equal((await emitAck(player2, 'game:play', { cardIds: ['p2-mais2'] })).ok, true);
    await stackedTwo;

    const penaltyDrawn = once(player1, 'game:state', state => state.game?.pendingDraw === 0 && !state.game.isMyTurn);
    assert.equal((await emitAck(player1, 'game:draw')).ok, true);
    const penaltyState = await penaltyDrawn;
    assert.equal(penaltyState.game.hand.length, 9, 'a pilha +2, +4, +2 deve obrigar a compra de oito cartas');

    const botStarted = once(player3, 'game:state', state => state.table.id === 'dupla-2' && state.game?.status === 'playing');
    assert.equal((await emitAck(player3, 'lobby:join', { roomId: 'dupla-2' })).ok, true);
    assert.equal((await emitAck(player3, 'lobby:fill-bots')).ok, true);
    const botState = await botStarted;
    assert.equal(botState.game.players.length, 2);
    assert.equal(botState.game.players.some(player => player.isBot), true);
    assert.equal(botState.game.hand.length, 7);
    await emitAck(player3, 'lobby:leave');

    const waitingThree = once(player3, 'game:state', state => state.table.id === 'comunidade-1' && !state.game);
    await emitAck(player3, 'lobby:join', { roomId: 'comunidade-1' });
    await waitingThree;
    const inviteReceived = once(player4, 'invite:new', invite => invite.roomId === 'comunidade-1');
    assert.equal((await emitAck(player3, 'invite:send', {
      toUserId: 'cores-da-rosa-local-4',
      roomId: 'comunidade-1'
    })).ok, true);
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
    assert.equal(fourState.game.hand.length, 7);

    console.log('Cores da Rosa: baralho, mesas cheias, mãos privadas, sequência, pilha +2/+4, bots e convites OK.');
  } finally {
    qaDb?.close();
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
