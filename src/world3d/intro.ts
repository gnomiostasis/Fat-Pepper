import * as THREE from 'three';
import { ITEM_BY_ID } from '../art/items';
import { PAL } from '../art/palette';
import { START_R, viewFor } from '../game/tuning';
import { Dog3D } from './dog3d';
import { ModelBuilder, inkedMesh, paint } from './toon';

// The intro: Pepper fast asleep in her bed at night, dreaming of food in a thought bubble. When the player
// starts, the bubble pops, she wakes up, stands, turns round, and the camera rises to the game's own view of
// her in her bed, where the room fades in round her and the run begins.
//
// The ending finishes here too: the last shot of her orbiting the sun shrinks into the thought bubble, and
// it turns out she was dreaming all along. Everything that moves while she sleeps loops every LOOP seconds,
// so the ending can stop on exactly the frame the intro starts on.

/** Everything in the sleeping shot repeats this often, in seconds. */
export const LOOP = 6;
const TAU = Math.PI * 2;
/** Camera field of view, the same as the game's. */
const FOV = 32;
const TILT = (62 * Math.PI) / 180;
/** The wake-up, in seconds: when each part starts and ends. */
const W_POP = 0.45, W_EYES = [0.45, 0.75], W_BLINK = [1.15, 1.35], W_RISE = [0.8, 1.6], W_TURN = [1.25, 2.1], W_CAM = [0.7, 2.3], W_FADE = [2.15, 2.75];
/** Pepper's heading while she sleeps (facing the camera, off to the left), and once she's up (north, as the game starts her). */
const SLEEP_HEADING = 2.35, AWAKE_HEADING = -Math.PI / 2;
/** Where the thought bubble floats, and how big its picture is (cm). */
const BUBBLE = new THREE.Vector3(-12, 29, -8);
const BUBBLE_SIZE = 21;
/** The close-up on her asleep. */
const CLOSE_AT = new THREE.Vector3(-3, 18, -2);
const CLOSE_POS = new THREE.Vector3(0.25, 0.5, 0.83).normalize().multiplyScalar(74).add(CLOSE_AT);
/** How high her bed's cushion is: asleep she lies on it (in the game she stands in it). */
const CUSHION = 5.3;
const NIGHT = new THREE.Color('#29304c');

const smooth = (a: number, b: number, t: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const wrap = (x: number) => x - Math.floor(x);

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, ctx: c.getContext('2d')! };
}

/** A cloud of overlapping circles filling most of a square, drawn in `fill`. */
function cloud(N: number, fill: string, grow = 0) {
  const { c, ctx } = canvas(N, N);
  ctx.fillStyle = fill;
  const circle = (x: number, y: number, r: number) => { ctx.beginPath(); ctx.arc(x * N, y * N, r * N + grow, 0, TAU); ctx.fill(); };
  circle(0.5, 0.5, 0.36);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + 0.2;
    circle(0.5 + Math.cos(a) * 0.33, 0.5 + Math.sin(a) * 0.31, 0.15 + (i % 2) * 0.025);
  }
  return c;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A sprite drawn over everything in the shot (the bubble floats in front of the bed). */
function sprite(map: THREE.Texture | null, order: number, extra: Partial<THREE.SpriteMaterialParameters> = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthTest: false, depthWrite: false, ...extra }));
  s.renderOrder = order;
  return s;
}

function renderTarget(w: number, h: number) {
  return new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
}

/** The dream: favourite snacks going round and round on a pink cloud. */
class Dream {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  readonly target = renderTarget(512, 512);
  private snacks: THREE.Object3D[] = [];
  private carousel = new THREE.Group();

