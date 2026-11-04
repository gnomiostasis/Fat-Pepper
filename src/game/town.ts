// Phase 5 level: the market town around Pepper's neighborhood.
// Laid out fresh each run like an old English town rather than a grid: a high street
// curving across the map through the market square, a ring road round the middle, roads
// winding out to the edges with lanes and cul-de-sacs off them, a river with bridges, a
// railway with its station, a park with a pond, a fairground, woods, and whole
// neighborhoods out on the edge of town. Pepper walks in from the west along the high street.

import { PAL } from '../art/palette';
import type { FurnitureSpot, Level, Pt } from './level';

/** How wide and tall the town is, in cm. */
export const TOWN_SIZE = 102400;
const W = TOWN_SIZE, H = TOWN_SIZE;
/** Sidewalk on each side of a road. */
const WALK = 350;

interface Road { pts: Pt[]; w: number; kind: 'high' | 'ring' | 'road' | 'lane' }
interface Spot { x: number; y: number; rad: number }

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const deg = (rad: number) => (rad * 180) / Math.PI;

/** A smooth curve through the control points (Catmull-Rom), sampled about every `step` cm. */
function smooth(ctrl: Pt[], step = 1200, closed = false): Pt[] {
  const n = ctrl.length, out: Pt[] = [];
  const at = (i: number) => (closed ? ctrl[(i + n) % n] : ctrl[Math.max(0, Math.min(n - 1, i))]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const k = Math.max(1, Math.round(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step));
    for (let j = 0; j < k; j++) {
      const t = j / k, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(closed ? out[0] : ctrl[n - 1]);
  return out;
}

/** Control points from a to b, pushed sideways at random so the road wanders. */
function wander(a: Pt, b: Pt, n: number, amp: number): Pt[] {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), nx = -dy / len, ny = dx / len;
  const pts: Pt[] = [a];
  for (let i = 1; i < n; i++) {
    const t = i / n, o = rand(-amp, amp);
    pts.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
  }
  pts.push(b);
  return pts;
}

/** Distance from x,y to a polyline, and the direction of the piece of it that's closest. */
function nearLine(x: number, y: number, pts: Pt[]) {
  let best = Infinity, ang = 0, along = 0, total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    const d = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (d < best) { best = d; ang = Math.atan2(dy, dx); along = total + Math.sqrt(l2) * t; }
    total += Math.sqrt(l2);
  }
  return { d: best, ang, along };
}

function disc(x: number, y: number, r: number, n = 16): Pt[] {
  return Array.from({ length: n }, (_, i): Pt => [x + Math.cos((i / n) * Math.PI * 2) * r, y + Math.sin((i / n) * Math.PI * 2) * r]);
}

/** A road drawn as one quad per piece, with a round patch at every bend so the joins don't show. */
function strip(pts: Pt[], w: number, caps = false): Pt[][] {
  const polys: Pt[][] = [], h = w / 2;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * h, ny = ((bx - ax) / len) * h;
    polys.push([[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]]);
    if (i > 0 || caps) polys.push(disc(ax, ay, h, 10));
  }
  if (caps) polys.push(disc(pts[pts.length - 1][0], pts[pts.length - 1][1], h, 10));
  return polys;
}

/** The river as one outline: down its left bank and back up its right. */
function ribbon(pts: Pt[], w: number): Pt[] {
  const left: Pt[] = [], right: Pt[] = [];
  pts.forEach(([x, y], i) => {
    const [px, py] = pts[Math.max(0, i - 1)], [qx, qy] = pts[Math.min(pts.length - 1, i + 1)];
    const len = Math.hypot(qx - px, qy - py) || 1, nx = (-(qy - py) / len) * (w / 2), ny = ((qx - px) / len) * (w / 2);
    left.push([x + nx, y + ny]); right.push([x - nx, y - ny]);
  });
  return [...left, ...right.reverse()];
}

