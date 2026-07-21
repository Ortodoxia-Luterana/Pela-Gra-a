import Phaser from 'phaser';
import type { BootstrapState, StationState } from '../../simulation/state';
import { VisitorMachine } from '../../simulation/visitorMachine';

type StationView = { sprite: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image | null };

const WORLD = { width: 720, height: 1280 };

export class ChurchScene extends Phaser.Scene {
  private state!: BootstrapState;
  private readonly stationViews = new Map<string, StationView>();

  constructor() { super('church'); }

  create(): void {
    this.state = this.registry.get('bootstrap') as BootstrapState;
    this.cameras.main.setBackgroundColor('#3d2418');
    this.add.image(WORLD.width / 2, WORLD.height / 2, 'church-room').setDisplaySize(WORLD.width, WORLD.height).setDepth(0);
    this.createStations();
    this.createPastor();
    for (let index = 0; index < 4; index += 1) new VisitorMachine(this, index);
    this.addWarmth();
    this.input.on('gameobjectdown', (_pointer: Phaser.Input.Pointer, object: Phaser.GameObjects.GameObject & { stationId?: string }) => {
      if (!object.stationId) return;
      window.dispatchEvent(new CustomEvent('lutheran:station-select', { detail: object.stationId }));
    });
    window.addEventListener('lutheran:state', this.onState as EventListener);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('lutheran:state', this.onState as EventListener));
    this.time.addEvent({ delay: 500, loop: true, callback: () => this.emitLocalProgress() });
  }

  private createStations(): void {
    this.station('altar', 254, 270, 'altar-l1', 0.34, 270);
    this.station('pulpit', 386, 255, this.pulpitTexture(), 0.39, 280);
    const benches = this.state.stations.find((station) => station.id === 'benches');
    const benchTexture = `benches-l${Math.max(1, Math.min(3, benches?.level || 1))}`;
    [[242, 550], [478, 550], [242, 670], [478, 670], [242, 790], [478, 790]].forEach(([x, y]) => {
      const bench = this.add.image(x, y, benchTexture).setScale(0.35).setDepth(y).setInteractive({ useHandCursor: true });
      (bench as Phaser.GameObjects.Image & { stationId?: string }).stationId = 'benches';
    });
    this.station('reception', 150, 915, 'reception-l1', 0.29, 915, true);
    this.station('catechesis', 565, 470, 'catechesis-l1', 0.27, 470, true);
  }

  private station(id: string, x: number, y: number, texture: string, scale: number, depth: number, buildable = false): void {
    const station = this.state.stations.find((candidate) => candidate.id === id);
    const glow = buildable ? this.add.image(x, y, 'ui-frame').setScale(0.27).setAlpha(station?.built ? 0 : 0.5).setTint(0xffd778).setDepth(depth - 2) : null;
    const sprite = this.add.image(x, y, texture).setScale(scale).setDepth(depth).setInteractive({ useHandCursor: true });
    (sprite as Phaser.GameObjects.Image & { stationId?: string }).stationId = id;
    sprite.setVisible(Boolean(station?.built));
    if (!station?.built && glow) {
      glow.setInteractive({ useHandCursor: true });
      (glow as Phaser.GameObjects.Image & { stationId?: string }).stationId = id;
      this.tweens.add({ targets: glow, alpha: { from: 0.28, to: 0.62 }, scale: { from: 0.25, to: 0.29 }, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.stationViews.set(id, { sprite, glow });
  }

  private createPastor(): void {
    const pastor = this.add.sprite(392, 345, 'pastor-walk', 0).setOrigin(0.5, 0.88).setScale(0.42).setDepth(350).play('pastor-walk-cycle');
    this.tweens.add({ targets: pastor, x: 424, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onYoyo: () => pastor.setFlipX(true), onRepeat: () => pastor.setFlipX(false) });
  }

  private addWarmth(): void {
    const graphics = this.add.graphics().setDepth(1400).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.09);
    graphics.fillStyle(0xffbd65, 1).fillEllipse(360, 345, 470, 260);
    this.tweens.add({ targets: graphics, alpha: { from: 0.06, to: 0.12 }, duration: 2200, yoyo: true, repeat: -1 });
  }

  private pulpitTexture(): string {
    const level = this.state.stations.find((station) => station.id === 'pulpit')?.level || 1;
    return `pulpit-l${Math.max(1, Math.min(3, level))}`;
  }

  private onState = (event: CustomEvent<BootstrapState>): void => {
    this.state = event.detail;
    const nextPulpit = this.state.stations.find((station) => station.id === 'pulpit');
    this.registry.set('pulpitProgress', nextPulpit?.readyCycles ? 1 : nextPulpit?.progress || 0);
    const pulpit = this.stationViews.get('pulpit');
    pulpit?.sprite.setTexture(this.pulpitTexture());
    for (const stationId of ['reception', 'catechesis']) {
      const station = this.state.stations.find((candidate) => candidate.id === stationId);
      const view = this.stationViews.get(stationId);
      view?.sprite.setVisible(Boolean(station?.built));
      view?.glow?.setVisible(!station?.built);
    }
    this.rewardBurst(this.state.stations.find((station) => station.id === 'pulpit'));
  };

  private rewardBurst(station?: StationState): void {
    if (!station) return;
    const x = 386;
    const y = 205;
    for (let index = 0; index < 7; index += 1) {
      const mote = this.add.circle(x, y, Phaser.Math.Between(3, 7), index % 2 ? 0xffd75e : 0xfff2bf).setDepth(1500);
      this.tweens.add({ targets: mote, x: x + Phaser.Math.Between(-65, 65), y: y + Phaser.Math.Between(-100, -35), alpha: 0, scale: 0.2, duration: Phaser.Math.Between(520, 900), onComplete: () => mote.destroy() });
    }
  }

  private emitLocalProgress(): void {
    const pulpit = this.state.stations.find((station) => station.id === 'pulpit');
    if (!pulpit) return;
    const lastProgress = Number(this.registry.get('pulpitProgress') ?? pulpit.progress);
    const nextProgress = pulpit.readyCycles > 0 ? 1 : Math.min(1, lastProgress + 0.5 / Math.max(1, pulpit.cycleSeconds));
    this.registry.set('pulpitProgress', nextProgress);
    window.dispatchEvent(new CustomEvent('lutheran:progress', { detail: nextProgress }));
  }
}
