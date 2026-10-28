import { PAL } from './palette';

export type Pt = [number, number];

export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): Pt[] {
  const pts: Pt[] = [], c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}
export const circ = (cx: number, cy: number, r: number) => ell(cx, cy, r, r);
export const rect = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];

/** Rounded rectangle as a polygon. */
export function rrect(x: number, y: number, w: number, h: number, r: number): Pt[] {
  r = Math.min(r, w / 2, h / 2);
  const pts: Pt[] = [];
  const corner = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i++) { const a = a0 + (i / 6) * (Math.PI / 2); pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

export interface FillOpts {
  /** Draw the ink outline (default true). */
  outline?: boolean;
  /** Skip the off-register offset, for small details like eyes and spots. */
  plain?: boolean;
}

interface Frame { x: number; y: number; a: number; s: number }

/**
 * Draws shapes in the 60s cartoon style: flat color printed slightly off the ink line.
 * Coordinates are "local units"; `k` is canvas pixels per local unit.
 */
export class Pen {
  private st: Frame[];

  constructor(public ctx: CanvasRenderingContext2D, public k: number, ox: number, oy: number) {
    this.st = [{ x: ox, y: oy, a: 0, s: k }];
  }

  private get top() { return this.st[this.st.length - 1]; }

  push(x: number, y: number, a = 0, s = 1) {
    const t = this.top, c = Math.cos(t.a), si = Math.sin(t.a);
    this.st.push({ x: t.x + (x * c - y * si) * t.s, y: t.y + (x * si + y * c) * t.s, a: t.a + a, s: t.s * s });
  }

  pop() { this.st.pop(); }

  private tf(pts: Pt[]): Pt[] {
    const t = this.top, c = Math.cos(t.a), si = Math.sin(t.a);
    return pts.map(([x, y]) => [t.x + (x * c - y * si) * t.s, t.y + (x * si + y * c) * t.s]);
  }

  private trace(pts: Pt[], closed = true) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]);
    if (closed) c.closePath();
  }

  fill(local: Pt[], color: string, o: FillOpts = {}) {
    const c = this.ctx, pts = this.tf(local);
    if (o.plain) {
      this.trace(pts); c.fillStyle = color; c.fill();
    } else {
      const d = 0.9 * this.k;
      this.trace(pts.map(([x, y]) => [x + d, y - d * 0.6])); c.fillStyle = color; c.fill();
    }
    if (o.outline !== false && !o.plain) {
      this.trace(pts); c.strokeStyle = PAL.ink; c.lineWidth = 1.1 * this.k; c.lineJoin = 'round'; c.stroke();
    }
  }

  line(local: Pt[], color: string, w: number, closed = false) {
    const c = this.ctx;
    this.trace(this.tf(local), closed);
    c.strokeStyle = color; c.lineWidth = w * this.top.s; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
  }

  /** Soft flat shadow, offset down-right. */
  shadow(local: Pt[]) {
    const c = this.ctx, d = 1.6 * this.k, pts = this.tf(local).map(([x, y]) => [x + d, y + d * 1.3] as Pt);
    this.trace(pts); c.fillStyle = 'rgba(35,26,20,0.22)'; c.fill();
  }
}
