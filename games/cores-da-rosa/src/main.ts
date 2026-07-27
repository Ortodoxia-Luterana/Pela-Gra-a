import Phaser from 'phaser';
import { io, type Socket } from 'socket.io-client';
import './styles.css';

type LiturgicalColor = 'branco' | 'vermelho' | 'verde' | 'roxo';
type CardKind = 'numero' | 'cantico' | 'procissao' | 'partilha' | 'rosa' | 'concilio';

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
  currentUserId: string | null;
  isMyTurn: boolean;
  mayPass: boolean;
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

class TableGlowScene extends Phaser.Scene {
  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x241437, 0x180d28, 0x0a1720, 0x0a1119, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x234c42, 0.78);
    graphics.fillEllipse(width / 2, height * 0.54, width * 0.86, height * 0.66);
    graphics.lineStyle(4, 0xb9974b, 0.28);
    graphics.strokeEllipse(width / 2, height * 0.54, width * 0.86, height * 0.66);
    graphics.lineStyle(1, 0xf3dc9d, 0.12);
    graphics.strokeEllipse(width / 2, height * 0.54, width * 0.8, height * 0.6);
    for (let index = 0; index < 22; index += 1) {
      const x = (index * 173) % width;
      const y = (index * 271) % height;
      this.add.circle(x, y, 2 + (index % 3), 0xe6c66d, 0.08);
    }
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'phaser-layer',
  width: 1440,
  height: 900,
  transparent: true,
  antialias: true,
  scene: TableGlowScene,
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  render: { powerPreference: 'low-power', antialias: true }
});

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
let inviteOpen = false;
let pendingWild: Card | null = null;

const colorNames: Record<LiturgicalColor, string> = {
  branco: 'Branco',
  vermelho: 'Vermelho',
  verde: 'Verde',
  roxo: 'Roxo'
};

const kindNames: Record<CardKind, string> = {
  numero: 'Número',
  cantico: 'Cântico',
  procissao: 'Procissão',
  partilha: 'Partilha',
  rosa: 'Rosa Livre',
  concilio: 'Concílio'
};

