import Phaser from 'phaser';
import { assets } from '../../assets/manifest';

export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }

  preload(): void {
    this.load.image('church-room', assets.background);
    assets.stations.pulpit.forEach((path, index) => this.load.image(`pulpit-l${index + 1}`, path));
    assets.stations.benches.forEach((path, index) => this.load.image(`benches-l${index + 1}`, path));
    this.load.image('altar-l1', assets.stations.altar);
    this.load.image('reception-l1', assets.stations.reception);
    this.load.image('catechesis-l1', assets.stations.catechesis);
    this.load.image('ui-frame', assets.ui.frame);
    this.load.image('ui-button', assets.ui.button);
    this.load.spritesheet('visitor-walk', assets.characters.visitor, { frameWidth: assets.characters.frameWidth, frameHeight: assets.characters.frameHeight });
    this.load.spritesheet('pastor-walk', assets.characters.pastor, { frameWidth: assets.characters.frameWidth, frameHeight: assets.characters.frameHeight });
  }

  create(): void {
    this.anims.create({ key: 'visitor-walk-cycle', frames: this.anims.generateFrameNumbers('visitor-walk', { start: 0, end: 3 }), frameRate: 7, repeat: -1 });
    this.anims.create({ key: 'pastor-walk-cycle', frames: this.anims.generateFrameNumbers('pastor-walk', { start: 0, end: 3 }), frameRate: 6, repeat: -1 });
    this.scene.start('church');
  }
}
