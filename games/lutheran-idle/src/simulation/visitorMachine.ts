import Phaser from 'phaser';

type VisitorPhase = 'spawn' | 'walking' | 'queueing' | 'participating' | 'leaving';

type Point = { x: number; y: number };

const PATHS: Array<{ queue: Point; seat: Point; lane: number }> = [
  { queue: { x: 332, y: 840 }, seat: { x: 257, y: 708 }, lane: -24 },
  { queue: { x: 388, y: 840 }, seat: { x: 463, y: 708 }, lane: 24 },
  { queue: { x: 334, y: 940 }, seat: { x: 260, y: 822 }, lane: -18 },
  { queue: { x: 386, y: 940 }, seat: { x: 460, y: 822 }, lane: 18 }
];

export class VisitorMachine {
  private phase: VisitorPhase = 'spawn';
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly path: (typeof PATHS)[number];

  constructor(private readonly scene: Phaser.Scene, index: number) {
    this.path = PATHS[index % PATHS.length];
    this.sprite = scene.add.sprite(360 + this.path.lane, 1160, 'visitor-walk', 0)
      .setOrigin(0.5, 0.88)
      .setScale(0.43)
      .setDepth(1160);
    this.sprite.setVisible(false);
    scene.time.delayedCall(index * 1400, () => this.begin());
  }

  private begin(): void {
    this.phase = 'spawn';
    this.sprite.setPosition(360 + this.path.lane, 1160).setVisible(true).setAlpha(1).play('visitor-walk-cycle');
    this.walk([
      { x: 360 + this.path.lane, y: 1055 },
      { x: 360 + this.path.lane, y: this.path.queue.y },
      this.path.queue
    ], () => this.queue());
  }

  private walk(points: Point[], done: () => void): void {
    this.phase = 'walking';
    const [next, ...rest] = points;
    if (!next) { done(); return; }
    const distance = Phaser.Math.Distance.Between(this.sprite.x, this.sprite.y, next.x, next.y);
    this.scene.tweens.add({
      targets: this.sprite,
      x: next.x,
      y: next.y,
      duration: Math.max(280, distance * 4.2),
      ease: 'Sine.easeInOut',
      onUpdate: () => this.sprite.setDepth(Math.round(this.sprite.y)),
      onComplete: () => this.walk(rest, done)
    });
  }

  private queue(): void {
    this.phase = 'queueing';
    this.sprite.stop().setFrame(1);
    this.scene.tweens.add({ targets: this.sprite, y: this.sprite.y - 4, duration: 520, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    this.scene.time.delayedCall(900, () => {
      this.sprite.play('visitor-walk-cycle');
      this.walk([this.path.seat], () => this.participate());
    });
  }

  private participate(): void {
    this.phase = 'participating';
    this.sprite.stop().setFrame(3).setScale(0.38).setDepth(Math.round(this.sprite.y - 16));
    this.scene.time.delayedCall(2500, () => this.leave());
  }

  private leave(): void {
    this.phase = 'leaving';
    this.sprite.setScale(0.43).play('visitor-walk-cycle').setFlipX(true);
    this.walk([
      this.path.queue,
      { x: 360 - this.path.lane, y: 980 },
      { x: 360 - this.path.lane, y: 1165 }
    ], () => {
      this.sprite.setFlipX(false).setVisible(false);
      this.scene.time.delayedCall(1100, () => this.begin());
    });
  }

  get currentPhase(): VisitorPhase { return this.phase; }
}
