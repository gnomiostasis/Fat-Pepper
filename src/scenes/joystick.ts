import Phaser from 'phaser';

/**
 * A floating thumbstick for phones and tablets: put a finger down anywhere and drag.
 * The stick appears where the finger lands, and its base trails the finger if it drags
 * past the rim, so turning around never needs a long swipe back.
 */
export class Joystick {
  /** Drag direction on screen, length 0..1 (0 inside the dead zone). */
  readonly vec = new Phaser.Math.Vector2();
  private id = -1;
  private bx = 0;
  private by = 0;
  private kx = 0;
  private ky = 0;
  private alpha = 0;
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly scene: Phaser.Scene;
  private enabled = () => true;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.g = scene.add.graphics().setDepth(1000).setScrollFactor(0);
    const inp = scene.input;
    inp.on('pointerdown', this.onDown, this);
    inp.on('pointermove', this.onMove, this);
    inp.on('pointerup', this.onUp, this);
    inp.on('pointerupoutside', this.onUp, this);
    inp.on('gameout', this.release, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      inp.off('pointerdown', this.onDown, this);
      inp.off('pointermove', this.onMove, this);
      inp.off('pointerup', this.onUp, this);
      inp.off('pointerupoutside', this.onUp, this);
      inp.off('gameout', this.release, this);
    });
  }

  /** Only grab touches while this says so (playing, not picking a powerup). */
  setEnabled(fn: () => boolean) { this.enabled = fn; }

  get active() { return this.id >= 0; }

  /** Stick size in screen pixels: bigger on tablets, never tiny on phones. */
  private get radius() {
    const { width, height } = this.scene.scale;
    return Phaser.Math.Clamp(Math.min(width, height) * 0.11, 44, 80);
  }

  private onDown(p: Phaser.Input.Pointer) {
    if (this.id >= 0 || !isTouch(p) || !this.enabled()) return;
    this.id = p.id;
    this.bx = this.kx = p.x;
    this.by = this.ky = p.y;
    this.vec.set(0, 0);
  }

  private onMove(p: Phaser.Input.Pointer) {
    if (p.id !== this.id) return;
    const R = this.radius;
    let dx = p.x - this.bx, dy = p.y - this.by;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // Drag the base along behind the finger.
      this.bx = p.x - (dx / d) * R;
      this.by = p.y - (dy / d) * R;
      dx = p.x - this.bx; dy = p.y - this.by;
    }
    this.kx = p.x; this.ky = p.y;
    const m = Math.min(1, Math.hypot(dx, dy) / R), dead = 0.12;
    if (m < dead) { this.vec.set(0, 0); return; }
    const s = (m - dead) / (1 - dead) / (m || 1);
    this.vec.set((dx / R) * s, (dy / R) * s);
  }

  private onUp(p: Phaser.Input.Pointer) {
    if (p.id === this.id) this.release();
  }

  release() {
    this.id = -1;
    this.vec.set(0, 0);
  }

  /** Call every frame to draw the stick and fade it in and out. */
  draw(dt: number) {
    if (this.id >= 0 && !this.enabled()) this.release();
    this.alpha += ((this.id >= 0 ? 1 : 0) - this.alpha) * (1 - Math.exp(-dt * 14));
    const g = this.g.clear();
    if (this.alpha < 0.02) return;
    const R = this.radius, a = this.alpha;
    g.fillStyle(0x345c32, 0.18 * a).fillCircle(this.bx, this.by + 3, R);
    g.fillStyle(0xfff6e3, 0.35 * a).fillCircle(this.bx, this.by, R);
    g.lineStyle(3, 0xfff6e3, 0.7 * a).strokeCircle(this.bx, this.by, R);
    g.fillStyle(0x345c32, 0.25 * a).fillCircle(this.kx, this.ky + 3, R * 0.45);
    g.fillStyle(0xfff6e3, 0.9 * a).fillCircle(this.kx, this.ky, R * 0.45);
  }
}

/** Is this a finger or a pen rather than a mouse? */
export function isTouch(p: Phaser.Input.Pointer) {
  const e = p.event as PointerEvent | TouchEvent | MouseEvent | undefined;
  if (p.wasTouch) return true;
  return !!e && 'pointerType' in e && (e.pointerType === 'touch' || e.pointerType === 'pen');
}

/** Does this device have a touch screen? Used to word the instructions. */
export const touchDevice = () =>
  typeof window !== 'undefined' && (navigator.maxTouchPoints > 0 || 'ontouchstart' in window);
