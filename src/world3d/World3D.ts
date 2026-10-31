import * as THREE from 'three';
import type { ItemDef } from '../art/items';
import { PAL } from '../art/palette';
import { FLOOR_TILE_WORLD, floorCanvases } from '../art/textures';
import type { Level, Seg } from '../game/level';
import { Catcher3D } from './catcher3d';
import { Dog3D, DogPose } from './dog3d';
import { ModelBuilder, ink, inkResolution, inkedMesh, paint } from './toon';

const COUNTER_H = 26;
/** Camera pitch: 90° would be straight down. */
const TILT = (62 * Math.PI) / 180;
const FOV = 32;

/** Something placed in the house: a loose item or a piece of furniture. */
export interface Placed {
  def: ItemDef;
  x: number;
  y: number;
  /** Rotation in the 2D layout, radians clockwise. */
  rot: number;
  slot?: { kind: Kind; i: number };
}

interface Kind {
  built: ReturnType<ModelBuilder['build']>;
  fill: THREE.InstancedMesh;
  line: THREE.InstancedMesh | null;
}

interface Anim {
  t: number;
  dur: number;
  step(k: number): void;
  done?(): void;
}

/**
 * Draws Pepper's house in 3D, on its own canvas under the Phaser HUD.
 * Game logic stays in the 2D layout's coordinates (cm, y down); here x stays x,
 * the layout's y becomes z, and height is y.
 */
