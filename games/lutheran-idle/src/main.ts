import Phaser from 'phaser';
import { io } from 'socket.io-client';
import './styles.css';
import { api } from './api/client';
import { GameStore, type BootstrapState } from './simulation/state';
import { BootScene } from './phaser/scenes/BootScene';
import { ChurchScene } from './phaser/scenes/ChurchScene';
import { HudController } from './ui/HudController';

const store = new GameStore();
let hud: HudController;

async function runAction(action: () => Promise<{ state: BootstrapState }>, success: string): Promise<void> {
  try {
    const result = await action();
    store.set(result.state);
    hud.toast(success);
  } catch (error) {
    hud.toast(error instanceof Error ? error.message : 'A ação não pôde ser concluída.', 'error');
  }
}

async function boot(): Promise<void> {
  try {
    const bootstrap = await api.bootstrap();
    hud = new HudController(store, {
      collect: (stationId) => runAction(() => api.collect(stationId), 'Produção coletada.'),
      upgrade: (stationId) => runAction(() => api.upgrade(stationId), 'Estação melhorada.'),
      build: (stationId) => runAction(() => api.build(stationId), 'Novo espaço construído.'),
      assign: (workerId, stationId) => runAction(() => api.assignWorker(workerId, stationId), 'Trabalhador alocado.'),
      claimOffline: () => runAction(() => api.claimOffline(), 'Produção offline recebida.'),
      createDistrict: (name) => runAction(() => api.createDistrict(name), 'Distrito fundado.'),
      joinDistrict: (districtId) => runAction(() => api.joinDistrict(districtId), 'Você entrou no distrito.'),
      contribute: (amount) => runAction(() => api.contribute(amount), 'Contribuição enviada.')
    });
    store.set(bootstrap);

    new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-root',
      width: 720,
      height: 1280,
      transparent: true,
      antialias: true,
      render: { powerPreference: 'high-performance', roundPixels: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 1280 },
      scene: [BootScene, ChurchScene],
      callbacks: { preBoot: (game) => game.registry.set('bootstrap', bootstrap) }
    });

    window.addEventListener('lutheran:station-select', (event) => hud.selectStation(String((event as CustomEvent<string>).detail || 'pulpit')));
    connectRealtime();
    if (bootstrap.offlineClaim) window.setTimeout(() => hud.openPanel('offline'), 650);
  } catch (error) {
    const bootScreen = document.querySelector<HTMLElement>('#boot-screen');
    if (bootScreen) bootScreen.innerHTML = `<div class="boot-emblem">!</div><strong>Não foi possível abrir Lutheran Idle</strong><span>${error instanceof Error ? error.message : 'Tente novamente pelo Game Hub.'}</span><a href="/">Voltar ao Hub</a>`;
  }
}

function connectRealtime(): void {
  const socket = io('/lutheran-idle', { transports: ['websocket', 'polling'], withCredentials: true, reconnectionDelay: 1200 });
  socket.on('world:ready', (payload: { online: number }) => store.patch({ online: payload.online }));
  socket.on('presence:update', (payload: { online: number }) => store.patch({ online: payload.online }));
  socket.on('district:update', () => { void api.bootstrap().then((state) => store.set(state)).catch(() => undefined); });
  socket.on('connect_error', () => hud.toast('Reconectando ao distrito...', 'error'));
}

void boot();
