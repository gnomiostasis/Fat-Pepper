// The neighborhood around Pepper's house, laid out fresh each run.
// Built like a corner of the market town rather than a grid: a main road winding across
// the map, a crescent looping off it round a little park, and side streets curving away
// to cul-de-sacs. Every house faces its street, with a front yard, a driveway and a
// fenced backyard that opens onto the green behind, and footpaths between the houses
// every few lots so no backyard or green can ever box Pepper in.

import { PAL } from '../art/palette';
import type { Box, Building, FurnitureSpot, Level, Pt, Seg } from './level';
import { disc, nearLine, smooth, strip, wander } from './town';

export const HOOD_W = 24000, HOOD_H = 19000;
const W = HOOD_W, H = HOOD_H;
const ROAD = 700;
const WALK = 180;
/** A lot's frontage along the street, and its depth back from the sidewalk. */
const LOT_W = 1500, LOT_D = 1900;
const SETBACK = 450;
const FENCE_T = 8;
/** Open green kept behind every backyard, wide enough for Pepper until she can eat the houses. */
const GREEN = 400;
/** The gap left for a footpath between houses every few lots. */
const PATH_GAP = 1400;
const CUL_R = 900;

const WALLS = [PAL.pink, PAL.sky, PAL.mustard, PAL.cream, PAL.tealLight, PAL.white];
const ROOFS = [PAL.rust, PAL.woodDark, PAL.navy, PAL.tealDark, PAL.grey];

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const deg = (rad: number) => (rad * 180) / Math.PI;

interface Road { pts: Pt[]; cul?: Pt }
/** A lot's own frame: its centre, `u` along the street and `v` pointing away from it. */
interface Lot { c: Pt; u: Pt; v: Pt }

/** A point given in a lot's frame, in map coordinates. */
const at = (l: Lot, u: number, v: number): Pt => [l.c[0] + l.u[0] * u + l.v[0] * v, l.c[1] + l.u[1] * u + l.v[1] * v];
/** A rectangle in a lot's frame, from u0,v0 to u1,v1. */
const quad = (l: Lot, u0: number, v0: number, u1: number, v1: number): Pt[] => [at(l, u0, v0), at(l, u1, v0), at(l, u1, v1), at(l, u0, v1)];

/** Do two convex polygons overlap? (Separating axis test.) */
function overlap(a: Pt[], b: Pt[]) {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % poly.length], nx = y0 - y1, ny = x1 - x0;
      let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
      for (const [x, y] of a) { const d = x * nx + y * ny; amin = Math.min(amin, d); amax = Math.max(amax, d); }
      for (const [x, y] of b) { const d = x * nx + y * ny; bmin = Math.min(bmin, d); bmax = Math.max(bmax, d); }
      if (amax <= bmin || bmax <= amin) return false;
    }
  }
  return true;
}

export interface Neighborhood {
  level: Level;
  /** Where Pepper's house goes: add this to the house's own coordinates. */
  homeAt: Pt;
  /** Where the main road leaves the neighborhood, on its west and east edges. */
  west: Pt;
  east: Pt;
}

/**
 * The neighborhood, with an empty lot facing the main road for Pepper's own house, whose outline (in the
 * house's own coordinates, front door to the south) is `home`.
 */
