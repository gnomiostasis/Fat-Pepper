import * as THREE from 'three';
import { PAL } from '../art/palette';
import type { Dog3D } from './dog3d';
import { paint } from './toon';

// The ending, after Pepper reaches space: she keeps on growing until the whole Earth is a snack, gulps it
// down, and then, a full round ball of a dog, goes into orbit round the sun.

/** Earth's radius in this little scene's units, and how many km one unit is. */
const EARTH = 10;
const KM_PER_UNIT = 6371 / EARTH;
/** When things happen, in seconds. */
const GROW = 4.2, CHOMP = 4.2, GULP = 5.2, FADE_OUT = 6.6, SWITCH = 7.3, FADE_IN = 8.1;
/** How long before the finish card comes up over the orbit. */
export const ENDING_CARD = 11;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** A cartoon Earth to wrap round a ball: sea, blobby green continents, ice caps and wisps of cloud. */
function earthTexture() {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!, r = seeded(73);
  ctx.fillStyle = '#5f9cc8'; ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 11; i++) {
    const cx = (i + r() * 0.6) * (W / 11), cy = H * (0.2 + r() * 0.6), n = 4 + Math.floor(r() * 6);
    for (let k = 0; k < n; k++) {
      const x = cx + (r() - 0.5) * 160, y = cy + (r() - 0.5) * 90, rx = 20 + r() * 40, ry = 14 + r() * 26;
      for (const dx of [0, -W, W]) {
        ctx.fillStyle = '#f1e2b8'; ctx.beginPath(); ctx.ellipse(x + dx, y, rx + 5, ry + 5, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  // The same blobs again in green, a little smaller, so a beach shows round each one
  const r2 = seeded(73);
  for (let i = 0; i < 11; i++) {
    const cx = (i + r2() * 0.6) * (W / 11), cy = H * (0.2 + r2() * 0.6), n = 4 + Math.floor(r2() * 6);
    for (let k = 0; k < n; k++) {
      const x = cx + (r2() - 0.5) * 160, y = cy + (r2() - 0.5) * 90, rx = 20 + r2() * 40, ry = 14 + r2() * 26;
      for (const dx of [0, -W, W]) {
        ctx.fillStyle = k % 3 ? '#8fbf78' : '#7fae6a'; ctx.beginPath(); ctx.ellipse(x + dx, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  ctx.fillStyle = PAL.white; ctx.fillRect(0, 0, W, 34); ctx.fillRect(0, H - 30, W, 30);
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const x = r() * W, y = H * (0.12 + r() * 0.76), w = 40 + r() * 100;
    ctx.lineWidth = 5 + r() * 7;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + w / 2, y - 10 - r() * 10, x + w, y); ctx.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function stars(n: number, rad: number) {
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rad * rand(0.8, 1));
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff8e6, size: 2, sizeAttenuation: false }));
}

const ball = (r: number, color: string) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), paint({ color }));
const glow = (r: number, color: string, opacity: number) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20),
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));

