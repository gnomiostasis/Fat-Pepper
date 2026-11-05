// The island, 64 km across, with Pepper's countryside in the middle of it. Out here a Pepper kilometres
// tall eats her way through more farmland and towns, great forests, hills and mountain ranges, ports,
// airports and cities, while ships and ferries go round the coast, until she can swallow the capital
// and then the island itself.

import { PAL } from '../art/palette';
import type { FurnitureSpot, Level, Pt } from './level';
import { nearLine, ribbon, smooth, strip, wander } from './town';

export const ISLAND_SIZE = 6400000;
const W = ISLAND_SIZE, H = ISLAND_SIZE;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export interface Island {
  level: Level;
  /** Where the countryside goes: add this to the countryside's own coordinates. */
  countryAt: Pt;
}

/**
 * The island, with room in the middle for the countryside (`country`: its size, where its motorway leaves
 * it, and its rivers, all in its own coordinates). The motorway carries on out to the cities, and the
 * rivers carry on down to the sea.
 */
export function buildIsland(country: { w: number; h: number; west: Pt; east: Pt; rivers: Pt[][] }): Island {
  const cx = W / 2, cy = H / 2;
  const countryAt: Pt = [cx - country.w / 2 + rand(-200000, 200000), cy - country.h / 2 + rand(-200000, 200000)];
  const inCountry = (p: Pt): Pt => [p[0] + countryAt[0], p[1] + countryAt[1]];
  /** How far x,y is from the countryside's square (0 inside it). */
  const fromCountry = (x: number, y: number) => Math.hypot(
    Math.max(countryAt[0] - x, 0, x - countryAt[0] - country.w), Math.max(countryAt[1] - y, 0, y - countryAt[1] - country.h));

  // ---- the coast: a lumpy ring with bays and headlands ----
  const waves = [[2, 220000], [3, 150000], [5, 80000], [9, 40000], [14, 18000]].map(([k, amp]) => ({ k, amp, ph: rand(0, Math.PI * 2) }));
  const coastR = (a: number) => 2420000 + waves.reduce((s, w) => s + w.amp * Math.sin(w.k * a + w.ph), 0);
  /** How far inland x,y is (negative out at sea). */
  const inland = (x: number, y: number) => coastR(Math.atan2(y - cy, x - cx)) - Math.hypot(x - cx, y - cy);
  const coastAt = (a: number, off = 0): Pt => { const r = coastR(a) + off; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; };
  const N = 260;
  const coast = Array.from({ length: N }, (_, i) => coastAt((i / N) * Math.PI * 2));

  const furniture: FurnitureSpot[] = [];
  const placed: { x: number; y: number; rad: number }[] = [];

  // ---- rivers: the countryside's carried on to the sea, and more down from the mountains ----
  const rivers: { pts: Pt[]; w: number }[] = [];
  for (const rv of country.rivers) {
    for (const end of [rv[0], rv[rv.length - 1]]) {
      const p = inCountry(end), a = Math.atan2(p[1] - cy, p[0] - cx);
      // Mostly on the way it was going (out the top or the bottom), bending toward the nearest bit of coast
      const out = end === rv[0] ? -Math.PI / 2 : Math.PI / 2, aim = out + Math.atan2(Math.sin(a - out), Math.cos(a - out)) * 0.5;
      rivers.push({ w: 9000, pts: smooth(wander(p, coastAt(aim, 60000), 9, 140000), 30000) });
    }
  }

  // Mountain ranges first, so the rivers can run off them
  const ranges: Pt[][] = [];
  for (let tries = 0; tries < 200 && ranges.length < 3; tries++) {
    const a = rand(0, Math.PI * 2), d = rand(1000000, 1700000), c: Pt = [cx + Math.cos(a) * d, cy + Math.sin(a) * d];
    if (inland(c[0], c[1]) < 450000 || fromCountry(c[0], c[1]) < 500000 || ranges.some((r) => Math.hypot(r[2][0] - c[0], r[2][1] - c[1]) < 1200000)) continue;
    // A spine running roughly along the coast
    const t = a + Math.PI / 2 + rand(-0.4, 0.4), len = rand(700000, 1100000);
    const ends: Pt[] = [[c[0] - Math.cos(t) * len / 2, c[1] - Math.sin(t) * len / 2], [c[0] + Math.cos(t) * len / 2, c[1] + Math.sin(t) * len / 2]];
    ranges.push(smooth(wander(ends[0], ends[1], 4, 120000), 60000));
  }
  const nearRange = (x: number, y: number) => Math.min(Infinity, ...ranges.map((r) => nearLine(x, y, r).d));
  for (const r of ranges) {
    for (const k of [0.25, 0.75]) {
      const s = r[Math.floor(r.length * k)], a = Math.atan2(s[1] - cy, s[0] - cx);
      rivers.push({ w: 14000, pts: smooth(wander(s, coastAt(a + rand(-0.15, 0.15), 60000), 8, 120000), 30000) });
    }
  }
  const wet = (x: number, y: number, pad: number) => rivers.some((rv) => nearLine(x, y, rv.pts).d < rv.w / 2 + pad);

  const lakes: Pt[][] = [];
  for (let tries = 0; tries < 80 && lakes.length < 7; tries++) {
    const x = rand(0, W), y = rand(0, H), r = rand(60000, 160000);
    if (inland(x, y) < r * 1.3 + 100000 || fromCountry(x, y) < r * 1.3 + 80000 || wet(x, y, r * 1.2) || nearRange(x, y) < r + 120000) continue;
    if (lakes.some((l) => Math.hypot(l[0][0] - x, l[0][1] - y) < r * 3 + 200000)) continue;
    lakes.push(Array.from({ length: 22 }, (_, k): Pt => {
      const a = (k / 22) * Math.PI * 2, rr = r * rand(0.8, 1.15);
      return [x + Math.cos(a) * rr, y + Math.sin(a) * rr];
    }));
    placed.push({ x, y, rad: r * 1.1 });
  }

  const fits = (x: number, y: number, rad: number, pad = 0.9) =>
    inland(x, y) > rad * 0.8 + 30000 && fromCountry(x, y) > rad + 40000 && !wet(x, y, rad * 0.7)
    && placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.rad + rad) * pad);
  const put = (id: string, rad: number, tries: number, where?: () => Pt, ok = fits, pad = 0.9) => {
    for (let i = 0; i < tries; i++) {
      const [x, y] = where ? where() : [rand(0, W), rand(0, H)];
      if (!ok(x, y, rad, pad)) continue;
      furniture.push({ id, x, y, rot: Math.round(rand(0, 360)) });
      placed.push({ x, y, rad });
      return [x, y] as Pt;
    }
    return null;
  };
  const upright = (spot: Pt | null) => { if (spot) furniture[furniture.length - 1].rot = 0; return spot; };

  // ---- the feast: the capital and the cities, then the ports and airports ----
  const cities: Pt[] = [];
  const capital = upright(put('capital', 170000, 600));
  if (capital) cities.push(capital);
  for (let i = 0; i < 7; i++) { const p = upright(put('city', 105000, 400)); if (p) cities.push(p); }
  // Ports sit on the shore, half in the water
  const onShore = (x: number, y: number, rad: number) => Math.abs(inland(x, y)) < rad * 0.25 && fromCountry(x, y) > rad + 200000
    && !wet(x, y, rad) && placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.rad + rad) * 0.9);
  const ports: Pt[] = [];
  for (let i = 0; i < 6; i++) {
    const p = put('harbour', 50000, 200, () => coastAt(rand(0, Math.PI * 2), -10000), onShore);
    if (!p) continue;
    ports.push(p);
    // The basin opens onto the sea
    furniture[furniture.length - 1].rot = Math.round((Math.atan2(p[1] - cy, p[0] - cx) * 180) / Math.PI - 90);
  }
  for (let i = 0; i < 3; i++) put('airport', 70000, 300);

  // ---- mountains and hills ----
  for (const r of ranges) {
    for (let i = 0; i < r.length; i++) {
      const [x, y] = r[i];
      put('mountain', 85000, 4, () => [x + rand(-70000, 70000), y + rand(-70000, 70000)], fits, 0.7);
    }
    for (let i = 0; i < 18; i++) {
      const [x, y] = pick(r);
      put('hill', 40000, 6, () => [x + rand(-260000, 260000), y + rand(-260000, 260000)], fits, 0.8);
    }
  }
  for (let i = 0; i < 70; i++) put('hill', 40000, 20);

  // ---- roads: the motorway on from the countryside, joining up the cities and ports ----
  const roads: { pts: Pt[]; w: number }[] = [];
  const road = (a: Pt, b: Pt, w: number) => {
    const pts = smooth(wander(a, b, 6, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.08), 40000);
    if (pts.every(([x, y]) => fromCountry(x, y) > 2000 || Math.hypot(x - a[0], y - a[1]) < 30000)) roads.push({ w, pts });
  };
  const nearest = (p: Pt, list: Pt[]) => [...list].sort((a, b) => Math.hypot(a[0] - p[0], a[1] - p[1]) - Math.hypot(b[0] - p[0], b[1] - p[1]));
  const west = inCountry(country.west), east = inCountry(country.east);
  const westCity = nearest([west[0] - 900000, west[1]], cities)[0], eastCity = nearest([east[0] + 900000, east[1]], cities)[0];
  // Straight out of the countryside at first, so it carries on from the road it joins
  if (westCity) road(west, westCity, 4500);
  if (eastCity) road(east, eastCity, 4500);
  for (const c of [...cities, ...ports]) {
    for (const o of nearest(c, cities).slice(1, 3)) if (c[0] < o[0] || ports.includes(c)) road(c, o, 6000);
  }

  // ---- snacks for a Pepper fresh from the countryside: more of its farms, forests, villages and towns ----
  for (let i = 0; i < 26; i++) put('bigtown', 20000, 60);
  for (let i = 0; i < 50; i++) put('smalltown', 13000, 40);
  for (let i = 0; i < 110; i++) put('village', 7500, 30);
  for (let i = 0; i < 24; i++) put('castle', 4800, 30);
  for (let i = 0; i < 40; i++) {
    const c: Pt = [rand(0, W), rand(0, H)];
    put('bigforest', 50000, 10, () => [c[0] + rand(-150000, 150000), c[1] + rand(-150000, 150000)], fits, 0.8);
    for (let k = 0; k < 4; k++) put('forest', 3200, 6, () => [c[0] + rand(-200000, 200000), c[1] + rand(-200000, 200000)]);
  }
  for (let i = 0; i < 380; i++) put('farm', 3700, 12);

  // ---- along the coast and out at sea ----
  for (let i = 0; i < 16; i++) put('lighthouse', 3000, 60, () => coastAt(rand(0, Math.PI * 2), -4000), (x, y, rad) => Math.abs(inland(x, y)) < 20000 && !wet(x, y, rad) && placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.rad + rad));
  const atSea = (x: number, y: number, rad: number) => inland(x, y) < -(rad + 40000) && x > rad && y > rad && x < W - rad && y < H - rad
    && placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.rad + rad);
  const offshore = (near: number, far: number) => () => coastAt(rand(0, Math.PI * 2), rand(near, far));
  for (let i = 0; i < 10; i++) put('oilrig', 5000, 40, offshore(150000, 600000), atSea);
  for (let i = 0; i < 90; i++) put('ship', 13000, 30, offshore(50000, 700000), atSea);
  for (let i = 0; i < 70; i++) put('ferry', 8000, 30, offshore(30000, 300000), atSea);
  // Ships steam along with the coast rather than every which way
  for (const f of furniture) {
    if (f.id === 'ship' || f.id === 'ferry') f.rot = Math.round((Math.atan2(f.y - cy, f.x - cx) * 180) / Math.PI + 90 + rand(-25, 25));
  }

  // ---- the ground: fields, moorland on the mountains, beaches round the edge, and the sea ----
  const CELL = 190000, n = Math.ceil(W / CELL) + 1;
  const corner = Array.from({ length: n + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j): Pt => [
    i * CELL + (i > 0 && i < n ? rand(-48000, 48000) : 0), j * CELL + (j > 0 && j < n ? rand(-48000, 48000) : 0),
  ]));
  const fields: Record<string, Pt[][]> = { 'floor-crops': [], 'floor-wheat': [], 'floor-plough': [], 'floor-moor': [] };
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const quad = [corner[i][j], corner[i + 1][j], corner[i + 1][j + 1], corner[i][j + 1]];
    if (quad.some(([x, y]) => fromCountry(x, y) < 20000 || inland(x, y) < 60000)) continue;
    const qx = quad.reduce((s, p) => s + p[0], 0) / 4, qy = quad.reduce((s, p) => s + p[1], 0) / 4;
    const high = nearRange(qx, qy) < 260000;
    if (!high && Math.random() < 0.35) continue; // some meadow
    fields[high ? 'floor-moor' : pick(['floor-crops', 'floor-wheat', 'floor-plough'])].push(quad.map(([x, y]): Pt => [qx + (x - qx) * 0.93, qy + (y - qy) * 0.93]));
  }
  // The sea, in slices from each stretch of coast out to far past the edge of the map, so the camera
  // never sees the end of the world.
  // Bands that get wider further out, so no piece is so long and thin that the depth buffer loses track of it.
  const out = (p: Pt, k: number): Pt => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k];
  const bands = [1, 1.04, 1.1, 1.2, 1.35, 1.6, 2, 2.6, 3.5, 5];
  const sea = coast.flatMap((p, i) => {
    const q = coast[(i + 1) % N];
    return bands.slice(1).map((k, j): Pt[] => [out(p, bands[j]), out(q, bands[j]), out(q, k), out(p, k)]);
  });
  const beach = [...coast, coast[0], coast[1]];
  const riverPolys = rivers.map((rv) => ribbon(rv.pts, rv.w));

  const level: Level = {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls: [], wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings: [],
    floors: [
      ...sea.map((poly) => ({ poly, texture: 'floor-sea' })),
      ...strip(beach, 50000).map((poly) => ({ poly, texture: 'floor-sand' })),
      ...Object.entries(fields).flatMap(([texture, polys]) => polys.map((poly) => ({ poly, texture }))),
      ...[...riverPolys, ...lakes].map((poly) => ({ poly, texture: 'floor-water' })),
      ...roads.flatMap((rd) => strip(rd.pts, rd.w)).map((poly) => ({ poly, texture: 'floor-asphalt' })),
    ],
    water: [...riverPolys, ...lakes],
    paths: roads,
    tile: 1280,
    marks: [], furniture, decals: [],
    rooms: [{ box: { x: 0, y: 0, w: W, h: H }, extras: {} }],
    doorways: [], wallThickness: 10, spawn: { x: cx, y: cy },
    scatter: {}, piles: [],
  };
  return { level, countryAt };
}
