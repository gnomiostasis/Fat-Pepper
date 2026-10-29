import Phaser from 'phaser';
import { ITEM_BY_ID, ItemDef } from '../art/items';
import { PAL, hexNum } from '../art/palette';
import { CHOMP_WORDS, chompKey } from '../art/textures';
import { Box, HouseLayout, PILES, SCATTER, Seg, buildHouse } from '../game/house';
import { DOOR_R, START_R, canEat, fatFor, formatSize, grownRadius, speedFor, viewFor } from '../game/tuning';
import { Placed, World3D, getWorld } from '../world3d/World3D';
import { EV } from './events';

interface Thing extends Placed {
  /** Collision radius for loose items. */
  rad: number;
  /** Collision box for furniture. */
  box?: Box;
  eaten: boolean;
}

export class GameScene extends Phaser.Scene {
  private house!: HouseLayout;
  private things: Thing[] = [];
  private solids: Box[] = [];
  /** Walls and the kitchen counter. */
  private segs: Seg[] = [];
  private doorFlap!: Box;
  private world!: World3D;
  private keys!: Record<'up' | 'down' | 'left' | 'right' | 'w' | 'a' | 's' | 'd', Phaser.Input.Keyboard.Key>;

  private r = START_R;
  private shownR = START_R;
  private x = 0;
  private y = 0;
  private vx = 0;
  private vy = 0;
  private heading = -Math.PI / 2;
  private walkPhase = 0;
  private chomp = 0;
  /** Seconds into the current bite lunge, or -1 when not biting. */
  private biteT = -1;
  /** Extra tail wagging right after a snack; fades out. */
  private happy = 0;
  private lastPop = 0;
  private started = false;
  private finished = false;
  private eatenCount = 0;
  private startTime = 0;
  private tooSmallUntil = 0;

  constructor() {
    super('game');
  }