const kindSymbols: Record<CardKind, string> = {
  numero: '',
  cantico: '♪',
  procissao: '↶',
  partilha: '+2',
  rosa: '✣',
  concilio: '✦'
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

function toast(message: string, tone: 'normal' | 'error' | 'success' = 'normal'): void {
  const item = document.createElement('div');
  item.className = `toast ${tone}`;
  item.textContent = message;
  toastLayer.append(item);
  window.setTimeout(() => item.remove(), 3600);
}

function action<T extends object>(event: string, payload = {}): Promise<T> {
  return new Promise((resolve, reject) => {
    socket.timeout(5000).emit(event, payload, (error: Error | null, response: { ok: boolean; error?: string } & T) => {
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

function shell(content: string, mode: 'lobby' | 'table'): string {
  const name = lobby?.me.name || 'Jogador';
  return `
    <header class="game-header">
      <a class="hub-link" href="/" aria-label="Voltar ao Hub">← <span>Hub</span></a>
      <div class="brand"><span class="brand-mark">✣</span><div><strong>Cores da Rosa</strong><small>cartas em comunidade</small></div></div>
      <div class="header-actions">
        ${mode === 'table' ? '<button id="leave-room" class="quiet-button" type="button">Sair da mesa</button>' : ''}
        <button id="rules-button" class="icon-button" type="button" aria-label="Como jogar">?</button>
        <span class="player-chip"><i></i>${escapeHtml(name)}</span>
      </div>
    </header>
    ${content}
    ${rulesOpen ? rulesDrawer() : ''}
  `;
}

function rulesDrawer(): string {
  return `
    <aside class="rules-drawer" role="dialog" aria-label="Como jogar">
      <button id="close-rules" class="drawer-close" type="button" aria-label="Fechar">×</button>
      <span class="eyebrow">REGRAS ORIGINAIS</span>
      <h2>Como completar a mão</h2>
      <p>Na sua vez, jogue uma carta da mesma cor, número ou símbolo da carta central. Se não puder, compre uma.</p>
      <ul>
        <li><b>♪ Cântico</b><span>segura a vez do próximo jogador.</span></li>
        <li><b>↶ Procissão</b><span>muda a direção da mesa.</span></li>
        <li><b>+2 Partilha</b><span>o próximo recebe duas cartas e perde a vez.</span></li>
        <li><b>✣ Rosa Livre</b><span>você escolhe a nova cor.</span></li>
        <li><b>✦ Concílio</b><span>todos os demais compram uma; você escolhe a cor.</span></li>
      </ul>
      <p class="rule-note">A rodada só começa quando todos os lugares da mesa estão ocupados. Vence quem esvaziar a mão primeiro.</p>
    </aside>
  `;
}

function renderLobby(): void {
  if (!lobby) return;
  const inviteCards = lobby.invites.length ? `
    <section class="invite-strip" aria-label="Convites recebidos">
      ${lobby.invites.map(invite => `
        <article>
          <span>Convite de <b>${escapeHtml(invite.fromUserName)}</b></span>
          <small>${escapeHtml(invite.roomName)}</small>
          <div><button data-accept="${invite.id}" type="button">Entrar</button><button data-decline="${invite.id}" class="quiet-button" type="button">Agora não</button></div>
        </article>
      `).join('')}
    </section>
  ` : '';
  const tableCards = lobby.tables.map(table => {
    const seats = Array.from({ length: table.capacity }, (_, index) => {
      const player = table.players.find(item => item.seat === index);
      return player
        ? `<span class="seat filled"><i></i>${escapeHtml(player.name)}</span>`
        : '<span class="seat">Lugar livre</span>';
    }).join('');
    const label = table.isMember ? 'Voltar à mesa' : table.full ? 'Mesa cheia' : table.playerCount ? 'Entrar agora' : 'Abrir mesa';
    return `
      <article class="table-card ${table.capacity === 4 ? 'large' : ''} ${table.isMember ? 'mine' : ''}">
        <div class="table-card-head"><span>${escapeHtml(table.mode)}</span><b>${table.playerCount}/${table.capacity}</b></div>
        <h3>${escapeHtml(table.name)}</h3>
        <div class="seat-list">${seats}</div>
        <div class="table-card-foot">
          <small>${table.status === 'playing' ? 'Partida em andamento' : table.playerCount ? 'Aguardando a mesa lotar' : 'Disponível agora'}</small>
          <button data-join="${table.id}" type="button" ${table.full && !table.isMember ? 'disabled' : ''}>${label}</button>
        </div>
      </article>
    `;
  }).join('');
  const onlineRows = lobby.online.length ? lobby.online.map(player => `
    <li><span><i></i>${escapeHtml(player.name)}${player.inRoom ? '<small>em uma mesa</small>' : '<small>no lobby</small>'}</span>
      <button data-quick-invite="${player.userId}" type="button">Convidar</button></li>
  `).join('') : '<li class="empty-online">Ninguém além de você está no jogo agora.</li>';
  const rankingRows = lobby.ranking.length ? lobby.ranking.slice(0, 5).map((player, index) => `
    <li><b>${index + 1}</b><span>${escapeHtml(player.user_name)}</span><strong>${player.wins} vit.</strong></li>
  `).join('') : '<li class="empty-online">A primeira vitória pode ser sua.</li>';

  app.innerHTML = shell(`
    <div class="lobby-layout">
      <section class="lobby-main">
        <div class="lobby-title">
          <span class="eyebrow">MESAS PÚBLICAS · TEMPO REAL</span>
          <h1>Escolha um lugar à mesa.</h1>
          <p>Entre direto ou convide alguém online. A rodada começa automaticamente quando todos os lugares estiverem ocupados.</p>
          <div class="personal-stats">
            <span><b>${lobby.stats.wins}</b> vitórias</span>
            <span><b>${lobby.stats.matches}</b> partidas</span>
            <span><b>${lobby.stats.points}</b> pontos</span>
          </div>
        </div>
        ${inviteCards}
        <div class="table-grid">${tableCards}</div>
      </section>
      <aside class="lobby-side">
        <section class="side-panel">
          <div class="side-heading"><div><span class="live-dot"></span><b>Online agora</b></div><small>${lobby.online.length + 1}</small></div>
          <ul class="online-list">${onlineRows}</ul>
        </section>
        <section class="side-panel ranking-panel">
          <div class="side-heading"><b>Mais vitórias</b></div>
          <ol>${rankingRows}</ol>
        </section>
      </aside>
    </div>
  `, 'lobby');
  bindShared();
  bindLobby();
}

function cardTemplate(card: Card, compact = false): string {
  const template = card.kind === 'rosa' || card.kind === 'concilio'
    ? 'rose'
    : ({ branco: 'white', vermelho: 'red', verde: 'green', roxo: 'purple' }[card.color || 'branco']);
  const main = card.kind === 'numero' ? String(card.value) : kindSymbols[card.kind];
  const label = card.kind === 'numero' ? colorNames[card.color!] : kindNames[card.kind];
  return `
    <span class="card-art ${compact ? 'compact' : ''}" style="--card-image:url('/assets/cores-da-rosa/assets/cards/card-${template}.png')">
      <span class="card-corner">${escapeHtml(main)}</span>
      <strong>${escapeHtml(main)}</strong>
      <small>${escapeHtml(label)}</small>
    </span>
  `;
}

function renderTable(): void {
  if (!lobby || !room) return;
  const { table, game } = room;
  if (!game) {
    const seats = Array.from({ length: table.capacity }, (_, index) => {
      const player = table.players.find(item => item.seat === index);
      return `
        <article class="waiting-seat ${player ? 'filled' : ''}">
          <span>${player ? escapeHtml(player.name).slice(0, 2).toUpperCase() : '+'}</span>
          <b>${player ? escapeHtml(player.name) : 'Lugar livre'}</b>
          <small>${player ? 'Pronto' : 'Aguardando jogador'}</small>
        </article>
      `;
    }).join('');
    app.innerHTML = shell(`
      <section class="waiting-room">
        <span class="eyebrow">${escapeHtml(table.mode)} · ${table.playerCount}/${table.capacity}</span>
        <h1>${escapeHtml(table.name)}</h1>
        <p>A partida começa sozinha quando a mesa estiver completa.</p>
        <div class="waiting-seats">${seats}</div>
        <button id="open-invites" class="primary-button" type="button">Convidar quem está online</button>
        ${inviteOpen ? invitePanel(table.id) : ''}
      </section>
    `, 'table');
    bindShared();
    bindTable();
    return;
  }

  const me = game.players.find(player => player.userId === lobby!.me.id);
  const others = game.players.filter(player => player.userId !== lobby!.me.id);
  const opponents = others.map((player, index) => `
    <article class="opponent opponent-${index + 1} ${game.currentUserId === player.userId ? 'active' : ''}">
      <div class="opponent-avatar">${escapeHtml(player.name).slice(0, 2).toUpperCase()}<i class="${player.connected ? '' : 'offline'}"></i></div>
      <div><b>${escapeHtml(player.name)}</b><span>${player.cardCount} cartas</span></div>
      <div class="opponent-cards">${Array.from({ length: Math.min(player.cardCount || 0, 7) }, () => '<img src="/assets/cores-da-rosa/assets/cards/card-back.png" alt="">').join('')}</div>
    </article>
  `).join('');
  const hand = game.hand.map((card, index) => `
    <button class="hand-card ${card.playable ? 'playable' : ''}" data-card="${card.id}" style="--card-index:${index};--card-count:${game.hand.length}" type="button" ${!card.playable ? 'disabled' : ''} aria-label="${kindNames[card.kind]} ${card.value || ''} ${card.color ? colorNames[card.color] : ''}">
      ${cardTemplate(card)}
    </button>
  `).join('');
  const status = game.status === 'finished'
    ? `${escapeHtml(game.winnerName)} venceu a rodada`
    : game.isMyTurn ? 'Sua vez' : `Vez de ${escapeHtml(game.players.find(player => player.userId === game.currentUserId)?.name || '')}`;

  app.innerHTML = shell(`
    <section class="game-table" data-color="${game.activeColor}">
      <div class="table-status"><span class="active-color"></span><div><b>${status}</b><small>${escapeHtml(game.message)}</small></div></div>
      <div class="opponents">${opponents}</div>
      <div class="center-piles">
        <button id="draw-card" class="deck-pile" type="button" ${!game.isMyTurn || game.mayPass || game.status !== 'playing' ? 'disabled' : ''}>
          <img src="/assets/cores-da-rosa/assets/cards/card-back.png" alt="Monte de compra">
          <span>${game.deckCount}<small>Comprar</small></span>
        </button>
        <div class="discard-pile">${cardTemplate(game.topCard, true)}</div>
        <div class="direction" aria-label="${game.direction > 0 ? 'Sentido horário' : 'Sentido anti-horário'}">${game.direction > 0 ? '↻' : '↺'}</div>
      </div>
      <div class="my-seat ${game.isMyTurn ? 'active' : ''}">
        <span>${escapeHtml(me?.name || lobby.me.name).slice(0, 2).toUpperCase()}</span>
        <b>${escapeHtml(me?.name || lobby.me.name)}</b>
        <small>${game.hand.length} cartas</small>
      </div>
      <div class="hand-label"><span>Minha mão</span>${game.mayPass ? '<button id="pass-turn" type="button">Passar a vez</button>' : ''}</div>
      <div class="hand">${hand}</div>
      ${game.status === 'finished' ? `
        <div class="round-result">
          <span class="result-rose">✣</span>
          <h2>${game.winnerId === lobby.me.id ? 'Você completou a mão!' : `${escapeHtml(game.winnerName)} venceu`}</h2>
          <p>${game.winnerId === lobby.me.id ? `+${game.pointsAwarded} pontos` : 'A mesa pode jogar outra rodada.'}</p>
          <button id="rematch" type="button">Quero revanche</button>
        </div>
      ` : ''}
      ${pendingWild ? colorPicker() : ''}
      ${inviteOpen ? invitePanel(table.id) : ''}
    </section>
  `, 'table');
  bindShared();
  bindTable();
}

function colorPicker(): string {
  return `
    <div class="modal-backdrop">
      <section class="color-picker" role="dialog" aria-label="Escolher nova cor">
        <button id="close-color" class="drawer-close" type="button">×</button>
        <span class="eyebrow">${pendingWild?.kind === 'concilio' ? 'CONCÍLIO' : 'ROSA LIVRE'}</span>
        <h2>Qual cor continua?</h2>
        <div>${(['branco', 'vermelho', 'verde', 'roxo'] as LiturgicalColor[]).map(color => `
          <button data-color="${color}" class="color-choice ${color}" type="button"><i></i>${colorNames[color]}</button>
        `).join('')}</div>
      </section>
    </div>
  `;
}

function invitePanel(roomId: string): string {
  const rows = lobby?.online.length ? lobby.online.map(player => `
    <li><span><i></i><b>${escapeHtml(player.name)}</b><small>${player.inRoom ? 'Já está em uma mesa' : 'Disponível'}</small></span>
      <button data-invite="${player.userId}" data-room="${roomId}" type="button" ${player.inRoom ? 'disabled' : ''}>Convidar</button></li>
  `).join('') : '<li class="empty-online">Ninguém disponível agora.</li>';
  return `
    <div class="modal-backdrop">
      <section class="invite-panel" role="dialog" aria-label="Convidar jogadores">
        <button id="close-invites" class="drawer-close" type="button">×</button>
        <span class="eyebrow">CONVITES EM TEMPO REAL</span>
        <h2>Chame alguém para a mesa</h2>
        <ul>${rows}</ul>
      </section>
    </div>
  `;
}

function bindShared(): void {
  document.querySelector('#rules-button')?.addEventListener('click', () => {
    rulesOpen = true;
    room ? renderTable() : renderLobby();
  });
  document.querySelector('#close-rules')?.addEventListener('click', () => {
    rulesOpen = false;
    room ? renderTable() : renderLobby();
  });
}

function bindLobby(): void {
  document.querySelectorAll<HTMLElement>('[data-join]').forEach(button => button.addEventListener('click', async () => {
    await run('lobby:join', { roomId: button.dataset.join });
  }));
  document.querySelectorAll<HTMLElement>('[data-accept]').forEach(button => button.addEventListener('click', async () => {
    await run('invite:accept', { inviteId: button.dataset.accept }, 'Convite aceito.');
  }));
  document.querySelectorAll<HTMLElement>('[data-decline]').forEach(button => button.addEventListener('click', async () => {
    await run('invite:decline', { inviteId: button.dataset.decline });
  }));
  document.querySelectorAll<HTMLElement>('[data-quick-invite]').forEach(button => button.addEventListener('click', () => {
    const available = lobby?.tables.find(table => table.isMember && !table.full)
      || lobby?.tables.find(table => !table.full && table.playerCount > 0)
      || lobby?.tables.find(table => !table.full);
    if (!available) return toast('Não há mesa com lugar livre.', 'error');
    const toUserId = button.dataset.quickInvite;
    const playerName = button.closest('li')?.querySelector('span')?.textContent?.trim() || 'o jogador';
    void (async () => {
      try {
        if (!available.isMember) await action('lobby:join', { roomId: available.id });
        await action('invite:send', { toUserId, roomId: available.id });
        toast(`Convite enviado para ${playerName}.`, 'success');
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Não foi possível enviar o convite.', 'error');
      }
    })();
  }));
}

function bindTable(): void {
  document.querySelector('#leave-room')?.addEventListener('click', async () => {
    await run('lobby:leave');
    room = null;
    inviteOpen = false;
    renderLobby();
  });
  document.querySelector('#open-invites')?.addEventListener('click', () => {
    inviteOpen = true;
    renderTable();
  });
  document.querySelector('#close-invites')?.addEventListener('click', () => {
    inviteOpen = false;
    renderTable();
  });
  document.querySelectorAll<HTMLElement>('[data-invite]').forEach(button => button.addEventListener('click', async () => {
    await run('invite:send', { toUserId: button.dataset.invite, roomId: button.dataset.room }, 'Convite enviado.');
  }));
  document.querySelectorAll<HTMLElement>('[data-card]').forEach(button => button.addEventListener('click', () => {
    const card = room?.game?.hand.find(item => item.id === button.dataset.card);
    if (!card) return;
    if (card.kind === 'rosa' || card.kind === 'concilio') {
      pendingWild = card;
      renderTable();
      return;
    }
    void run('game:play', { cardId: card.id });
  }));
  document.querySelector('#close-color')?.addEventListener('click', () => {
    pendingWild = null;
    renderTable();
  });
  document.querySelectorAll<HTMLElement>('[data-color]').forEach(button => button.addEventListener('click', async () => {
    if (!pendingWild) return;
    const card = pendingWild;
    pendingWild = null;
    await run('game:play', { cardId: card.id, chosenColor: button.dataset.color });
  }));
  document.querySelector('#draw-card')?.addEventListener('click', () => void run('game:draw'));
  document.querySelector('#pass-turn')?.addEventListener('click', () => void run('game:pass'));
  document.querySelector('#rematch')?.addEventListener('click', () => void run('game:rematch', {}, 'Revanche confirmada.'));
}

socket.on('connect', () => {
  document.body.classList.add('connected');
  toast('Conectado à mesa.', 'success');
});
socket.on('disconnect', () => {
  document.body.classList.remove('connected');
  toast('Conexão interrompida. Reconectando…', 'error');
});
socket.on('connect_error', error => {
  document.body.classList.remove('connected');
  if (error.message === 'launch_required') {
    app.innerHTML = '<section class="boot-card"><span class="boot-rose">!</span><strong>Abra o jogo pelo Hub</strong><small>O acesso seguro desta sessão expirou.</small><a href="/">Voltar ao Hub</a></section>';
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
    renderTable();
  }
});
socket.on('game:state', (next: RoomState) => {
  room = next;
  renderTable();
});
socket.on('invite:new', (invite: Invite) => {
  toast(`${invite.fromUserName} convidou você para ${invite.roomName}.`, 'success');
  socket.emit('lobby:refresh');
});
