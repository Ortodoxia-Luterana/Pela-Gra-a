import { io, type Socket } from 'socket.io-client';
import './styles.css';

type LiturgicalColor = 'branco' | 'vermelho' | 'verde' | 'roxo';
type CardKind = 'numero' | 'pular' | 'inverter' | 'mais2' | 'coringa' | 'mais4';

interface Card {
  id: string;
  color: LiturgicalColor | null;
  kind: CardKind;
  value: number | null;
  playable?: boolean;
}

interface Player {
  userId: string;
  name: string;
  seat: number;
  connected: boolean;
  isBot?: boolean;
  cardCount?: number;
}

interface Table {
  id: string;
  name: string;
  capacity: number;
  mode: string;
  playerCount: number;
  full: boolean;
  status: 'open' | 'waiting' | 'playing' | 'finished';
  isMember: boolean;
  players: Player[];
}

interface Invite {
  id: string;
  roomId: string;
  roomName: string;
  fromUserId: string;
  fromUserName: string;
  createdAt: string;
}

interface Lobby {
  localPreview: boolean;
  me: { id: string; name: string };
  tables: Table[];
  online: Array<{ userId: string; name: string; inRoom: boolean }>;
  invites: Invite[];
  stats: { matches: number; wins: number; points: number };
  ranking: Array<{ user_id: string; user_name: string; matches: number; wins: number; points: number }>;
}

interface GameState {
  id: string;
  roomId: string;
  status: 'playing' | 'finished';
  activeColor: LiturgicalColor;
  topCard: Card;
  deckCount: number;
  direction: number;
  pendingDraw: number;
  currentUserId: string | null;
  isMyTurn: boolean;
  mayPass: boolean;
  drawnCardId: string | null;
  hand: Card[];
  players: Player[];
  message: string;
  winnerId: string | null;
  winnerName: string | null;
  pointsAwarded: number;
}

interface RoomState {
  table: Table;
  game: GameState | null;
}

const app = document.querySelector<HTMLElement>('#app')!;
const toastLayer = document.querySelector<HTMLElement>('#toast-layer')!;
const localPlayer = new URLSearchParams(window.location.search).get('localPlayer') || '1';
const socket: Socket = io('/cores-da-rosa', {
  transports: ['websocket', 'polling'],
  withCredentials: true,
  query: { localPlayer },
  reconnectionDelay: 800
});

let lobby: Lobby | null = null;
let room: RoomState | null = null;
let rulesOpen = false;
let playersOpen = false;
let inviteOpen = false;
let pendingColorCard: Card | null = null;
let selectedCardIds: string[] = [];

const colorNames: Record<LiturgicalColor, string> = {
  branco: 'Branco',
  vermelho: 'Vermelho',
  verde: 'Verde',
  roxo: 'Roxo'
};

const kindNames: Record<CardKind, string> = {
  numero: 'Número',
  pular: 'Pular',
  inverter: 'Inverter',
  mais2: 'Comprar 2',
  coringa: 'Escolher cor',
  mais4: 'Comprar 4 e escolher cor'
};

const kindSymbols: Record<CardKind, string> = {
  numero: '',
  pular: '⊘',
  inverter: '↻',
  mais2: '+2',
  coringa: 'COR',
  mais4: '+4'
};

function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[character] || character));
}

