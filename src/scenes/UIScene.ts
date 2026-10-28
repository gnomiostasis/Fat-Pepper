import Phaser from 'phaser';
import { PAL, hexNum } from '../art/palette';
import { DOOR_R, START_R, formatSize } from '../game/tuning';
import { EV, RunStats } from './events';

const DISPLAY = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
const BODY = '"Nunito", "Segoe UI", system-ui, sans-serif';

interface FeedLine { name: string; count: number; text: Phaser.GameObjects.Text; at: number }

/** HUD, film grain, and the start and finish cards, drawn on top of the game. */
export class UIScene extends Phaser.Scene {
  private grain!: Phaser.GameObjects.TileSprite;
  private vignette!: Phaser.GameObjects.Image;
  private panel!: Phaser.GameObjects.Graphics;
  private sizeLabel!: Phaser.GameObjects.Text;
  private sizeText!: Phaser.GameObjects.Text;
  private doorLabel!: Phaser.GameObjects.Text;
  private bar!: Phaser.GameObjects.Graphics;
  private toastBox!: Phaser.GameObjects.Container;
  private overlay?: Phaser.GameObjects.Container;
  private feed: FeedLine[] = [];
  private r = START_R;

  constructor() {
    super('ui');
  }

  create() {
    this.feed = [];
    this.r = START_R;

    this.panel = this.add.graphics();
    this.sizeLabel = this.add.text(0, 0, 'PEPPER', { fontFamily: DISPLAY, fontSize: '14px', color: PAL.rust }).setLetterSpacing(2);
    this.sizeText = this.add.text(0, 0, formatSize(START_R), { fontFamily: DISPLAY, fontSize: '40px', color: PAL.ink });
    this.doorLabel = this.add.text(0, 0, '', { fontFamily: BODY, fontSize: '13px', fontStyle: '800', color: PAL.ink });
    this.bar = this.add.graphics();
    this.toastBox = this.add.container(0, 0).setAlpha(0);

    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0);
    this.grain = this.add.tileSprite(0, 0, 10, 10, 'grain').setOrigin(0);

