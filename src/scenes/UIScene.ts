import Phaser from 'phaser';
import { PAL, hexNum } from '../art/palette';
import { MILESTONES, POWER_BY_ID, PowerDef, PowerId, Stacks } from '../game/powerups';
import { DOOR_R, START_R, formatSize } from '../game/tuning';
import { EV, Goal, PowerState, RunStats } from './events';

const DISPLAY = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
const BODY = '"Nunito", "Segoe UI", system-ui, sans-serif';

interface FeedLine { name: string; count: number; text: Phaser.GameObjects.Text; at: number }

/** HUD and the start and finish cards, drawn on top of the game. */
export class UIScene extends Phaser.Scene {
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
  private goal: Goal = { from: START_R, to: DOOR_R, label: 'Dog door at', reached: 'Dog door: OPEN!' };
  private powers: PowerState = { stacks: {}, next: MILESTONES[0], fur: 0 };
  private nextLabel!: Phaser.GameObjects.Text;
  private chips!: Phaser.GameObjects.Container;
  private picker?: Phaser.GameObjects.Container;

  constructor() {
    super('ui');
  }

  create() {
    this.feed = [];
    this.r = START_R;
    this.goal = { from: START_R, to: DOOR_R, label: 'Dog door at', reached: 'Dog door: OPEN!' };
    this.powers = { stacks: {}, next: MILESTONES[0], fur: 0 };
    this.picker = undefined;

    this.panel = this.add.graphics();
    this.sizeLabel = this.add.text(0, 0, 'PEPPER', { fontFamily: DISPLAY, fontSize: '14px', color: PAL.rust }).setLetterSpacing(2);
    this.sizeText = this.add.text(0, 0, formatSize(START_R), { fontFamily: DISPLAY, fontSize: '40px', color: PAL.ink });
    this.doorLabel = this.add.text(0, 0, '', { fontFamily: BODY, fontSize: '13px', fontStyle: '800', color: PAL.ink });
    this.bar = this.add.graphics();
    this.nextLabel = this.add.text(0, 0, '', {
      fontFamily: BODY, fontSize: '13px', fontStyle: '800', color: PAL.white, stroke: PAL.avocadoDark, strokeThickness: 4,
    });
    this.chips = this.add.container(0, 0);
    this.toastBox = this.add.container(0, 0).setAlpha(0);

    this.vignette = this.add.image(0, 0, 'vignette').setOrigin(0);

    const bus = this.game.events;
    const onSize = (r: number) => { this.r = r; this.drawHud(); };
    const onEat = (name: string) => this.addFeed(name);
    const onToast = (msg: string) => this.toast(msg);
    const onDone = (s: RunStats) => this.showFinish(s);
    const onGoal = (g: Goal) => { this.goal = g; this.drawHud(); };
    const onPowers = (p: PowerState) => { this.powers = p; this.drawHud(); };
    const onOffer = (choices: PowerDef[]) => this.showPicker(choices);
    bus.on(EV.size, onSize); bus.on(EV.eat, onEat); bus.on(EV.toast, onToast); bus.on(EV.done, onDone); bus.on(EV.goal, onGoal);
    bus.on(EV.powers, onPowers); bus.on(EV.offer, onOffer);
    const onResize = () => this.layout();
    this.scale.on('resize', onResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      bus.off(EV.size, onSize); bus.off(EV.eat, onEat); bus.off(EV.toast, onToast); bus.off(EV.done, onDone); bus.off(EV.goal, onGoal);
      bus.off(EV.powers, onPowers); bus.off(EV.offer, onOffer);
      this.scale.off('resize', onResize);
    });