function roseSvg(className = 'rose-mark'): string {
  return `
    <svg class="${className}" viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="47" fill="#d8ae47"/>
      <circle cx="50" cy="50" r="42" fill="#2379a5"/>
      <g fill="#fff8e7" stroke="#e5d8b9" stroke-width="1.3">
        <ellipse cx="50" cy="25" rx="14" ry="23"/>
        <ellipse cx="73.8" cy="42.3" rx="14" ry="23" transform="rotate(72 73.8 42.3)"/>
        <ellipse cx="64.7" cy="70.2" rx="14" ry="23" transform="rotate(144 64.7 70.2)"/>
        <ellipse cx="35.3" cy="70.2" rx="14" ry="23" transform="rotate(216 35.3 70.2)"/>
        <ellipse cx="26.2" cy="42.3" rx="14" ry="23" transform="rotate(288 26.2 42.3)"/>
      </g>
      <path d="M50 72C43 63 30 56 30 43c0-9 6-15 14-15 4 0 7 2 10 5 3-3 6-5 10-5 8 0 14 6 14 15 0 13-14 21-28 29Z" fill="#b62e36" stroke="#722027" stroke-width="2"/>
      <path d="M47 35h8v13h9v8h-9v18h-8V56h-9v-8h9Z" fill="#151317"/>
    </svg>
  `;
}

function toast(message: string, tone: 'normal' | 'error' | 'success' = 'normal'): void {
  const item = document.createElement('div');
  item.className = `toast ${tone}`;
  item.textContent = message;
  toastLayer.append(item);
  window.setTimeout(() => item.remove(), 3400);
}

function action<T extends object>(event: string, payload = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(6000).emit(event, payload, (error: Error | null, response: { ok: boolean; error?: string } & T) => {
      if (error) return reject(new Error('O servidor não respondeu. Tente novamente.'));
      if (!response?.ok) return reject(new Error(response?.error || 'A ação foi recusada.'));
      resolve(response);
    });
  });
}

async function run(event: string, payload = {}, success = ''): Promise<void> {
  try {
    await action(event, payload);
    if (success) toast(success, 'success');
  } catch (error) {
    toast(error instanceof Error ? error.message : 'Não foi possível concluir.', 'error');
  }
}

function gameHeader(mode: 'lobby' | 'table'): string {
  return `
    <header class="game-hud">
      <a class="hud-button hub-button" href="/" aria-label="Voltar ao Hub">← <span>Hub</span></a>
      <div class="game-brand">${roseSvg('brand-rose')}<div><strong>Uno Luterano</strong><small>Jogo de cartas litúrgico</small></div></div>
      <div class="hud-actions">
        ${mode === 'table' ? '<button id="leave-room" class="hud-button" type="button">Sair</button>' : ''}
        <button id="players-button" class="hud-button" type="button" aria-label="Jogadores online">♟ <span>${(lobby?.online.length || 0) + 1}</span></button>
        <button id="rules-button" class="hud-button" type="button" aria-label="Como jogar">?</button>
      </div>
    </header>
  `;
}

function overlays(): string {
  return `
    ${rulesOpen ? rulesDrawer() : ''}
    ${playersOpen ? playersDrawer() : ''}
  `;
}

function rulesDrawer(): string {
  return `
    <aside class="side-drawer" role="dialog" aria-label="Como jogar">
      <button id="close-rules" class="close-button" type="button" aria-label="Fechar">×</button>
      <span class="drawer-kicker">108 CARTAS</span>
      <h2>Regras do Uno Luterano</h2>
      <p>Combine a cor, o número ou a ação da carta no centro. Vence quem esvaziar a mão.</p>
      <div class="rule-block">
        <b>Sequência numérica</b>
        <span>Depois de uma primeira carta válida, você pode baixar juntas outras cartas do mesmo número, mesmo que sejam de cores diferentes.</span>
      </div>
      <div class="rule-block">
        <b>Pilha de compra</b>
        <span><code>+2</code> e <code>+4</code> acumulam entre si. Quem não responder compra toda a pilha e perde a vez.</span>
      </div>
      <div class="action-key">
        <span><i>⊘</i><b>Pular</b></span>
        <span><i>↻</i><b>Inverter</b></span>
        <span><i>+2</i><b>Acumula 2</b></span>
        <span><i>+4</i><b>Acumula 4 e escolhe a cor</b></span>
      </div>
      <p class="fine-print">Baralho: 19 números e seis ações por cor, quatro coringas e quatro cartas <code>+4</code>.</p>
    </aside>
  `;
}

