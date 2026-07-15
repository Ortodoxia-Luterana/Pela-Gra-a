import { JourneyScene } from './game-scene.js?v=2.2.0';
import { BabelRealtime } from './multiplayer.js?v=2.2.0';
import { GameSimulation } from './simulation.js?v=2.2.0';
import { GameUI } from './ui.js?v=2.2.0';

const boot = window.__BABEL_BOOT__ || { user: { name: 'Aventureiro' }, state: null, offlineSeconds: 0 };
const emit = (type, payload = {}) => window.dispatchEvent(new CustomEvent('babel:event', { detail: { type, payload } }));
const simulation = new GameSimulation(boot.state, emit);
const offlineReward = simulation.applyOffline(boot.offlineSeconds);
const realtime = new BabelRealtime(simulation);

const game = new window.Phaser.Game({
  type: window.Phaser.AUTO,
  parent: 'game-canvas',
  transparent: false,
  backgroundColor: '#071827',
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  render: { antialias: true, antialiasGL: true, roundPixels: true, pixelArt: false, powerPreference: 'high-performance' },
  scale: { mode: window.Phaser.Scale.RESIZE, autoCenter: window.Phaser.Scale.CENTER_BOTH, autoRound: true, width: '100%', height: '100%' },
  input: { activePointers: 3 },
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scene: [new JourneyScene(simulation, realtime)]
});

const ui = new GameUI(simulation, boot);
realtime.on('joined', ({ player }) => ui.toast(`${player.name} entrou nos Campos das Fronteiras.`));
realtime.on('left', ({ player }) => { if (player?.name) ui.toast(`${player.name} deixou a região.`); });
realtime.on('replaced', payload => ui.toast(payload?.message || 'Esta jornada foi aberta em outra aba.'));
realtime.on('error', payload => {
  if (payload?.code === 'authentication_required') ui.toast('Sua sessão expirou. Entre novamente pelo Game Hub.');
});
realtime.start();
if (offlineReward) window.setTimeout(() => ui.showOffline(offlineReward), 500);

let saveInFlight = null;
let saveQueued = false;

async function saveProgress() {
  if (!simulation.state.profile.created) return;
  if (saveInFlight) {
    saveQueued = true;
    return saveInFlight;
  }
  const payload = JSON.stringify({ state: simulation.snapshot() });
  saveInFlight = fetch('/api/babel/save', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    credentials: 'same-origin',
    keepalive: payload.length < 60_000
  }).then(response => {
    if (!response.ok) throw new Error(`save:${response.status}`);
    return response.json();
  }).catch(error => {
    console.warn('Não foi possível sincronizar o save de Babel.', error);
  }).finally(() => {
    saveInFlight = null;
    if (saveQueued) {
      saveQueued = false;
      saveProgress();
    }
  });
  return saveInFlight;
}

const saveEvents = new Set(['journeyStarted', 'enemyDefeated', 'itemEquipped', 'petEquipped', 'skillEquipped', 'equipmentFused', 'skillFused', 'equipmentSeen', 'levelUp', 'autoUnlocked', 'regionChanged', 'regionComplete', 'playerDefeated', 'trainingUpgraded', 'summoned', 'missionClaimed', 'gemsEarned']);
window.addEventListener('babel:event', event => { if (saveEvents.has(event.detail.type)) window.setTimeout(saveProgress, 180); });
window.setInterval(saveProgress, 10_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) saveProgress();
});
window.addEventListener('pagehide', () => {
  saveProgress();
  realtime.destroy();
}, { once: true });

window.addEventListener('error', event => {
  if (!String(event.message || '').includes('ResizeObserver')) ui.toast('A jornada encontrou uma falha visual. Recarregue a página se ela persistir.');
});

window.__BABEL_DEBUG__ = { game, simulation, realtime, saveProgress };