    this.layout();
    this.showStart();
  }

  private layout() {
    const { width: w, height: h } = this.scale;
    this.vignette.setDisplaySize(w, h);
    this.drawHud();
    this.feed.forEach((f, i) => f.text.setPosition(20, h - 40 - i * 24));
    this.toastBox.setPosition(w / 2, 96);
    if (this.overlay) this.overlay.getData('layout')?.();
    if (this.picker) this.picker.getData('layout')?.();
  }

  private drawHud() {
    const pw = 190, ph = 108, x = 16, y = 16;
    const g = this.panel.clear();
    card(g, x, y, pw, ph, PAL.cream);
    this.sizeLabel.setPosition(x + 16, y + 12);
    this.sizeText.setText(formatSize(this.r)).setPosition(x + 14, y + 26);

    const g0 = this.goal;
    const pct = Math.max(0, Math.min(1, (this.r - g0.from) / (g0.to - g0.from)));
    const open = this.r >= g0.to;
    this.doorLabel.setText(open ? g0.reached : `${g0.label} ${formatSize(g0.to)}`).setPosition(x + 16, y + 72);
    const bx = x + 16, by = y + 90, bw = pw - 32, bh = 8;
    this.bar.clear();
    this.bar.fillStyle(hexNum(PAL.paper)).fillRoundedRect(bx, by, bw, bh, 4);
    if (pct > 0) this.bar.fillStyle(hexNum(open ? PAL.teal : PAL.mustard)).fillRoundedRect(bx, by, Math.max(bh, bw * pct), bh, 4);

    // Under the panel: when the next powerup comes, then a chip for each one Pepper has.
    const p = this.powers;
    this.nextLabel.setText(p.next ? `Next powerup at ${formatSize(p.next)}` : 'All powerups found!').setPosition(x + 4, y + ph + 12);
    this.drawChips(x, y + ph + 36, p.stacks);
  }

  private drawChips(x0: number, y0: number, stacks: Stacks) {
    this.chips.removeAll(true);
    const maxW = Math.min(this.scale.width - 32, 420);
    let x = x0, y = y0;
    for (const [id, n] of Object.entries(stacks) as [PowerId, number][]) {
      const def = POWER_BY_ID[id];
      let label = n > 1 ? `${def.icon} ${def.name} ×${n}` : `${def.icon} ${def.name}`;
      if (id === 'fur') label = `${def.icon} ${def.name} (${this.powers.fur} left)`;
      if (id === 'treats') continue;
      const t = this.add.text(10, 4, label, { fontFamily: BODY, fontSize: '13px', fontStyle: '800', color: PAL.ink });
      const w = t.width + 20, h = 26;
      if (x + w > x0 + maxW) { x = x0; y += h + 6; }
      const g = this.add.graphics();
      g.fillStyle(0x345c32, 0.18).fillRoundedRect(2, 3, w, h, 13);
      g.fillStyle(hexNum(def.color)).fillRoundedRect(0, 0, w, h, 13);
      this.chips.add(this.add.container(x, y, [g, t]));
      x += w + 6;
    }
  }

  // ---------- picking a powerup ----------

  /** Pick 1 of 3: cards side by side (stacked on a narrow phone), click, tap or press 1-3. */
  private showPicker(choices: PowerDef[]) {
    this.picker?.destroy();
    const c = this.add.container(0, 0).setDepth(90);
    this.picker = c;
    const dim = this.add.rectangle(0, 0, 10, 10, hexNum(PAL.ink), 0.4).setOrigin(0).setInteractive();
    const title = this.add.text(0, 0, 'Pepper grew! Pick a powerup', {
      fontFamily: DISPLAY, fontSize: '40px', color: PAL.cream, stroke: PAL.rust, strokeThickness: 8, align: 'center',
    }).setOrigin(0.5, 0);
    c.add([dim, title]);

    // A short pause so a held key or tap from playing doesn't pick by accident.
    let done = false;
    const shownAt = performance.now();
    const pick = (i: number) => {
      if (done || !choices[i] || performance.now() - shownAt < 450) return;
      done = true;
      this.input.keyboard!.off('keydown', onKey);
      const chosen = cards[i];
      this.tweens.add({ targets: chosen, scale: 1.08, duration: 120, yoyo: true });
      this.tweens.add({
        targets: c, alpha: 0, delay: 200, duration: 200,
        onComplete: () => { c.destroy(); if (this.picker === c) this.picker = undefined; },
      });
      this.game.events.emit(EV.pick, choices[i].id);
    };
    const onKey = (e: KeyboardEvent) => { const i = ['1', '2', '3'].indexOf(e.key); if (i >= 0) pick(i); };

    const cards = choices.map((def, i) => {
      const have = this.powers.stacks[def.id] ?? 0;
      const card = this.add.container(0, 0);
      const g = this.add.graphics();
      const icon = this.add.text(0, 0, def.icon, { fontFamily: BODY, fontSize: '44px' }).setOrigin(0.5);
      const name = this.add.text(0, 0, def.name, { fontFamily: DISPLAY, fontSize: '26px', color: PAL.ink, align: 'center' }).setOrigin(0.5, 0);
      const lvl = this.add.text(0, 0, def.id === 'treats' ? (have ? 'Again!' : 'Right now!') : have ? `Level ${have + 1}` : 'New!', {
        fontFamily: BODY, fontSize: '13px', fontStyle: '800', color: PAL.rust,
      }).setOrigin(0.5, 0);
      const blurb = this.add.text(0, 0, def.blurb(have + 1), {
        fontFamily: BODY, fontSize: '15px', fontStyle: '700', color: PAL.ink, align: 'center', lineSpacing: 2,
      }).setOrigin(0.5, 0);
      const key = this.add.text(0, 0, `${i + 1}`, { fontFamily: DISPLAY, fontSize: '18px', color: PAL.cream }).setOrigin(0.5);
      const hit = this.add.rectangle(0, 0, 10, 10, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      card.add([g, icon, name, lvl, blurb, key, hit]);
      card.setData('parts', { g, icon, name, lvl, blurb, key, hit, def });
      hit.on('pointerover', () => this.tweens.add({ targets: card, y: card.getData('y') - 6, duration: 100 }));
      hit.on('pointerout', () => this.tweens.add({ targets: card, y: card.getData('y'), duration: 100 }));
      hit.on('pointerup', () => pick(i));
      c.add(card);
      return card;
    });

    const layout = () => {
      const { width: w, height: h } = this.scale;
      dim.setSize(w, h);
      const narrow = w < 640;
      title.setFontSize(narrow ? 28 : 40).setWordWrapWidth(w - 32);
      const cw = narrow ? Math.min(360, w - 32) : Math.min(230, (w - 64) / 3), ch = narrow ? 120 : 270, gap = 16;
      const totalH = narrow ? cards.length * ch + (cards.length - 1) * gap : ch;
      const top = Math.max(title.height + 32, (h - totalH) / 2 + 20);
      title.setPosition(w / 2, Math.max(16, top - title.height - 24));
      cards.forEach((card, i) => {
        const { g, icon, name, lvl, blurb, key, hit, def } = card.getData('parts');
        const cx = narrow ? (w - cw) / 2 : w / 2 - (cards.length * cw + (cards.length - 1) * gap) / 2 + i * (cw + gap);
        const cy = narrow ? top + i * (ch + gap) : top;
        card.setPosition(cx, cy).setData('y', cy);
        g.clear();
        g.fillStyle(0x345c32, 0.25).fillRoundedRect(4, 6, cw, ch, 16);
        g.fillStyle(hexNum(PAL.cream)).fillRoundedRect(0, 0, cw, ch, 16);
        // A colour band for the icon: across the top, or down the left on a phone.
        g.fillStyle(hexNum(def.color)).fillRoundedRect(0, 0, narrow ? 84 : cw, narrow ? ch : 92, narrow ? { tl: 16, bl: 16, tr: 0, br: 0 } : { tl: 16, tr: 16, bl: 0, br: 0 });
        if (narrow) {
          icon.setPosition(42, ch / 2);
          name.setOrigin(0, 0).setPosition(98, 12).setFontSize(22);
          lvl.setOrigin(1, 0).setPosition(cw - 12, 16);
          blurb.setOrigin(0, 0).setAlign('left').setWordWrapWidth(cw - 110).setPosition(98, 44).setFontSize(14);
          g.fillStyle(hexNum(PAL.rust)).fillCircle(16, 16, 12);
          key.setPosition(16, 17);
        } else {
          icon.setPosition(cw / 2, 46);
          name.setOrigin(0.5, 0).setPosition(cw / 2, 106).setWordWrapWidth(cw - 24).setFontSize(26);
          lvl.setOrigin(0.5, 0).setPosition(cw / 2, 106 + name.height + 2);
          blurb.setOrigin(0.5, 0).setAlign('center').setWordWrapWidth(cw - 32).setPosition(cw / 2, 106 + name.height + 24).setFontSize(15);
          g.fillStyle(hexNum(PAL.rust)).fillCircle(cw / 2, ch - 24, 14);
          key.setPosition(cw / 2, ch - 23);
        }
        hit.setSize(cw, ch);
      });
    };
    c.setData('layout', layout);
    layout();

    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 200 });
    cards.forEach((card, i) => {
      const y = card.getData('y');
      card.setY(y + 40);
      this.tweens.add({ targets: card, y, duration: 260, delay: 60 * i, ease: 'Back.easeOut' });
    });
    this.input.keyboard!.on('keydown', onKey);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.input.keyboard?.off('keydown', onKey));
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
      fontFamily: DISPLAY, fontSize: '20px', color: PAL.white, stroke: PAL.avocadoDark, strokeThickness: 5,
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
      'Pepper is a tiny puppy with a big appetite. Eat anything smaller than you, grow big enough to jump out the dog door, then eat your way around the neighborhood. Every few sizes you pick a powerup, and they stack. Watch out for the dog catcher!',
      'Move with the arrow keys or WASD, or hold the mouse or your finger where Pepper should go.',
      'Start',
      () => this.game.events.emit(EV.start),
    );
  }

  private showFinish(s: RunStats) {
    const m = Math.floor(s.seconds / 60), sec = Math.floor(s.seconds % 60).toString().padStart(2, '0');
    const won = s.outcome === 'ate-catcher';
    this.showCard(
      won ? 'Pepper ate the dog catcher!' : 'Gotcha!',
      won
        ? `At ${formatSize(s.r)} she gulped him down, net and all, after eating ${s.eaten} things in ${m}:${sec}.`
        : `The dog catcher netted Pepper at ${formatSize(s.r)}, after she ate ${s.eaten} things in ${m}:${sec}. Off to the pound!`,
      this.buildLine(s.stacks) || (won ? 'Eating whole buildings comes next.' : 'Keep moving and keep eating: he speeds up as you grow.'),
      won ? 'Play again' : 'Try again',
      () => {
        this.scene.get('game').scene.restart();
        this.scene.restart();
      },
    );
  }

  /** "Build: Zoomies ×2, Snack Magnet" for the finish card. */
  private buildLine(stacks: Stacks) {
    const parts = (Object.entries(stacks) as [PowerId, number][]).map(([id, n]) => `${POWER_BY_ID[id].icon} ${POWER_BY_ID[id].name}${n > 1 ? ` ×${n}` : ''}`);
    return parts.length ? `Build: ${parts.join(', ')}` : '';
  }

  private showCard(title: string, body: string, small: string, button: string, onGo: () => void) {
    const c = this.add.container(0, 0).setDepth(100);
    this.overlay = c;
    const dim = this.add.rectangle(0, 0, 10, 10, hexNum(PAL.ink), 0.45).setOrigin(0);
    const g = this.add.graphics();
    const tTitle = this.add.text(0, 0, title, { fontFamily: DISPLAY, fontSize: '52px', color: PAL.orange }).setOrigin(0.5, 0);
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

/** A garden pastel panel: flat colour over a soft drop shadow, no outline. */
function card(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, color: string) {
  g.fillStyle(0x345c32, 0.2).fillRoundedRect(x + 4, y + 6, w, h, 14);
  g.fillStyle(hexNum(color)).fillRoundedRect(x, y, w, h, 14);
}