function playersDrawer(): string {
  const online = lobby?.online.length ? lobby.online.map(player => `
    <li><span><i></i><b>${escapeHtml(player.name)}</b><small>${player.inRoom ? 'Em uma mesa' : 'No salão'}</small></span></li>
  `).join('') : '<li class="empty-row">Nenhum outro jogador conectado.</li>';
  const ranking = lobby?.ranking.length ? lobby.ranking.slice(0, 6).map((player, index) => `
    <li class="rank-row"><em>${index + 1}</em><span>${escapeHtml(player.user_name)}</span><b>${player.wins} vit.</b></li>
  `).join('') : '<li class="empty-row">Ainda não há vitórias registradas.</li>';
  return `
    <aside class="side-drawer players-drawer" role="dialog" aria-label="Jogadores">
      <button id="close-players" class="close-button" type="button" aria-label="Fechar">×</button>
      <span class="drawer-kicker">SALÃO ONLINE</span>
      <h2>Jogadores</h2>
      <ul class="players-list">${online}</ul>
      <h3>Mais vitórias</h3>
      <ol class="ranking-list">${ranking}</ol>
    </aside>
  `;
}

function renderLobby(): void {
  if (!lobby) return;
  const tableTokens = lobby.tables.map((table, index) => {
    const status = table.status === 'playing' ? 'Em partida' : table.playerCount ? 'Aguardando' : 'Livre';
    const seats = Array.from({ length: table.capacity }, (_, seat) => {
      const occupied = table.players.some(player => player.seat === seat);
      return `<i class="${occupied ? 'occupied' : ''}"></i>`;
    }).join('');
    return `
      <button class="table-token table-${index + 1} ${table.isMember ? 'mine' : ''}" data-join="${table.id}" type="button" ${table.full && !table.isMember ? 'disabled' : ''}>
        <span class="token-number">${index + 1}</span>
        <span class="token-copy"><small>${escapeHtml(table.mode)}</small><b>${escapeHtml(table.name.replace('Mesa ', ''))}</b><em>${status}</em></span>
        <span class="token-seats">${seats}</span>
        <strong>${table.playerCount}/${table.capacity}</strong>
      </button>
    `;
  }).join('');
  const inviteNotice = lobby.invites.length ? `
    <div class="incoming-invite">
      <span><small>CONVITE RECEBIDO</small><b>${escapeHtml(lobby.invites[0].fromUserName)} chamou você para ${escapeHtml(lobby.invites[0].roomName)}</b></span>
      <button data-accept="${lobby.invites[0].id}" type="button">Sentar à mesa</button>
      <button data-decline="${lobby.invites[0].id}" class="decline" type="button">×</button>
    </div>
  ` : '';

  app.innerHTML = `
    <main class="game-scene lobby-scene">
      ${gameHeader('lobby')}
      <section class="lobby-tabletop">
        <div class="title-plaque">
          ${roseSvg('plaque-rose')}
          <div><span>ESCOLHA SUA MESA</span><h1>O salão está aberto</h1><p>A partida começa quando todos os lugares estiverem ocupados.</p></div>
        </div>
        <div class="table-map">${tableTokens}</div>
        <div class="lobby-score">
          <span><b>${lobby.stats.wins}</b> vitórias</span>
          <span><b>${lobby.stats.matches}</b> partidas</span>
          <span><b>${lobby.stats.points}</b> pontos</span>
          <span class="current-player"><i></i>${escapeHtml(lobby.me.name)}</span>
        </div>
      </section>
      ${inviteNotice}
      ${overlays()}
    </main>
  `;
  bindShared();
  document.querySelectorAll<HTMLElement>('[data-join]').forEach(button => button.addEventListener('click', () => {
    void run('lobby:join', { roomId: button.dataset.join });
  }));
  document.querySelectorAll<HTMLElement>('[data-accept]').forEach(button => button.addEventListener('click', () => {
    void run('invite:accept', { inviteId: button.dataset.accept }, 'Convite aceito.');
  }));
  document.querySelectorAll<HTMLElement>('[data-decline]').forEach(button => button.addEventListener('click', () => {
    void run('invite:decline', { inviteId: button.dataset.decline });
  }));
}