  constructor() {
    this.scene.background = new THREE.Color('#f6d9df');
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.7));
    const key = new THREE.DirectionalLight(0xffffff, 1.3);
    key.position.set(2, 5, 4);
    this.scene.add(key, this.carousel);
    // A soft plate of cloud under the snacks
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.2, 40), paint({ color: '#fbeef0' }));
    plate.position.y = -0.75;
    this.scene.add(plate);
    const ids = ['bone', 'donut', 'sandwich', 'cookie', 'banana'];
    ids.forEach((id, i) => {
      const def = ITEM_BY_ID[id], b = new ModelBuilder();
      def.model(b);
      const m = inkedMesh(b.build());
      m.castShadow = m.receiveShadow = false;
      // Every snack about the same size in the dream, whatever its real size
      m.scale.setScalar(1.05 / Math.max(def.w, def.h));
      m.rotation.x = 0.35;
      const holder = new THREE.Group().add(m);
      const a = (i / ids.length) * TAU;
      holder.position.set(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3);
      this.carousel.add(holder);
      this.snacks.push(holder);
    });
    this.camera.position.set(0, 2.6, 5.6);
    this.camera.lookAt(0, -0.1, 0);
  }

  /** Poses the dream at loop time `tau`; turns a fifth of the way round each loop, so it repeats. */
  pose(tau: number) {
    const p = tau / LOOP;
    this.carousel.rotation.y = p * (TAU / 5);
    this.snacks.forEach((s, i) => {
      s.position.y = 0.12 * Math.sin(p * TAU * 2 + i * 1.3);
      s.rotation.y = -p * TAU + i;
    });
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }
}