    const bus = this.game.events;
    const onSize = (r: number) => { this.r = r; this.drawHud(); };
    const onEat = (name: string) => this.addFeed(name);
    const onToast = (msg: string) => this.toast(msg);
    const onDone = (s: RunStats) => this.showFinish(s);
    bus.on(EV.size, onSize); bus.on(EV.eat, onEat); bus.on(EV.toast, onToast); bus.on(EV.done, onDone);
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EV.size, onSize); bus.off(EV.eat, onEat); bus.off(EV.toast, onToast); bus.off(EV.done, onDone);
      this.scale.off('resize', onResize);
    });

    this.layout();
    this.showStart();
  }

  update(_time: number, delta: number) {
    // Let the grain crawl a little, like old film.
    this.grain.tilePositionX += delta * 0.37;
    this.grain.tilePositionY -= delta * 0.53;
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    this.vignette.setDisplaySize(w, h);
    this.grain.setSize(w, h);
    this.drawHud();
    this.feed.forEach((f, i) => f.text.setPosition(20, h - 40 - i * 24));
    this.toastBox.setPosition(w / 2, 96);
    if (this.overlay) this.overlay.getData('layout')?.();
  }

  private drawHud() {
    const pw = 190, ph = 108, x = 16, y = 16;
    const g = this.panel.clear();
    card(g, x, y, pw, ph, PAL.cream);
    this.sizeLabel.setPosition(x + 16, y + 12);
    this.sizeText.setText(formatSize(this.r)).setPosition(x + 14, y + 26);

    const pct = Math.min(1, (this.r - START_R) / (DOOR_R - START_R));
    const open = this.r >= DOOR_R;
    this.doorLabel.setText(open ? 'Dog door: OPEN!' : `Dog door at ${formatSize(DOOR_R)}`).setPosition(x + 16, y + 72);
    const bx = x + 16, by = y + 90, bw = pw - 32, bh = 8;
    this.bar.clear();
    this.bar.fillStyle(hexNum(PAL.paper)).fillRoundedRect(bx, by, bw, bh, 4);
    if (pct > 0) this.bar.fillStyle(hexNum(open ? PAL.teal : PAL.mustard)).fillRoundedRect(bx, by, Math.max(bh, bw * pct), bh, 4);
    this.bar.lineStyle(2, hexNum(PAL.ink)).strokeRoundedRect(bx, by, bw, bh, 4);
  }

  private addFeed(name: string) {
    const now = this.time.now, h = this.scale.height;
    const top = this.feed[0];
    if (top && top.name === name && now - top.at < 1500) {
      top.count++; top.at = now;
      top.text.setText(`${name} ×${top.count}`).setAlpha(1);
      this.tweens.killTweensOf(top.text);
      this.fadeLater(top);
      return;
    }
    const text = this.add.text(20, h - 40, name, {
      fontFamily: DISPLAY, fontSize: '20px', color: PAL.cream, stroke: PAL.ink, strokeThickness: 5,
    }).setOrigin(0, 0.5);
    const line = { name, count: 1, text, at: now };
    this.feed.unshift(line);
    while (this.feed.length > 5) this.feed.pop()!.text.destroy();
    this.feed.forEach((f, i) => f.text.setY(h - 40 - i * 24));
    text.setScale(1.3);
    this.tweens.add({ targets: text, scale: 1, duration: 140, ease: 'Back.easeOut' });
    this.fadeLater(line);
  }

  private fadeLater(line: FeedLine) {
    this.tweens.add({
      targets: line.text, alpha: 0, delay: 2200, duration: 600,
      onComplete: () => {
        const i = this.feed.indexOf(line);
        if (i >= 0) { this.feed.splice(i, 1); line.text.destroy(); }
      },
    });
  }

  private toast(msg: string) {
    const c = this.toastBox;
    c.removeAll(true);
    const maxW = Math.min(520, this.scale.width - 40);
    const t = this.add.text(0, 0, msg, {
      fontFamily: BODY, fontSize: '17px', fontStyle: '800', color: PAL.ink, align: 'center', wordWrap: { width: maxW - 36 },
    }).setOrigin(0.5);
    const g = this.add.graphics();
    card(g, -t.width / 2 - 18, -t.height / 2 - 12, t.width + 36, t.height + 24, PAL.yellow);
    c.add([g, t]);
    this.tweens.killTweensOf(c);
    c.setAlpha(1).setScale(0.85);
    this.tweens.add({ targets: c, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, delay: 2600, duration: 400 });
  }

  // ---------- start and finish cards ----------

  private showStart() {
    this.showCard(
      'Fat Pepper',
      'Pepper is a tiny puppy with a big appetite. Eat anything smaller than you, grow, and get big enough to jump out the dog door.',
      'Move with the arrow keys or WASD, or hold the mouse or your finger where Pepper should go.',
      'Start',
      () => this.game.events.emit(EV.start),
    );
  }

  private showFinish(s: RunStats) {
    const m = Math.floor(s.seconds / 60), sec = Math.floor(s.seconds % 60).toString().padStart(2, '0');
    this.showCard(
      'Pepper got out!',
      `She squeezed through the dog door at ${formatSize(s.r)} after eating ${s.eaten} things in ${m}:${sec}.`,
      'The outdoors, the dog catcher and powerups come next.',
      'Play again',
      () => {
        this.scene.get('game').scene.restart();
        this.scene.restart();
      },
    );
  }

  private showCard(title: string, body: string, small: string, button: string, onGo: () => void) {
    const c = this.add.container(0, 0).setDepth(100);
    this.overlay = c;
    const dim = this.add.rectangle(0, 0, 10, 10, hexNum(PAL.ink), 0.45).setOrigin(0);
    const g = this.add.graphics();
    const tTitle = this.add.text(0, 0, title, { fontFamily: DISPLAY, fontSize: '52px', color: PAL.orange, stroke: PAL.ink, strokeThickness: 6 }).setOrigin(0.5, 0);
    const tBody = this.add.text(0, 0, body, { fontFamily: BODY, fontSize: '18px', color: PAL.ink, align: 'center', lineSpacing: 4 }).setOrigin(0.5, 0);
    const tSmall = this.add.text(0, 0, small, { fontFamily: BODY, fontSize: '14px', color: PAL.rust, align: 'center', fontStyle: '700' }).setOrigin(0.5, 0);
    const btnG = this.add.graphics();
    const tBtn = this.add.text(0, 0, button, { fontFamily: DISPLAY, fontSize: '26px', color: PAL.cream }).setOrigin(0.5);
    c.add([dim, g, tTitle, tBody, tSmall, btnG, tBtn]);

    const layout = () => {
      const { width: w, height: h } = this.scale;
      const cw = Math.min(480, w - 32), inner = cw - 48;
      dim.setSize(w, h);
      tBody.setWordWrapWidth(inner); tSmall.setWordWrapWidth(inner);
      tTitle.setFontSize(cw < 380 ? 40 : 52);
      const ch = 28 + tTitle.height + 12 + tBody.height + 14 + tSmall.height + 24 + 52 + 28;
      const x = (w - cw) / 2, y = Math.max(16, (h - ch) / 2);
      g.clear(); card(g, x, y, cw, ch, PAL.cream);
      let cy = y + 28;
      tTitle.setPosition(w / 2, cy); cy += tTitle.height + 12;
      tBody.setPosition(w / 2, cy); cy += tBody.height + 14;
      tSmall.setPosition(w / 2, cy); cy += tSmall.height + 24;
      const bw = Math.max(170, tBtn.width + 56);
      btnG.clear(); card(btnG, w / 2 - bw / 2, cy, bw, 52, PAL.teal);
      tBtn.setPosition(w / 2, cy + 26);
    };
    c.setData('layout', layout);
    layout();

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250 });

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      this.input.keyboard!.off('keydown', go);
      this.input.off('pointerdown', go);
      this.tweens.add({ targets: c, alpha: 0, duration: 200, onComplete: () => { c.destroy(); if (this.overlay === c) this.overlay = undefined; } });
      onGo();
    };
    // A short pause so a held key or tap from playing doesn't skip the card.
    this.time.delayedCall(500, () => {
      this.input.on('pointerdown', go);
      this.input.keyboard!.on('keydown', go);
    });
  }
}

/** A 60s cartoon panel: flat color printed a bit off its ink outline. */
function card(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle(hexNum(color)).fillRoundedRect(x + 3, y - 2, w, h, 12);
  g.lineStyle(3, hexNum(PAL.ink)).strokeRoundedRect(x, y, w, h, 12);
}