function renderWaiting(): void {
  if (!lobby || !room) return;
  const { table } = room;
  const seatMarkup = Array.from({ length: table.capacity }, (_, index) => {
    const player = table.players.find(item => item.seat === index);
    return `
      <article class="physical-seat seat-${index + 1} ${player ? 'filled' : ''}">
        <span>${player ? escapeHtml(player.name).slice(0, 2).toUpperCase() : '+'}</span>
        <b>${player ? escapeHtml(player.name) : 'Lugar livre'}</b>
        <small>${player ? player.isBot ? 'Jogador de teste' : 'Pronto' : 'Aguardando'}</small>
      </article>
    `;
  }).join('');
  app.innerHTML = `
    <main class="game-scene waiting-scene">
      ${gameHeader('table')}
      <section class="waiting-table">
        <div class="waiting-title"><small>${escapeHtml(table.mode)} · ${table.playerCount}/${table.capacity}</small><h1>${escapeHtml(table.name)}</h1><p>A rodada começa automaticamente com a mesa cheia.</p></div>
        <div class="seat-ring capacity-${table.capacity}">${seatMarkup}</div>
        <div class="waiting-actions">
          <button id="open-invites" class="game-button" type="button">Convidar jogador online</button>
          ${lobby.localPreview ? '<button id="fill-bots" class="game-button bot-button" type="button">Jogar agora contra bots</button>' : ''}
        </div>
      </section>
      ${inviteOpen ? invitePanel(table.id) : ''}
      ${overlays()}
    </main>
  `;
  bindShared();
  bindRoomCommon();
  document.querySelector('#open-invites')?.addEventListener('click', () => {
    inviteOpen = true;
    renderWaiting();
  });
  document.querySelector('#fill-bots')?.addEventListener('click', () => void run('lobby:fill-bots', {}, 'Jogadores de teste sentaram à mesa.'));
}

function cardCenter(card: Card): string {
  if (card.kind === 'numero') return `<strong class="number-value">${card.value}</strong>`;
  if (card.kind === 'coringa') return `${roseSvg('card-rose')}<strong class="action-word">COR</strong>`;
  if (card.kind === 'mais4') return `<strong class="draw-value">+4</strong><span class="four-colors"><i></i><i></i><i></i><i></i></span><small>ESCOLHA A COR</small>`;
  if (card.kind === 'mais2') return `<strong class="draw-value">+2</strong><span class="mini-cards"><i></i><i></i></span>`;
  if (card.kind === 'pular') return '<strong class="action-symbol">⊘</strong><small>PULAR</small>';
  return '<strong class="action-symbol">↻</strong><small>INVERTER</small>';
}

function cardMarkup(card: Card, options: { compact?: boolean; back?: boolean } = {}): string {
  if (options.back) return `
    <span class="card-face card-back ${options.compact ? 'compact' : ''}">
      <span class="back-pattern"></span>${roseSvg('back-rose')}
    </span>
  `;
  const wild = card.kind === 'coringa' || card.kind === 'mais4';
  const tone = wild ? 'multicolor' : card.color;
  const corner = card.kind === 'numero' ? String(card.value) : kindSymbols[card.kind];
  return `
    <span class="card-face tone-${tone} kind-${card.kind} ${options.compact ? 'compact' : ''}">
      <span class="inner-border"></span>
      <span class="card-corner top">${escapeHtml(corner)}</span>
      <span class="card-center">${cardCenter(card)}</span>
      <span class="card-corner bottom">${escapeHtml(corner)}</span>
    </span>
  `;
}

