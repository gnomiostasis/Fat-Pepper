import Phaser from 'phaser';
import { makeTextures } from '../art/textures';
import { loadingDone, loadingStep } from '../loading';

/** Draws every texture up front, then starts the game with the HUD on top, keeping the loading screen up meanwhile. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    loadingStep(70, 'Drawing the snacks…')
      .then(() => makeTextures(this))
      .then(() => loadingStep(85, 'Laying out the whole world…'))
      .then(() => {
        // Fade the loading screen once the game scene exists and has drawn a frame.
        this.scene.get('game').events.once(Phaser.Scenes.Events.CREATE, () => {
          requestAnimationFrame(() => requestAnimationFrame(loadingDone));
        });
        this.scene.start('game');
        this.scene.launch('ui');
      });
  }
}
