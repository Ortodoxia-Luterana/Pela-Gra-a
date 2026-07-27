const crypto = require('node:crypto');

const COLORS = ['branco', 'vermelho', 'verde', 'roxo'];
const TABLES = Object.freeze([
  { id: 'dupla-1', name: 'Mesa Melanchthon', capacity: 2, mode: 'Dupla' },
  { id: 'dupla-2', name: 'Mesa Catarina', capacity: 2, mode: 'Dupla' },
  { id: 'dupla-3', name: 'Mesa Bach', capacity: 2, mode: 'Dupla' },
  { id: 'comunidade-1', name: 'Mesa Wittenberg', capacity: 4, mode: 'Comunidade' },
  { id: 'comunidade-2', name: 'Mesa Augsburgo', capacity: 4, mode: 'Comunidade' }
]);
const TABLE_BY_ID = new Map(TABLES.map(table => [table.id, table]));

function createCoresDaRosaService({ db, gameId = 'cores-da-rosa' }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS cdr_room_members (
      room_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      seat INTEGER NOT NULL,
      joined_at TEXT NOT NULL,
      PRIMARY KEY (room_id, user_id),
      UNIQUE (room_id, seat)
    );
    CREATE TABLE IF NOT EXISTS cdr_room_games (
      room_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cdr_invites (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      from_user_id TEXT NOT NULL,
      from_user_name TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cdr_stats (
      user_id TEXT PRIMARY KEY,
      user_name TEXT NOT NULL,
      matches INTEGER NOT NULL DEFAULT 0,
      wins INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);

  // Mesas são sessões ao vivo. Reiniciar o processo encerra partidas antigas,
  // enquanto vitórias e pontuação continuam persistidas.
  db.exec('DELETE FROM cdr_room_members; DELETE FROM cdr_room_games;');
  db.prepare("DELETE FROM cdr_invites WHERE status = 'pending'").run();

  const listMembers = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members ORDER BY room_id, seat');
  const listRoomMembers = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE room_id = ? ORDER BY seat');
  const findMembership = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE user_id = ? LIMIT 1');
  const findRoomMembership = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE room_id = ? AND user_id = ?');
  const insertMember = db.prepare('INSERT INTO cdr_room_members (room_id, user_id, user_name, seat, joined_at) VALUES (?, ?, ?, ?, ?)');
  const deleteMember = db.prepare('DELETE FROM cdr_room_members WHERE room_id = ? AND user_id = ?');
  const deleteUserMembership = db.prepare('DELETE FROM cdr_room_members WHERE user_id = ?');
  const getGameRow = db.prepare('SELECT state_json FROM cdr_room_games WHERE room_id = ?');
  const putGame = db.prepare(`
    INSERT INTO cdr_room_games (room_id, state_json, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(room_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `);
  const deleteGame = db.prepare('DELETE FROM cdr_room_games WHERE room_id = ?');
  const insertInvite = db.prepare('INSERT INTO cdr_invites (id, room_id, from_user_id, from_user_name, to_user_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const getInvite = db.prepare('SELECT * FROM cdr_invites WHERE id = ?');
  const updateInvite = db.prepare('UPDATE cdr_invites SET status = ? WHERE id = ?');
  const pendingInvites = db.prepare("SELECT * FROM cdr_invites WHERE to_user_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 12");
  const expireInvites = db.prepare("UPDATE cdr_invites SET status = 'expired' WHERE status = 'pending' AND created_at < ?");
  const upsertStats = db.prepare(`
    INSERT INTO cdr_stats (user_id, user_name, matches, wins, points, updated_at)
    VALUES (?, ?, 1, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      user_name = excluded.user_name,
      matches = cdr_stats.matches + 1,
      wins = cdr_stats.wins + excluded.wins,
      points = cdr_stats.points + excluded.points,
      updated_at = excluded.updated_at
  `);
  const getStats = db.prepare('SELECT user_id, user_name, matches, wins, points FROM cdr_stats WHERE user_id = ?');
  const ranking = db.prepare('SELECT user_id, user_name, matches, wins, points FROM cdr_stats ORDER BY wins DESC, points DESC, matches ASC LIMIT 10');

  const onlineSockets = new Map();
  const disconnectTimers = new Map();
  let namespace = null;

  function now() {
    return new Date().toISOString();
  }

  function parseState(roomId) {
    const row = getGameRow.get(roomId);
    if (!row) return null;
    try {
      return JSON.parse(row.state_json);
    } catch {
      deleteGame.run(roomId);
      return null;
    }
  }

  function saveState(state) {
    state.updatedAt = now();
    putGame.run(state.roomId, JSON.stringify(state), state.updatedAt);
  }

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swap = crypto.randomInt(index + 1);
      [result[index], result[swap]] = [result[swap], result[index]];
    }
    return result;
  }

  function createDeck() {
    let serial = 0;
    const deck = [];
    for (const color of COLORS) {
      for (let value = 1; value <= 9; value += 1) {
        for (let copy = 0; copy < 2; copy += 1) {
          deck.push({ id: `${color}-${value}-${copy}-${serial++}`, color, kind: 'numero', value });
        }
      }
      for (const kind of ['cantico', 'procissao', 'partilha']) {
        for (let copy = 0; copy < 2; copy += 1) {
          deck.push({ id: `${color}-${kind}-${copy}-${serial++}`, color, kind, value: null });
        }
      }
    }
    for (let copy = 0; copy < 4; copy += 1) {
      deck.push({ id: `rosa-${copy}-${serial++}`, color: null, kind: 'rosa', value: null });
      deck.push({ id: `concilio-${copy}-${serial++}`, color: null, kind: 'concilio', value: null });
    }
    return shuffle(deck);
  }

  function drawOne(state) {
    if (!state.deck.length) {
      const top = state.discard.pop();
      state.deck = shuffle(state.discard);
      state.discard = top ? [top] : [];
    }
    return state.deck.pop() || null;
  }

  function scoreCard(card) {
    if (card.kind === 'numero') return Number(card.value || 0);
    if (card.kind === 'rosa' || card.kind === 'concilio') return 18;
    return 12;
  }

  function nextIndex(state, from = state.turnIndex, steps = 1) {
    const size = state.players.length;
    return (from + state.direction * steps + size * 10) % size;
  }

  function canPlay(card, state) {
    if (!card) return false;
    if (card.kind === 'rosa' || card.kind === 'concilio') return true;
    const top = state.discard[state.discard.length - 1];
    if (card.color === state.activeColor) return true;
    if (card.kind === 'numero') return top?.kind === 'numero' && card.value === top.value;
    return card.kind === top?.kind;
  }

  function createMatch(roomId, members) {
    const deck = createDeck();
    const hands = Object.fromEntries(members.map(member => [member.user_id, []]));
    for (let round = 0; round < 6; round += 1) {
      members.forEach(member => hands[member.user_id].push(deck.pop()));
    }
    let opening = deck.pop();
    while (opening && opening.kind !== 'numero') {
      deck.unshift(opening);
      opening = deck.pop();
    }
    const first = crypto.randomInt(members.length);
    const state = {
      id: crypto.randomUUID(),
      roomId,
      status: 'playing',
      round: 1,
      players: members.map(member => ({
        userId: member.user_id,
        name: member.user_name,
        seat: member.seat
      })),
      hands,
      deck,
      discard: [opening],
      activeColor: opening.color,
      turnIndex: first,
      direction: 1,
      drawnCardId: null,
      message: `A vez é de ${members[first].user_name}.`,
      winnerId: null,
      winnerName: null,
      pointsAwarded: 0,
      startedAt: now(),
      updatedAt: now()
    };
    saveState(state);
    return state;
  }

  function publicCard(card) {
    if (!card) return null;
    return { id: card.id, color: card.color, kind: card.kind, value: card.value };
  }

  function gameView(state, userId) {
    if (!state) return null;
    const hand = state.hands[userId] || [];
    const top = state.discard[state.discard.length - 1];
    const current = state.players[state.turnIndex];
    return {
      id: state.id,
      roomId: state.roomId,
      status: state.status,
      activeColor: state.activeColor,
      topCard: publicCard(top),
      deckCount: state.deck.length,
      direction: state.direction,
      currentUserId: current?.userId || null,
      isMyTurn: state.status === 'playing' && current?.userId === userId,
      mayPass: current?.userId === userId && Boolean(state.drawnCardId),
      hand: hand.map(card => ({ ...publicCard(card), playable: current?.userId === userId && canPlay(card, state) })),
      players: state.players.map(player => ({
        ...player,
        cardCount: state.hands[player.userId]?.length || 0,
        connected: onlineSockets.has(player.userId)
      })),
      message: state.message,
      winnerId: state.winnerId,
      winnerName: state.winnerName,
      pointsAwarded: state.pointsAwarded,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt
    };
  }

  function tableView(table, userId) {
    const members = listRoomMembers.all(table.id);
    const game = parseState(table.id);
    return {
      ...table,
      playerCount: members.length,
      full: members.length === table.capacity,
      status: game?.status || (members.length ? 'waiting' : 'open'),
      isMember: members.some(member => member.user_id === userId),
      players: members.map(member => ({
        userId: member.user_id,
        name: member.user_name,
        seat: member.seat,
        connected: onlineSockets.has(member.user_id)
      }))
    };
  }

  function lobbyView(user) {
    expireInvites.run(new Date(Date.now() - 10 * 60 * 1000).toISOString());
    const online = [...onlineSockets.entries()]
      .filter(([userId]) => userId !== user.id)
      .map(([userId, entry]) => ({ userId, name: entry.user.name, inRoom: Boolean(findMembership.get(userId)) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return {
      gameId,
      me: { id: user.id, name: user.name },
      tables: TABLES.map(table => tableView(table, user.id)),
      online,
      invites: pendingInvites.all(user.id).map(invite => ({
        id: invite.id,
        roomId: invite.room_id,
        roomName: TABLE_BY_ID.get(invite.room_id)?.name || invite.room_id,
        fromUserId: invite.from_user_id,
        fromUserName: invite.from_user_name,
        createdAt: invite.created_at
      })),
      stats: getStats.get(user.id) || { user_id: user.id, user_name: user.name, matches: 0, wins: 0, points: 0 },
      ranking: ranking.all()
    };
  }

  function emitUser(userId, event, payload) {
    namespace?.to(`user:${userId}`).emit(event, payload);
  }

  function emitLobby() {
    if (!namespace) return;
    for (const [userId, entry] of onlineSockets.entries()) {
      emitUser(userId, 'lobby:state', lobbyView(entry.user));
    }
  }

  function emitRoom(roomId) {
    if (!namespace) return;
    const members = listRoomMembers.all(roomId);
    const state = parseState(roomId);
    members.forEach(member => emitUser(member.user_id, 'game:state', {
      table: tableView(TABLE_BY_ID.get(roomId), member.user_id),
      game: gameView(state, member.user_id)
    }));
    emitLobby();
  }

  function maybeStart(roomId) {
    const table = TABLE_BY_ID.get(roomId);
    const members = listRoomMembers.all(roomId);
    const current = parseState(roomId);
    if (table && members.length === table.capacity && (!current || current.status !== 'playing')) {
      createMatch(roomId, members);
      return true;
    }
    return false;
  }

  function joinRoom(user, roomId) {
    const table = TABLE_BY_ID.get(roomId);
    if (!table) throw new Error('Mesa desconhecida.');
    const existing = findMembership.get(user.id);
    if (existing?.room_id === roomId) return;
    if (existing) {
      const oldGame = parseState(existing.room_id);
      if (oldGame?.status === 'playing') throw new Error('Saia da partida atual antes de trocar de mesa.');
      deleteUserMembership.run(user.id);
    }
    const members = listRoomMembers.all(roomId);
    if (members.length >= table.capacity) throw new Error('Esta mesa já está cheia.');
    if (parseState(roomId)?.status === 'playing') throw new Error('Esta partida já começou.');
    const occupied = new Set(members.map(member => member.seat));
    let seat = 0;
    while (occupied.has(seat)) seat += 1;
    insertMember.run(roomId, user.id, user.name, seat, now());
    maybeStart(roomId);
    emitRoom(roomId);
  }

  function finishMatch(state, winnerId, message) {
    if (state.status !== 'playing') return;
    const winner = state.players.find(player => player.userId === winnerId);
    const points = Object.entries(state.hands)
      .filter(([userId]) => userId !== winnerId)
      .flatMap(([, hand]) => hand)
      .reduce((sum, card) => sum + scoreCard(card), 0);
    state.status = 'finished';
    state.winnerId = winnerId;
    state.winnerName = winner?.name || 'Jogador';
    state.pointsAwarded = points;
    state.message = message || `${state.winnerName} completou a mão!`;
    state.players.forEach(player => {
      upsertStats.run(player.userId, player.name, player.userId === winnerId ? 1 : 0, player.userId === winnerId ? points : 0, now());
    });
    saveState(state);
  }

  function leaveRoom(user) {
    const member = findMembership.get(user.id);
    if (!member) return;
    const state = parseState(member.room_id);
    if (state?.status === 'playing') {
      const contenders = state.players.filter(player => player.userId !== user.id);
      if (contenders.length) finishMatch(state, contenders[0].userId, `${user.name} saiu; ${contenders[0].name} venceu por permanência.`);
    }
    deleteMember.run(member.room_id, user.id);
    if (!listRoomMembers.all(member.room_id).length) deleteGame.run(member.room_id);
    emitRoom(member.room_id);
  }

  function applyCard(user, cardId, chosenColor) {
    const member = findMembership.get(user.id);
    if (!member) throw new Error('Você não está em uma mesa.');
    const state = parseState(member.room_id);
    if (!state || state.status !== 'playing') throw new Error('A partida ainda não começou.');
    const current = state.players[state.turnIndex];
    if (current?.userId !== user.id) throw new Error('Aguarde a sua vez.');
    const hand = state.hands[user.id];
    const index = hand.findIndex(card => card.id === cardId);
    const card = hand[index];
    if (!card || !canPlay(card, state)) throw new Error('Esta carta não pode ser jogada agora.');
    if ((card.kind === 'rosa' || card.kind === 'concilio') && !COLORS.includes(chosenColor)) {
      throw new Error('Escolha a próxima cor.');
    }

    hand.splice(index, 1);
    state.discard.push(card);
    state.drawnCardId = null;
    state.activeColor = card.color || chosenColor;

    if (!hand.length) {
      finishMatch(state, user.id);
      emitRoom(member.room_id);
      return;
    }

    if (card.kind === 'procissao') {
      state.direction *= -1;
      state.turnIndex = nextIndex(state);
      state.message = `A procissão mudou de direção. Vez de ${state.players[state.turnIndex].name}.`;
    } else if (card.kind === 'cantico') {
      state.turnIndex = nextIndex(state, state.turnIndex, 2);
      state.message = `O cântico segurou uma vez. Agora joga ${state.players[state.turnIndex].name}.`;
    } else if (card.kind === 'partilha') {
      const targetIndex = nextIndex(state);
      const target = state.players[targetIndex];
      for (let count = 0; count < 2; count += 1) {
        const drawn = drawOne(state);
        if (drawn) state.hands[target.userId].push(drawn);
      }
      state.turnIndex = nextIndex(state, targetIndex);
      state.message = `${target.name} recebeu duas cartas na partilha. Vez de ${state.players[state.turnIndex].name}.`;
    } else if (card.kind === 'concilio') {
      state.players.forEach(player => {
        if (player.userId === user.id) return;
        const drawn = drawOne(state);
        if (drawn) state.hands[player.userId].push(drawn);
      });
      state.turnIndex = nextIndex(state);
      state.message = `O concílio reuniu a mesa em ${state.activeColor}. Vez de ${state.players[state.turnIndex].name}.`;
    } else {
      state.turnIndex = nextIndex(state);
      state.message = `Vez de ${state.players[state.turnIndex].name}.`;
    }
    saveState(state);
    emitRoom(member.room_id);
  }

  function drawCard(user) {
    const member = findMembership.get(user.id);
    const state = member && parseState(member.room_id);
    if (!state || state.status !== 'playing') throw new Error('A partida ainda não começou.');
    if (state.players[state.turnIndex]?.userId !== user.id) throw new Error('Aguarde a sua vez.');
    if (state.drawnCardId) throw new Error('Você já comprou uma carta. Jogue-a ou passe.');
    const card = drawOne(state);
    if (!card) throw new Error('O monte está vazio.');
    state.hands[user.id].push(card);
    if (canPlay(card, state)) {
      state.drawnCardId = card.id;
      state.message = `${user.name} comprou uma carta jogável.`;
    } else {
      state.turnIndex = nextIndex(state);
      state.message = `${user.name} comprou e passou. Vez de ${state.players[state.turnIndex].name}.`;
    }
    saveState(state);
    emitRoom(member.room_id);
  }

  function passTurn(user) {
    const member = findMembership.get(user.id);
    const state = member && parseState(member.room_id);
    if (!state || state.status !== 'playing') throw new Error('A partida ainda não começou.');
    if (state.players[state.turnIndex]?.userId !== user.id || !state.drawnCardId) throw new Error('Não é possível passar agora.');
    state.drawnCardId = null;
    state.turnIndex = nextIndex(state);
    state.message = `${user.name} passou. Vez de ${state.players[state.turnIndex].name}.`;
    saveState(state);
    emitRoom(member.room_id);
  }

  function sendInvite(user, toUserId, roomId) {
    const table = TABLE_BY_ID.get(roomId);
    if (!table) throw new Error('Escolha uma mesa válida.');
    if (!findRoomMembership.get(roomId, user.id)) throw new Error('Entre nessa mesa antes de convidar alguém.');
    if (toUserId === user.id) throw new Error('Você já está aqui.');
    if (!onlineSockets.has(toUserId)) throw new Error('Esse jogador não está mais online.');
    if (listRoomMembers.all(roomId).length >= table.capacity) throw new Error('A mesa ficou cheia.');
    const id = crypto.randomUUID();
    insertInvite.run(id, roomId, user.id, user.name, toUserId, 'pending', now());
    emitUser(toUserId, 'invite:new', {
      id,
      roomId,
      roomName: table.name,
      fromUserId: user.id,
      fromUserName: user.name,
      createdAt: now()
    });
    emitLobby();
  }

  function acceptInvite(user, inviteId) {
    const invite = getInvite.get(inviteId);
    if (!invite || invite.to_user_id !== user.id || invite.status !== 'pending') throw new Error('Este convite não está mais disponível.');
    joinRoom(user, invite.room_id);
    updateInvite.run('accepted', inviteId);
    emitLobby();
  }

  function requestRematch(user) {
    const member = findMembership.get(user.id);
    if (!member) throw new Error('Você não está em uma mesa.');
    const state = parseState(member.room_id);
    if (!state || state.status !== 'finished') throw new Error('A rodada ainda não terminou.');
    state.rematchVotes ||= [];
    if (!state.rematchVotes.includes(user.id)) state.rematchVotes.push(user.id);
    const members = listRoomMembers.all(member.room_id);
    if (members.length === TABLE_BY_ID.get(member.room_id).capacity && state.rematchVotes.length === members.length) {
      createMatch(member.room_id, members);
    } else {
      state.message = `${state.rematchVotes.length}/${members.length} confirmaram a revanche.`;
      saveState(state);
    }
    emitRoom(member.room_id);
  }

  function safeAck(ack, callback) {
    try {
      const result = callback();
      if (typeof ack === 'function') ack({ ok: true, ...result });
    } catch (error) {
      if (typeof ack === 'function') ack({ ok: false, error: error.message || 'A ação foi rejeitada.' });
    }
  }

  function attachRealtime(io, { currentUser, hasValidLaunch }) {
    namespace = io.of('/cores-da-rosa');
    namespace.use((socket, next) => {
      const user = currentUser(socket.request);
      if (!user || !hasValidLaunch(socket.request, user.id)) return next(new Error('launch_required'));
      socket.data.user = user;
      next();
    });
    namespace.on('connection', socket => {
      const user = socket.data.user;
      clearTimeout(disconnectTimers.get(user.id));
      disconnectTimers.delete(user.id);
      const existing = onlineSockets.get(user.id) || { user, socketIds: new Set() };
      existing.user = user;
      existing.socketIds.add(socket.id);
      onlineSockets.set(user.id, existing);
      socket.join(`user:${user.id}`);
      socket.emit('lobby:state', lobbyView(user));
      const member = findMembership.get(user.id);
      if (member) socket.emit('game:state', {
        table: tableView(TABLE_BY_ID.get(member.room_id), user.id),
        game: gameView(parseState(member.room_id), user.id)
      });
      emitLobby();

      socket.on('lobby:join', (payload, ack) => safeAck(ack, () => joinRoom(user, String(payload?.roomId || ''))));
      socket.on('lobby:leave', (_payload, ack) => safeAck(ack, () => leaveRoom(user)));
      socket.on('invite:send', (payload, ack) => safeAck(ack, () => sendInvite(user, String(payload?.toUserId || ''), String(payload?.roomId || ''))));
      socket.on('invite:accept', (payload, ack) => safeAck(ack, () => acceptInvite(user, String(payload?.inviteId || ''))));
      socket.on('invite:decline', (payload, ack) => safeAck(ack, () => {
        const invite = getInvite.get(String(payload?.inviteId || ''));
        if (!invite || invite.to_user_id !== user.id) throw new Error('Convite desconhecido.');
        updateInvite.run('declined', invite.id);
        emitLobby();
      }));
      socket.on('game:play', (payload, ack) => safeAck(ack, () => applyCard(user, String(payload?.cardId || ''), String(payload?.chosenColor || ''))));
      socket.on('game:draw', (_payload, ack) => safeAck(ack, () => drawCard(user)));
      socket.on('game:pass', (_payload, ack) => safeAck(ack, () => passTurn(user)));
      socket.on('game:rematch', (_payload, ack) => safeAck(ack, () => requestRematch(user)));
      socket.on('lobby:refresh', () => socket.emit('lobby:state', lobbyView(user)));

      socket.on('disconnect', () => {
        const entry = onlineSockets.get(user.id);
        entry?.socketIds.delete(socket.id);
        if (entry?.socketIds.size) return;
        onlineSockets.delete(user.id);
        const timer = setTimeout(() => {
          if (onlineSockets.has(user.id)) return;
          leaveRoom(user);
          disconnectTimers.delete(user.id);
        }, 30_000);
        timer.unref?.();
        disconnectTimers.set(user.id, timer);
        emitLobby();
      });
    });
    return namespace;
  }

  return {
    attachRealtime,
    lobbyView,
    TABLES,
    COLORS
  };
}

module.exports = {
  createCoresDaRosaService,
  CORES_DA_ROSA_TABLES: TABLES,
  CORES_DA_ROSA_COLORS: COLORS
};