export class Ending {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 3000);
  /** Seconds since the ending started. */
  t = 0;
  private earthPart = new THREE.Group();
  private sunPart = new THREE.Group();
  private earth: THREE.Mesh;
  private bits: { m: THREE.Mesh; v: THREE.Vector3 }[] = [];
  private fade: THREE.Mesh;
  private planets: { m: THREE.Object3D; R: number; w: number; a: number }[] = [];
  /** Pepper's width in km, for the HUD, while she's still growing. */
  sizeKm = 100;

  constructor(private dog: Dog3D) {
    this.scene.background = new THREE.Color('#141a34');
    this.scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.4);
    key.position.set(30, 40, 50);
    this.scene.add(key, stars(900, 900), this.earthPart, this.sunPart, dog.root);

    // ---- the Earth ----
    this.earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH, 48, 32), paint({ map: earthTexture() }));
    this.earth.rotation.z = 0.4;
    this.earthPart.add(this.earth, glow(EARTH * 1.06, '#9fc4de', 0.08));
    const moon = ball(2.4, PAL.greyLight);
    moon.position.set(26, 8, -30);
    this.earthPart.add(moon);

    // ---- the sun, its planets, and the orbit Pepper will go round ----
    const sun = new THREE.Mesh(new THREE.SphereGeometry(8, 48, 32), new THREE.MeshBasicMaterial({ color: '#ffd76a' }));
    this.sunPart.add(sun, glow(9.5, '#ffb347', 0.35), glow(12, '#ff9a5a', 0.15), glow(16, '#ffd76a', 0.07));
    this.sunPart.add(new THREE.PointLight(0xfff1d0, 900, 0, 1.6));
    for (const [R, color, r, w, ringed] of [[16, PAL.orange, 1.1, 0.9, false], [30, PAL.white, 0, 0, false], [44, PAL.mustard, 2.4, 0.22, true], [56, PAL.tealLight, 1.6, 0.14, false]] as const) {
      const orbit = new THREE.Mesh(new THREE.TorusGeometry(R, 0.08, 6, 160), new THREE.MeshBasicMaterial({ color: '#c9d2f0', transparent: true, opacity: R === 30 ? 0.55 : 0.22 }));
      orbit.rotation.x = Math.PI / 2;
      this.sunPart.add(orbit);
      if (!r) continue;
      const p = new THREE.Group().add(ball(r, color));
      if (ringed) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 1.8, r * 0.18, 4, 48), paint({ color: PAL.woodLight })); ring.rotation.x = 1.2; p.add(ring); }
      this.sunPart.add(p);
      this.planets.push({ m: p, R, w, a: rand(0, Math.PI * 2) });
    }
    this.sunPart.visible = false;

    // A black sheet just in front of the camera, for fading between the two shots
    this.fade = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ color: '#0b0f22', transparent: true, opacity: 1, depthTest: false }));
    this.fade.position.z = -1;
    this.fade.renderOrder = 999;
    this.camera.add(this.fade);
    this.scene.add(this.camera);
  }

  /** Puts Pepper back where she came from (when a new run starts). */
  release(home: THREE.Object3D) {
    home.add(this.dog.root);
  }

  update(dt: number, aspect: number) {
    this.t += dt;
    const t = this.t;
    this.camera.aspect = aspect;
    const ease = (a: number, b: number) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

    if (t < SWITCH) {
      // ---- shot one: Pepper outgrows the planet and gulps it down ----
      const r0 = 50 / KM_PER_UNIT, r = r0 * Math.pow(EARTH * 1.35 / r0, ease(0, GROW) * 0.85 + ease(GULP, FADE_OUT) * 0.15);
      this.sizeKm = 2 * r * KM_PER_UNIT;
      const chomp = t > CHOMP && t < GULP + 0.3 ? Math.sin(Math.min(1, (t - CHOMP) / (GULP + 0.3 - CHOMP)) * Math.PI * 2) ** 2 : 0;
      const lunge = Math.sin(Math.min(1, Math.max(0, (t - CHOMP) / (GULP - CHOMP))) * Math.PI) * EARTH * 1.2;
      const x = -(EARTH + r * 1.8);
      this.dog.pose({ x, y: 0, heading: 0, r, fat: 1, moving: 0, gait: 0, wag: Math.sin(t * 10) * 0.6, chomp, lunge, round: ease(GULP, FADE_OUT) });
      this.dog.root.position.y = -r * 0.7;
      // The Earth spins, then gets sucked into her mouth
      this.earth.rotation.y += dt * 0.5;
      const g = ease(CHOMP + 0.4, GULP);
      const mouth = new THREE.Vector3(x + lunge + r * 1.6, r * 0.25, 0);
      this.earthPart.position.copy(mouth).multiplyScalar(g);
      this.earthPart.scale.setScalar(Math.max(0.001, 1 - g));
      if (g >= 1 && this.earthPart.visible) { this.earthPart.visible = false; this.burst(mouth, r); }
      const dist = 34 + r * 3.6;
      this.camera.position.set(-r * 0.6, dist * 0.18, dist);
      this.camera.lookAt(-r * 0.6, 0, 0);
      this.fadeTo(1 - ease(0, 0.5) + ease(FADE_OUT, SWITCH));
    } else {
      // ---- shot two: a perfectly round Pepper in orbit round the sun ----
      if (!this.sunPart.visible) { this.sunPart.visible = true; this.earthPart.visible = false; for (const b of this.bits) this.scene.remove(b.m); this.bits = []; }
      const a = (t - SWITCH) * 0.42 + 1.4, R = 30;
      this.dog.pose({ x: Math.cos(a) * R, y: Math.sin(a) * R, heading: a + Math.PI / 2, r: 3.4, fat: 1, moving: 0, gait: 0, wag: Math.sin(t * 8) * 0.5, chomp: 0, lunge: 0, round: 1 });
      this.dog.root.position.y = -3;
      for (const p of this.planets) { p.a += dt * p.w * 0.42; p.m.position.set(Math.cos(p.a) * p.R, 0, Math.sin(p.a) * p.R); }
      // Drift in a little closer
      const k = ease(SWITCH, SWITCH + 6);
      this.camera.position.set(0, 40 - 12 * k, 82 - 18 * k);
      this.camera.lookAt(0, -3, 0);
      this.fadeTo(1 - ease(SWITCH, FADE_IN));
    }

    // Crumbs of planet flying off
    for (const b of this.bits) {
      b.m.position.addScaledVector(b.v, dt);
      b.m.scale.multiplyScalar(Math.exp(-dt * 1.6));
    }
    this.camera.updateProjectionMatrix();
  }

  private fadeTo(o: number) {
    (this.fade.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.max(0, o));
    this.fade.visible = o > 0.001;
  }

  private burst(at: THREE.Vector3, r: number) {
    const colors = [PAL.avocado, '#86b9d6', PAL.white, '#f1e2b8'];
    for (let i = 0; i < 26; i++) {
      const m = ball(r * rand(0.04, 0.09), colors[i % colors.length]);
      m.position.copy(at);
      const v = new THREE.Vector3(rand(-0.2, 1), rand(-0.8, 0.8), rand(-0.8, 0.8)).normalize().multiplyScalar(r * rand(1.5, 4));
      this.scene.add(m);
      this.bits.push({ m, v });
    }
  }
}
