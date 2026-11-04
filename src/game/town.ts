// Phase 5 level: the town around Pepper's neighborhood.
// A grid of big blocks: downtown in the middle (town hall, shops, offices), then a
// ring of parks, schools and streets of houses, and whole neighborhoods further out.
// Pepper walks in from the west edge at about house size, eats her way up through
// buses, shops and churches, and finishes by gulping whole neighborhoods.

import { PAL } from '../art/palette';
import type { Box, FurnitureSpot, Level, Pt } from './level';

const BLOCK = 6000;
const ROAD = 1600;
const WALK = 400;
const PITCH = ROAD + WALK * 2 + BLOCK;
/** Blocks across and down. */
export const TOWN_N = 12;

const rect = (b: Box): Pt[] => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const rot = (): FurnitureSpot['rot'] => pick([0, 90, 180, 270] as const);

type BlockKind = 'downtown' | 'townhall' | 'park' | 'houses' | 'hood' | 'school' | 'gas';

export function buildTown(): Level {
  const W = TOWN_N * PITCH + ROAD, H = W;
  const roads: Box[] = [], sidewalks: Box[] = [], plazas: Box[] = [];
  const marks: Level['marks'] = [];
  const furniture: FurnitureSpot[] = [];
  const rooms: Level['rooms'] = [];
  const mid = Math.floor(TOWN_N / 2);

  // Avenues in a grid, with dashes down the middle
  for (let i = 0; i <= TOWN_N; i++) {
    roads.push({ x: i * PITCH, y: 0, w: ROAD, h: H }, { x: 0, y: i * PITCH, w: W, h: ROAD });
    for (let t = 0; t < W; t += 1500) {
      if (t % PITCH < ROAD + 200 || t % PITCH > PITCH - 700) continue;
      marks.push({ box: { x: i * PITCH + ROAD / 2 - 20, y: t, w: 40, h: 700 }, color: PAL.yellow });
      marks.push({ box: { x: t, y: i * PITCH + ROAD / 2 - 20, w: 700, h: 40 }, color: PAL.yellow });
    }
  }
  for (const r of roads) rooms.push({ box: r, extras: {} });

  // Downtown in the middle, neighborhoods out toward the edges. The west side, where Pepper
  // walks in, is streets of houses and parks, so there's plenty she can eat straight away.
  const kindAt = (bx: number, by: number): BlockKind => {
    const d = Math.max(Math.abs(bx - mid + 0.5), Math.abs(by - mid + 0.5));
    if (bx === mid && by === mid) return 'townhall';
    if (d < 1.5) return Math.random() < 0.8 ? 'downtown' : 'park';
    if (bx <= 1 && Math.abs(by - mid) <= 2) return Math.random() < 0.7 ? 'houses' : 'park';
    const t = Math.random();
    if (d < 3.5) return t < 0.25 ? 'downtown' : t < 0.35 ? 'park' : t < 0.43 ? 'school' : t < 0.5 ? 'gas' : t < 0.85 ? 'houses' : 'hood';
    return t < 0.45 ? 'hood' : t < 0.8 ? 'houses' : t < 0.9 ? 'park' : 'gas';
  };

  for (let by = 0; by < TOWN_N; by++) for (let bx = 0; bx < TOWN_N; bx++) {
    const x0 = bx * PITCH + ROAD, y0 = by * PITCH + ROAD, S = PITCH - ROAD;
    sidewalks.push(
      { x: x0, y: y0, w: S, h: WALK }, { x: x0, y: y0 + S - WALK, w: S, h: WALK },
      { x: x0, y: y0, w: WALK, h: S }, { x: x0 + S - WALK, y: y0, w: WALK, h: S },
    );
    rooms.push({ box: { x: x0, y: y0, w: S, h: WALK }, extras: { lamppost: 2, hydrant: 1, trashcan: 1 } });
    const b: Box = { x: x0 + WALK, y: y0 + WALK, w: BLOCK, h: BLOCK };
    const cx = b.x + BLOCK / 2, cy = b.y + BLOCK / 2;
    const put = (id: string, x: number, y: number, r = rot()) => furniture.push({ id, x, y, rot: r });
    const start = furniture.length;
    // Trees go wherever there's room, clear of whatever else is on the block
    const trees = (n: number, box: Box) => {
      for (let i = 0, tries = 0; i < n && tries < n * 10; tries++) {
        const x = rand(box.x + 300, box.x + box.w - 300), y = rand(box.y + 300, box.y + box.h - 300);
        if (furniture.slice(start).some((f) => Math.hypot(f.x - x, f.y - y) < (f.id === 'tree' ? 600 : 1500))) continue;
        put('tree', x, y, 0); i++;
      }
    };

    switch (kindAt(bx, by)) {
      case 'townhall':
        plazas.push(b);
        put('townhall', cx, cy - 900, 0);
        put('fountain', cx, cy + 1900, 0);
        rooms.push({ box: { x: b.x, y: cy + 1200, w: BLOCK, h: BLOCK / 2 - 1200 }, extras: { statue: 2, bench: 6, hotdog: 2, lamppost: 4 } });
        break;
      case 'downtown': {
        plazas.push(b);
        // Four lots, each with a shop, a café, apartments or an office tower
        for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const lx = b.x + qx * 3000 + 1500, ly = b.y + qy * 3000 + 1500;
          const id = pick(['shop', 'shop', 'cafe', 'apartments', 'office', 'church']);
          put(id, lx, ly, qy === 0 ? 180 : 0);
        }
        rooms.push({ box: b, extras: { bench: 2, hotdog: 1, lamppost: 2 } });
        break;
      }
      case 'park':
        put('fountain', cx, cy, 0);
        if (Math.random() < 0.6) put('gazebo', b.x + rand(1000, 2000), b.y + rand(1000, 2000), 0);
        if (Math.random() < 0.6) put('playground', b.x + BLOCK - 1300, b.y + BLOCK - 1200, rot());
        trees(14, b);
        rooms.push({ box: b, extras: { bench: 4, statue: Math.random() < 0.5 ? 1 : 0, icecream: Math.random() < 0.4 ? 1 : 0, bush: 8 } });
        break;
      case 'school':
        put('school', cx, cy - 600, rot());
        put('playground', cx + 1600, cy + 2100, 0);
        trees(4, { x: b.x, y: cy + 1400, w: BLOCK / 2, h: BLOCK / 2 - 1400 });
        rooms.push({ box: b, extras: { bus: 2, bike: 3 } });
        break;
      case 'gas':
        put('gasstation', cx - 900, cy - 900, 0);
        put(Math.random() < 0.5 ? 'watertower' : 'shop', cx + 1500, cy + 1500, rot());
        rooms.push({ box: b, extras: { car: 4, van: 1 } });
        break;
      case 'houses': {
        // A few streets' worth of houses, four by four, with a tree in most yards
        const houses = ['cottage', 'cottage2', 'cottage3'];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
          const lx = b.x + 750 + i * 1500, ly = b.y + 750 + j * 1500;
          put(pick(houses), lx + rand(-80, 80), ly + rand(-80, 80), rot());
          if (Math.random() < 0.6) put('tree', lx + pick([-600, 600]), ly + pick([-600, 600]), 0);
        }
        rooms.push({ box: b, extras: { car: 3, doghouse: 2, kiddiepool: 2, bbq: 2, bush: 6 } });
        break;
      }
      case 'hood':
        put(Math.random() < 0.5 ? 'hood' : 'hoodrow', cx, cy, rot());
        break;
    }
  }

  // Pepper comes up the middle avenue from the west, where her old neighborhood was
  const spawn = { x: 1500, y: mid * PITCH + ROAD / 2 };

  return {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls: [], wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings: [],
    floors: [
      ...plazas.map((b) => ({ poly: rect(b), texture: 'floor-sidewalk' })),
      ...sidewalks.map((b) => ({ poly: rect(b), texture: 'floor-sidewalk' })),
      ...roads.map((b) => ({ poly: rect(b), texture: 'floor-asphalt' })),
    ],
    tile: 4,
    marks, furniture, decals: [], rooms, doorways: [],
    wallThickness: 10, spawn,
    scatter: {
      car: 260, van: 60, bus: 30, icecream: 12, firetruck: 8, hotdog: 30, busstop: 40,
      lamppost: 80, bench: 60, trashcan: 80, hydrant: 40, bush: 160, mailbox: 40, bike: 40,
    },
    piles: [
      { id: 'trashcan', piles: 10, each: 6, spread: 900 },
      { id: 'bush', piles: 10, each: 6, spread: 1000 },
    ],
  };
}
