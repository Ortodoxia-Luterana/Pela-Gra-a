const MOVE_INTERVAL_MS = 80;
const HEARTBEAT_MS = 900;

function currentFrame(simulation) {
  if (simulation.runtime.now < simulation.attackPoseUntil) return 3;
  if (!simulation.runtime.moving) return 0;
  return simulation.runtime.facing === 'up' ? 2 : 1;
}

export class BabelRealtime {
  constructor(simulation) {
    this.sim = simulation;
    this.socket = null;
    this.selfId = null;
    this.connected = false;
    this.joined = false;
    this.suspended = false;
    this.players = new Map();
    this.listeners = new Map();
    this.population = 0;
    this.sequence = 0;
    this.lastMoveAt = 0;
    this.lastMoveKey = '';
    this.lastProfileKey = '';
    this.simulationHandler = event => this.onSimulationEvent(event.detail.type);
    window.addEventListener('babel:event', this.simulationHandler);
  }

  start() {
    if (this.socket || typeof window.io !== 'function') {
      if (typeof window.io !== 'function') this.publishOnline('unavailable');
      return;
    }
    this.socket = window.io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000,
      timeout: 8000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      this.joined = false;
      if (this.suspended) {
        this.socket.disconnect();
        this.publishOnline('replaced');
        return;
      }
      this.emitLocal('connected', {});
      this.joinRegion(true);
      this.publishOnline('connected');
    });
    this.socket.on('disconnect', reason => {
      this.connected = false;
      this.joined = false;
      this.selfId = null;
      this.population = 0;
      this.players.clear();
      this.emitLocal('sync', {});
      this.emitLocal('disconnected', { reason });
      this.publishOnline(this.suspended ? 'replaced' : 'reconnecting');
    });
    this.socket.on('connect_error', () => {
      this.connected = false;
      this.publishOnline('reconnecting');
    });
    this.socket.on('babel:init', payload => {
      this.selfId = payload?.id || this.socket.id;
      this.joined = true;
      this.players.clear();
      for (const player of payload?.players || []) this.setPlayer(player);
      this.emitLocal('sync', {});
      this.publishOnline('online');
    });
    this.socket.on('babel:population', payload => {
      if (payload?.regionId !== this.sim.state.world.regionId) return;
      this.population = Math.max(1, Number(payload?.count) || 1);
      this.publishOnline('online');
    });
    this.socket.on('babel:player-joined', player => {
      if (!player || player.id === this.selfId) return;
      this.setPlayer(player);
      this.emitLocal('joined', { player });
      this.emitLocal('sync', {});
      this.publishOnline('online');
    });
    this.socket.on('babel:player-update', player => {
      if (!player || player.id === this.selfId) return;
      const previous = this.players.get(player.id);
      if (previous && Number(player.sequence) < Number(previous.sequence)) return;
      this.setPlayer(player);
      this.emitLocal('sync', { playerId: player.id });
      if (!previous || previous.level !== player.level || previous.power !== player.power) this.publishOnline('online');
    });
    this.socket.on('babel:player-left', payload => {
      const player = this.players.get(payload?.id);
      this.players.delete(payload?.id);
      this.emitLocal('left', { player: player || payload });
      this.emitLocal('sync', {});
      this.publishOnline('online');
    });
    this.socket.on('babel:session-replaced', payload => {
      this.suspended = true;
      this.joined = false;
      this.players.clear();
      this.emitLocal('replaced', payload || {});
      this.emitLocal('sync', {});
      this.publishOnline('replaced');
      this.socket.disconnect();
    });
    this.socket.on('babel:error', payload => this.emitLocal('error', payload || {}));
  }

  on(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
    return () => this.listeners.get(type)?.delete(handler);
  }

  emitLocal(type, payload) {
    for (const handler of this.listeners.get(type) || []) handler(payload);
  }

  localPayload() {
    const state = this.sim.state;
    return {
      regionId: state.world.regionId,
      body: state.profile.body,
      weapon: state.profile.weapon,
      x: state.player.x,
      y: state.player.y,
      facing: this.sim.runtime.facing,
      moving: this.sim.runtime.moving,
      frame: currentFrame(this.sim),
      level: state.player.level,
      power: this.sim.stats.power
    };
  }

  joinRegion(force = false) {
    if (!this.socket?.connected || !this.sim.state.profile.created || this.suspended) return;
    if (this.joined && !force) return;
    this.socket.timeout(5000).emit('babel:join', this.localPayload(), (error, response) => {
      if (error || !response?.ok) {
        this.joined = false;
        this.emitLocal('error', { code: response?.error || 'join_timeout' });
        return;
      }
      this.joined = true;
      this.population = Math.max(1, Number(response.count) || 1);
      this.publishOnline('online');
    });
  }

  updateLocal(now = performance.now()) {
    if (!this.sim.state.profile.created || this.suspended) return;
    if (!this.joined) {
      this.joinRegion();
      return;
    }

    const payload = this.localPayload();
    const profileKey = `${payload.body}:${payload.weapon}:${payload.level}:${payload.power}`;
    if (profileKey !== this.lastProfileKey) {
      this.lastProfileKey = profileKey;
      this.socket.emit('babel:profile', payload);
    }

    const moveKey = `${Math.round(payload.x)}:${Math.round(payload.y)}:${payload.facing}:${payload.moving ? 1 : 0}:${payload.frame}`;
    if (now - this.lastMoveAt < MOVE_INTERVAL_MS) return;
    if (moveKey === this.lastMoveKey && now - this.lastMoveAt < HEARTBEAT_MS) return;
    this.lastMoveAt = now;
    this.lastMoveKey = moveKey;
    payload.sequence = ++this.sequence;
    this.socket.volatile.emit('babel:move', payload);
  }

  setPlayer(player) {
    this.players.set(player.id, {
      ...player,
      x: Number(player.x) || 0,
      y: Number(player.y) || 0,
      level: Math.max(1, Number(player.level) || 1),
      power: Math.max(0, Number(player.power) || 0),
      frame: Math.max(0, Math.min(3, Number(player.frame) || 0))
    });
  }

  onSimulationEvent(type) {
    if (type === 'journeyStarted' || type === 'playerDefeated') {
      this.joined = false;
      this.joinRegion(true);
    }
    if (type === 'levelUp' || type === 'itemEquipped') this.lastProfileKey = '';
  }

  publishOnline(status) {
    const count = this.connected && this.joined ? Math.max(1, this.population || this.players.size + 1) : 0;
    window.dispatchEvent(new CustomEvent('babel:online', {
      detail: {
        status,
        connected: this.connected && this.joined,
        count,
        players: [...this.players.values()].map(player => ({ id: player.id, name: player.name, level: player.level, power: player.power }))
      }
    }));
  }

  destroy() {
    window.removeEventListener('babel:event', this.simulationHandler);
    this.socket?.disconnect();
    this.listeners.clear();
    this.players.clear();
  }
}
