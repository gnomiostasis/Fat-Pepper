import Phaser from 'phaser';
import { PAL } from './art/palette';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

async function fontsReady() {
  // Phaser draws text to canvas, so the web fonts must be loaded first. Give up after 3s.
  const load = Promise.all(['400 20px "Lilita One"', '400 16px "Nunito"', '700 16px "Nunito"', '800 16px "Nunito"'].map((f) => document.fonts.load(f)));
  await Promise.race([load, new Promise((r) => setTimeout(r, 3000))]);
}

fontsReady().then(() => {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: PAL.avocadoDark,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    render: { antialias: true, roundPixels: false },
    input: { activePointers: 2 },
    scene: [BootScene, GameScene, UIScene],
  });

  // Handy for poking at the game from the browser console while developing.
  if (import.meta.env.DEV) (window as unknown as { game: Phaser.Game }).game = game;
});