function selectionFirst(): Card | null {
  if (!room?.game || !selectedCardIds.length) return null;
  return room.game.hand.find(card => card.id === selectedCardIds[0]) || null;
}

function isCardSelectable(card: Card): boolean {
  const game = room?.game;
  if (!game?.isMyTurn || game.status !== 'playing') return false;
  if (selectedCardIds.includes(card.id)) return true;
  const first = selectionFirst();
  if (!first) return Boolean(card.playable);
  if (game.drawnCardId || game.pendingDraw > 0) return false;
  return first.kind === 'numero' && card.kind === 'numero' && card.value === first.value;
}

function renderGame(): void {
  if (!lobby || !room?.game) return;
  const { table, game } = room;
  const me = game.players.find(player => player.userId === lobby!.me.id);
  const opponents = game.players.filter(player => player.userId !== lobby!.me.id);
  const opponentMarkup = opponents.map((player, index) => `
    <article class="opponent-seat opponent-${index + 1} ${game.currentUserId === player.userId ? 'turn' : ''}">
      <span class="avatar">${player.isBot ? '⚙' : escapeHtml(player.name).slice(0, 2).toUpperCase()}<i class="${player.connected ? '' : 'offline'}"></i></span>
      <div><b>${escapeHtml(player.name)}</b><small>${player.cardCount} cartas</small></div>
      <span class="opponent-hand">${Array.from({ length: Math.min(player.cardCount || 0, 8) }, () => cardMarkup({} as Card, { compact: true, back: true })).join('')}</span>
      ${player.cardCount === 1 ? '<em class="last-card">ÚLTIMA!</em>' : ''}
    </article>
  `).join('');
  const handMarkup = game.hand.map((card, index) => {
    const selected = selectedCardIds.includes(card.id);
    const selectable = isCardSelectable(card);
    return `
      <button class="hand-card ${selected ? 'selected' : ''} ${selectable ? 'selectable' : ''}" data-card="${card.id}" style="--angle:${(index - (game.hand.length - 1) / 2) * 2.1}deg;--lift:${Math.abs(index - (game.hand.length - 1) / 2) * 2}px" type="button" ${!selectable ? 'disabled' : ''} aria-label="${kindNames[card.kind]} ${card.value ?? ''} ${card.color ? colorNames[card.color] : ''}">
        ${cardMarkup(card)}
        ${selected ? `<span class="selection-order">${selectedCardIds.indexOf(card.id) + 1}</span>` : ''}
      </button>
    `;
  }).join('');
  const currentName = game.players.find(player => player.userId === game.currentUserId)?.name || '';
  const turnText = game.isMyTurn ? 'SUA VEZ' : `VEZ DE ${currentName.toUpperCase()}`;
  const penalty = game.pendingDraw > 0 ? `
    <div class="penalty-banner"><small>PILHA ACUMULADA</small><strong>+${game.pendingDraw}</strong><span>Jogue +2 ou +4<br>ou compre tudo</span></div>
  ` : '';
  const selectionText = selectedCardIds.length > 1
    ? `${selectedCardIds.length} cartas de número ${selectionFirst()?.value}`
    : selectedCardIds.length ? kindNames[selectionFirst()!.kind] : 'Escolha uma carta';

  app.innerHTML = `
    <main class="game-scene match-scene" data-active-color="${game.activeColor}">
      ${gameHeader('table')}
      <section class="match-surface">
        <div class="turn-ribbon"><i></i><div><b>${turnText}</b><small>${escapeHtml(game.message)}</small></div></div>
        <div class="opponents">${opponentMarkup}</div>
        <div class="center-play">
          ${penalty}
          <button id="draw-card" class="deck-stack" type="button" ${!game.isMyTurn || game.mayPass || game.status !== 'playing' ? 'disabled' : ''}>
            ${cardMarkup({} as Card, { back: true })}
            <span>${game.pendingDraw > 0 ? `COMPRAR ${game.pendingDraw}` : 'COMPRAR'}<small>${game.deckCount} no monte</small></span>
          </button>
          <div class="discard-stack">${cardMarkup(game.topCard)}<span class="active-color-name">${colorNames[game.activeColor]}</span></div>
          <span class="play-direction" aria-label="${game.direction > 0 ? 'Sentido horário' : 'Sentido anti-horário'}">${game.direction > 0 ? '↻' : '↺'}</span>
        </div>
        <div class="my-player ${game.isMyTurn ? 'turn' : ''}">
          <span>${escapeHtml(me?.name || lobby.me.name).slice(0, 2).toUpperCase()}</span>
          <div><b>${escapeHtml(me?.name || lobby.me.name)}</b><small>${game.hand.length} cartas</small></div>
          ${game.hand.length === 1 ? '<em>ÚLTIMA CARTA!</em>' : ''}
        </div>
        <div class="hand-command">
          <span>${selectionText}</span>
          <div>
            ${game.mayPass ? '<button id="pass-turn" class="secondary-action" type="button">Passar</button>' : ''}
            <button id="play-selected" class="primary-action" type="button" ${!selectedCardIds.length ? 'disabled' : ''}>${selectedCardIds.length > 1 ? `Jogar ${selectedCardIds.length} cartas` : 'Jogar carta'}</button>
          </div>
        </div>
        <div class="player-hand">${handMarkup}</div>
      </section>
      ${game.status === 'finished' ? resultPanel(game) : ''}
      ${pendingColorCard ? colorPicker() : ''}
      ${inviteOpen ? invitePanel(table.id) : ''}
      ${overlays()}
    </main>
  `;
  bindShared();
  bindRoomCommon();
  bindGame();
}

