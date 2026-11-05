// The countryside around Pepper's town, 8 km across, laid out fresh each run. A patchwork of
// fields, rivers and lakes, a motorway and country lanes, and on them farms, forests, castles,
// villages and whole towns, for Pepper to eat until she can gulp down the biggest towns.

import { PAL } from '../art/palette';
import type { FurnitureSpot, Level, Pt } from './level';
import { nearLine, ribbon, smooth, strip, wander } from './town';

export const COUNTRY_SIZE = 800000;
const W = COUNTRY_SIZE, H = COUNTRY_SIZE;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export interface Country {
  level: Level;
  /** Where Pepper's town goes: add this to the town's own coordinates. */
  townAt: Pt;
  /** Where the motorway leaves the countryside, west and east, so the island's roads can carry it on. */
  west: Pt;
  east: Pt;
  /** The rivers, top to bottom, so the island can carry them on down to the sea. */
  rivers: Pt[][];
}

/**
 * The countryside, with room in the middle for Pepper's town (`town`, its size and where its road leaves
 * it, in its own coordinates). The motorway runs into the town from the west and on out of it to the east.
 */
export function buildCountry(town: { w: number; h: number; west: Pt; east: Pt }): Country {
  const townAt: Pt = [W / 2 - town.w / 2 + rand(-60000, 60000), H / 2 - town.h / 2 + rand(-60000, 60000)];
  /** How far x,y is from the town's square (0 inside it). */
  const fromTown = (x: number, y: number) => Math.hypot(
    Math.max(townAt[0] - x, 0, x - townAt[0] - town.w), Math.max(townAt[1] - y, 0, y - townAt[1] - town.h));
  const spawn = { x: townAt[0] + town.w / 2, y: townAt[1] + town.h / 2 };
  const furniture: FurnitureSpot[] = [];
  const placed: { x: number; y: number; rad: number; big: boolean }[] = [];

  // ---- water, kept out of town ----
  const RIVER_W = 9000;
  const rivers = [0, 1].map((i) => {
    let rv: Pt[] = [];
    for (let tries = 0; tries < 60; tries++) {
      const x0 = W * (i ? rand(0.62, 0.8) : rand(0.2, 0.38));
      rv = smooth(wander([x0, -20000], [x0 + rand(-120000, 120000), H + 20000], 7, 60000), 6000);
      if (rv.every(([x, y]) => fromTown(x, y) > RIVER_W / 2 + 15000)) break;
    }
    return rv;
  }).filter((rv) => rv.every(([x, y]) => fromTown(x, y) > RIVER_W / 2 + 15000));
  const lakes: Pt[][] = [];
  for (let tries = 0; tries < 40 && lakes.length < 5; tries++) {
    const x = rand(60000, W - 60000), y = rand(60000, H - 60000), r = rand(12000, 26000);
    if (fromTown(x, y) < r * 1.2 + 20000 || rivers.some((rv) => nearLine(x, y, rv).d < r + 15000)) continue;
    lakes.push(Array.from({ length: 18 }, (_, k): Pt => {
      const a = (k / 18) * Math.PI * 2, rr = r * rand(0.8, 1.15);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    }));
    placed.push({ x, y, rad: r * 1.1, big: false });
  }
  const wet = (x: number, y: number, pad: number) => rivers.some((rv) => nearLine(x, y, rv).d < RIVER_W / 2 + pad);

  const fits = (x: number, y: number, rad: number, big: boolean) =>
    x > rad + 8000 && y > rad + 8000 && x < W - rad - 8000 && y < H - rad - 8000 && !wet(x, y, rad * 0.8)
    && fromTown(x, y) > rad + (big ? 40000 : 12000)
    // Villages and towns keep at least Pepper's width apart until she can step over them, so they can't trap her.
    && placed.every((p) => Math.hypot(p.x - x, p.y - y) > (big && p.big ? p.rad + rad + 32000 : (p.rad + rad) * 0.9));
  const put = (id: string, rad: number, big: boolean, tries: number, near?: () => Pt) => {
    for (let i = 0; i < tries; i++) {
      const [x, y] = near ? near() : [rand(0, W), rand(0, H)];
      if (!fits(x, y, rad, big)) continue;
      furniture.push({ id, x, y, rot: big ? 0 : Math.round(rand(0, 360)) });
      placed.push({ x, y, rad, big });
      return [x, y] as Pt;
    }
    return null;
  };

  // ---- towns and villages, the biggest first so they get room ----
  const towns: Pt[] = [];
  for (let i = 0; i < 7; i++) { const p = put('bigtown', 20000, true, 300); if (p) towns.push(p); }
  for (let i = 0; i < 12; i++) { const p = put('smalltown', 13000, true, 300); if (p) towns.push(p); }
  for (let i = 0; i < 24; i++) { const p = put('village', 7500, true, 300); if (p) towns.push(p); }

  // ---- roads: a motorway across the middle, and lanes joining every town to its nearest neighbours ----
  const roads: { pts: Pt[]; w: number }[] = [];
  // The motorway, in from the west edge to Pepper's town and out the other side to the east edge
  const tw: Pt = [townAt[0] + town.west[0], townAt[1] + town.west[1]], te: Pt = [townAt[0] + town.east[0], townAt[1] + town.east[1]];
  const leadIn = (a: Pt, b: Pt, out: number) => {
    const pts = smooth(wander(a, b, 5, 30000), 5000);
    // Straight for the last stretch, so it meets the town's road head on
    return out > 0 ? [...pts.slice(0, -1), [b[0] - 6000, b[1]] as Pt, b] : [a, [a[0] + 6000, a[1]] as Pt, ...pts.slice(1)];
  };
  // The last stretch into town narrows to the road it joins: the neighborhood's street, or the high street.
  const joinTown = (pts: Pt[], end: Pt, w: number) => {
    const d = (p: Pt) => Math.hypot(p[0] - end[0], p[1] - end[1]);
    const fromEnd = d(pts[0]) < d(pts[pts.length - 1]) ? pts : [...pts].reverse();
    const j = fromEnd.findIndex((p) => d(p) >= 30000);
    if (j <= 0) { roads.push({ w, pts }); return; }
    roads.push({ w, pts: fromEnd.slice(0, j + 1) }, { w: 4500, pts: fromEnd.slice(j) });
  };
  const west: Pt = [-10000, tw[1] + rand(-60000, 60000)], east: Pt = [W + 10000, te[1] + rand(-60000, 60000)];
  joinTown(leadIn(west, [tw[0], tw[1]], 1), tw, 900);
  joinTown(leadIn([te[0], te[1]], east, -1), te, 1800);
  for (const t of towns) {
    const others = towns.filter((o) => o !== t).sort((a, b) => Math.hypot(a[0] - t[0], a[1] - t[1]) - Math.hypot(b[0] - t[0], b[1] - t[1]));
    for (const o of others.slice(0, 2)) {
      if (t[0] > o[0]) continue; // each pair once, roughly
      const pts = smooth(wander(t, o, 4, Math.hypot(o[0] - t[0], o[1] - t[1]) * 0.12), 4000);
      if (pts.every(([x, y]) => fromTown(x, y) > 4000)) roads.push({ w: 1800, pts });
    }
  }

  // ---- meals: castles, farms and forests ----
  for (let i = 0; i < 6; i++) put('castle', 4800, false, 200);
  for (let i = 0; i < 240; i++) put('farm', 3700, false, 30);
  // Forests come in clumps
  for (let i = 0; i < 60; i++) {
    const c: Pt = [rand(0, W), rand(0, H)];
    for (let k = 0; k < 6; k++) put('forest', 3200, false, 6, () => [c[0] + rand(-12000, 12000), c[1] + rand(-12000, 12000)]);
  }
  // Wind farms on the hills
  const turbines: FurnitureSpot[] = [];
  for (let i = 0; i < 8; i++) {
    const cx = rand(40000, W - 40000), cy = rand(40000, H - 40000);
    if (fromTown(cx, cy) < 40000) continue;
    for (let k = 0; k < 8; k++) turbines.push({ id: 'turbine', x: cx + (k % 4) * 6000, y: cy + Math.floor(k / 4) * 7000, rot: 0 });
  }

  // ---- the patchwork of fields ----
  const CELL = 24000, n = Math.ceil(W / CELL) + 1;
  const corner = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j): Pt => [
    i * CELL + (i > 0 && i < n ? rand(-6000, 6000) : 0), j * CELL + (j > 0 && j < n ? rand(-6000, 6000) : 0),
  ]));
  const fields: Record<string, Pt[][]> = { 'floor-crops': [], 'floor-wheat': [], 'floor-plough': [] };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (Math.random() < 0.3) continue; // some meadow
    // Inset a little so a strip of grass, like a hedgerow, shows between fields
    const quad = [corner[i][j], corner[i + 1][j], corner[i + 1][j + 1], corner[i][j + 1]];
    if (quad.some(([x, y]) => fromTown(x, y) < 3000)) continue;
    const cx = quad.reduce((s, p) => s + p[0], 0) / 4, cy = quad.reduce((s, p) => s + p[1], 0) / 4;
    fields[pick(Object.keys(fields))].push(quad.map(([x, y]): Pt => [cx + (x - cx) * 0.93, cy + (y - cy) * 0.93]));
  }

  const riverPolys = rivers.map((rv) => ribbon(rv, RIVER_W));
  const level: Level = {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls: [], wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings: [],
    floors: [
      ...Object.entries(fields).flatMap(([texture, polys]) => polys.map((poly) => ({ poly, texture }))),
      ...[...riverPolys, ...lakes].map((poly) => ({ poly, texture: 'floor-water' })),
      ...roads.flatMap((rd) => strip(rd.pts, rd.w)).map((poly) => ({ poly, texture: 'floor-asphalt' })),
    ],
    water: [...riverPolys, ...lakes],
    paths: roads,
    tile: 160,
    marks: [], furniture: [...furniture, ...turbines.filter((t) => !wet(t.x, t.y, 3000))], decals: [],
    rooms: [{ box: { x: 0, y: 0, w: W, h: H }, extras: {} }],
    doorways: [], wallThickness: 10, spawn,
    scatter: { barn: 420, silo: 300, windmill: 70, tractor: 120, haybale: 150, church: 40, watertower: 30 },
    piles: [
      { id: 'barn', piles: 14, each: 5, spread: 7000 },
      { id: 'silo', piles: 10, each: 5, spread: 6000 },
    ],
    };
  return { level, townAt, west, east, rivers };
}