export function buildNeighborhood(home: Box): Neighborhood {
  // ---- streets ----
  const roads: Road[] = [];
  const midY = H * rand(0.5, 0.56), homeX = W * rand(0.38, 0.44), homeY = midY + rand(-600, 600);
  // The main road runs straight past Pepper's house, so it can sit square to the street
  const main = smooth([[0, midY + rand(-1200, 1200)], [W * 0.18, midY + rand(-1300, 1300)], [homeX - 2600, homeY], [homeX + 2600, homeY], [W * 0.72, midY + rand(-1300, 1300)], [W, midY + rand(-1200, 1200)]], 400);
  roads.push({ pts: main });
  const mainY = (x: number) => main.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b))[1];
  // A crescent looping north off the main road and back
  const xa = W * rand(0.15, 0.19), xb = W * rand(0.81, 0.85), top = H * rand(0.195, 0.21);
  roads.push({ pts: smooth([[xa, mainY(xa)], [xa + rand(-600, 600), (mainY(xa) + top) / 2], [W * 0.32, top], [W * 0.5, top + rand(-500, 300)], [W * 0.68, top], [xb + rand(-600, 600), (mainY(xb) + top) / 2], [xb, mainY(xb)]], 400) });
  // Side streets curving south to cul-de-sacs
  for (const fx of [rand(0.17, 0.22), rand(0.47, 0.53), rand(0.78, 0.83)]) {
    const x0 = W * fx, end: Pt = [x0 + rand(-1500, 1500), H * rand(0.76, 0.78)];
    roads.push({ pts: smooth(wander([x0, mainY(x0)], end, 3, 1400), 400), cul: end });
  }
  const halfRoad = ROAD / 2 + WALK;
  const roadDist = (x: number, y: number, skip?: Road) => {
    let best = Infinity;
    for (const rd of roads) if (rd !== skip) {
      best = Math.min(best, nearLine(x, y, rd.pts).d);
      if (rd.cul) best = Math.min(best, Math.hypot(x - rd.cul[0], y - rd.cul[1]) - (CUL_R + WALK - halfRoad));
    }
    return best;
  };

  // ---- the park in the crescent, with a pond ----
  const parkC: Pt = [W * 0.62 + rand(-1000, 1000), (top + mainY(W * 0.62)) / 2];
  const pondR = rand(550, 750);
  const pond = disc(parkC[0], parkC[1], pondR, 20);

  const inside = (p: Pt, m: number) => p[0] > m && p[1] > m && p[0] < W - m && p[1] < H - m;

  // ---- lots along every street ----
  const lots: { lot: Lot; poly: Pt[]; road: Road; first: boolean; w: number; home?: boolean }[] = [];
  const taken: Pt[][] = [];
  // Pepper's own lot comes first: square to the road, a little wider than the rest
  const HOME_W = home.w + 900;
  const homeLot: Lot = { c: [homeX, homeY - ROAD / 2 - WALK - LOT_D / 2], u: [1, 0], v: [0, -1] };
  taken.push(quad(homeLot, -HOME_W / 2, -LOT_D / 2, HOME_W / 2, LOT_D / 2 + GREEN));
  lots.push({ lot: homeLot, poly: quad(homeLot, -HOME_W / 2, -LOT_D / 2, HOME_W / 2, LOT_D / 2), road: roads[0], first: true, w: HOME_W, home: true });
  const tryLot = (lot: Lot, road: Road) => {
    const poly = quad(lot, -LOT_W / 2, -LOT_D / 2, LOT_W / 2, LOT_D / 2);
    // Kept clear of the sidewalks, the map's edge, the pond and every other lot, with green behind it
    const back = quad(lot, -LOT_W * 0.47, -LOT_D / 2 + 40, LOT_W * 0.47, LOT_D / 2 + GREEN);
    if (!back.every((p) => inside(p, 500))) return false;
    if (poly.some(([x, y]) => roadDist(x, y, road) < halfRoad + 40) || roadDist(lot.c[0], lot.c[1], road) < halfRoad + LOT_D / 2 + GREEN * 2) return false;
    if (poly.some(([x, y]) => nearLine(x, y, road.pts).d < halfRoad - 60) || nearLine(lot.c[0], lot.c[1], road.pts).d < halfRoad + LOT_D * 0.4) return false;
    if (Math.hypot(lot.c[0] - parkC[0], lot.c[1] - parkC[1]) < pondR + LOT_D / 2 + 800) return false;
    if (taken.some((t) => overlap(t, back))) return false;
    taken.push(back);
    return poly;
  };

  for (const road of roads) {
    const pts = road.pts;
    for (const side of [-1, 1]) {
      let along = 0, next = rand(300, 900), run = 0, runLen = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay) || 1;
        while (next < along + len) {
          const t = (next - along) / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
          const tx = (bx - ax) / len, ty = (by - ay) / len, nx = -ty * side, ny = tx * side;
          const off = halfRoad + LOT_D / 2;
          const lot: Lot = { c: [x + nx * off, y + ny * off], u: [tx * side, ty * side], v: [nx, ny] };
          const poly = tryLot(lot, road);
          if (poly) {
            lots.push({ lot, poly, road, first: run === 0, w: LOT_W });
            next += LOT_W;
            // A footpath between the houses every few lots, so there's always a way round the back
            if (++run >= runLen) { run = 0; runLen = 3 + Math.floor(Math.random() * 3); next += PATH_GAP; }
          } else {
            next += 150;
            run = 0;
          }
        }
        along += len;
      }
    }
    // A ring of houses round the cul-de-sac, facing in
    if (road.cul) {
      const [cx, cy] = road.cul, a0 = rand(0, Math.PI * 2);
      for (let k = 0; k < 5; k++) {
        const a = a0 + (k / 5) * Math.PI * 2, vx = Math.cos(a), vy = Math.sin(a), off = CUL_R + WALK + LOT_D / 2;
        const lot: Lot = { c: [cx + vx * off, cy + vy * off], u: [-vy, vx], v: [vx, vy] };
        const poly = tryLot(lot, road);
        if (poly) lots.push({ lot, poly, road, first: true, w: LOT_W });
      }
    }
  }

  // ---- houses, yards, driveways and fences ----
  const buildings: Building[] = [];
  const walls: Seg[] = [];
  const furniture: FurnitureSpot[] = [];
  const rooms: Level['rooms'] = [];
  const driveways: Pt[][] = [];
  let spawn = { x: W / 2, y: H / 2 }, homeAt: Pt = [0, 0];
  const box = (p: Pt, half: number) => ({ x: p[0] - half, y: p[1] - half, w: half * 2, h: half * 2 });

  for (const l of lots) {
    const { lot } = l;
    const hw = l.home ? home.w : rand(820, 980), hd = l.home ? home.h : rand(680, 800);
    const front = -LOT_D / 2 + SETBACK, back = front + hd;
    if (l.home) {
      // Pepper's own house goes here, roof off, so the lot is left empty apart from a driveway up to the garage
      homeAt = [lot.c[0] - hw / 2 - home.x, lot.c[1] - front - (home.y + home.h)];
      driveways.push(quad(lot, hw / 2 - 270, -LOT_D / 2, hw / 2 - 20, front));
    } else {
      buildings.push({ poly: quad(lot, -hw / 2, front, hw / 2, back), height: rand(240, 300), wall: pick(WALLS), roof: pick(ROOFS) });
      // Driveway from the garage end of the house to the sidewalk, sometimes with a car on it
      driveways.push(quad(lot, hw / 2 - 320, -LOT_D / 2, hw / 2 - 20, front));
      const dc = at(lot, hw / 2 - 170, (-LOT_D / 2 + front) / 2);
      if (Math.random() < 0.55) furniture.push({ id: 'car', x: dc[0], y: dc[1], rot: deg(Math.atan2(lot.v[1], lot.v[0])) });
    }

    // Side fences round the backyard, stopping short of the house so there's a way through
    walls.push({ a: at(lot, l.w / 2, back + 120), b: at(lot, l.w / 2, LOT_D / 2), t: FENCE_T });
    if (l.first) walls.push({ a: at(lot, -l.w / 2, back + 120), b: at(lot, -l.w / 2, LOT_D / 2), t: FENCE_T });

    // Front yard and backyard, each with their own kind of clutter, and a tree or two
    rooms.push({ box: box(at(lot, 0, (-LOT_D / 2 + front) / 2), 200), extras: { gnome: 1, flamingo: Math.random() < 0.4 ? 2 : 0, mailbox: 1, newspaper: 1 } });
    rooms.push({ box: box(at(lot, 0, (back + LOT_D / 2) / 2), 300), extras: { bbq: Math.random() < 0.5 ? 1 : 0, lawnchair: 2, kiddiepool: Math.random() < 0.3 ? 1 : 0, doghouse: Math.random() < 0.3 ? 1 : 0, bike: 1, frisbee: 2 } });
    // Trees stay off the gaps between houses, so they can't close one off
    const tree = at(lot, (Math.random() < 0.5 ? -1 : 1) * rand(250, 420), LOT_D / 2 - 240);
    furniture.push({ id: 'tree', x: tree[0], y: tree[1], rot: 0 });
    if (Math.random() < 0.5) {
      const t2 = at(lot, rand(-hw / 2 + 260, -120), -LOT_D / 2 + 215);
      furniture.push({ id: 'tree', x: t2[0], y: t2[1], rot: 0 });
    }

    // Pepper comes out of the dog door on the side of her house, by the driveway
    if (l.home) { const s = at(lot, hw / 2 + 90, (front + back) / 2 + hd * 0.1); spawn = { x: s[0], y: s[1] }; }
  }

  // ---- the park: trees round the pond, and benches ----
  for (let i = 0; i < 14; i++) {
    const a = rand(0, Math.PI * 2), d = rand(pondR + 500, pondR + 2600), x = parkC[0] + Math.cos(a) * d, y = parkC[1] + Math.sin(a) * d;
    if (roadDist(x, y) < halfRoad + 400 || taken.some((t) => overlap(t, disc(x, y, 300, 6)))) continue;
    if (furniture.some((f) => f.id === 'tree' && Math.hypot(f.x - x, f.y - y) < 800)) continue;
    furniture.push({ id: 'tree', x, y, rot: 0 });
  }
  rooms.push({ box: box(parkC, pondR + 1800), extras: { bench: 5, bush: 8, ball: 4, frisbee: 3, sandwich: 3 } });

  // ---- paint, and where loose things and the dog catcher can turn up ----
  const marks: Level['marks'] = [];
  const catcherSpawns: Pt[] = [];
  for (const road of roads) {
    let along = 0, next = 300, nextSpawn = 600;
    for (let i = 0; i < road.pts.length - 1; i++) {
      const [ax, ay] = road.pts[i], [bx, by] = road.pts[i + 1], len = Math.hypot(bx - ax, by - ay) || 1;
      while (next < along + len) {
        const t = (next - along) / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        // A dash down the middle, but not across a junction
        if (roadDist(x, y, road) > halfRoad + 300 && (!road.cul || Math.hypot(x - road.cul[0], y - road.cul[1]) > CUL_R + 300)) {
          marks.push({ box: { x: x - 150, y: y - 7, w: 300, h: 14 }, color: PAL.yellow, rot: deg(Math.atan2(by - ay, bx - ax)) });
        }
        next += 600;
      }
      while (nextSpawn < along + len) {
        const t = (nextSpawn - along) / len, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        if (x > 300 && y > 300 && x < W - 300 && y < H - 300) {
          catcherSpawns.push([x, y]);
          rooms.push({ box: box([x, y], 500), extras: {} });
        }
        nextSpawn += 1500;
      }
      along += len;
    }
  }

  const culs = roads.flatMap((rd) => (rd.cul ? [rd.cul] : []));
  const floors = [
    { poly: pond, texture: 'floor-water' },
    ...roads.flatMap((rd) => strip(rd.pts, ROAD + WALK * 2, !!rd.cul)).map((poly) => ({ poly, texture: 'floor-sidewalk' })),
    ...culs.map(([x, y]) => ({ poly: disc(x, y, CUL_R + WALK, 20), texture: 'floor-sidewalk' })),
    ...driveways.map((poly) => ({ poly, texture: 'floor-sidewalk' })),
    ...roads.flatMap((rd) => strip(rd.pts, ROAD, !!rd.cul)).map((poly) => ({ poly, texture: 'floor-asphalt' })),
    ...culs.map(([x, y]) => ({ poly: disc(x, y, CUL_R, 20), texture: 'floor-asphalt' })),
  ];

  const level: Level = {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls, wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings,
    floors, marks, furniture, decals: [], rooms, doorways: [],
    water: [pond],
    paths: roads.map((rd) => ({ pts: rd.pts, w: ROAD })),
    wallThickness: FENCE_T, spawn, catcherSpawns,
    scatter: {
      ball: 40, frisbee: 30, newspaper: 30, sock: 30, shoe: 30, sandwich: 40, bone: 40, can: 30, donut: 40,
      book: 20, teddy: 20, slipper: 20, plant: 30, cushion: 20, box: 30, basket: 20, stool: 15,
      gnome: 30, hydrant: 20, flamingo: 20, mailbox: 15, trashcan: 50, bush: 90, lawnchair: 30, bbq: 20,
      doghouse: 15, bike: 30, kiddiepool: 15, bench: 20,
    },
    piles: [
      { id: 'cookie', piles: 20, each: 10, spread: 90 },
      { id: 'donut', piles: 12, each: 6, spread: 80 },
      { id: 'sandwich', piles: 10, each: 5, spread: 90 },
    ],
  };
  return { level, homeAt, west: main[0], east: main[main.length - 1] };
}
