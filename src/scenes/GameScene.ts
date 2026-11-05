import Phaser from 'phaser';
import { ITEM_BY_ID, ItemDef } from '../art/items';
import { PAL, hexNum } from '../art/palette';
import { CHOMP_WORDS, chompKey } from '../art/textures';
import { Joystick, isTouch } from './joystick';
import type { Box, Level, Pt, Seg } from '../game/level';
import { Tiers } from '../game/grid';
import { Region, RegionName, World, buildWorld } from '../game/world';
import {
  APPETITE, JAWS, MILESTONES, POWER_BY_ID, PowerId, RUSH, RUSH_TIME, SNEAKY, STREAK, STREAK_CAP, STREAK_GAP,
  Stacks, TONGUE, ZOOMIES, rollChoices,
} from '../game/powerups';
import {
  CATCHER_R, CATCHER_RAD, CATCHER_SIZE, CATCHER_SPEED, DOOR_R, EAT_RATIO, GROW_K, HOUSE_BITE, START_R, STREET_R, TOWN_R, WALL_R, WIN_R,
  canHop, fatFor, formatSize, grownRadius, OUTDOOR_ZOOM, speedFor, viewFor,
} from '../game/tuning';
import { ITEMS } from '../art/items';
import { Placed, World3D, getWorld } from '../world3d/World3D';
import { EV, Goal, PowerState, RunStats } from './events';

interface Thing extends Placed {
  /** Collision radius for loose items. */
  rad: number;
  /** Collision box for furniture. */
  box?: Box;
  eaten: boolean;
}

/** A building in the neighborhood, which Pepper can eat once she's big enough. */
interface House {
  /** Index into the level's buildings, which is also its 3D model. */
  i: number;
  box: Box;
  poly: Pt[];
  /** Its outline, solid like a wall until it's eaten. */
  edges: Seg[];
  /** How big it counts as for eating. */
  bite: number;
  /** Its footprint in cm², which is how much it grows Pepper. */
  area: number;
  eaten: boolean;
}

/** Things in town that count as a whole neighborhood. */
const HOODS = new Set(['hood', 'hoodrow']);
/** Things in the countryside that count as a whole town. */
const TOWNS = new Set(['smalltown', 'bigtown']);

/** The dog catcher, once he's on Pepper's trail. */
interface Catcher {
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  gait: number;
  /** Seconds left in his net lunge, and until he can lunge again. */
  lunge: number;
  cool: number;
  /** 0..1, how far the net is swung down. */
  swing: number;
  /** When he's stuck behind something he walks sideways for a moment. */
  detour: number;
  detourAng: number;
  checkT: number;
  lastX: number;
  lastY: number;
  /** Once Pepper is big enough, he runs away from her instead. */
  fleeing: boolean;
  /** Seconds since Pepper ate him, or -1. */
  eatenT: number;
  /** Seconds he stands dazed after his net slips off Slippery Fur. */
  stun: number;
}

/** Sizes of the cells in the stacked spatial hashes, from crumbs up to whole towns. */
const TIERS = [200, 2000, 20000, 200000];

export class GameScene extends Phaser.Scene {
  /** The whole world as one level. */
  private level!: Level;
  /** Its parts, from the inside out: the house, the neighborhood, the town, the countryside. */
  private regions: Region[] = [];
  private houseBox!: Box;
  /** Pepper has been out the dog door. */
  private outside = false;
  /** The parts of the world Pepper has set foot in, each greeted once. */
  private seen = new Set<RegionName>();
  /** The house's own walls come first in the level's walls; eating any of them takes the rest of the house with it. */
  private houseWallN = 0;
  private houseGone = false;
  /** Extra camera pull-back: 1 indoors, easing up to OUTDOOR_ZOOM once outside. */
  private zoom = 1;
  private catcher: Catcher | null = null;
  /** Pepper ate the dog catcher, so he's gone for good. */
  private catcherEaten = false;
  private houses: House[] = [];
  /**
   * Walls Pepper can eat a piece at a time, by index into [...level.walls, ...level.counters]. Outdoors that's
   * every yard fence, once she can eat a house. Indoors it's the inside walls and the kitchen counter, once
   * she's too big for the doorways, so she can never get boxed into a room.
   */
  private fences: { i: number; seg: Seg; eaten: boolean }[] = [];
  /** How big a fence counts as: the same as the smallest house, so everything opens up at once. */
  private fenceBite = Infinity;
  private housesEaten = 0;
  private hoodsEaten = 0;
  private townsEaten = 0;
  /** Building edges, solid like walls but drawn as part of the building. */
  private buildingPolys: Pt[][] = [];
  private things: Thing[] = [];
  /** Which thing each piece of furniture's collision box belongs to. */
  private boxOwner = new Map<Box, Thing>();
  /** Things and solid boxes by where they are, so only the ones near Pepper get checked each frame. */
  private grid = new Tiers<Thing>(TIERS);
  private solidGrid = new Tiers<Box>(TIERS);
  /** Walls and the kitchen counter. */
  private segs: Seg[] = [];
  private doorFlap: Box | null = null;
  private world!: World3D;
  private stick!: Joystick;
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

  // ---- roguelike powerups ----
  private stacks: Stacks = {};
  /** Index of the next size milestone in MILESTONES. */
  private milestone = 0;
  /** Milestones passed but not picked yet (a big bite can pass two). */
  private pendingPicks = 0;
  /** The game is paused while the player picks a powerup. */
  private picking = false;
  private pickStart = 0;
  private furLeft = 0;
  /** Seconds Pepper can't be netted, after Slippery Fur saves her. */
  private safeT = 0;
  private streak = 0;
  private lastBite = -99;
  /** Sugar Rush boost left, in seconds. */
  private rushT = 0;

  constructor() {
    super('game');
  }

