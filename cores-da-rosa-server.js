const crypto = require('node:crypto');

const COLORS = ['branco', 'vermelho', 'verde', 'roxo'];
const DRAW_KINDS = new Set(['mais2', 'mais4']);
const TABLES = Object.freeze([
  { id: 'dupla-1', name: 'Mesa Melanchthon', capacity: 2, mode: 'Dupla' },
  { id: 'dupla-2', name: 'Mesa Catarina', capacity: 2, mode: 'Dupla' },
  { id: 'dupla-3', name: 'Mesa Bach', capacity: 2, mode: 'Dupla' },
  { id: 'comunidade-1', name: 'Mesa Wittenberg', capacity: 4, mode: 'Comunidade' },
  { id: 'comunidade-2', name: 'Mesa Augsburgo', capacity: 4, mode: 'Comunidade' }
]);
const TABLE_BY_ID = new Map(TABLES.map(table => [table.id, table]));
const BOT_NAMES = ['Käthe', 'Felipe', 'Johann', 'Elisabeth'];

function createCoresDaRosaService({ db, gameId = 'cores-da-rosa', allowBots = false }) {
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

  // Partidas ao vivo são reiniciadas com o processo. O histórico da conta permanece.
  db.exec('DELETE FROM cdr_room_members; DELETE FROM cdr_room_games;');
  db.prepare("DELETE FROM cdr_invites WHERE status = 'pending'").run();

  const listRoomMembers = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE room_id = ? ORDER BY seat');
  const findMembership = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE user_id = ? LIMIT 1');
  const findRoomMembership = db.prepare('SELECT room_id, user_id, user_name, seat, joined_at FROM cdr_room_members WHERE room_id = ? AND user_id = ?');
  const insertMember = db.prepare('INSERT INTO cdr_room_members (room_id, user_id, user_name, seat, joined_at) VALUES (?, ?, ?, ?, ?)');
  const deleteMember = db.prepare('DELETE FROM cdr_room_members WHERE room_id = ? AND user_id = ?');
  const deleteUserMembership = db.prepare('DELETE FROM cdr_room_members WHERE user_id = ?');
  const deleteRoomBots = db.prepare("DELETE FROM cdr_room_members WHERE room_id = ? AND user_id LIKE 'cdr-bot:%'");
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
  const ranking = db.prepare("SELECT user_id, user_name, matches, wins, points FROM cdr_stats WHERE user_id NOT LIKE 'cdr-bot:%' ORDER BY wins DESC, points DESC, matches ASC LIMIT 10");

  const onlineSockets = new Map();
  const disconnectTimers = new Map();
  const botTimers = new Map();
  let namespace = null;

  const now = () => new Date().toISOString();
  const isBotId = userId => String(userId || '').startsWith('cdr-bot:');

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
      deck.push({ id: `${color}-0-${serial++}`, color, kind: 'numero', value: 0 });
      for (let value = 1; value <= 9; value += 1) {
        for (let copy = 0; copy < 2; copy += 1) {
          deck.push({ id: `${color}-${value}-${copy}-${serial++}`, color, kind: 'numero', value });
        }
      }
      for (const kind of ['pular', 'inverter', 'mais2']) {
        for (let copy = 0; copy < 2; copy += 1) {
          deck.push({ id: `${color}-${kind}-${copy}-${serial++}`, color, kind, value: null });
        }
      }
    }
    for (let copy = 0; copy < 4; copy += 1) {
      deck.push({ id: `coringa-${copy}-${serial++}`, color: null, kind: 'coringa', value: null });
      deck.push({ id: `mais4-${copy}-${serial++}`, color: null, kind: 'mais4', value: null });
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

  function drawMany(state, userId, amount) {
    for (let count = 0; count < amount; count += 1) {
      const card = drawOne(state);
      if (card) state.hands[userId].push(card);
    }
  }

  function scoreCard(card) {
    if (card.kind === 'numero') return Number(card.value || 0);
    if (card.kind === 'coringa' || card.kind === 'mais4') return 50;
    return 20;
  }

  function nextIndex(state, from = state.turnIndex, steps = 1) {
    const size = state.players.length;
    return (from + state.direction * steps + size * 20) % size;
  }

  function canPlayFirst(card, state) {
    if (!card) return false;
    if (state.pendingDraw > 0) return DRAW_KINDS.has(card.kind);
    if (card.kind === 'coringa' || card.kind === 'mais4') return true;
    if (card.color === state.activeColor) return true;
    const top = state.discard[state.discard.length - 1];
    if (card.kind === 'numero') return top?.kind === 'numero' && card.value === top.value;
    return card.kind === top?.kind;
  }

  function createMatch(roomId, members) {
    const deck = createDeck();
    const hands = Object.fromEntries(members.map(member => [member.user_id, []]));
    for (let round = 0; round < 7; round += 1) {
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
      players: members.map(member => ({
        userId: member.user_id,
        name: member.user_name,
        seat: member.seat,
        isBot: isBotId(member.user_id)
      })),
      hands,
      deck,
      discard: [opening],
      activeColor: opening.color,
      turnIndex: first,
      direction: 1,
      pendingDraw: 0,
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
      pendingDraw: state.pendingDraw,
      currentUserId: current?.userId || null,
      isMyTurn: state.status === 'playing' && current?.userId === userId,
      mayPass: current?.userId === userId && Boolean(state.drawnCardId),
      drawnCardId: current?.userId === userId ? state.drawnCardId : null,
      hand: hand.map(card => ({
        ...publicCard(card),
        playable: current?.userId === userId
          && (!state.drawnCardId || state.drawnCardId === card.id)
          && canPlayFirst(card, state)
      })),
      players: state.players.map(player => ({
        ...player,
        cardCount: state.hands[player.userId]?.length || 0,
        connected: player.isBot || onlineSockets.has(player.userId)
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
        isBot: isBotId(member.user_id),
        connected: isBotId(member.user_id) || onlineSockets.has(member.user_id)
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
      localPreview: allowBots,
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
    const table = TABLE_BY_ID.get(roomId);
    const members = listRoomMembers.all(roomId);
    const state = parseState(roomId);
    members.forEach(member => emitUser(member.user_id, 'game:state', {
      table: tableView(table, member.user_id),
      game: gameView(state, member.user_id)
    }));
    emitLobby();
    scheduleBot(roomId);
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

  function fillWithBots(user) {
    if (!allowBots) throw new Error('Jogadores de teste só estão disponíveis na prévia local.');
    const member = findMembership.get(user.id);
    if (!member) throw new Error('Entre em uma mesa antes de adicionar jogadores de teste.');
    if (parseState(member.room_id)?.status === 'playing') throw new Error('A partida já começou.');
    const table = TABLE_BY_ID.get(member.room_id);
    const members = listRoomMembers.all(member.room_id);
    const occupied = new Set(members.map(item => item.seat));
    for (let seat = 0; seat < table.capacity; seat += 1) {
      if (occupied.has(seat)) continue;
      const botId = `cdr-bot:${member.room_id}:${seat}`;
      insertMember.run(member.room_id, botId, `Bot ${BOT_NAMES[seat] || seat + 1}`, seat, now());
    }
    maybeStart(member.room_id);
    emitRoom(member.room_id);
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
    state.players.filter(player => !player.isBot).forEach(player => {
      upsertStats.run(player.userId, player.name, player.userId === winnerId ? 1 : 0, player.userId === winnerId ? points : 0, now());
    });
    saveState(state);
  }

  function leaveRoom(user) {
    const member = findMembership.get(user.id);
    if (!member) return;
    const state = parseState(member.room_id);
    if (state?.status === 'playing') {
      const contenders = state.players.filter(player => player.userId !== user.id && !player.isBot);
      if (contenders.length) finishMatch(state, contenders[0].userId, `${user.name} saiu; ${contenders[0].name} venceu por permanência.`);
    }
    deleteMember.run(member.room_id, user.id);
    if (allowBots) deleteRoomBots.run(member.room_id);
    if (!listRoomMembers.all(member.room_id).length || allowBots) deleteGame.run(member.room_id);
    clearTimeout(botTimers.get(member.room_id));
    botTimers.delete(member.room_id);
    emitRoom(member.room_id);
  }

  function validatePlay(state, userId, cardIds, chosenColor) {
    if (!Array.isArray(cardIds) || !cardIds.length) throw new Error('Escolha pelo menos uma carta.');
    if (new Set(cardIds).size !== cardIds.length) throw new Error('A mesma carta não pode aparecer duas vezes.');
    const hand = state.hands[userId];
    const cards = cardIds.map(cardId => hand.find(card => card.id === cardId));
    if (cards.some(card => !card)) throw new Error('Uma das cartas não está na sua mão.');
    const first = cards[0];
    if (!canPlayFirst(first, state)) {
      throw new Error(state.pendingDraw > 0 ? `Responda com +2 ou +4, ou compre ${state.pendingDraw}.` : 'A primeira carta não combina com a mesa.');
    }
    if (state.drawnCardId && (cards.length !== 1 || first.id !== state.drawnCardId)) {
      throw new Error('Depois de comprar, apenas a carta comprada pode ser jogada.');
    }
    if (cards.length > 1) {
      if (state.pendingDraw > 0 || first.kind !== 'numero') throw new Error('Somente números iguais podem ser baixados em sequência.');
      if (cards.some(card => card.kind !== 'numero' || card.value !== first.value)) {
        throw new Error('Todas as cartas da sequência precisam ter o mesmo número.');
      }
    }
    if ((first.kind === 'coringa' || first.kind === 'mais4') && !COLORS.includes(chosenColor)) {
      throw new Error('Escolha a próxima cor.');
    }
    return cards;
  }

  function applyCards(user, cardIds, chosenColor) {
    const member = findMembership.get(user.id);
    if (!member) throw new Error('Você não está em uma mesa.');
    const state = parseState(member.room_id);
    if (!state || state.status !== 'playing') throw new Error('A partida ainda não começou.');
    const current = state.players[state.turnIndex];
    if (current?.userId !== user.id) throw new Error('Aguarde a sua vez.');
    const cards = validatePlay(state, user.id, cardIds, chosenColor);
    const hand = state.hands[user.id];
    cards.forEach(card => {
      hand.splice(hand.findIndex(item => item.id === card.id), 1);
      state.discard.push(card);
    });
    state.drawnCardId = null;

    const first = cards[0];
    const last = cards[cards.length - 1];
    state.activeColor = last.color || chosenColor;

    if (first.kind === 'mais2' || first.kind === 'mais4') {
      state.pendingDraw += first.kind === 'mais2' ? 2 : 4;
      state.turnIndex = nextIndex(state);
      state.message = `${user.name} acumulou +${state.pendingDraw}. ${state.players[state.turnIndex].name} precisa responder ou comprar.`;
    } else if (first.kind === 'inverter') {
      state.direction *= -1;
      state.turnIndex = state.players.length === 2 ? nextIndex(state, state.turnIndex, 2) : nextIndex(state);
      state.message = `A direção mudou. Vez de ${state.players[state.turnIndex].name}.`;
    } else if (first.kind === 'pular') {
      const skipped = state.players[nextIndex(state)];
      state.turnIndex = nextIndex(state, state.turnIndex, 2);
      state.message = `${skipped?.name || 'Um jogador'} perdeu a vez. Vez de ${state.players[state.turnIndex].name}.`;
    } else {
      state.turnIndex = nextIndex(state);
      state.message = cards.length > 1
        ? `${user.name} baixou ${cards.length} cartas de número ${first.value}. Vez de ${state.players[state.turnIndex].name}.`
        : `Vez de ${state.players[state.turnIndex].name}.`;
    }

    if (!hand.length) finishMatch(state, user.id);
    else saveState(state);
    emitRoom(member.room_id);
  }

  function drawCards(user) {
    const member = findMembership.get(user.id);
    const state = member && parseState(member.room_id);
    if (!state || state.status !== 'playing') throw new Error('A partida ainda não começou.');
    if (state.players[state.turnIndex]?.userId !== user.id) throw new Error('Aguarde a sua vez.');
    if (state.drawnCardId) throw new Error('Você já comprou uma carta. Jogue-a ou passe.');

    if (state.pendingDraw > 0) {
      const amount = state.pendingDraw;
      drawMany(state, user.id, amount);
      state.pendingDraw = 0;
      state.turnIndex = nextIndex(state);
      state.message = `${user.name} comprou ${amount} cartas. Vez de ${state.players[state.turnIndex].name}.`;
      saveState(state);
      emitRoom(member.room_id);
      return;
    }

    const card = drawOne(state);
    if (!card) throw new Error('O monte está vazio.');
    state.hands[user.id].push(card);
    if (canPlayFirst(card, state)) {
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

  function bestBotColor(hand) {
    return COLORS
      .map(color => ({ color, count: hand.filter(card => card.color === color).length }))
      .sort((a, b) => b.count - a.count)[0]?.color || COLORS[crypto.randomInt(COLORS.length)];
  }

  function scheduleBot(roomId) {
    clearTimeout(botTimers.get(roomId));
    botTimers.delete(roomId);
    const state = parseState(roomId);
    const current = state?.players[state.turnIndex];
    if (!state || state.status !== 'playing' || !current?.isBot) return;
    const timer = setTimeout(() => {
      botTimers.delete(roomId);
      playBotTurn(roomId);
    }, 850);
    timer.unref?.();
    botTimers.set(roomId, timer);
  }

  function playBotTurn(roomId) {
    const state = parseState(roomId);
    const bot = state?.players[state.turnIndex];
    if (!state || state.status !== 'playing' || !bot?.isBot) return;
    const hand = state.hands[bot.userId];
    const playable = hand.filter(card => canPlayFirst(card, state) && (!state.drawnCardId || card.id === state.drawnCardId));

    if (!playable.length) {
      drawCards({ id: bot.userId, name: bot.name });
      return;
    }

    const first = playable.find(card => DRAW_KINDS.has(card.kind))
      || playable.find(card => card.kind !== 'coringa')
      || playable[0];
    const sequence = first.kind === 'numero' && !state.drawnCardId
      ? hand.filter(card => card.kind === 'numero' && card.value === first.value).slice(0, 4)
      : [first];
    if (sequence[0].id !== first.id) {
      sequence.splice(sequence.findIndex(card => card.id === first.id), 1);
      sequence.unshift(first);
    }
    const chosenColor = first.kind === 'coringa' || first.kind === 'mais4' ? bestBotColor(hand.filter(card => card.id !== first.id)) : '';
    applyCards({ id: bot.userId, name: bot.name }, sequence.map(card => card.id), chosenColor);
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
    const humans = members.filter(item => !isBotId(item.user_id));
    if (members.length === TABLE_BY_ID.get(member.room_id).capacity && state.rematchVotes.length >= humans.length) {
      createMatch(member.room_id, members);
    } else {
      state.message = `${state.rematchVotes.length}/${humans.length} jogadores confirmaram a revanche.`;
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
      socket.on('lobby:fill-bots', (_payload, ack) => safeAck(ack, () => fillWithBots(user)));
      socket.on('invite:send', (payload, ack) => safeAck(ack, () => sendInvite(user, String(payload?.toUserId || ''), String(payload?.roomId || ''))));
      socket.on('invite:accept', (payload, ack) => safeAck(ack, () => acceptInvite(user, String(payload?.inviteId || ''))));
      socket.on('invite:decline', (payload, ack) => safeAck(ack, () => {
        const invite = getInvite.get(String(payload?.inviteId || ''));
        if (!invite || invite.to_user_id !== user.id) throw new Error('Convite desconhecido.');
        updateInvite.run('declined', invite.id);
        emitLobby();
      }));
      socket.on('game:play', (payload, ack) => safeAck(ack, () => {
        const cardIds = Array.isArray(payload?.cardIds) ? payload.cardIds.map(String) : [String(payload?.cardId || '')].filter(Boolean);
        applyCards(user, cardIds, String(payload?.chosenColor || ''));
      }));
      socket.on('game:draw', (_payload, ack) => safeAck(ack, () => drawCards(user)));
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