export function buildTown(): Level {
  // The middle of town, a little west of centre so the river runs through its east side.
  const C: Pt = [W * rand(0.4, 0.46), H * rand(0.45, 0.55)];
  const R = 20000;
  const fromC = (x: number, y: number) => Math.hypot(x - C[0], y - C[1]);

  // ---- roads ----
  const roads: Road[] = [];
  const hy = C[1];
  roads.push({
    kind: 'high', w: 1800,
    pts: smooth([[-1500, hy + rand(-6000, 6000)], [W * 0.18, hy + rand(-5000, 5000)], C, [W * 0.68, hy + rand(-6000, 6000)], [W + 1500, hy + rand(-8000, 8000)]], 1000),
  });
  const ringCtrl = Array.from({ length: 14 }, (_, i): Pt => {
    const a = (i / 14) * Math.PI * 2, r = R + rand(-2500, 2500);
    return [C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r];
  });
  roads.push({ kind: 'ring', w: 1400, pts: smooth(ringCtrl, 1000, true) });
  // Roads out to the edges, avoiding the high street's two directions
  for (const base of [-Math.PI * 0.75, -Math.PI / 2, -Math.PI * 0.25, Math.PI * 0.25, Math.PI / 2, Math.PI * 0.75]) {
    const a = base + rand(-0.2, 0.2);
    const start: Pt = [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R];
    const far = 90000, end: Pt = [C[0] + Math.cos(a) * far, C[1] + Math.sin(a) * far];
    roads.push({ kind: 'road', w: 1400, pts: smooth(wander(start, end, 5, 4000), 1000) });
  }
  // Side streets inside the ring road, out from the market square
  for (const base of [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75, -Math.PI / 2, Math.PI / 2]) {
    const a = base + rand(-0.15, 0.15);
    const r0 = base === -Math.PI / 2 ? 7600 : 4400;
    const start: Pt = [C[0] + Math.cos(a) * r0, C[1] + Math.sin(a) * r0], end: Pt = [C[0] + Math.cos(a) * R, C[1] + Math.sin(a) * R];
    roads.push({ kind: 'road', w: 1100, pts: smooth(wander(start, end, 3, 1500), 900) });
  }
  const inMap = (x: number, y: number, m = 0) => x > m && y > m && x < W - m && y < H - m;
  const roadDist = (x: number, y: number, skip?: Road) => {
    let best = Infinity;
    for (const rd of roads) if (rd !== skip) best = Math.min(best, nearLine(x, y, rd.pts).d - rd.w / 2);
    return best;
  };
  // Lanes off the bigger roads, each ending in a cul-de-sac
  const culs: Pt[] = [];
  for (let tries = 0, made = 0; tries < 200 && made < 18; tries++) {
    const from = pick(roads.slice(1));
    const p = pick(from.pts.slice(3, -3));
    if (!p || !inMap(p[0], p[1], 6000) || fromC(p[0], p[1]) < R * 0.8) continue;
    const { ang } = nearLine(p[0], p[1], from.pts);
    const side = Math.random() < 0.5 ? 1 : -1, a = ang + side * Math.PI / 2 + rand(-0.3, 0.3), len = rand(7000, 12000);
    const end: Pt = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len];
    const pts = smooth(wander(p, end, 2, 1500), 900);
    // Keep it clear of every other road, and of the one it starts from once it has left it
    if (!pts.slice(2).every(([x, y]) => inMap(x, y, 3000) && roadDist(x, y, from) > 2600)) continue;
    if (!pts.slice(6).every(([x, y]) => nearLine(x, y, from.pts).d > 3000)) continue;
    roads.push({ kind: 'lane', w: 1000, pts });
    culs.push(end);
    made++;
  }

  // ---- the river ----
  const rx = W * rand(0.6, 0.7);
  const river = smooth([[rx + rand(-4000, 4000), -3000], [rx + rand(-7000, 7000), H * 0.3], [rx + rand(-7000, 7000), H * 0.6], [rx + rand(-4000, 4000), H + 3000]], 1500);
  const RIVER_W = 2600;
  const riverPoly = ribbon(river, RIVER_W);
  const wet = (x: number, y: number, pad: number) => nearLine(x, y, river).d < RIVER_W / 2 + pad;

  // ---- what goes where ----
  const furniture: FurnitureSpot[] = [];
  const placed: Spot[] = [];
  const marks: Level['marks'] = [];
  const rooms: Level['rooms'] = [];
  const plazas: Pt[][] = [], ponds: Pt[][] = [];
  const free = (x: number, y: number, rad: number, roadPad = 150) =>
    inMap(x, y, rad + 300) && roadDist(x, y) > rad * 0.8 + roadPad && !wet(x, y, rad * 0.8 + 200)
    && placed.every((s) => Math.hypot(s.x - x, s.y - y) > s.rad * 0.85 + rad * 0.85 + 100);
  const size = (id: string) => ({ cottage: 850, cottage2: 850, cottage3: 850, shop: 1600, cafe: 1400, apartments: 2800, office: 2900, church: 2600, school: 3600, gasstation: 2200, watertower: 2400, playground: 1100, gazebo: 900, fountain: 700, tree: 450, hood: 5600, hoodrow: 5600, station: 1800, train: 1600, carousel: 1200, ferriswheel: 2400, bigtop: 2600, townhall: 3800, statue: 600 } as Record<string, number>)[id] ?? 1000;
  const put = (id: string, x: number, y: number, rot: number, rad = size(id) / 2, force = false) => {
    if (!force && !free(x, y, rad)) return false;
    furniture.push({ id, x, y, rot: ((Math.round(rot) % 360) + 360) % 360 });
    placed.push({ x, y, rad });
    return true;
  };
  /** Rotation that turns a building's front (its +z side) to face from x,y toward tx,ty. */
  const facing = (x: number, y: number, tx: number, ty: number) => deg(Math.atan2(-(tx - x), ty - y));

  // The market square in the middle, with the town hall on its north side
  plazas.push(disc(C[0], C[1], 4200, 24));
  placed.push({ x: C[0], y: C[1], rad: 3600 });
  put('townhall', C[0], C[1] - 4400, 0, 2300, true);
  put('fountain', C[0] - 2400, C[1] + 1900, 0, 400, true);
  put('statue', C[0] + 2400, C[1] + 1900, 0, 350, true);
  rooms.push({ box: { x: C[0] - 4000, y: C[1] - 1500, w: 8000, h: 5000 }, extras: { bench: 6, hotdog: 3, lamppost: 6 } });

  // The park with a pond, inside the ring road, wherever there's room for it
  const pondR = 2600;
  for (let tries = 0; tries < 40; tries++) {
    const pa = rand(0, Math.PI * 2), pd = rand(R * 0.4, R * 0.7), park: Pt = [C[0] + Math.cos(pa) * pd, C[1] + Math.sin(pa) * pd];
    if (roadDist(park[0], park[1]) < pondR + 1800 || wet(park[0], park[1], pondR + 1500)) continue;
    ponds.push(disc(park[0], park[1], pondR, 20));
    placed.push({ x: park[0], y: park[1], rad: pondR + 300 });
    put('gazebo', park[0] + pondR + 1300, park[1], 0);
    put('playground', park[0] - pondR - 1500, park[1] + 900, rand(0, 360));
    for (let i = 0; i < 16; i++) { const a = rand(0, Math.PI * 2), d = rand(pondR + 700, pondR + 3800); put('tree', park[0] + Math.cos(a) * d, park[1] + Math.sin(a) * d, 0); }
    rooms.push({ box: { x: park[0] - 6000, y: park[1] - 6000, w: 12000, h: 12000 }, extras: { bench: 6, statue: 1, icecream: 1 } });
    break;
  }

  // The railway: dead straight across the north or south of town, with its station
  const railY = Math.random() < 0.5 ? H * rand(0.12, 0.18) : H * rand(0.82, 0.88);
  const railFloor: Pt[] = [[0, railY - 450], [W, railY - 450], [W, railY + 450], [0, railY + 450]];
  for (const off of [-230, 230]) marks.push({ box: { x: 0, y: railY + off - 30, w: W, h: 60 }, color: '#8d8f96' });
  for (let x = 100; x < W; x += 320) marks.push({ box: { x, y: railY - 340, w: 110, h: 680 }, color: PAL.woodDark });
  placed.push(...Array.from({ length: Math.ceil(W / 1000) }, (_, i): Spot => ({ x: i * 1000 + 500, y: railY, rad: 500 })));
  const stationX = Math.max(8000, Math.min(W - 8000, C[0] + rand(-15000, 15000)));
  const stationY = railY + (railY < H / 2 ? 1500 : -1500);
  put('station', stationX, stationY, railY < H / 2 ? 180 : 0, 1000, true);
  for (let i = 0; i < 3; i++) {
    const x = rand(4000, W - 4000);
    if (roadDist(x, railY) > 1500) furniture.push({ id: 'train', x, y: railY, rot: 0 });
  }

  // The fairground, out past the ring road
  for (let tries = 0; tries < 60; tries++) {
    const a = rand(0, Math.PI * 2), d = rand(R + 9000, R + 20000), fx = C[0] + Math.cos(a) * d, fy = C[1] + Math.sin(a) * d;
    if (!inMap(fx, fy, 8000) || roadDist(fx, fy) < 6500 || wet(fx, fy, 7000) || Math.abs(fy - railY) < 7500) continue;
    plazas.push(disc(fx, fy, 5600, 24));
    put('ferriswheel', fx - 2400, fy - 2000, 0, 1500, true);
    put('bigtop', fx + 2400, fy - 1200, 0, 1400, true);
    put('carousel', fx - 1800, fy + 2600, 0, 700, true);
    put('carousel', fx + 2600, fy + 2900, 0, 700, true);
    rooms.push({ box: { x: fx - 5000, y: fy - 5000, w: 10000, h: 10000 }, extras: { hotdog: 5, icecream: 2, bench: 4, trashcan: 4 } });
    break;
  }

  // Whole neighborhoods, out on the edge of town where there's room for them
  for (let tries = 0, made = 0; tries < 2500 && made < 26; tries++) {
    const x = rand(4000, W - 4000), y = rand(4000, H - 4000);
    if (fromC(x, y) < R + 5000) continue;
    const near = roads.reduce((b, rd) => { const n = nearLine(x, y, rd.pts); return n.d - rd.w / 2 < b.d ? { d: n.d - rd.w / 2, ang: n.ang } : b; }, { d: Infinity, ang: 0 });
    if (near.d < 3400 || near.d > 9000) continue;
    if (put(Math.random() < 0.5 ? 'hood' : 'hoodrow', x, y, deg(near.ang), 3300)) made++;
  }

  // Buildings along every road, facing it: shops and offices in the middle, houses further out
  const downtown = ['shop', 'shop', 'cafe', 'cafe', 'apartments', 'apartments', 'office', 'church'];
  const suburb = () => {
    const t = Math.random();
    if (t < 0.03) return 'school';
    if (t < 0.07) return 'gasstation';
    if (t < 0.1) return 'playground';
    if (t < 0.12) return 'watertower';
    if (t < 0.16) return 'shop';
    return pick(['cottage', 'cottage2', 'cottage3']);
  };
  for (const rd of [...roads].sort((a, b) => (a.kind === 'lane' ? 1 : 0) - (b.kind === 'lane' ? 1 : 0))) {
    let along = 0, next = rand(200, 800);
    for (let i = 0; i < rd.pts.length - 1; i++) {
      const [ax, ay] = rd.pts[i], [bx, by] = rd.pts[i + 1], len = Math.hypot(bx - ax, by - ay);
      while (next < along + len) {
        const t = (next - along) / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const nx = -(by - ay) / len, ny = (bx - ax) / len, d = fromC(x, y);
        let gap = 600;
        for (const side of [-1, 1]) {
          const id = d < R - 3000 ? pick(downtown) : d < R + 14000 || rd.kind === 'lane' ? suburb() : Math.random() < 0.55 ? suburb() : '';
          if (!id) continue;
          const s = size(id), off = rd.w / 2 + WALK + s * 0.45 + 150;
          const px = x + nx * side * off, py = y + ny * side * off;
          if (put(id, px, py, facing(px, py, x, y), s / 2)) {
            gap = Math.max(gap, s);
            // A tree in some front gardens
            if (id.startsWith('cottage') && Math.random() < 0.5) {
              const tx = px + (bx - ax) / len * 750 - nx * side * 250, ty = py + (by - ay) / len * 750 - ny * side * 250;
              put('tree', tx, ty, 0);
            }
          }
        }
        next += gap + rand(100, 500);
      }
      along += len;
    }
    // Cars and bus stops along the way, and the odd lamppost
    for (let i = 0; i < rd.pts.length; i += 4) {
      const [x, y] = rd.pts[i];
      rooms.push({ box: { x: x - 1300, y: y - 1300, w: 2600, h: 2600 }, extras: {
        car: Math.random() < 0.6 ? 1 : 0, van: Math.random() < 0.1 ? 1 : 0, bus: rd.kind !== 'lane' && Math.random() < 0.08 ? 1 : 0,
        busstop: rd.kind !== 'lane' && Math.random() < 0.08 ? 1 : 0, lamppost: Math.random() < 0.5 ? 1 : 0,
      } });
    }
  }
  // A ring of houses round each cul-de-sac
  for (const [x, y] of culs) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rand(0, 0.5), px = x + Math.cos(a) * 2300, py = y + Math.sin(a) * 2300;
      put(pick(['cottage', 'cottage2', 'cottage3']), px, py, facing(px, py, x, y));
    }
  }

  // Woods in the open country between the roads
  for (let n = 0; n < 40; n++) {
    const cx = rand(3000, W - 3000), cy = rand(3000, H - 3000);
    if (fromC(cx, cy) < R * 0.7) continue;
    for (let i = 0; i < 10; i++) put('tree', cx + rand(-2600, 2600), cy + rand(-2600, 2600), 0);
  }
  rooms.push({ box: { x: 0, y: 0, w: W, h: H }, extras: {} });

  const entry = roads[0].pts.reduce((b, p) => (Math.abs(p[0] - 1500) < Math.abs(b[0] - 1500) ? p : b));
  const spawn = { x: 1500, y: entry[1] };
  const roadPolys = roads.flatMap((rd) => strip(rd.pts, rd.w, rd.kind === 'lane'));
  const walkPolys = roads.flatMap((rd) => strip(rd.pts, rd.w + WALK * 2, rd.kind === 'lane'));

  return {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls: [], wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings: [],
    floors: [
      { poly: riverPoly, texture: 'floor-water' },
      ...ponds.map((poly) => ({ poly, texture: 'floor-water' })),
      ...[...plazas, railFloor, ...walkPolys, ...culs.map(([x, y]) => disc(x, y, 1900, 16))].map((poly) => ({ poly, texture: 'floor-sidewalk' })),
      ...[...roadPolys, ...culs.map(([x, y]) => disc(x, y, 1500, 16))].map((poly) => ({ poly, texture: 'floor-asphalt' })),
    ],
    water: [riverPoly, ...ponds],
    paths: roads.map((rd) => ({ pts: rd.pts, w: rd.w })),
    tile: 4,
    marks, furniture, decals: [], rooms, doorways: [],
    wallThickness: 10, spawn,
    scatter: {
      hotdog: 20, lamppost: 60, bench: 50, trashcan: 70, hydrant: 40, bush: 220, mailbox: 40, bike: 40, statue: 6,
    },
    piles: [
      { id: 'trashcan', piles: 10, each: 6, spread: 900 },
      { id: 'bush', piles: 14, each: 6, spread: 1000 },
    ],
  };
}
