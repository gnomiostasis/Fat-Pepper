import Phaser from 'phaser';
import { DOG_BODY_RX, dogRig } from '../art/dog';
import { ITEM_BY_ID, ItemDef } from '../art/items';
import { PAL, hexNum } from '../art/palette';
import { CHOMP_WORDS, DOG_FAT_STEPS, DOG_K, FLOOR_TILE_WORLD, ITEM_K, TAIL_ORIGIN, chompKey, dogKey, itemKey } from '../art/textures';
import { Box, HouseLayout, PILES, Pt, SCATTER, Seg, buildHouse } from '../game/house';
import { DOOR_R, START_R, canEat, fatFor, formatSize, grownRadius, speedFor, zoomFor } from '../game/tuning';
import { EV } from './events';

interface Thing {
  def: ItemDef;
  x: number;
  y: number;
  /** Collision radius for loose items. */
  rad: number;
  /** Collision box for furniture. */
  box?: Box;
  sprite: Phaser.GameObjects.Image;
  shadow: Phaser.GameObjects.Image;
  eaten: boolean;
  wobbling: boolean;
}

const FLOOR_SCALE = FLOOR_TILE_WORLD / 256;
const SHADOW_ALPHA = 0.22;

export class GameScene extends Phaser.Scene {
  private house!: HouseLayout;
  private things: Thing[] = [];
  private solids: Box[] = [];
  /** Walls and the kitchen counter. */
  private segs: Seg[] = [];
  private doorFlap!: Box;
  private flap!: Phaser.GameObjects.Graphics;
  private arrow!: Phaser.GameObjects.Graphics;
  private dog!: Phaser.GameObjects.Container;
  private dogBody!: Phaser.GameObjects.Image;
  private dogPaws: Phaser.GameObjects.Image[] = [];
  private dogTail!: Phaser.GameObjects.Image;
  private dogShadow!: Phaser.GameObjects.Image;
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
  private dogStep = -1;
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
    this.vx = this.vy = 0; this.heading = -Math.PI / 2; this.walkPhase = 0; this.chomp = 0; this.dogStep = -1;
    this.biteT = -1; this.happy = 0; this.lastPop = 0;
    this.started = false; this.finished = false; this.eatenCount = 0; this.tooSmallUntil = 0;

    this.house = buildHouse();
    const h = this.house;
    this.x = h.spawn.x; this.y = h.spawn.y;

    this.cameras.main.setBackgroundColor(PAL.avocadoDark);
    const b = h.bounds;
    this.add.tileSprite(b.x - 3000, b.y - 3000, b.w + 6000, b.h + 6000, 'floor-grass').setOrigin(0).setTileScale(FLOOR_SCALE).setDepth(-30000);
    this.buildFloors();
    this.buildWalls();
    this.buildDoor();
    for (const d of h.decals) this.addDecal(d.id, d.x, d.y, d.rot);
    for (const spot of h.furniture) this.addFurniture(spot.id, spot.x, spot.y, spot.rot);
    this.scatterItems();

    this.dogShadow = this.add.image(this.x, this.y, dogKey(0)).setTintFill(0x000000).setAlpha(SHADOW_ALPHA).setDepth(9);
    // Pepper is built from parts so her legs and tail can move. The container works in
    // the art's local units; each part's texture has DOG_K pixels per unit.
    this.dogTail = this.add.image(0, 0, 'dog-tail').setOrigin(TAIL_ORIGIN.x, TAIL_ORIGIN.y).setScale(1 / DOG_K);
    this.dogPaws = [0, 1, 2, 3].map(() => this.add.image(0, 0, 'dog-paw').setScale(1 / DOG_K));
    this.dogBody = this.add.image(0, 0, dogKey(0)).setScale(1 / DOG_K);
    this.dog = this.add.container(this.x, this.y, [this.dogTail, ...this.dogPaws, this.dogBody]).setDepth(10);
    this.arrow = this.add.graphics().setDepth(20);
    this.renderDog(0);