export class World3D {
  readonly renderer: THREE.WebGLRenderer;
  readonly dog = new Dog3D();
  readonly catcher = new Catcher3D();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 1, 10000);
  private sun = new THREE.DirectionalLight(0xffffff, 1.2);
  private root = new THREE.Group();
  private models = new Map<string, ReturnType<ModelBuilder['build']>>();
  private kinds: Kind[] = [];
  private anims: Anim[] = [];
  private wobbles = new Map<Placed, number>();
  private flap = new THREE.Group();
  private flapAngle = 0;
  /** Floor arrows near Pepper: one to the dog door, one warning where the dog catcher is. */
  private arrows: Record<'door' | 'catcher', THREE.Mesh>;
  private camX = 0;
  private camY = 0;
  private view = 150;
  private time = 0;
  private ray = new THREE.Raycaster();
  private m4 = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(parent: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    parent.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(PAL.avocado);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.9));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.scene.add(this.sun, this.sun.target, this.root, this.dog.root, this.catcher.root);

    const arrow = (color: string) => {
      const shape = new THREE.Shape([new THREE.Vector2(1, 0), new THREE.Vector2(-0.6, 0.8), new THREE.Vector2(-0.6, -0.8)]);
      const tri = new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false });
      tri.rotateX(-Math.PI / 2);
      const m = inkedMesh(new ModelBuilder().add(tri, color, 0, 0, 0).build());
      m.visible = false;
      this.scene.add(m);
      return m;
    };
    this.arrows = { door: arrow(PAL.mustard), catcher: arrow(PAL.collar) };

    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    inkResolution.value.set(w, h);
  }

  // ---------- building ----------

  /** Clears the last level and builds this one fresh. */
  build(house: Level) {
    // Free last run's GPU memory, but keep the item models: they're the same every run.
    const keep = new Set<THREE.BufferGeometry>();
    for (const m of this.models.values()) { keep.add(m.fill); if (m.line) keep.add(m.line); }
    this.root.traverse((o) => {
      if (o instanceof THREE.InstancedMesh) o.dispose();
      if (o instanceof THREE.Mesh) {
        if (!keep.has(o.geometry)) o.geometry.dispose();
        const mat = o.material as THREE.MeshToonMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
    for (const c of [...this.root.children]) this.root.remove(c);
    for (const a of this.anims) a.done?.();
    this.kinds = []; this.anims = []; this.wobbles.clear();
    this.flapAngle = 0;

    const tex = (key: string) => {
      const t = new THREE.CanvasTexture(floorCanvases()[key]);
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      return t;
    };

    // Grass all around
    const b = house.bounds, pad = 6000;
    const grassTex = tex('floor-grass');
    grassTex.repeat.set((b.w + pad) / FLOOR_TILE_WORLD, (b.h + pad) / FLOOR_TILE_WORLD);
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(b.w + pad, b.h + pad).rotateX(-Math.PI / 2), paint({ map: grassTex }));
    grass.position.set(b.x + b.w / 2, -1, b.y + b.h / 2);
    grass.receiveShadow = true;
    this.root.add(grass);

    // Floors, each clipped to its room
    house.floors.forEach((f, i) => {
      const t = tex(f.texture);
      t.repeat.set(1 / FLOOR_TILE_WORLD, 1 / FLOOR_TILE_WORLD);
      const geo = new THREE.ShapeGeometry(new THREE.Shape(f.poly.map(([x, y]) => new THREE.Vector2(x, -y))));
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, paint({ map: t }));
      mesh.position.y = i * 0.25;
      mesh.receiveShadow = true;
      this.root.add(mesh);
    });

    // Walls (or fences), kitchen counter, front door, stairs
    const WALL_H = house.wallStyle.height;
    const walls = new ModelBuilder();
    const slab = (sg: Seg, t: number, y0: number, h: number, color: string, extend = true) => {
      const [ax, ay] = sg.a, [bx, by] = sg.b, len = Math.hypot(bx - ax, by - ay);
      walls.add(new THREE.BoxGeometry(len + (extend ? t : 0), h, t), color, (ax + bx) / 2, y0 + h / 2, (ay + by) / 2,
        { ry: -Math.atan2(by - ay, bx - ax) });
    };
    for (const sg of house.walls) slab(sg, sg.t, 0, WALL_H, house.wallStyle.color);
    // The counter bends, so its pieces meet at round posts instead of overlapping
    if (house.counters.length) {
      const ct = house.counters[0].t;
      for (const sg of house.counters) {
        slab(sg, ct - 6, 0, COUNTER_H - 3, PAL.tealLight, false);
        slab(sg, ct, COUNTER_H - 3, 3, PAL.white, false);
      }
      for (const [x, y] of [house.counters[0].a, ...house.counters.map((sg) => sg.b)]) {
        walls.cyl(x, y, (ct - 6) / 2, 0, COUNTER_H - 3, PAL.tealLight, { ink: false });
        walls.cyl(x, y, ct / 2, COUNTER_H - 3, 3, PAL.white, { ink: false });
      }
    }
    const fd = house.frontDoor;
    if (fd) {
      slab(fd, fd.t - 4, 0, WALL_H - 2, PAL.wood, false);
      walls.ball(fd.a[0] + (fd.b[0] - fd.a[0]) * 0.8, WALL_H * 0.45, fd.a[1] + fd.t / 2, 2.6, PAL.mustard);
    }
    const st = house.stairs;
    if (st) {
      const steps = 9, dz = st.h / steps;
      for (let i = 0; i < steps; i++) {
        walls.box(st.x + st.w / 2, st.y + st.h - (i + 0.5) * dz, st.w, dz, 0, 6 + i * 4.5, i % 2 ? PAL.wood : PAL.woodLight);
      }
    }
    // Paint on the ground
    for (const m of house.marks) walls.box(m.box.x + m.box.w / 2, m.box.y + m.box.h / 2, m.box.w, m.box.h, 0, 0.6, m.color, { ink: false });
    if (house.walls.length || house.counters.length || fd || st || house.marks.length) this.root.add(inkedMesh(walls.build()));

    // Buildings: solid walls with a roof slab on top
    if (house.buildings.length) {
      const bb = new ModelBuilder();
      for (const bd of house.buildings) {
        const xs = bd.poly.map((p) => p[0]), ys = bd.poly.map((p) => p[1]);
        const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const isRect = bd.poly.length === 4 && bd.poly.every(([x, y]) => (x === x0 || x === x1) && (y === y0 || y === y1));
        if (isRect) {
          // A house: walls, a door and windows, under a hip roof with eaves
          const w = x1 - x0, d = y1 - y0, cx = (x0 + x1) / 2, cz = (y0 + y1) / 2;
          bb.box(cx, cz, w, d, 0, bd.height, bd.wall).pyramid(cx, cz, w + 80, d + 80, bd.height, Math.min(w, d) * 0.32, bd.roof);
          for (const side of [-1, 1]) {
            const z = cz + side * (d / 2 + 1);
            for (let i = 0; i < 3; i++) bb.box(x0 + w * (0.2 + i * 0.3), z, 110, 2, bd.height * 0.4, bd.height * 0.35, PAL.navy, { ink: false });
            bb.box(cx, z, 100, 3, 0, bd.height * 0.7, PAL.woodDark, { ink: false });
          }
          for (const side of [-1, 1]) bb.box(cx + side * (w / 2 + 1), cz, 2, 110, bd.height * 0.4, bd.height * 0.35, PAL.navy, { ink: false });
        } else {
          const shape = new THREE.Shape(bd.poly.map(([x, y]) => new THREE.Vector2(x, -y)));
          const body = new THREE.ExtrudeGeometry(shape, { depth: bd.height, bevelEnabled: false }).rotateX(-Math.PI / 2);
          const roof = new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false }).rotateX(-Math.PI / 2);
          bb.add(body, bd.wall, 0, 0, 0).add(roof, bd.roof, 0, bd.height, 0);
        }
      }
      this.root.add(inkedMesh(bb.build()));
    }

    // Welcome mat and the dog door's flap
    const door = house.door, T = house.wallThickness;
    if (!door) return;
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(34, 60).rotateX(-Math.PI / 2), paint({ map: this.matTexture() }));
    mat.position.set(door.x - 27, 0.8, door.y);
    mat.receiveShadow = true;
    this.root.add(mat);
    const panel = new ModelBuilder()
      .box(0, 0, T - 6, door.half * 2, -WALL_H, WALL_H, PAL.mustard)
      .ball(-(T - 6) / 2, -WALL_H * 0.75, 0, 3, PAL.mustardDark, { ink: false });
    this.flap.clear();
    this.flap.add(inkedMesh(panel.build()));
    this.flap.position.set(door.x + T / 2, WALL_H, door.y);
    this.flap.rotation.set(0, 0, 0);
    this.root.add(this.flap);
  }

  private matTexture() {
    const c = document.createElement('canvas'), k = 4;
    c.width = 34 * k; c.height = 60 * k;
    const g = c.getContext('2d')!;
    g.fillStyle = PAL.ink; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = PAL.orange; g.beginPath(); g.roundRect(6, 6, c.width - 12, c.height - 12, 14); g.fill();
    g.translate(c.width / 2, c.height / 2); g.rotate(-Math.PI / 2);
    g.font = '400 44px "Lilita One", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = PAL.cream; g.fillText('DOG', 0, -22); g.fillText('DOOR', 0, 24);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private model(def: ItemDef) {
    let m = this.models.get(def.id);
    if (!m) {
      const b = new ModelBuilder();
      def.model(b);
      m = b.build();
      this.models.set(def.id, m);
    }
    return m;
  }

  /** Adds every item and piece of furniture, one instanced mesh per kind of thing. */
  addThings(things: Placed[]) {
    const byId = new Map<string, Placed[]>();
    for (const t of things) byId.set(t.def.id, [...(byId.get(t.def.id) ?? []), t]);
    for (const [, list] of byId) {
      const built = this.model(list[0].def);
      const fill = new THREE.InstancedMesh(built.fill, paint(), list.length);
      fill.castShadow = true; fill.receiveShadow = true; fill.frustumCulled = false;
      const line = built.line ? new THREE.InstancedMesh(built.line, ink(built.size), list.length) : null;
      if (line) line.frustumCulled = false;
      const kind: Kind = { built, fill, line };
      list.forEach((t, i) => { t.slot = { kind, i }; this.place(t); });
      this.root.add(fill);
      if (line) this.root.add(line);
      this.kinds.push(kind);
    }
  }

  private place(t: Placed, tilt = 0, scaleBy = 1) {
    if (!t.slot) return;
    const unit = (t.def.size / Math.max(t.def.w, t.def.h)) * scaleBy;
    this.q.setFromEuler(this.e.set(tilt * 0.6, -t.rot, tilt, 'YXZ'));
    this.m4.compose(this.v.set(t.x, 0, t.y), this.q, this.s.set(unit, unit, unit));
    const { kind, i } = t.slot;
    kind.fill.setMatrixAt(i, this.m4);
    kind.fill.instanceMatrix.needsUpdate = true;
    if (kind.line) { kind.line.setMatrixAt(i, this.m4); kind.line.instanceMatrix.needsUpdate = true; }
  }

  /** Pepper ate it: it vanishes from the floor and a copy shrinks into her mouth. */
  eat(t: Placed, mouthX: number, mouthY: number, mouthH: number) {
    this.wobbles.delete(t);
    this.place(t, 0, 0);
    if (!t.slot) return;
    const { kind } = t.slot;
    const copy = new THREE.Mesh(kind.built.fill, kind.fill.material);
    if (kind.line) copy.add(new THREE.Mesh(kind.built.line!, kind.line.material));
    const unit = t.def.size / Math.max(t.def.w, t.def.h);
    copy.rotation.y = -t.rot;
    this.scene.add(copy);
    const from = new THREE.Vector3(t.x, 0, t.y), to = new THREE.Vector3(mouthX, mouthH, mouthY);
    this.anims.push({
      t: 0, dur: 0.17,
      step: (k) => { const e = k * k; copy.position.lerpVectors(from, to, e); copy.scale.setScalar(Math.max(0.001, unit * (1 - e))); },
      done: () => this.scene.remove(copy),
    });
  }

  /** A quick rock, for something Pepper bumped but is too small to eat. */
  wobble(t: Placed) {
    if (!this.wobbles.has(t)) this.wobbles.set(t, 0);
  }

  /** The flap swings a little: Pepper is too small to get through. */
  flapBump() {
    this.anims.push({ t: 0, dur: 0.36, step: (k) => { this.flapAngle = 0.45 * Math.sin(k * Math.PI * 2) * (1 - k); } });
  }

  /** The flap swings wide open as Pepper jumps through. */
  flapOpen() {
    this.anims.push({ t: 0, dur: 1.3, step: (k) => { this.flapAngle = 1.25 * Math.sin(Math.min(1, k * 1.6) * Math.PI * 0.5) * (k < 0.7 ? 1 : (1 - k) / 0.3); } });
  }

  setArrow(which: 'door' | 'catcher', show: boolean, x = 0, y = 0, angle = 0, size = 1) {
    const a = this.arrows[which];
    a.visible = show;
    if (!show) return;
    a.position.set(x, 1, y);
    a.rotation.y = -angle;
    a.scale.set(size, 1, size);
  }

  posePepper(p: DogPose) {
    this.dog.pose(p);
  }

  // ---------- camera ----------

  /** Keeps the camera on x,y, far enough back to show `viewCm` across the screen's short side. */
  follow(x: number, y: number, viewCm: number, dt: number, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-dt * 16);
    this.camX += (x - this.camX) * k;
    this.camY += (y - this.camY) * k;
    this.view = viewCm;
  }

  private placeCamera() {
    const aspect = this.camera.aspect;
    const visH = aspect >= 1 ? this.view : this.view / aspect;
    const D = visH / (2 * Math.tan((FOV * Math.PI) / 360));
    this.camera.position.set(this.camX, D * Math.sin(TILT), this.camY + D * Math.cos(TILT));
    this.camera.near = D * 0.1; this.camera.far = D * 6;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(this.camX, 0, this.camY);

    // The sun's shadow box travels with the camera.
    const E = visH * Math.max(1, aspect) * 0.75, sc = this.sun.shadow.camera;
    this.sun.target.position.set(this.camX, 0, this.camY);
    this.sun.position.set(this.camX + D * 0.6, D * 1.6, this.camY + D * 0.45);
    Object.assign(sc, { left: -E, right: E, top: E, bottom: -E, near: D * 0.2, far: D * 4 });
    sc.updateProjectionMatrix();
    this.sun.shadow.normalBias = E * 0.0015;
  }

  /** Where the pointer at screen x,y meets the floor, in layout coordinates. */
  ground(sx: number, sy: number): [number, number] | null {
    const el = this.renderer.domElement;
    this.ray.setFromCamera(new THREE.Vector2((sx / el.clientWidth) * 2 - 1, -(sy / el.clientHeight) * 2 + 1), this.camera);
    const { origin, direction } = this.ray.ray;
    if (Math.abs(direction.y) < 1e-6) return null;
    const t = -origin.y / direction.y;
    return t > 0 ? [origin.x + direction.x * t, origin.z + direction.z * t] : null;
  }

  /** Screen position of a point in the house, `h` cm off the floor. */
  toScreen(x: number, y: number, h = 0): [number, number] {
    const p = this.v.set(x, h, y).project(this.camera), el = this.renderer.domElement;
    return [(p.x + 1) * 0.5 * el.clientWidth, (1 - p.y) * 0.5 * el.clientHeight];
  }

  /** Roughly how many screen pixels one cm covers around Pepper. */
  pxPerCm() {
    const aspect = this.camera.aspect, visH = aspect >= 1 ? this.view : this.view / aspect;
    return this.renderer.domElement.clientHeight / visH;
  }

  // ---------- each frame ----------

  render(dt: number) {
    this.time += dt;
    this.anims = this.anims.filter((a) => {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      a.step(k);
      if (k >= 1) { a.done?.(); return false; }
      return true;
    });
    for (const [t, age] of this.wobbles) {
      const next = age + dt;
      if (next >= 0.28) { this.wobbles.delete(t); this.place(t); }
      else { this.wobbles.set(t, next); this.place(t, 0.18 * Math.sin((next / 0.14) * Math.PI)); }
    }
    this.flap.rotation.z = this.flapAngle;
    for (const a of Object.values(this.arrows)) if (a.visible) a.scale.multiplyScalar(1 + 0.08 * Math.sin(this.time * 6));
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
  }
}

let world: World3D | null = null;
/** The one 3D view, created on first use under the given element. */
export function getWorld(parent?: HTMLElement) {
  if (!world) world = new World3D(parent ?? document.body);
  return world;
}