function resultPanel(game: GameState): string {
  const winner = game.winnerId === lobby?.me.id;
  return `
    <div class="modal-layer">
      <section class="result-panel">
        ${roseSvg('result-rose')}
        <small>RODADA ENCERRADA</small>
        <h2>${winner ? 'Você esvaziou a mão!' : `${escapeHtml(game.winnerName)} venceu`}</h2>
        <p>${winner ? `Você recebeu ${game.pointsAwarded} pontos.` : 'A mesa pode começar outra rodada.'}</p>
        <button id="rematch" class="game-button" type="button">Pedir revanche</button>
      </section>
    </div>
  `;
}

function colorPicker(): string {
  return `
    <div class="modal-layer">
      <section class="color-picker">
        <button id="close-color" class="close-button" type="button">×</button>
        <small>${pendingColorCard?.kind === 'mais4' ? '+4 E NOVA COR' : 'NOVA COR'}</small>
        <h2>Qual cor continua?</h2>
        <div class="color-grid">${(['branco', 'vermelho', 'verde', 'roxo'] as LiturgicalColor[]).map(color => `
          <button data-color="${color}" class="color-choice tone-${color}" type="button"><i></i><b>${colorNames[color]}</b></button>
        `).join('')}</div>
      </section>
    </div>
  `;
}

function invitePanel(roomId: string): string {
  const rows = lobby?.online.length ? lobby.online.map(player => `
    <li><span><i></i><b>${escapeHtml(player.name)}</b><small>${player.inRoom ? 'Já está em uma mesa' : 'Disponível'}</small></span>
      <button data-invite="${player.userId}" data-room="${roomId}" type="button" ${player.inRoom ? 'disabled' : ''}>Convidar</button></li>
  `).join('') : '<li class="empty-row">Ninguém disponível agora.</li>';
  return `
    <div class="modal-layer">
      <section class="invite-panel">
        <button id="close-invites" class="close-button" type="button">×</button>
        <small>CONVITE EM TEMPO REAL</small>
        <h2>Chame alguém para a mesa</h2>
        <ul>${rows}</ul>
      </section>
    </div>
  `;
}