  create() {
    // A restarted scene reuses this object, so reset everything here.
    this.things = []; this.solids = []; this.segs = [];
    this.r = this.shownR = START_R;
    this.vx = this.vy = 0; this.heading = -Math.PI / 2; this.walkPhase = 0; this.chomp = 0;
    this.biteT = -1; this.happy = 0; this.lastPop = 0;
    this.started = false; this.finished = false; this.eatenCount = 0; this.tooSmallUntil = 0;

    this.house = buildHouse();
    const h = this.house;
    this.x = h.spawn.x; this.y = h.spawn.y;

    // The house is drawn in 3D underneath; this scene keeps the rules and the comic pops.
    this.world = getWorld();
    this.world.build(h);
    this.segs = [...h.walls, h.frontDoor, ...h.counters];
    this.solids.push(h.stairs);
    this.doorFlap = { x: h.door.x, y: h.door.y - h.door.half, w: h.wallThickness, h: h.door.half * 2 };
    this.solids.push(this.doorFlap);
    const decals: Placed[] = h.decals.map((d) => ({ def: ITEM_BY_ID[d.id], x: d.x, y: d.y, rot: Phaser.Math.DegToRad(d.rot) }));
    for (const spot of h.furniture) this.addFurniture(spot.id, spot.x, spot.y, spot.rot);
    this.scatterItems();
    this.world.addThings([...decals, ...this.things]);
    this.world.follow(this.x, this.y, viewFor(this.r), 0, true);
    this.renderDog(0);

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
    }) as GameScene['keys'];

    const onStart = () => { this.started = true; this.startTime = this.time.now; };
    this.game.events.on(EV.start, onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(EV.start, onStart));

    this.game.events.emit(EV.size, this.r);
  }

  // ---------- setting up the house ----------

  private addFurniture(id: string, x: number, y: number, rotDeg: number) {
    const def = ITEM_BY_ID[id];
    const sc = def.size / Math.max(def.w, def.h);
    const turned = rotDeg % 180 !== 0;
    const bw = (turned ? def.h : def.w) * sc, bh = (turned ? def.w : def.h) * sc;
    const box = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
    this.solids.push(box);
    this.things.push({ def, x, y, rot: Phaser.Math.DegToRad(rotDeg), rad: Math.min(bw, bh) / 2, box, eaten: false });
  }

  private scatterItems() {
    const h = this.house;
    const area = h.rooms.map((r) => r.box.w * r.box.h), total = area.reduce((a, b) => a + b, 0);
    const pickRoom = () => {
      let t = Math.random() * total;
      for (let i = 0; i < h.rooms.length; i++) { t -= area[i]; if (t <= 0) return h.rooms[i].box; }
      return h.rooms[0].box;
    };

    const radOf = (def: ItemDef) => (def.size / 2) * ((def.w + def.h) / 2) / Math.max(def.w, def.h);
    const tryPlace = (def: ItemDef, x: number, y: number) => {
      const rad = radOf(def);
      if (this.solids.some((b) => circleBoxDist(x, y, b) < rad + 3)) return false;
      if (this.segs.some((sg) => segHit(x, y, sg).d < rad + sg.t / 2 + 3)) return false;
      if (this.things.some((o) => !o.box && o.rad > 2 && Math.hypot(o.x - x, o.y - y) < rad + o.rad + 1)) return false;
      if (!canEat(START_R, def.size)) {
        // Keep the start spot and the way to the dog door clear of anything Pepper can't eat yet.
        if (Math.hypot(x - h.spawn.x, y - h.spawn.y) < rad + 40) return false;
        if (Math.hypot(x - h.door.x, y - h.door.y) < rad + 80) return false;
        if (h.doorways.some(([dx, dy]) => Math.hypot(x - dx, y - dy) < rad + 50)) return false;
      }
      this.things.push({ def, x, y, rot: Math.random() * Math.PI * 2, rad, eaten: false });
      return true;
    };
    const randomSpot = (rad: number, room = pickRoom()) =>
      [room.x + rad + Math.random() * (room.w - rad * 2), room.y + rad + Math.random() * (room.h - rad * 2)];
    const placeIn = (def: ItemDef, room?: Box) => {
      for (let tries = 0; tries < 40; tries++) {
        const [x, y] = randomSpot(radOf(def), room);
        if (tryPlace(def, x, y)) return;
      }
    };

    // Big things first so the small stuff fills in around them.
    const order = Object.entries(SCATTER).sort((a, b) => ITEM_BY_ID[b[0]].size - ITEM_BY_ID[a[0]].size);
    for (const [id, count] of order) {
      for (let n = 0; n < count; n++) placeIn(ITEM_BY_ID[id]);
    }
    // Room-specific things: cans in the pantry, boxes in the garage, shoes by the front door.
    for (const room of h.rooms) {
      for (const [id, count] of Object.entries(room.extras ?? {})) {
        for (let n = 0; n < count; n++) placeIn(ITEM_BY_ID[id], room.box);
      }
    }

    // Spills of tiny food. The first one lands right next to Pepper.
    let first = true;
    for (const pile of PILES) {
      const def = ITEM_BY_ID[pile.id];
      for (let n = 0; n < pile.piles; n++) {
        let [cx, cy] = randomSpot(pile.spread);
        if (first) { cx = h.spawn.x + 34; cy = h.spawn.y - 6; first = false; }
        for (let i = 0; i < pile.each; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * pile.spread;
          tryPlace(def, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
        }
      }
    }
  }

  // ---------- the loop ----------

  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.started && !this.finished) this.step(time, dt);
    this.shownR += (this.r - this.shownR) * (1 - Math.exp(-dt * 8));
    this.chomp *= Math.exp(-dt * 10);
    this.renderDog(dt);
    this.drawDoorArrow();
    this.world.follow(this.x, this.y, viewFor(this.shownR), dt);
    this.world.render(dt);
  }

  private step(time: number, dt: number) {
    // Steering: keys, or hold the mouse/finger where Pepper should go
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;
    const p = this.input.activePointer;
    // Slows to a stop right under the pointer instead of jittering around it
    let ease = 1;
    if (p.isDown) {
      const wp = this.world.ground(p.x, p.y);
      if (wp) {
        const px = wp[0] - this.x, py = wp[1] - this.y, d = Math.hypot(px, py);
        if (d > this.r * 0.4) { dx = px / d; dy = py / d; ease = Math.min(1, d / (this.r * 2.5)); }
      }
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    const speed = speedFor(this.r) * ease, a = 1 - Math.exp(-dt * 22);
    this.vx += (dx * speed - this.vx) * a;
    this.vy += (dy * speed - this.vy) * a;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.collide(time);
    this.eatNearby();

    const v = Math.hypot(this.vx, this.vy);
    if (v > speedFor(this.r) * 0.1) this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(this.vy, this.vx), dt * 24);
    this.walkPhase += (v / this.r) * dt * 1.4;
  }

  private collide(time: number) {
    const r = this.r;
    for (const b of this.solids) {
      const nx = Phaser.Math.Clamp(this.x, b.x, b.x + b.w), ny = Phaser.Math.Clamp(this.y, b.y, b.y + b.h);
      let ox = this.x - nx, oy = this.y - ny;
      const d = Math.hypot(ox, oy);
      if (d >= r) continue;

      if (b === this.doorFlap) {
        if (r >= DOOR_R) { this.exitThroughDoor(); return; }
        if (time > this.tooSmallUntil) {
          this.tooSmallUntil = time + 2500;
          this.game.events.emit(EV.toast, `Too small! Pepper needs to be ${formatSize(DOOR_R)} to jump through.`);
          this.world.flapBump();
        }
      }

      if (d > 0.0001) { ox /= d; oy /= d; this.x = nx + ox * r; this.y = ny + oy * r; }
      else {
        // Centre is inside the box: push out the shortest way.
        const left = this.x - b.x, right = b.x + b.w - this.x, top = this.y - b.y, bottom = b.y + b.h - this.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) { ox = -1; oy = 0; this.x = b.x - r; }
        else if (m === right) { ox = 1; oy = 0; this.x = b.x + b.w + r; }
        else if (m === top) { ox = 0; oy = -1; this.y = b.y - r; }
        else { ox = 0; oy = 1; this.y = b.y + b.h + r; }
      }
      const vn = this.vx * ox + this.vy * oy;
      if (vn < 0) { this.vx -= vn * ox; this.vy -= vn * oy; }
    }

    for (const sg of this.segs) {
      const hit = segHit(this.x, this.y, sg), min = r + sg.t / 2;
      if (hit.d >= min || hit.d < 0.0001) continue;
      const ox = (this.x - hit.x) / hit.d, oy = (this.y - hit.y) / hit.d;
      this.x = hit.x + ox * min; this.y = hit.y + oy * min;
      const vn = this.vx * ox + this.vy * oy;
      if (vn < 0) { this.vx -= vn * ox; this.vy -= vn * oy; }
    }

    // Loose things that are still too big to eat are solid too.
    for (const t of this.things) {
      if (t.eaten || t.box || canEat(r, t.def.size)) continue;
      let ox = this.x - t.x, oy = this.y - t.y;
      const d = Math.hypot(ox, oy), min = r + t.rad * 0.85;
      if (d >= min || d < 0.0001) continue;
      ox /= d; oy /= d;
      this.x = t.x + ox * min; this.y = t.y + oy * min;
      const vn = this.vx * ox + this.vy * oy;
      if (vn < 0) { this.vx -= vn * ox; this.vy -= vn * oy; }
      this.world.wobble(t);
    }
  }

  private eatNearby() {
    const r = this.r;
    for (const t of this.things) {
      if (t.eaten || !canEat(this.r, t.def.size)) continue;
      const d = t.box ? circleBoxDist(this.x, this.y, t.box) : Math.hypot(this.x - t.x, this.y - t.y) - t.rad * 0.6;
      if (d < r * 0.8) this.eat(t);
    }
  }

  private eat(t: Thing) {
    t.eaten = true;
    if (t.box) this.solids = this.solids.filter((b) => b !== t.box);
    const before = this.r;
    this.r = grownRadius(this.r, t.def.size);
    this.eatenCount++;
    this.chomp = 1;
    this.biteT = 0;
    this.happy = 1;

    const mouthX = this.x + Math.cos(this.heading) * this.r * 1.6, mouthY = this.y + Math.sin(this.heading) * this.r * 1.6;
    this.world.eat(t, mouthX, mouthY, this.r * 1.2);

    const [sx, sy] = this.world.toScreen(mouthX, mouthY, this.r * 1.2), ppc = this.world.pxPerCm();
    this.crumbBurst(sx, sy, before * ppc);
    if (t.def.size >= before * 0.7) this.chompPop(sx, sy, before * ppc);

    this.game.events.emit(EV.eat, t.def.name);
    this.game.events.emit(EV.size, this.r);
    if (before < DOOR_R && this.r >= DOOR_R) {
      this.game.events.emit(EV.toast, 'Big enough! Head for the dog door in the garage.');
    }
  }

  /** A little spray of crumbs from Pepper's mouth, in screen pixels. */
  private crumbBurst(x: number, y: number, r: number) {
    const colors = [PAL.bread, PAL.cream, PAL.mustard, PAL.white];
    const n = 5 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const a = this.heading + Math.PI + (Math.random() - 0.5) * 2.6;
      const dist = r * (0.6 + Math.random() * 0.9), size = (r * (0.12 + Math.random() * 0.1)) / 16;
      const dot = this.add.image(x, y, 'dot').setTint(hexNum(colors[i % colors.length])).setScale(size).setDepth(12);
      this.tweens.add({
        targets: dot, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist, scale: size * 0.3, alpha: 0,
        duration: 260 + Math.random() * 160, ease: 'Quad.easeOut', onComplete: () => dot.destroy(),
      });
    }
  }

  /** A comic-book starburst for a big bite, in screen pixels. */
  private chompPop(x: number, y: number, r: number) {
    if (this.time.now - this.lastPop < 450) return;
    this.lastPop = this.time.now;
    const side = Math.random() < 0.5 ? -1 : 1, a = this.heading + side * 1.2;
    const px = x + Math.cos(a) * r * 1.4, py = y + Math.sin(a) * r * 1.4;
    const word = Math.floor(Math.random() * CHOMP_WORDS.length);
    const scale = (r * 3.4) / 260;
    const pop = this.add.image(px, py, chompKey(word)).setScale(0).setDepth(30).setRotation(side * 0.2);
    this.tweens.add({ targets: pop, scale, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: pop, alpha: 0, scale: scale * 1.15, delay: 420, duration: 220, onComplete: () => pop.destroy() });
  }

  private exitThroughDoor() {
    this.finished = true;
    const { door } = this.house;
    this.vx = this.vy = 0;
    this.heading = 0;
    this.world.flapOpen();
    this.tweens.add({
      targets: this, x: door.x + this.r * 3, y: door.y, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => {
        this.game.events.emit(EV.done, {
          seconds: (this.time.now - this.startTime) / 1000,
          eaten: this.eatenCount,
          r: this.r,
        });
      },
    });
  }

  // ---------- drawing Pepper ----------

  private renderDog(dt: number) {
    const v = Math.hypot(this.vx, this.vy), moving = Math.min(1, v / speedFor(this.r));

    // Bite lunge: a quick hop forward and back.
    let lunge = 0;
    if (this.biteT >= 0) {
      this.biteT += dt;
      const t = this.biteT / 0.2;
      if (t >= 1) this.biteT = -1; else lunge = Math.sin(t * Math.PI) * this.shownR * 0.3;
    }

    // Tail: wags with each step, a happy idle wag, and extra wagging after a snack.
    this.happy *= Math.exp(-dt * 1.5);
    const now = this.time.now / 1000, gait = this.walkPhase * 0.6;
    const wag = Math.sin(gait * 2) * 0.45 * moving + Math.sin(now * 7) * (0.3 + this.happy * 0.5) * (1 - moving * 0.6);

    this.world.posePepper({
      x: this.x, y: this.y, heading: this.heading, r: this.shownR, fat: fatFor(this.shownR),
      moving, gait, wag, chomp: this.chomp, lunge,
    });
  }

  /** Once Pepper is big enough, an arrow on the floor points her toward the dog door. */
  private drawDoorArrow() {
    if (this.r < DOOR_R || this.finished || !this.started) { this.world.setArrow(false); return; }
    const { door } = this.house;
    const a = Math.atan2(door.y - this.y, door.x - this.x), dist = this.shownR * 2.3;
    this.world.setArrow(true, this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, a, this.shownR * 0.45);
  }
}

function circleBoxDist(x: number, y: number, b: Box) {
  const nx = Phaser.Math.Clamp(x, b.x, b.x + b.w), ny = Phaser.Math.Clamp(y, b.y, b.y + b.h);
  return Math.hypot(x - nx, y - ny);
}

/** Closest point on a wall segment to x,y, and the distance to it. */
function segHit(x: number, y: number, sg: Seg) {
  const [ax, ay] = sg.a, [bx, by] = sg.b, dx = bx - ax, dy = by - ay;
  const t = Phaser.Math.Clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
  const px = ax + dx * t, py = ay + dy * t;
  return { x: px, y: py, d: Math.hypot(x - px, y - py) };
}