export class Intro {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 4000);
  /** What the camera of the ending's last shot sees, drawn into the bubble while the dream takes over. */
  readonly orbitTarget = renderTarget(768, 768);
  /** Seconds into the sleeping loop. */
  tau = 0;
  /** Seconds into the wake-up, or -1 while she sleeps. */
  wakeT = -1;
  /** Seconds left before she starts waking, once asked. */
  private wakeDelay = 0;
  private onAwake: (() => void) | null = null;
  /** How far into the ending's slide into the dream, 0..1, or -1 when it isn't happening. */
  private fromEnding = -1;

  private dog = new Dog3D();
  private dream = new Dream();
  private ambient = new THREE.AmbientLight(0xffffff, 1.9);
  private sun = new THREE.DirectionalLight(0xffffff, 1.2);
  private floor: THREE.Mesh;
  private bubble = new THREE.Group();
  private foodPic: THREE.Sprite;
  private orbitPic: THREE.Sprite;
  private puffs: THREE.Sprite[] = [];
  private zs: THREE.Sprite[] = [];
  private v = new THREE.Vector3();
  private w = new THREE.Vector3();

  constructor() {
    this.scene.background = NIGHT.clone();
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.bias = -0.0004;
    Object.assign(this.sun.shadow.camera, { left: -90, right: 90, top: 90, bottom: -90, near: 10, far: 600 });
    this.sun.position.set(0.6 * 160, 1.6 * 160, 0.45 * 160);
    this.scene.add(this.ambient, this.sun, this.sun.target, this.dog.root, this.bubble);

    // A pool of lamplight on the carpet, fading into the dark room
    const { c, ctx } = canvas(256, 256);
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, '#5d7f8e'); g.addColorStop(0.25, '#3f5470'); g.addColorStop(1, '#29304c');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
    this.floor = new THREE.Mesh(new THREE.CircleGeometry(400, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex(c) }));
    this.scene.add(this.floor);

    // Her bed, just as it sits in the living room
    const def = ITEM_BY_ID.dogbed, b = new ModelBuilder();
    def.model(b);
    const bed = inkedMesh(b.build());
    bed.scale.setScalar(def.size / Math.max(def.w, def.h));
    this.scene.add(bed);

    // The thought bubble: three little puffs rising from her head, then the cloud with the dream in it
    const border = sprite(tex(cloud(512, PAL.cream, 12)), 10);
    border.scale.setScalar(BUBBLE_SIZE * 1.06);
    const mask = tex(cloud(512, '#ffffff'), false);
    this.foodPic = sprite(this.dream.target.texture, 11, { alphaMap: mask });
    this.orbitPic = sprite(this.orbitTarget.texture, 12, { alphaMap: mask, opacity: 0 });
    for (const s of [this.foodPic, this.orbitPic]) s.scale.setScalar(BUBBLE_SIZE);
    this.bubble.add(border, this.foodPic, this.orbitPic);
    this.bubble.position.copy(BUBBLE);
    const dot = canvas(64, 64);
    dot.ctx.fillStyle = PAL.cream; dot.ctx.beginPath(); dot.ctx.arc(32, 32, 30, 0, TAU); dot.ctx.fill();
    const dotTex = tex(dot.c);
    for (let i = 0; i < 3; i++) {
      const p = sprite(dotTex, 9);
      this.puffs.push(p);
      this.scene.add(p);
    }

    // Zzz
    const z = canvas(128, 128);
    z.ctx.font = '400 104px "Lilita One", "Arial Rounded MT Bold", sans-serif';
    z.ctx.textAlign = 'center'; z.ctx.textBaseline = 'middle';
    z.ctx.lineJoin = 'round'; z.ctx.lineWidth = 14; z.ctx.strokeStyle = PAL.ink; z.ctx.strokeText('z', 64, 70);
    z.ctx.fillStyle = PAL.cream; z.ctx.fillText('z', 64, 70);
    const zTex = tex(z.c);
    for (let i = 0; i < 3; i++) {
      const s = sprite(zTex, 13);
      this.zs.push(s);
      this.scene.add(s);
    }
  }

  /** True while she's asleep and no wake-up has been asked for. */
  get dreaming() {
    return this.wakeT < 0 && !this.onAwake;
  }

  /** Back to the very first frame: asleep, at the start of the loop. */
  reset() {
    this.tau = 0; this.wakeT = -1; this.wakeDelay = 0; this.onAwake = null; this.fromEnding = -1;
  }

  /** Wakes her up after `delay` seconds; `done` runs once the room has faded in and the game can start. */
  wake(done: () => void, delay = 0) {
    this.onAwake = done;
    this.wakeDelay = delay;
  }

  /** The ending is sliding into the dream: `k` 0..1 through it, at loop time `tau`. */
  dreamFromEnding(k: number, tau: number) {
    this.fromEnding = k;
    this.tau = tau;
  }

  /** How much of the intro shows over the game, 0..1 (it fades out at the end of the wake-up). */
  get opacity() {
    return this.wakeT < 0 ? 1 : 1 - smooth(W_FADE[0], W_FADE[1], this.wakeT);
  }

  /** Poses everything for this frame. Call `advance` after drawing it. */
  update(aspect: number) {
    this.camera.aspect = aspect;
    const tau = this.tau, w = this.wakeT < 0 ? 0 : this.wakeT;
    const breath = Math.sin((tau / LOOP) * TAU * 2);

    // ---- Pepper ----
    const rise = smooth(W_RISE[0], W_RISE[1], w), turn = smooth(W_TURN[0], W_TURN[1], w);
    const blink = w > W_BLINK[0] && w < W_BLINK[1] ? Math.sin(((w - W_BLINK[0]) / (W_BLINK[1] - W_BLINK[0])) * Math.PI) : 0;
    const lids = Math.max(1 - smooth(W_EYES[0], W_EYES[1], w), blink);
    const awake = smooth(W_RISE[1], W_RISE[1] + 0.4, w);
    this.dog.pose({
      x: 0, y: 0, heading: SLEEP_HEADING + (AWAKE_HEADING - SLEEP_HEADING) * turn, r: START_R, fat: 0,
      moving: Math.sin(turn * Math.PI) * 0.8, gait: w * 14, wag: Math.sin(w * 16) * 0.7 * awake, chomp: 0, lunge: 0,
      sleep: 1 - rise, lids, breath,
    });
    // Asleep, she lies on top of the cushion; by the time the camera is overhead she's standing in it, as in the game
    this.dog.root.position.y += CUSHION * (1 - smooth(W_RISE[1], W_CAM[1], w));

    // ---- the bubble, the puffs and the Zzz: they pop as she wakes ----
    const pop = this.wakeT < 0 ? 0 : Math.min(1, this.wakeT / W_POP);
    const sleepy = 1 - pop;
    this.dream.pose(tau);
    const wobble = 1 + 0.025 * Math.sin((tau / LOOP) * TAU * 2 + 1);
    this.bubble.scale.setScalar(wobble * (1 + 0.2 * pop));
    this.bubble.visible = pop < 1;
    (this.bubble.children[0] as THREE.Sprite).material.opacity = sleepy;
    this.foodPic.material.opacity = sleepy;
    this.orbitPic.material.opacity = this.fromEnding < 0 ? 0 : 1 - smooth(0.6, 0.9, this.fromEnding);
    // Her head, more or less, in the bed
    const head = this.v.set(Math.cos(SLEEP_HEADING) * 7, 10, Math.sin(SLEEP_HEADING) * 7);
    this.puffs.forEach((p, i) => {
      const k = (i + 1) / 4;
      p.position.lerpVectors(head, this.w.copy(BUBBLE).add({ x: 4, y: -BUBBLE_SIZE * 0.32, z: 2 } as THREE.Vector3), k);
      p.scale.setScalar((1.6 + i * 1.3) * (1 + 0.08 * Math.sin((tau / LOOP) * TAU * 2 - i)) * sleepy + 0.001);
      p.material.opacity = sleepy;
    });
    this.zs.forEach((s, i) => {
      // Each z drifts up and fades, one after another, three every two seconds
      const k = wrap(tau / 2 + i / 3);
      s.position.set(head.x + 3 + k * 9 + Math.sin(k * TAU) * 1.5, head.y + 6 + k * 14, head.z + 2);
      s.scale.setScalar((2.2 + k * 3) * sleepy + 0.001);
      s.material.opacity = Math.sin(k * Math.PI) * sleepy;
    });

    // ---- night to day ----
    const day = smooth(W_CAM[0], W_CAM[1], w);
    this.ambient.intensity = 1.05 + (1.9 - 1.05) * day;
    this.ambient.color.set('#b4bfe8').lerp(new THREE.Color(0xffffff), day);
    this.sun.intensity = 0.7 + (1.2 - 0.7) * day;
    this.sun.color.set('#cdd8ff').lerp(new THREE.Color(0xffffff), day);
    (this.scene.background as THREE.Color).copy(NIGHT).lerp(new THREE.Color('#9ccdc4'), day);

    // ---- the camera ----
    // Close up on her asleep, rising to just where the game's camera will be when it takes over.
    const visH = aspect >= 1 ? viewFor(START_R) : viewFor(START_R) / aspect;
    const D = visH / (2 * Math.tan((FOV * Math.PI) / 360));
    const gamePos = this.w.set(0, D * Math.sin(TILT), D * Math.cos(TILT));
    // Pull back far enough to fit the bubble on a narrow phone screen
    const fit = Math.max(1, 0.85 / aspect);
    const closePos = this.v.copy(CLOSE_POS).sub(CLOSE_AT).multiplyScalar(fit).add(CLOSE_AT);
    const c = smooth(W_CAM[0], W_CAM[1], w);
    this.camera.position.lerpVectors(closePos, gamePos, c);
    const at = new THREE.Vector3().lerpVectors(CLOSE_AT, new THREE.Vector3(0, 0, 0), c);
    if (this.fromEnding >= 0) {
      // The ending's picture fills the screen inside the bubble, then the camera pulls back to the bed.
      const fill = BUBBLE_SIZE / (2 * Math.tan((FOV * Math.PI) / 360));
      const fromBubble = new THREE.Vector3().subVectors(closePos, BUBBLE).normalize();
      const fromBed = new THREE.Vector3().subVectors(closePos, CLOSE_AT);
      const far = fromBed.length();
      const k = smooth(0.12, 0.85, this.fromEnding);
      at.lerpVectors(BUBBLE, CLOSE_AT, k);
      const dir = fromBubble.lerp(fromBed.normalize(), k).normalize();
      this.camera.position.copy(at).addScaledVector(dir, fill * Math.pow(far / fill, k));
    }
    this.camera.near = Math.max(0.5, this.camera.position.distanceTo(at) * 0.05);
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(at);
  }

  /** Draws the dream into the bubble; the caller then draws `scene` with `camera`. */
  renderDream(renderer: THREE.WebGLRenderer) {
    this.dream.render(renderer);
  }

  /** Moves time on after a frame is drawn. Returns true on the frame the wake-up finishes. */
  advance(dt: number) {
    if (this.fromEnding >= 0) return false;
    if (this.wakeT < 0) {
      this.tau = (this.tau + dt) % LOOP;
      if (this.onAwake && (this.wakeDelay -= dt) <= 0) this.wakeT = 0;
      return false;
    }
    this.wakeT += dt;
    if (this.wakeT >= W_FADE[1]) {
      const done = this.onAwake;
      this.onAwake = null;
      done?.();
      return true;
    }
    return false;
  }

  /** The ending has handed over: carry on dreaming from the start of the loop. */
  endingDone() {
    this.reset();
  }
}