    const cam = this.cameras.main;
    cam.startFollow(this.dog, true, 0.12, 0.12);
    cam.setZoom(zoomFor(this.r, Math.min(this.scale.width, this.scale.height)));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
    }) as GameScene['keys'];

    const onStart = () => { this.started = true; this.startTime = this.time.now; };
    this.game.events.on(EV.start, onStart);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(EV.start, onStart));

    this.game.events.emit(EV.size, this.r);
  }

  // ---------- building the house ----------

  /** Each floor is a tiled texture clipped to its room's outline. */
  private buildFloors() {
    this.house.floors.forEach((f, i) => {
      const xs = f.poly.map((p) => p[0]), ys = f.poly.map((p) => p[1]);
      const x0 = Math.min(...xs), y0 = Math.min(...ys);
      const tile = this.add.tileSprite(x0, y0, Math.max(...xs) - x0, Math.max(...ys) - y0, f.texture)
        .setOrigin(0).setTileScale(FLOOR_SCALE).setDepth(-29000 + i);
      const shape = this.make.graphics({}, false);
      shape.fillStyle(0xffffff).fillPoints(f.poly.map(([x, y]) => new Phaser.Math.Vector2(x, y)), true);
      tile.setMask(shape.createGeometryMask());
    });
  }

  private buildWalls() {
    const h = this.house;
    this.segs = [...h.walls, h.frontDoor, ...h.counters];

    // Ink first, a little fatter, then the colour on top, so joints merge cleanly.
    const g = this.add.graphics().setDepth(5);
    const paint = (segs: Seg[], color: string, grow: number, dx = 0, dy = 0) => {
      g.fillStyle(hexNum(color));
      for (const sg of segs) g.fillPoints(segQuad(sg, grow, dx, dy), true);
    };
    paint(h.walls, PAL.ink, 4.5);
    paint([h.frontDoor], PAL.ink, 4.5);
    paint(h.counters, PAL.ink, 4.5);
    paint(h.walls, PAL.tealDark, 0, 1.6, -1);
    paint([h.frontDoor], PAL.wood, -3, 1.6, -1);
    paint(h.counters, PAL.white, 0, 1.6, -1);
    // Front door knob
    const fd = h.frontDoor;
    g.fillStyle(hexNum(PAL.mustard)).fillCircle(fd.a[0] + (fd.b[0] - fd.a[0]) * 0.8, fd.a[1], 2.6);

    // Stairs: solid, drawn as treads going up
    const st = h.stairs;
    this.solids.push(st);
    const sg = this.add.graphics().setDepth(4);
    sg.fillStyle(hexNum(PAL.ink)).fillRect(st.x - 2, st.y - 2, st.w + 4, st.h + 4);
    sg.fillStyle(hexNum(PAL.wood)).fillRect(st.x + 1.6, st.y - 1, st.w, st.h);
    const steps = 9;
    for (let i = 1; i < steps; i++) {
      const y = st.y + (st.h * i) / steps;
      sg.fillStyle(hexNum(PAL.woodDark)).fillRect(st.x, y - 1.2, st.w, 2.4);
    }
  }

  /** Something flat on the floor that Pepper walks over, like her bed. */
  private addDecal(id: string, x: number, y: number, rotDeg: number) {
    const def = ITEM_BY_ID[id];
    const sc = def.size / Math.max(def.w, def.h) / ITEM_K;
    this.add.image(x, y, itemKey(def.id)).setScale(sc).setRotation(Phaser.Math.DegToRad(rotDeg)).setDepth(-25000);
  }

  private buildDoor() {
    const { door, wallThickness: T } = this.house;
    this.doorFlap = { x: door.x, y: door.y - door.half, w: T, h: door.half * 2 };
    this.solids.push(this.doorFlap);

    // Welcome mat in front of the door
    const mat = this.add.graphics().setDepth(-28000);
    mat.fillStyle(hexNum(PAL.orange)).fillRoundedRect(door.x - 44 + 2, door.y - 30 - 1.2, 34, 60, 4);
    mat.lineStyle(2, hexNum(PAL.ink)).strokeRoundedRect(door.x - 44, door.y - 30, 34, 60, 4);
    this.add.text(door.x - 27, door.y, 'DOG\nDOOR', {
      fontFamily: '"Lilita One", sans-serif', fontSize: '10px', color: PAL.cream, align: 'center', lineSpacing: -2,
    }).setOrigin(0.5).setResolution(6).setRotation(-Math.PI / 2).setDepth(-27999);

    // The flap itself, drawn around its hinge at the top
    this.flap = this.add.graphics({ x: door.x + T / 2, y: door.y - door.half }).setDepth(6);
    this.flap.fillStyle(hexNum(PAL.mustard)).fillRect(-T / 2 + 3, 0, T - 6, door.half * 2);
    this.flap.lineStyle(2, hexNum(PAL.ink)).strokeRect(-T / 2 + 3, 0, T - 6, door.half * 2);
    this.flap.fillStyle(hexNum(PAL.mustardDark)).fillCircle(0, door.half, 3);
  }

  private makeSprites(def: ItemDef, x: number, y: number, rot: number) {
    const sc = def.size / Math.max(def.w, def.h) / ITEM_K;
    const off = Phaser.Math.Clamp(def.size * 0.04, 0.4, 5);
    const shadow = this.add.image(x + off, y + off * 1.3, itemKey(def.id)).setScale(sc).setRotation(rot)
      .setTintFill(0x000000).setAlpha(SHADOW_ALPHA).setDepth(-20000 - def.size);
    const sprite = this.add.image(x, y, itemKey(def.id)).setScale(sc).setRotation(rot).setDepth(-def.size);
    return { sprite, shadow };
  }

  private addFurniture(id: string, x: number, y: number, rotDeg: number) {
    const def = ITEM_BY_ID[id];
    const sc = def.size / Math.max(def.w, def.h);
    const turned = rotDeg % 180 !== 0;
    const bw = (turned ? def.h : def.w) * sc, bh = (turned ? def.w : def.h) * sc;
    const box = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
    this.solids.push(box);
    const { sprite, shadow } = this.makeSprites(def, x, y, Phaser.Math.DegToRad(rotDeg));
    this.things.push({ def, x, y, rad: Math.min(bw, bh) / 2, box, sprite, shadow, eaten: false, wobbling: false });
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
      const { sprite, shadow } = this.makeSprites(def, x, y, Math.random() * Math.PI * 2);
      this.things.push({ def, x, y, rad, sprite, shadow, eaten: false, wobbling: false });
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

    const cam = this.cameras.main;
    const z = zoomFor(this.shownR, Math.min(this.scale.width, this.scale.height));
    cam.setZoom(cam.zoom + (z - cam.zoom) * (1 - Math.exp(-dt * 3)));
    this.drawDoorArrow();
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
    if (p.isDown) {
      const wp = p.positionToCamera(this.cameras.main) as Phaser.Math.Vector2;
      const px = wp.x - this.x, py = wp.y - this.y, d = Math.hypot(px, py);
      if (d > this.r * 0.4) { dx = px / d; dy = py / d; }
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    const speed = speedFor(this.r), a = 1 - Math.exp(-dt * 9);
    this.vx += (dx * speed - this.vx) * a;
    this.vy += (dy * speed - this.vy) * a;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.collide(time);
    this.eatNearby();

    const v = Math.hypot(this.vx, this.vy);
    if (v > speed * 0.1) this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(this.vy, this.vx), dt * 10);
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
          this.tweens.add({ targets: this.flap, scaleX: 0.4, duration: 90, yoyo: true, repeat: 1 });
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
      this.wobble(t);
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

    t.shadow.destroy();
    const mouthX = this.x + Math.cos(this.heading) * this.r * 1.6, mouthY = this.y + Math.sin(this.heading) * this.r * 1.6;
    t.sprite.setDepth(11);
    this.tweens.add({
      targets: t.sprite, x: mouthX, y: mouthY, scale: 0, duration: 170, ease: 'Quad.easeIn',
      onComplete: () => t.sprite.destroy(),
    });

    this.crumbBurst(mouthX, mouthY, before);
    if (t.def.size >= before * 0.7) this.chompPop(mouthX, mouthY, before);

    this.game.events.emit(EV.eat, t.def.name);
    this.game.events.emit(EV.size, this.r);
    if (before < DOOR_R && this.r >= DOOR_R) {
      this.game.events.emit(EV.toast, 'Big enough! Head for the dog door in the garage.');
    }
  }

  /** A little spray of crumbs from Pepper's mouth. */
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

  /** A comic-book starburst for a big bite. */
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

  private wobble(t: Thing) {
    if (t.wobbling) return;
    t.wobbling = true;
    const base = t.sprite.rotation;
    this.tweens.add({
      targets: t.sprite, rotation: base + 0.18, duration: 70, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
      onComplete: () => { t.sprite.rotation = base; t.wobbling = false; },
    });
  }

  private exitThroughDoor() {
    this.finished = true;
    const { door } = this.house;
    this.vx = this.vy = 0;
    this.heading = 0;
    this.tweens.add({ targets: this.flap, scaleY: 0.1, duration: 160, yoyo: true, hold: 500 });
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
    const fat = fatFor(this.shownR);
    const step = Math.round(fat * (DOG_FAT_STEPS - 1));
    if (step !== this.dogStep) {
      if (this.dogStep >= 0 && dt > 0) this.chomp = Math.max(this.chomp, 0.8);
      this.dogStep = step;
      this.dogBody.setTexture(dogKey(step));
      this.dogShadow.setTexture(dogKey(step));
    }
    const fq = step / (DOG_FAT_STEPS - 1);
    const unit = this.shownR / (DOG_BODY_RX * (1 + fq));
    const v = Math.hypot(this.vx, this.vy), moving = Math.min(1, v / speedFor(this.r));
    const waddle = Math.sin(this.walkPhase) * 0.05 * moving;
    const squash = this.chomp * 0.14;
    const rot = this.heading + Math.PI / 2 + waddle;

    // Bite lunge: a quick hop forward and back.
    let lunge = 0;
    if (this.biteT >= 0) {
      this.biteT += dt;
      const t = this.biteT / 0.2;
      if (t >= 1) this.biteT = -1; else lunge = Math.sin(t * Math.PI) * this.shownR * 0.3;
    }
    const x = this.x + Math.cos(this.heading) * lunge, y = this.y + Math.sin(this.heading) * lunge;

    // Trot: diagonal paws move together, lifting a little as they swing forward.
    const rig = dogRig(fq), gait = this.walkPhase * 0.6, stride = 4.5 * moving;
    rig.paws.forEach((p, i) => {
      const phase = i === 0 || i === 3 ? 0 : Math.PI;
      const swing = Math.sin(gait + phase), lift = Math.max(0, -Math.cos(gait + phase)) * moving;
      this.dogPaws[i].setPosition(p.x, p.y + swing * stride).setScale((1 + lift * 0.22) / DOG_K);
    });

    // Tail: wags with each step, a happy idle wag, and extra wagging after a snack.
    this.happy *= Math.exp(-dt * 1.5);
    const now = this.time.now / 1000;
    const wag = Math.sin(gait * 2) * 0.45 * moving + Math.sin(now * 7) * (0.22 + this.happy * 0.4) * (1 - moving * 0.6);
    this.dogTail.setPosition(rig.tail.x, rig.tail.y).setRotation(wag - 0.15);

    this.dog.setPosition(x, y).setRotation(rot).setScale(unit * (1 + squash), unit * (1 - squash * 0.6));
    const off = this.shownR * 0.16, s = unit / DOG_K;
    this.dogShadow.setPosition(x + off, y + off * 1.3).setRotation(rot).setScale(s * (1 + squash), s * (1 - squash * 0.6));
  }

  /** Once Pepper is big enough, a little arrow points her toward the dog door. */
  private drawDoorArrow() {
    const g = this.arrow;
    g.clear();
    if (this.r < DOOR_R || this.finished || !this.started) return;
    const { door } = this.house;
    const a = Math.atan2(door.y - this.y, door.x - this.x);
    const dist = this.shownR * 2.3, size = this.shownR * 0.45;
    const cx = this.x + Math.cos(a) * dist, cy = this.y + Math.sin(a) * dist;
    const pts = [
      new Phaser.Math.Vector2(cx + Math.cos(a) * size, cy + Math.sin(a) * size),
      new Phaser.Math.Vector2(cx + Math.cos(a + 2.4) * size, cy + Math.sin(a + 2.4) * size),
      new Phaser.Math.Vector2(cx + Math.cos(a - 2.4) * size, cy + Math.sin(a - 2.4) * size),
    ];
    const pulse = 0.75 + 0.25 * Math.sin(this.time.now / 160);
    g.fillStyle(hexNum(PAL.mustard), pulse).fillPoints(pts, true);
    g.lineStyle(Math.max(1, size * 0.12), hexNum(PAL.ink), pulse).strokePoints(pts, true);
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

/** A wall segment as a filled quad, padded by `grow` on every side (so ends overlap at corners). */
function segQuad(sg: Seg, grow: number, ox = 0, oy = 0): Phaser.Math.Vector2[] {
  const [ax, ay] = sg.a, [bx, by] = sg.b, len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
  const half = sg.t / 2 + grow, ext = sg.t / 2 + grow;
  const pts: Pt[] = [
    [ax - ux * ext + nx * half, ay - uy * ext + ny * half],
    [bx + ux * ext + nx * half, by + uy * ext + ny * half],
    [bx + ux * ext - nx * half, by + uy * ext - ny * half],
    [ax - ux * ext - nx * half, ay - uy * ext - ny * half],
  ];
  return pts.map(([x, y]) => new Phaser.Math.Vector2(x + ox, y + oy));
}