function bindShared(): void {
  document.querySelector('#rules-button')?.addEventListener('click', () => {
    rulesOpen = true;
    renderCurrent();
  });
  document.querySelector('#close-rules')?.addEventListener('click', () => {
    rulesOpen = false;
    renderCurrent();
  });
  document.querySelector('#players-button')?.addEventListener('click', () => {
    playersOpen = true;
    renderCurrent();
  });
  document.querySelector('#close-players')?.addEventListener('click', () => {
    playersOpen = false;
    renderCurrent();
  });
}

function bindRoomCommon(): void {
  document.querySelector('#leave-room')?.addEventListener('click', async () => {
    await run('lobby:leave');
    room = null;
    selectedCardIds = [];
    inviteOpen = false;
    renderLobby();
  });
  document.querySelector('#close-invites')?.addEventListener('click', () => {
    inviteOpen = false;
    renderCurrent();
  });
  document.querySelectorAll<HTMLElement>('[data-invite]').forEach(button => button.addEventListener('click', () => {
    void run('invite:send', { toUserId: button.dataset.invite, roomId: button.dataset.room }, 'Convite enviado.');
  }));
}

function bindGame(): void {
  document.querySelectorAll<HTMLElement>('[data-card]').forEach(button => button.addEventListener('click', () => {
    const cardId = String(button.dataset.card || '');
    if (selectedCardIds.includes(cardId)) {
      const position = selectedCardIds.indexOf(cardId);
      selectedCardIds = position === 0 ? [] : selectedCardIds.filter(id => id !== cardId);
    } else {
      selectedCardIds.push(cardId);
    }
    renderGame();
  }));
  document.querySelector('#play-selected')?.addEventListener('click', () => {
    const first = selectionFirst();
    if (!first) return;
    if (first.kind === 'coringa' || first.kind === 'mais4') {
      pendingColorCard = first;
      renderGame();
      return;
    }
    void run('game:play', { cardIds: selectedCardIds });
  });
  document.querySelector('#draw-card')?.addEventListener('click', () => void run('game:draw'));
  document.querySelector('#pass-turn')?.addEventListener('click', () => void run('game:pass'));
  document.querySelector('#rematch')?.addEventListener('click', () => void run('game:rematch', {}, 'Revanche confirmada.'));
  document.querySelector('#close-color')?.addEventListener('click', () => {
    pendingColorCard = null;
    renderGame();
  });
  document.querySelectorAll<HTMLElement>('[data-color]').forEach(button => button.addEventListener('click', () => {
    const chosenColor = button.dataset.color;
    pendingColorCard = null;
    void run('game:play', { cardIds: selectedCardIds, chosenColor });
  }));
}

function renderCurrent(): void {
  if (!room) renderLobby();
  else if (!room.game) renderWaiting();
  else renderGame();
}

socket.on('connect', () => {
  document.body.classList.add('connected');
});
socket.on('disconnect', () => {
  document.body.classList.remove('connected');
  toast('Conexão interrompida. Reconectando…', 'error');
});
socket.on('connect_error', error => {
  document.body.classList.remove('connected');
  if (error.message === 'launch_required') {
    app.innerHTML = '<section class="boot-card"><span>!</span><strong>Abra o jogo pelo Hub</strong><small>O acesso seguro desta sessão expirou.</small><a href="/">Voltar ao Hub</a></section>';
  }
});
socket.on('lobby:state', (next: Lobby) => {
  lobby = next;
  const membership = next.tables.find(table => table.isMember);
  if (!membership) {
    room = null;
    renderLobby();
  } else if (!room) {
    room = { table: membership, game: null };
    renderWaiting();
  }
});
socket.on('game:state', (next: RoomState) => {
  room = next;
  selectedCardIds = [];
  pendingColorCard = null;
  renderCurrent();
});
socket.on('invite:new', (invite: Invite) => {
  toast(`${invite.fromUserName} convidou você para ${invite.roomName}.`, 'success');
  socket.emit('lobby:refresh');
});