  create() {
    // A restarted scene reuses this object, so reset everything here.
    this.things = []; this.segs = [];
    this.r = this.shownR = START_R;
    this.vx = this.vy = 0; this.heading = -Math.PI / 2; this.walkPhase = 0; this.chomp = 0;
    this.biteT = -1; this.happy = 0; this.lastPop = 0;
    this.started = false; this.finished = false; this.eatenCount = 0; this.tooSmallUntil = 0;
    this.outside = false; this.seen = new Set(['house']); this.houseGone = false;
    this.catcher = null; this.catcherEaten = false; this.zoom = 1;
    this.houses = []; this.housesEaten = 0; this.hoodsEaten = 0; this.townsEaten = 0;
    // One free pick as soon as the run starts.
    this.stacks = {}; this.milestone = 0; this.pendingPicks = 1; this.picking = false;
    this.furLeft = 0; this.safeT = 0; this.streak = 0; this.lastBite = -99; this.rushT = 0;

    // The level is drawn in 3D underneath; this scene keeps the rules and the comic pops.
    this.world = getWorld();
    this.world.catcher.show(false);
    this.loadWorld(buildWorld());
    this.heading = -Math.PI / 2;

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT', w: 'W', a: 'A', s: 'S', d: 'D',
    }) as GameScene['keys'];
    // Phones and tablets steer with a thumbstick that appears wherever a finger goes down.
    this.stick = new Joystick(this);
    this.stick.setEnabled(() => this.started && !this.finished && !this.picking);

    const onStart = () => { this.started = true; this.startTime = this.time.now; };
    this.game.events.on(EV.start, onStart);
    const onPick = (id: PowerId) => this.takePower(id);
    this.game.events.on(EV.pick, onPick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(EV.start, onStart);
      this.game.events.off(EV.pick, onPick);
    });

    this.game.events.emit(EV.size, this.r);
    this.emitGoal();
    this.emitPowers();
  }

  // ---------- setting up a level ----------

  private loadWorld(w: World) {
    const level = w.level;
    this.level = level;
    this.regions = w.regions;
    this.houseBox = w.regions[0].box;
    this.houseWallN = w.regions[0].level.walls.length + (w.regions[0].level.frontDoor ? 1 : 0);
    this.things = []; this.segs = []; this.boxOwner.clear();
    this.grid = new Tiers(TIERS); this.solidGrid = new Tiers(TIERS);
    this.x = level.spawn.x; this.y = level.spawn.y;
    this.vx = this.vy = 0;

    this.buildingPolys = level.buildings.map((b) => b.poly);
    this.houses = level.buildings.map((b, i): House => {
      const xs = b.poly.map((p) => p[0]), ys = b.poly.map((p) => p[1]);
      const box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      const edges = b.poly.map((a, k): Seg => ({ a, b: b.poly[(k + 1) % b.poly.length], t: 4 }));
      // The longest wall, so a house turned to face a curving street isn't judged by its slanted bounding box.
      const long = Math.max(...edges.map((e) => Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1])));
      return { i, box, poly: b.poly, edges, bite: long * HOUSE_BITE, area: polyArea(b.poly), eaten: false };
    });
    const edges = this.houses.flatMap((h) => h.edges);
    this.fences = [...level.walls, ...level.counters].map((seg, i) => ({ i, seg, eaten: false }));
    // Pepper's own house counts as the biggest house on the street.
    this.fenceBite = this.houses.length ? Math.min(...this.houses.map((h) => h.bite)) : Infinity;
    this.segs = [...level.walls, ...level.counters, ...edges];
    if (level.stairs) this.solidGrid.insertBox(level.stairs, level.stairs);
    this.doorFlap = null;
    if (level.door) {
      this.doorFlap = { x: level.door.x, y: level.door.y - level.door.half, w: level.wallThickness, h: level.door.half * 2 };
      this.solidGrid.insertBox(this.doorFlap, this.doorFlap);
    }

    this.world.build(level);
    const decals: Placed[] = level.decals.map((d) => ({ def: ITEM_BY_ID[d.id], x: d.x, y: d.y, rot: Phaser.Math.DegToRad(d.rot) }));
    for (const spot of level.furniture) this.addFurniture(spot.id, spot.x, spot.y, spot.rot);
    // Loose things in each part of the world, kept out of the part inside it
    w.regions.forEach((rg, i) => this.scatterItems(rg.level, i > 0 ? w.regions[i - 1].box : undefined, i === 0));
    this.world.addThings([...decals, ...this.things]);
    this.world.follow(this.x, this.y, this.viewCm(), 0, true);
    this.renderDog(0);
  }

  /** Tells the HUD what Pepper is growing toward right now. */
  private emitGoal() {
    let goal: Goal;
    const houseR = this.houseEatR(), hoodR = this.hoodEatR(), townR = this.townEatR();
    if (!this.outside) goal = { from: START_R, to: DOOR_R, label: 'Dog door at', reached: 'Dog door: OPEN!' };
    else if (!this.catcher && !this.catcherEaten) goal = { from: DOOR_R, to: CATCHER_R, label: 'Dog catcher alert at', reached: 'The dog catcher is coming!' };
    else if (!this.catcherEaten) goal = { from: CATCHER_R, to: this.catcherEatR(), label: 'Eat the catcher at', reached: 'Eat the dog catcher!' };
    else if (this.r < houseR && this.housesEaten === 0) goal = { from: this.catcherEatR(), to: houseR, label: 'Eat houses at', reached: 'Houses are on the menu!' };
    else if (this.r < hoodR && this.hoodsEaten === 0) goal = { from: Math.min(houseR, this.r), to: hoodR, label: 'Eat neighborhoods at', reached: 'Neighborhoods are on the menu!' };
    else if (this.r < townR && this.townsEaten === 0) goal = { from: Math.min(hoodR, this.r), to: townR, label: 'Eat towns at', reached: 'Whole towns are on the menu!' };
    else goal = { from: Math.min(townR, this.r), to: WIN_R, label: 'Eat the countryside at', reached: 'Pepper ate the countryside!' };
    this.game.events.emit(EV.goal, goal);
  }

  private addFurniture(id: string, x: number, y: number, rotDeg: number) {
    const def = ITEM_BY_ID[id];
    const sc = def.size / Math.max(def.w, def.h);
    // Collision is an upright box: the turned footprint's bounds, trimmed a little when it sits at an angle
    // so Pepper doesn't bump into thin air at the corners.
    const a = Phaser.Math.DegToRad(rotDeg), c = Math.abs(Math.cos(a)), sn = Math.abs(Math.sin(a));
    const trim = rotDeg % 90 === 0 ? 1 : 0.85;
    const bw = (def.w * c + def.h * sn) * sc * trim, bh = (def.w * sn + def.h * c) * sc * trim;
    const box = { x: x - bw / 2, y: y - bh / 2, w: bw, h: bh };
    this.solidGrid.insertBox(box, box);
    const t: Thing = { def, x, y, rot: Phaser.Math.DegToRad(rotDeg), rad: Math.min(bw, bh) / 2, box, eaten: false };
    this.boxOwner.set(box, t);
    this.addThing(t);
  }

  private addThing(t: Thing) {
    this.things.push(t);
    if (t.box) this.grid.insertBox(t, t.box);
    else this.grid.insert(t, t.x - t.rad, t.y - t.rad, t.x + t.rad, t.y + t.rad);
  }

  /** Solid boxes (furniture, the stairs, the dog door's flap) that might be within `r` of x,y. */
  private solidsNear(x: number, y: number, r: number) {
    return this.solidGrid.near(x, y, r);
  }

  /** Scatters a part of the world's loose things over its rooms, keeping out of `hole` (the part inside it). */
  private scatterItems(h: Level, hole?: Box, home = false) {
    const w = this.level;
    const area = h.rooms.map((r) => r.box.w * r.box.h), total = area.reduce((a, b) => a + b, 0);
    const pickRoom = () => {
      let t = Math.random() * total;
      for (let i = 0; i < h.rooms.length; i++) { t -= area[i]; if (t <= 0) return h.rooms[i].box; }
      return h.rooms[0].box;
    };

    const radOf = (def: ItemDef) => (def.size / 2) * ((def.w + def.h) / 2) / Math.max(def.w, def.h);
    const tryPlace = (def: ItemDef, x: number, y: number) => {
      const rad = radOf(def);
      if (this.solidsNear(x, y, rad + 3).some((b) => circleBoxDist(x, y, b) < rad + 3)) return false;
      if (this.segs.some((sg) => segHit(x, y, sg).d < rad + sg.t / 2 + 3)) return false;
      if (this.grid.near(x, y, rad + 1).some((o) => !o.box && o.rad > 2 && Math.hypot(o.x - x, o.y - y) < rad + o.rad + 1)) return false;
      if (hole && x > hole.x - rad && y > hole.y - rad && x < hole.x + hole.w + rad && y < hole.y + hole.h + rad) return false;
      if (this.buildingPolys.some((poly) => inPoly(x, y, poly))) return false;
      if (!this.canEat(def.size)) {
        // Keep the start spot and the ways through clear of anything Pepper can't eat yet.
        if (Math.hypot(x - w.spawn.x, y - w.spawn.y) < rad + this.r * 6) return false;
        if (w.door && Math.hypot(x - w.door.x, y - w.door.y) < rad + 80) return false;
        if (w.doorways.some(([dx, dy]) => Math.hypot(x - dx, y - dy) < rad + Math.max(50, this.r * 2))) return false;
      }
      this.addThing({ def, x, y, rot: Math.random() * Math.PI * 2, rad, eaten: false });
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
    const order = Object.entries(h.scatter).sort((a, b) => ITEM_BY_ID[b[0]].size - ITEM_BY_ID[a[0]].size);
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
    let first = home;
    for (const pile of h.piles) {
      const def = ITEM_BY_ID[pile.id];
      for (let n = 0; n < pile.piles; n++) {
        let [cx, cy] = randomSpot(pile.spread);
        if (first) { cx = h.spawn.x + this.r * 5.5; cy = h.spawn.y - this.r; first = false; }
        for (let i = 0; i < pile.each; i++) {
          const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * pile.spread;
          tryPlace(def, cx + Math.cos(a) * d, cy + Math.sin(a) * d);
        }
      }
    }
  }

  /** How many cm the camera shows across the screen's short side right now. */
  private viewCm() {
    return viewFor(this.shownR) * this.zoom;
  }

  // ---------- the loop ----------

  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    if (this.started && !this.finished && !this.picking) {
      this.step(time, dt);
      if (this.pendingPicks > 0) this.offerPowers();
    }
    this.shownR += (this.r - this.shownR) * (1 - Math.exp(-dt * 8));
    this.chomp *= Math.exp(-dt * 10);
    this.renderDog(dt);
    this.stick.draw(dt);
    // Once he's been gulped down and shrunk away, the dog catcher is gone for good.
    if (this.catcher && this.catcher.eatenT >= 0.35) { this.catcher = null; this.world.catcher.show(false); }
    this.renderCatcher(dt);
    this.drawDoorArrow();
    this.zoom += ((this.outside ? OUTDOOR_ZOOM : 1) - this.zoom) * (1 - Math.exp(-dt * 2));
    this.world.follow(this.x, this.y, this.viewCm(), dt);
    this.world.render(dt);
  }

  private step(time: number, dt: number) {
    // Steering: keys, a thumbstick on touch screens, or hold the mouse where Pepper should go
    let dx = 0, dy = 0;
    const k = this.keys;
    if (k.left.isDown || k.a.isDown) dx -= 1;
    if (k.right.isDown || k.d.isDown) dx += 1;
    if (k.up.isDown || k.w.isDown) dy -= 1;
    if (k.down.isDown || k.s.isDown) dy += 1;
    const p = this.input.activePointer;
    // Slows to a stop right under the pointer instead of jittering around it
    let ease = 1;
    if (this.stick.active) {
      const v = this.stick.vec, m = v.length();
      if (m > 0) {
        // Turn the screen drag into a floor direction, so "up" on the stick is always up on screen.
        const [sx, sy] = this.world.toScreen(this.x, this.y), reach = 100 / m;
        const wp = this.world.ground(sx + v.x * reach, sy + v.y * reach);
        if (wp) {
          const px = wp[0] - this.x, py = wp[1] - this.y, d = Math.hypot(px, py);
          if (d > 0) { dx = px / d; dy = py / d; ease = m; }
        }
      }
    } else if (p.isDown && !isTouch(p)) {
      const wp = this.world.ground(p.x, p.y);
      if (wp) {
        const px = wp[0] - this.x, py = wp[1] - this.y, d = Math.hypot(px, py);
        if (d > this.r * 0.4) { dx = px / d; dy = py / d; ease = Math.min(1, d / (this.r * 2.5)); }
      }
    }
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; }

    this.rushT = Math.max(0, this.rushT - dt);
    this.safeT = Math.max(0, this.safeT - dt);
    const speed = this.topSpeed() * ease * this.paddle(), a = 1 - Math.exp(-dt * 22);
    this.vx += (dx * speed - this.vx) * a;
    this.vy += (dy * speed - this.vy) * a;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bite first, then bump: anything she has just walked into and is big enough for gets eaten
    // before it can push her back, so she ploughs straight through houses, fences and furniture.
    this.eatNearby();
    this.collide(time);
    if (this.finished) return;
    const b = this.level.bounds;
    this.x = Phaser.Math.Clamp(this.x, b.x + this.r, b.x + b.w - this.r);
    this.y = Phaser.Math.Clamp(this.y, b.y + this.r, b.y + b.h - this.r);
    this.greet();
    this.pullSnacks(dt);
    this.eatNearby();
    this.stepCatcher(dt);

    const v = Math.hypot(this.vx, this.vy);
    if (v > this.topSpeed() * 0.1) this.heading = Phaser.Math.Angle.RotateTo(this.heading, Math.atan2(this.vy, this.vx), dt * 24);
    this.walkPhase += (v / this.r) * dt * 1.4;
  }

  private collide(time: number) {
    const r = this.r;
    // Once Pepper is too wide for the town's streets she steps over whatever she can't eat yet,
    // anywhere, so nothing in the whole world can box her in.
    const overAll = r >= STREET_R;
    const indoors = this.inHouse(this.x, this.y);
    for (const b of this.solidsNear(this.x, this.y, r + 1)) {
      if (b !== this.doorFlap && indoors && canHop(r, Math.min(b.w, b.h))) continue;
      const nx = Phaser.Math.Clamp(this.x, b.x, b.x + b.w), ny = Phaser.Math.Clamp(this.y, b.y, b.y + b.h);
      let ox = this.x - nx, oy = this.y - ny;
      const d = Math.hypot(ox, oy);
      if (d >= r) continue;
      const id = this.boxOwner.get(b)?.def.id ?? '';
      if (overAll) {
        // Striding over a whole neighborhood or town: say when she'll be able to eat one.
        if (time > this.tooSmallUntil && (HOODS.has(id) || TOWNS.has(id))) {
          this.tooSmallUntil = time + 6000;
          this.game.events.emit(EV.toast, HOODS.has(id)
            ? `Pepper can gulp a whole neighborhood at ${formatSize(this.hoodEatR())}.`
            : `Pepper can gulp a whole town at ${formatSize(this.townEatR())}.`);
        }
        continue;
      }

      if (b === this.doorFlap) {
        if (!this.outside && r >= DOOR_R) { this.exitThroughDoor(); return; }
        if (!this.outside && time > this.tooSmallUntil) {
          this.tooSmallUntil = time + 2500;
          this.game.events.emit(EV.toast, `Too small! Pepper needs to be ${formatSize(DOOR_R)} to jump through.`);
          this.world.flapBump();
        }
      } else if (time > this.tooSmallUntil && HOODS.has(id)) {
        this.tooSmallUntil = time + 4000;
        this.game.events.emit(EV.toast, `A whole neighborhood is too big to eat yet! Pepper can gulp one at ${formatSize(this.hoodEatR())}.`);
      } else if (time > this.tooSmallUntil && TOWNS.has(id)) {
        this.tooSmallUntil = time + 4000;
        this.game.events.emit(EV.toast, `A whole town is too big to eat yet! Pepper can gulp one at ${formatSize(this.townEatR())}.`);
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
    for (const t of this.grid.near(this.x, this.y, r)) {
      if (t.eaten || t.box || overAll || this.canEat(t.def.size)) continue;
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
    const reach = this.r * (0.8 + TONGUE * this.n('tongue'));
    for (const t of this.grid.near(this.x, this.y, Math.max(reach, this.r + 2))) {
      if (t.eaten || !this.canEat(t.def.size)) continue;
      const d = t.box ? circleBoxDist(this.x, this.y, t.box) : Math.hypot(this.x - t.x, this.y - t.y) - t.rad * 0.6;
      // Long Tongue reaches loose snacks. Furniture is solid, so walls keep Pepper at arm's length:
      // bumping into a piece she's big enough for is the bite.
      if (d < (t.box ? this.r + 2 : reach)) this.eat(t);
    }
    // Houses are walled in, so Pepper just has to touch one she's big enough for.
    for (const h of this.houses) {
      if (!h.eaten && this.canEat(h.bite) && circleBoxDist(this.x, this.y, h.box) < this.r + 8) this.eatHouse(h);
    }
    // At house size the fences go too, and the walls of Pepper's own house, so nothing is left standing.
    // Indoors, once Pepper is too big for the doorways, she chomps through the inside walls and the
    // kitchen counter instead.
    const fences = this.canEat(this.fenceBite), inner = this.r >= WALL_R;
    if (fences || inner) {
      const nw = this.level.walls.length;
      for (const f of this.fences) {
        if (f.eaten || !(fences || f.seg.inner || f.i >= nw)) continue;
        if (segHit(this.x, this.y, f.seg).d < this.r + f.seg.t / 2 + 8) this.eatFence(f);
      }
    }
  }

  // ---------- powerups ----------

  /** How many of a powerup Pepper has. */
  private n(id: PowerId) {
    return this.stacks[id] ?? 0;
  }

  private canEat(size: number) {
    return size <= this.r * (EAT_RATIO + JAWS * this.n('jaws'));
  }

  /** Pepper's size when she can eat the dog catcher, with Big Jaws counted. */
  private catcherEatR() {
    return CATCHER_SIZE / (EAT_RATIO + JAWS * this.n('jaws'));
  }

  /** Pepper's size when she can eat the smallest house still standing, with Big Jaws counted. */
  private houseEatR() {
    const left = this.houses.filter((h) => !h.eaten);
    if (!left.length) return this.hoodEatR();
    return Math.min(...left.map((h) => h.bite)) / (EAT_RATIO + JAWS * this.n('jaws'));
  }

  /** Pepper's size when she can eat the smallest neighborhood still standing in town, with Big Jaws counted. */
  private hoodEatR() {
    const left = this.things.filter((t) => !t.eaten && HOODS.has(t.def.id));
    if (!left.length) return this.townEatR();
    return Math.min(...left.map((t) => t.def.size)) / (EAT_RATIO + JAWS * this.n('jaws'));
  }

  /** Pepper's size when she can eat the smallest town still standing in the countryside, with Big Jaws counted. */
  private townEatR() {
    const left = this.things.filter((t) => !t.eaten && TOWNS.has(t.def.id));
    if (!left.length) return WIN_R;
    return Math.min(...left.map((t) => t.def.size)) / (EAT_RATIO + JAWS * this.n('jaws'));
  }

  /** Is x,y inside Pepper's house? */
  private inHouse(x: number, y: number) {
    const b = this.houseBox;
    return x > b.x && y > b.y && x < b.x + b.w && y < b.y + b.h;
  }

  /** The innermost part of the world at x,y. */
  private regionAt(x: number, y: number) {
    return this.regions.find((rg) => x >= rg.box.x && y >= rg.box.y && x <= rg.box.x + rg.box.w && y <= rg.box.y + rg.box.h) ?? this.regions[this.regions.length - 1];
  }

  /** The first time Pepper sets foot in a new part of the world, say what's to eat there. */
  private greet() {
    if (!this.outside) return;
    const name = this.regionAt(this.x, this.y).name;
    if (this.seen.has(name)) return;
    this.seen.add(name);
    if (name === 'town') {
      this.game.events.emit(EV.toast, `Welcome to town! Buses, shops and churches are all food here. Whole neighborhoods are on the menu at ${formatSize(this.hoodEatR())}.`);
    } else if (name === 'country') {
      this.game.events.emit(EV.toast, `The countryside! Farms, forests and castles are all food out here. Whole towns are on the menu at ${formatSize(this.townEatR())}.`);
    }
  }

  /** In water (a river, a lake or a pond, off the bridges) a smaller Pepper has to paddle, at about half speed. */
  private paddle() {
    const { water, paths } = this.level;
    if (!water || this.r >= STREET_R || !water.some((poly) => inPoly(this.x, this.y, poly))) return 1;
    const onBridge = paths?.some((p) => p.pts.some((q, i) => i > 0 && segHit(this.x, this.y, { a: p.pts[i - 1], b: q, t: 0 }).d < p.w / 2));
    return onBridge ? 1 : 0.5;
  }

  private topSpeed() {
    const rush = 1 + RUSH * this.n('rush') * Math.min(1, this.rushT / RUSH_TIME);
    return speedFor(this.r) * (1 + ZOOMIES * this.n('zoomies')) * rush;
  }

  /** Snack Magnet: loose food nearby slides toward Pepper, stopping at walls. */
  private pullSnacks(dt: number) {
    const m = this.n('magnet');
    if (!m) return;
    const range = this.r * (2.2 + 1.4 * m), pull = speedFor(this.r) * (0.35 + 0.2 * m);
    for (const t of this.grid.near(this.x, this.y, range)) {
      if (t.eaten || t.box || !this.canEat(t.def.size)) continue;
      const dx = this.x - t.x, dy = this.y - t.y, d = Math.hypot(dx, dy);
      if (d > range || d < 0.001) continue;
      const step = Math.min(d, pull * (1.2 - d / range) * dt);
      const nx = t.x + (dx / d) * step, ny = t.y + (dy / d) * step;
      if (this.segs.some((sg) => segHit(nx, ny, sg).d < t.rad * 0.5 + sg.t / 2)) continue;
      t.x = nx; t.y = ny;
      this.grid.remove(t);
      this.grid.insert(t, t.x - t.rad, t.y - t.rad, t.x + t.rad, t.y + t.rad);
      this.world.move(t);
    }
  }

  /** Pepper passed a size milestone: pause and offer three powerups. */
  private offerPowers() {
    const choices = rollChoices(this.stacks);
    if (!choices.length) { this.pendingPicks = 0; return; }
    this.picking = true;
    this.pickStart = this.time.now;
    this.vx = this.vy = 0;
    this.game.events.emit(EV.offer, choices, Object.keys(this.stacks).length === 0);
  }

  private takePower(id: PowerId) {
    if (!this.picking) return;
    this.picking = false;
    this.pendingPicks--;
    // The pause doesn't count toward the run's time.
    this.startTime += this.time.now - this.pickStart;
    this.stacks[id] = this.n(id) + 1;
    if (id === 'fur') this.furLeft++;
    if (id === 'treats') this.treatRain();
    this.game.events.emit(EV.toast, `${POWER_BY_ID[id].name}!`);
    this.emitPowers();
    this.emitGoal();
  }

  private emitPowers() {
    const s: PowerState = { stacks: { ...this.stacks }, next: MILESTONES[this.milestone] ?? null, fur: this.furLeft };
    this.game.events.emit(EV.powers, s);
  }

  /** Treat Rain: a ring of snacks sized for Pepper right now drops in around her. */
  private treatRain() {
    const r = this.r;
    const snacks = ITEMS.filter((d) => !d.furniture && d.size >= r * 0.25 && d.size <= r * 0.9);
    const pool = snacks.length ? snacks : ITEMS.filter((d) => !d.furniture && d.size <= r).slice(-4);
    const b = this.level.bounds, added: Thing[] = [];
    for (let i = 0; i < 18; i++) {
      const def = pool[Math.floor(Math.random() * pool.length)];
      const rad = (def.size / 2) * ((def.w + def.h) / 2) / Math.max(def.w, def.h);
      for (let tries = 0; tries < 12; tries++) {
        const a = Math.random() * Math.PI * 2, d = r * (2 + Math.random() * 4);
        const x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d;
        if (x < b.x + rad || y < b.y + rad || x > b.x + b.w - rad || y > b.y + b.h - rad) continue;
        if (this.solidsNear(x, y, rad + 2).some((s) => circleBoxDist(x, y, s) < rad + 2)) continue;
        if (this.segs.some((sg) => segHit(x, y, sg).d < rad + sg.t / 2 + 2)) continue;
        if (this.buildingPolys.some((poly) => inPoly(x, y, poly))) continue;
        const t: Thing = { def, x, y, rot: Math.random() * Math.PI * 2, rad, eaten: false };
        added.push(t);
        break;
      }
    }
    for (const t of added) this.addThing(t);
    this.world.addThings(added);
  }

  /** Grows Pepper by a bite worth `gained` (added to r²), with the powerups that boost each bite. */
  private grow(gained: number) {
    const now = this.time.now / 1000;
    this.streak = now - this.lastBite < STREAK_GAP ? Math.min(STREAK_CAP, this.streak + 1) : 0;
    this.lastBite = now;
    const boost = 1 + APPETITE * this.n('appetite') + STREAK * this.n('streak') * this.streak;
    this.r = Math.sqrt(this.r * this.r + gained * boost);
    if (this.n('rush')) this.rushT = RUSH_TIME;
    this.eatenCount++;
    this.chomp = 1;
    this.biteT = 0;
    this.happy = 1;
  }

  private eat(t: Thing) {
    t.eaten = true;
    this.grid.remove(t);
    if (t.box) this.solidGrid.remove(t.box);
    const before = this.r;
    const town = TOWNS.has(t.def.id);
    if (town) this.townsEaten++;
    const hood = HOODS.has(t.def.id) || town;
    if (HOODS.has(t.def.id)) this.hoodsEaten++;
    if (t.def.name === 'house') this.housesEaten++;
    this.grow(grownRadius(this.r, t.def.size) ** 2 - this.r * this.r);

    const mouthX = this.x + Math.cos(this.heading) * this.r * 1.6, mouthY = this.y + Math.sin(this.heading) * this.r * 1.6;
    this.world.eat(t, mouthX, mouthY, this.r * 1.2);

    const [sx, sy] = this.world.toScreen(mouthX, mouthY, this.r * 1.2), ppc = this.world.pxPerCm();
    this.crumbBurst(sx, sy, before * ppc);
    if (hood) this.lastPop = 0;
    if (t.def.size >= before * 0.7) this.chompPop(sx, sy, before * ppc);

    this.game.events.emit(EV.eat, t.def.name);
    if (HOODS.has(t.def.id) && this.hoodsEaten === 1) this.game.events.emit(EV.toast, 'Pepper ate a whole neighborhood!');
    if (town && this.townsEaten === 1) this.game.events.emit(EV.toast, 'Pepper ate a whole town!');
    this.afterGrow(before);
  }

  /** Pepper swallows a whole house, walls, roof and all. */
  private eatHouse(h: House) {
    h.eaten = true;
    this.housesEaten++;
    const gone = new Set(h.edges);
    this.segs = this.segs.filter((sg) => !gone.has(sg));
    this.buildingPolys = this.buildingPolys.filter((p) => p !== h.poly);
    const before = this.r;
    // A house is worth its whole footprint, so each one is a big jump.
    this.grow(GROW_K * h.area / 4);

    const mouthX = this.x + Math.cos(this.heading) * this.r * 1.6, mouthY = this.y + Math.sin(this.heading) * this.r * 1.6;
    this.world.eatBuilding(h.i, mouthX, mouthY, this.r * 1.2);
    const [sx, sy] = this.world.toScreen(mouthX, mouthY, this.r * 1.2), ppc = this.world.pxPerCm();
    this.crumbBurst(sx, sy, before * ppc);
    this.lastPop = 0;
    this.chompPop(sx, sy, before * ppc);

    this.game.events.emit(EV.eat, 'a house');
    if (this.housesEaten === 1) this.game.events.emit(EV.toast, 'Pepper ate a whole house!');
    this.afterGrow(before);
  }

  /** A whole stretch of yard fence (or inside wall), gulped like a breadstick. */
  private eatFence(f: GameScene['fences'][number]) {
    f.eaten = true;
    this.segs = this.segs.filter((sg) => sg !== f.seg);
    const before = this.r;
    const len = Math.hypot(f.seg.b[0] - f.seg.a[0], f.seg.b[1] - f.seg.a[1]);
    // Yard fences are thin, so they count as a strip about a metre wide. The house's walls just count their footprint.
    const ofHouse = f.i < this.houseWallN || f.i >= this.level.walls.length;
    this.grow(GROW_K * (len * (ofHouse ? f.seg.t : 100)) / 4);

    const mouthX = this.x + Math.cos(this.heading) * this.r * 1.6, mouthY = this.y + Math.sin(this.heading) * this.r * 1.6;
    this.world.eatWall(f.i, mouthX, mouthY, this.r * 1.2);
    const [sx, sy] = this.world.toScreen(mouthX, mouthY, this.r * 1.2), ppc = this.world.pxPerCm();
    this.crumbBurst(sx, sy, before * ppc);
    const what = !ofHouse ? 'a fence' : f.i >= this.level.walls.length ? 'the kitchen counter' : 'a wall';
    this.game.events.emit(EV.eat, what);
    // Biting into the outside of Pepper's house takes the stairs and the dog door with it.
    if (f.i < this.houseWallN && !f.seg.inner && !this.houseGone) {
      this.houseGone = true;
      if (this.level.stairs) this.solidGrid.remove(this.level.stairs);
      if (this.doorFlap) this.solidGrid.remove(this.doorFlap);
      this.world.eatHouseBits(mouthX, mouthY, this.r * 1.2);
      this.game.events.emit(EV.toast, 'Pepper is eating her own house!');
    }
    this.afterGrow(before);
  }

  /** Everything that follows a bite: HUD, size toasts, powerup milestones, the next goal, the win. */
  private afterGrow(before: number) {
    this.game.events.emit(EV.size, this.r);
    if (before < DOOR_R && this.r >= DOOR_R) {
      this.game.events.emit(EV.toast, 'Big enough! Head for the dog door in the garage.');
    } else if (!this.outside && before < WALL_R && this.r >= WALL_R) {
      this.game.events.emit(EV.toast, 'Too chunky for the doorways! Pepper can chomp right through the walls now.');
    }
    // Size goals, wherever Pepper is
    const passed = (at: number) => before < at && this.r >= at;
    const houseR = this.houseEatR(), hoodR = this.hoodEatR(), townR = this.townEatR();
    if (this.outside && this.housesEaten === 0 && passed(houseR)) {
      this.game.events.emit(EV.toast, 'Pepper is big enough to eat houses, fences, everything! Go chomp.');
    }
    if (passed(STREET_R)) {
      this.game.events.emit(EV.toast, 'Too wide for the streets! Pepper can stomp right over anything she can\'t eat yet.');
    }
    if (this.hoodsEaten === 0 && passed(hoodR)) {
      this.game.events.emit(EV.toast, 'Pepper can eat whole neighborhoods now! There are some round the edge of town, each with a hedge round it.');
    }
    if (this.townsEaten === 0 && passed(townR)) {
      this.game.events.emit(EV.toast, 'Pepper can eat whole towns now! Head out into the countryside and find the biggest one.');
    }
    if (this.outside) this.emitGoal();
    if (this.r >= WIN_R) { this.endRun('won'); return; }
    if (this.n('streak') && this.streak >= 3 && this.streak % 3 === 0) {
      this.game.events.emit(EV.toast, `Munch streak ×${this.streak}!`);
    }
    while (this.milestone < MILESTONES.length && this.r >= MILESTONES[this.milestone]) {
      this.milestone++;
      this.pendingPicks++;
    }
    if (this.pendingPicks) this.emitPowers();
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
    const door = this.level.door!;
    this.vx = this.vy = 0;
    this.heading = 0;
    this.world.flapOpen();
    this.tweens.add({
      targets: this, x: door.x + this.r * 3, y: door.y, duration: 700, ease: 'Quad.easeIn',
      onComplete: () => this.goOutside(),
    });
  }

  /** Out the dog door and into the neighborhood, which was right there all along. */
  private goOutside() {
    this.outside = true;
    this.seen.add('hood');
    this.heading = 0;
    this.finished = false;
    // The flap swings shut behind her: back in, she could grow too big to get out again.
    this.world.setArrow('door', false);
    this.emitGoal();
    this.game.events.emit(EV.toast, `Pepper's out! The whole neighborhood is a buffet. Watch out for the dog catcher once you hit ${formatSize(CATCHER_R)}.`);
  }

  private endRun(outcome: RunStats['outcome']) {
    this.finished = true;
    const stats: RunStats = {
      outcome, seconds: (this.time.now - this.startTime) / 1000, eaten: this.eatenCount, houses: this.housesEaten, hoods: this.hoodsEaten, towns: this.townsEaten,
      r: this.r, stacks: { ...this.stacks },
    };
    this.time.delayedCall(1100, () => this.game.events.emit(EV.done, stats));
  }

  // ---------- the dog catcher ----------

  /** He shows up at the street corner nearest a good distance away. */
  private spawnCatcher() {
    const spots = this.level.catcherSpawns ?? [[this.level.bounds.x, this.level.bounds.y]];
    const far = (p: Pt) => Math.abs(Math.hypot(p[0] - this.x, p[1] - this.y) - 3200);
    const [x, y] = [...spots].sort((a, b) => far(a) - far(b))[0];
    this.catcher = {
      x, y, vx: 0, vy: 0, heading: Math.atan2(this.y - y, this.x - x), gait: 0, lunge: 0, cool: 2, swing: 0,
      detour: 0, detourAng: 0, checkT: 0, lastX: x, lastY: y, fleeing: false, eatenT: -1, stun: 0,
    };
    this.world.catcher.show(true);
    this.emitGoal();
    this.game.events.emit(EV.toast, `Uh oh! The dog catcher spotted Pepper. Keep eating, and don't let him catch you until you're ${formatSize(this.catcherEatR())}.`);
  }

  private stepCatcher(dt: number) {
    if (!this.outside || this.catcherEaten) return;
    if (!this.catcher) { if (this.r >= CATCHER_R) this.spawnCatcher(); return; }
    const c = this.catcher;
    // Once Pepper is far too big to net, he gives up and goes home.
    if (this.r >= TOWN_R && c.eatenT < 0) {
      this.catcher = null; this.catcherEaten = true;
      this.world.catcher.show(false); this.world.setArrow('catcher', false);
      this.game.events.emit(EV.toast, 'The dog catcher gave up! Pepper is far too big for his net now.');
      this.emitGoal();
      return;
    }
    const big = this.canEat(CATCHER_SIZE);
    if (big && !c.fleeing) {
      c.fleeing = true;
      this.game.events.emit(EV.toast, 'Pepper is bigger than the dog catcher now. Eat him!');
    }

    const dx = this.x - c.x, dy = this.y - c.y, d = Math.hypot(dx, dy) || 1;
    let ang = Math.atan2(dy, dx) + (c.fleeing ? Math.PI : 0);
    if (c.detour > 0) { c.detour -= dt; ang += c.detourAng; }

    // He keeps up with a growing Pepper, and lunges with the net when he's close.
    let speed = c.fleeing ? 0.72 * speedFor(this.r) : Math.max(CATCHER_SPEED, 0.8 * speedFor(this.r)) * (1 - SNEAKY * this.n('sneaky'));
    if (c.stun > 0) { c.stun -= dt; speed = 0; }
    c.cool -= dt;
    if (!c.fleeing && c.lunge <= 0 && c.cool <= 0 && d < this.r + CATCHER_RAD + 260) { c.lunge = 0.55; c.cool = 2.6; }
    if (c.lunge > 0) { c.lunge -= dt; speed *= 1.7; }
    const a = 1 - Math.exp(-dt * 8);
    c.vx += (Math.cos(ang) * speed - c.vx) * a;
    c.vy += (Math.sin(ang) * speed - c.vy) * a;
    c.x += c.vx * dt; c.y += c.vy * dt;
    this.pushOut(c, CATCHER_RAD);
    const b = this.level.bounds;
    c.x = Phaser.Math.Clamp(c.x, b.x + CATCHER_RAD, b.x + b.w - CATCHER_RAD);
    c.y = Phaser.Math.Clamp(c.y, b.y + CATCHER_RAD, b.y + b.h - CATCHER_RAD);

    // Stuck behind a fence or a house? Walk sideways for a bit.
    c.checkT += dt;
    if (c.checkT > 0.6) {
      if (Math.hypot(c.x - c.lastX, c.y - c.lastY) < speed * 0.6 * 0.3 && c.detour <= 0) {
        c.detour = 0.9; c.detourAng = (Math.random() < 0.5 ? -1 : 1) * Math.PI / 2;
      }
      c.checkT = 0; c.lastX = c.x; c.lastY = c.y;
    }
    const v = Math.hypot(c.vx, c.vy);
    if (v > 10) c.heading = Phaser.Math.Angle.RotateTo(c.heading, Math.atan2(c.vy, c.vx), dt * 10);
    c.gait += (v / 45) * dt;

    if (d < this.r + CATCHER_RAD + (c.lunge > 0 ? 30 : 5)) {
      if (big) this.eatCatcher(); else if (this.furLeft > 0) this.slipNet(); else if (this.safeT <= 0) this.getCaught();
    }
  }

  /** Slippery Fur: the net slides off, Pepper gets a moment to run, and he's left dazed. */
  private slipNet() {
    if (this.safeT > 0) return;
    const c = this.catcher!;
    this.furLeft--;
    this.safeT = 2;
    c.stun = 1.4; c.lunge = 0; c.cool = 3; c.swing = 1;
    this.emitPowers();
    this.game.events.emit(EV.toast, this.furLeft
      ? `The net slipped off! Slippery Fur can save Pepper ${this.furLeft} more time${this.furLeft > 1 ? 's' : ''}.`
      : 'The net slipped off! That was the last of the Slippery Fur. Run!');
  }

  private getCaught() {
    const c = this.catcher!;
    c.swing = 1; c.lunge = 0;
    this.vx = this.vy = 0;
    this.game.events.emit(EV.toast, 'Gotcha! The dog catcher netted Pepper.');
    this.endRun('caught');
  }

  /** Pepper gulps the dog catcher down. That's not the end: next she starts on the houses. */
  private eatCatcher() {
    const c = this.catcher!;
    c.eatenT = 0;
    this.catcherEaten = true;
    this.world.setArrow('catcher', false);
    const before = this.r;
    this.grow(grownRadius(this.r, CATCHER_SIZE) ** 2 - this.r * this.r);
    this.game.events.emit(EV.eat, 'the dog catcher');
    const [sx, sy] = this.world.toScreen(c.x, c.y, 100), ppc = this.world.pxPerCm();
    this.crumbBurst(sx, sy, this.r * ppc);
    this.lastPop = 0;
    this.chompPop(sx, sy, this.r * ppc);
    this.game.events.emit(EV.toast, `Pepper ate the dog catcher, net and all! Nothing can stop her now. Houses are on the menu at ${formatSize(this.houseEatR())}.`);
    this.afterGrow(before);
  }

  /** Slides a walker (the dog catcher) out of walls, fences, buildings and furniture. */
  private pushOut(e: { x: number; y: number; vx: number; vy: number }, r: number) {
    for (const b of this.solidsNear(e.x, e.y, r)) {
      if (b !== this.doorFlap && !this.outside && canHop(r, Math.min(b.w, b.h))) continue;
      const nx = Phaser.Math.Clamp(e.x, b.x, b.x + b.w), ny = Phaser.Math.Clamp(e.y, b.y, b.y + b.h);
      const d = Math.hypot(e.x - nx, e.y - ny);
      if (d >= r || d < 0.0001) continue;
      const ox = (e.x - nx) / d, oy = (e.y - ny) / d;
      e.x = nx + ox * r; e.y = ny + oy * r;
      const vn = e.vx * ox + e.vy * oy;
      if (vn < 0) { e.vx -= vn * ox; e.vy -= vn * oy; }
    }
    for (const sg of this.segs) {
      const hit = segHit(e.x, e.y, sg), min = r + sg.t / 2;
      if (hit.d >= min || hit.d < 0.0001) continue;
      const ox = (e.x - hit.x) / hit.d, oy = (e.y - hit.y) / hit.d;
      e.x = hit.x + ox * min; e.y = hit.y + oy * min;
      const vn = e.vx * ox + e.vy * oy;
      if (vn < 0) { e.vx -= vn * ox; e.vy -= vn * oy; }
    }
  }

  private renderCatcher(dt: number) {
    const c = this.catcher;
    if (!c) { this.world.setArrow('catcher', false); return; }
    const target = c.lunge > 0 || (this.finished && c.eatenT < 0) ? 1 : 0;
    c.swing += (target - c.swing) * (1 - Math.exp(-dt * 14));
    const scale = c.eatenT >= 0 ? 1 - Math.min(1, (c.eatenT += dt) / 0.3) : 1;
    this.world.catcher.pose({ x: c.x, y: c.y, heading: c.heading, gait: c.gait, swing: c.swing, scale });

    // A red arrow floating above Pepper's head points to him while he's off screen.
    const d = Math.hypot(c.x - this.x, c.y - this.y);
    const show = !this.finished && d > this.viewCm() * 0.45;
    if (!show) { this.world.setArrow('catcher', false); return; }
    const a = Math.atan2(c.y - this.y, c.x - this.x), dist = this.shownR * 2.6;
    this.world.setArrow('catcher', true, this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, a, this.shownR * 0.5, this.shownR * 2.2);
  }

  // ---------- drawing Pepper ----------

  private renderDog(dt: number) {
    const v = Math.hypot(this.vx, this.vy), moving = Math.min(1, v / this.topSpeed());

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
    const { door } = this.level;
    if (!door || this.outside || this.r < DOOR_R || this.finished || !this.started) { this.world.setArrow('door', false); return; }
    const a = Math.atan2(door.y - this.y, door.x - this.x), dist = this.shownR * 2.3;
    this.world.setArrow('door', true, this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, a, this.shownR * 0.45);
  }
}

/** Area of a simple polygon (shoelace formula). */
function polyArea(poly: Pt[]) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) { const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length]; a += x0 * y1 - x1 * y0; }
  return Math.abs(a) / 2;
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

/** Is x,y inside the polygon? */
function inPoly(x: number, y: number, poly: Pt[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
