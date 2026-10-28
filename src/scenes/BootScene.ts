import Phaser from 'phaser';
import { makeTextures } from '../art/textures';

/** Draws every texture up front, then starts the game with the HUD on top. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    makeTextures(this);
    this.scene.start('game');
    this.scene.launch('ui');
  }
}
