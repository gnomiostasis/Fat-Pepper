import { PAL } from './palette';
import type { ItemDef } from './items';
import type { ModelBuilder } from '../world3d/toon';

// The open ocean, seen by a Pepper tens of kilometres tall, her head up in the clouds. Icebergs, fleets,
// atolls and clouds are snacks, islands, volcanoes and hurricanes are meals, and big islands and whole
// stretches of the mainland are the feast.
// Same modelling rules as items.ts: a w x h footprint in local units, y up, `size` in cm.

const flat = { ink: false } as const;
const SAND = '#f1e2b8';
const LAGOON = '#9fdccf';
const SNOW = '#fbfaf6';
const ROCK = '#a7a39c';
const DARKROCK = '#8a8079';
const ICE = ['#fbfaf6', '#e3f1f7', '#cfe7f1'];
const GLASS = ['#bcd6e8', '#9fc4de', '#cfe0ea', '#e6e2d8', '#f4ead4', '#d9d4e8'];
const ROOFS = [PAL.rust, PAL.pink, PAL.mustard, PAL.cream, PAL.tealLight];

/** A seeded random, so each kind of thing looks the same every time it's built. */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function tree(b: ModelBuilder, x: number, z: number, r: number, color = PAL.lettuce, y = 0) {
  b.cyl(x, z, r * 0.18, y, r * 0.9, PAL.woodDark).ball(x, y + r * 1.5, z, r, color);
}

function palm(b: ModelBuilder, x: number, z: number, s: number) {
  b.cyl(x, z, s * 0.08, 0, s * 1.6, PAL.wood, { rz: 0.15 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box(x + 0.25 * s + Math.cos(a) * s * 0.45, z + Math.sin(a) * s * 0.45, s * 0.9, s * 0.25, s * 1.6, s * 0.06, PAL.lettuce, { ...flat, ry: -a });
  }
}

function peak(b: ModelBuilder, x: number, z: number, r: number, h: number, y = 0) {
  b.cone(x, z, r, y, h, ROCK).cone(x, z, r * 0.4, y + h * 0.6, h * 0.4, SNOW);
}

/** A lumpy patch of land: a few overlapping discs with a beach round them, rising gently in the middle. */
function land(b: ModelBuilder, r: () => number, discs: [number, number, number][], green = PAL.avocado) {
  for (const [x, z, rad] of discs) b.cyl(x, z, rad + 0.6, 0, 0.15, SAND, flat);
  for (const [x, z, rad] of discs) b.cyl(x, z, rad, 0.15, 0.2, green, flat).ball(x, 0.35, z, rad * 0.85, green, { sy: 0.08 + r() * 0.04, ink: false });
}

/** A city from very high up: a cluster of towers on grey. */
function towers(b: ModelBuilder, r: () => number, x: number, z: number, rad: number, tall: number, y = 0.4) {
  b.cyl(x, z, rad, y, 0.08, '#cfd3cb', flat);
  for (let i = 0; i < rad * rad * 3; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad * 0.9, s = rad * 0.11;
    b.box(x + Math.cos(a) * d, z + Math.sin(a) * d, s, s, y, (0.2 + (1 - d / rad) * tall * (0.4 + r())) , GLASS[Math.floor(r() * GLASS.length)]);
  }
}

/** Villages: little coloured roofs scattered round a point. */
function village(b: ModelBuilder, r: () => number, x: number, z: number, rad: number, n: number, y = 0.5) {
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad, s = rad * 0.13;
    b.box(x + Math.cos(a) * d, z + Math.sin(a) * d, s, s * 0.8, y, s * 0.6, PAL.cream).pyramid(x + Math.cos(a) * d, z + Math.sin(a) * d, s * 1.1, s * 0.9, y + s * 0.6, s * 0.5, ROOFS[i % ROOFS.length]);
  }
}

export const OCEAN_ITEMS: ItemDef[] = [
  // ---- snacks ----
  { id: 'iceberg', name: 'iceberg', size: 300000, w: 32, h: 32, model(b) {
    const r = seeded(51);
    b.cyl(0, 0, 14, 0, 0.1, '#cfe7f1', flat);
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, d = r() * 7, w = 6 + r() * 6;
      b.box(Math.cos(a) * d, Math.sin(a) * d, w, w * (0.6 + r() * 0.4), 0, 2 + r() * 5, ICE[i % ICE.length], { ry: r() * 3 });
    }
    b.cone(1, -1, 5, 3, 7, ICE[0], { ry: 0.4 }).cone(-5, 3, 3.5, 2, 5, ICE[1], { ry: 1.1 });
  } },
  { id: 'fleet', name: 'naval fleet', size: 250000, w: 32, h: 32, model(b) {
    // An aircraft carrier with its escorts round it, all heading the same way
    b.box(0, 0, 18, 4, 0, 1.6, PAL.grey).box(0, 0, 18.4, 4.6, 1.6, 0.3, '#8f8d89').box(2, -1.6, 2.6, 1, 1.9, 2.2, PAL.grey);
    b.box(-2, 0.6, 12, 0.12, 1.92, 0.02, PAL.white, flat);
    for (const [x, z] of [[-5, 0.8], [-1, -0.6], [3, 0.9]]) b.box(x, z, 1.6, 1.4, 1.95, 0.25, PAL.greyLight);
    for (const [x, z] of [[-12, 8], [-12, -8], [9, 9], [9, -9], [-2, 13], [-2, -13]]) {
      b.box(x, z, 7, 1.4, 0, 1, PAL.grey).box(x - 0.5, z, 2, 1, 1, 1.3, PAL.greyLight).cyl(x - 0.5, z, 0.1, 2.3, 1.2, PAL.ink);
      b.box(x + 4, z, 1, 1, 0, 1, PAL.grey, { ry: Math.PI / 4 });
    }
  } },
  { id: 'cloud', name: 'cloud', size: 350000, w: 32, h: 20, model(b) {
    const r = seeded(53);
    for (let i = 0; i < 7; i++) {
      const x = -11 + i * 3.6 + (r() - 0.5) * 2, z = (r() - 0.5) * 6, s = 3.5 + r() * 3 - Math.abs(i - 3) * 0.5;
      b.ball(x, 14 + s * 0.3, z, s, PAL.white, { sy: 0.65, ink: false });
    }
  } },
  { id: 'atoll', name: 'atoll', size: 400000, w: 32, h: 32, model(b) {
    const r = seeded(57);
    b.cyl(0, 0, 13.5, 0, 0.08, LAGOON, flat).ring(0, 0.2, 0, 13, 1.4, SAND, { ...flat, sy: 0.25 });
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      if (r() < 0.3) continue;
      palm(b, Math.cos(a) * 13, Math.sin(a) * 13, 0.9 + r() * 0.5);
    }
    b.box(10, -8, 1.6, 1.2, 0.3, 0.8, PAL.cream).pyramid(10, -8, 1.8, 1.4, 1.1, 0.6, PAL.mustard);
  } },

  // ---- mountains and volcanoes, sitting on the islands, eaten before the islands themselves ----
  { id: 'seapeak', name: 'mountain', size: 300000, w: 32, h: 32, furniture: true, model(b) {
    peak(b, 0, 0, 12, 20);
    peak(b, 7, 6, 6, 9);
    peak(b, -7, 5, 5, 7);
  } },
  { id: 'volcanocone', name: 'volcano', size: 720000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(63);
    b.cone(0, 0, 14, 0, 12.8, DARKROCK).cyl(0, 0, 3, 10.5, 0.7, PAL.orange, { r2: 4.2 }).cyl(0, 0, 2.1, 11.1, 0.3, PAL.yellow, flat);
    // Lava running down one side, and a plume of smoke
    for (let i = 0; i < 5; i++) b.box(1.2 + i * 1.9, 1.2 + i * 0.7, 1.6, 0.9, 10.4 - i * 2.3, 0.45, PAL.orange, { ...flat, rz: -0.7, ry: -0.35 });
    for (let i = 0; i < 6; i++) b.ball((r() - 0.5) * 3.5, 14.6 + i * 2.6, -i * 1.4, 2.3 + i * 0.7, i < 2 ? '#8f8d89' : PAL.greyLight, { ink: false });
  } },
  { id: 'massif', name: 'mountain range', size: 1000000, w: 32, h: 32, furniture: true, model(b) {
    peak(b, 0, 0, 8, 17);
    peak(b, -6, -4, 7, 13);
    peak(b, 5, -5, 6.5, 11);
    peak(b, 4, 5, 7, 12);
    peak(b, -6, 6, 5.5, 9);
    peak(b, -10, 1, 4, 7);
    peak(b, 10, 0, 4, 7);
  } },

  // ---- meals ----
  { id: 'isle', name: 'island', size: 700000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(59);
    land(b, r, [[0, 0, 11], [-6, 6, 7], [7, -5, 6], [5, 8, 5]]);
    // Its mountain is a separate thing on top (ISLAND_TOPS), eaten first
    b.ball(-3, 0, -2, 7, PAL.lettuce, { sy: 0.2 });
    village(b, r, 6, 5, 3, 14);
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = 4 + r() * 8;
      tree(b, Math.cos(a) * d, Math.sin(a) * d, 0.5 + r() * 0.3, r() < 0.5 ? PAL.avocadoDark : PAL.lettuce, 0.4);
    }
    for (let i = 0; i < 8; i++) { const a = r() * Math.PI * 2; palm(b, Math.cos(a) * 11.5, Math.sin(a) * 11.5, 0.7); }
    b.cyl(-11, -5, 0.4, 0.3, 2.4, PAL.white).cyl(-11, -5, 0.45, 2.7, 0.5, PAL.collar);
  } },
  { id: 'volcano', name: 'volcanic island', size: 1000000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(61);
    // Black rock where the volcano stands: the volcano itself is a separate thing on top (ISLAND_TOPS), eaten first
    b.cyl(0, 0, 15, 0, 0.15, SAND, flat).cyl(0, 0, 14, 0.15, 0.4, '#9cbf7f', flat).cyl(0, 0, 10.5, 0.5, 0.1, DARKROCK, flat);
    for (let i = 0; i < 24; i++) { const a = r() * Math.PI * 2; tree(b, Math.cos(a) * 12.5, Math.sin(a) * 12.5, 0.5, PAL.avocadoDark, 0.5); }
  } },
  { id: 'hurricane', name: 'hurricane', size: 1600000, w: 32, h: 32, model(b) {
    // A great swirl of cloud with a clear eye in the middle
    for (let arm = 0; arm < 3; arm++) {
      for (let i = 0; i < 26; i++) {
        const t = i / 26, a = arm * (Math.PI * 2 / 3) + t * 4.2, d = 2.4 + t * 12.5, s = 1.4 + (1 - t) * 1.8;
        b.ball(Math.cos(a) * d, 12 + (1 - t) * 1.5, Math.sin(a) * d, s, i % 4 ? PAL.white : '#e8eef3', { sy: 0.4, ink: false });
      }
    }
    b.ring(0, 13.2, 0, 2.4, 0.9, PAL.white, { ink: false, sy: 0.5 });
  } },

  // ---- the feast ----
  { id: 'bigisle', name: 'big island', size: 2600000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(67);
    land(b, r, [[0, 0, 12], [-7, 6, 8], [8, -6, 7], [6, 8, 6], [-8, -6, 6]]);
    // Mountains down the middle, cities on the coast, forests and a lake between
    // (its mountains are separate things on top: ISLAND_TOPS)
    towers(b, r, 9, 6, 3, 3.5);
    towers(b, r, -9, -5, 2.4, 2.5);
    village(b, r, -7, 8, 3, 12);
    b.cyl(5, -9, 2, 0.45, 0.05, '#9fcbe0', flat);
    for (let i = 0; i < 60; i++) {
      const a = r() * Math.PI * 2, d = 5 + r() * 8, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - 9, z - 6) < 3.4 || Math.hypot(x + 9, z + 5) < 2.8) continue;
      tree(b, x, z, 0.45 + r() * 0.2, r() < 0.5 ? PAL.avocadoDark : PAL.lettuce, 0.45);
    }
  } },
  { id: 'mainland', name: 'stretch of mainland', size: 5000000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(71);
    land(b, r, [[0, 0, 12.5], [-8, -7, 7], [8, -7, 7], [-8, 7, 7], [8, 7, 7], [0, 11, 5], [0, -11, 5], [11, 0, 5], [-11, 0, 5]]);
    // A desert, a long mountain range with snow, a megacity on the bay and smaller cities about
    b.cyl(-7, -6, 5, 0.42, 0.06, '#ecd39a', flat);
    // (its mountain range is separate things on top: ISLAND_TOPS)
    towers(b, r, 7, -6, 4, 5);
    towers(b, r, -3, 9, 2.4, 2.4);
    towers(b, r, 9, 7, 2, 2);
    b.box(-1, -1, 20, 0.4, 0.44, 0.04, '#9fcbe0', { ...flat, ry: 0.6 }).cyl(4, 5, 1.8, 0.44, 0.05, '#9fcbe0', flat);
    for (let i = 0; i < 90; i++) {
      const a = r() * Math.PI * 2, d = 3 + r() * 12, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - 7, z + 6) < 4.4 || Math.hypot(x + 7, z + 6) < 5.2) continue;
      tree(b, x, z, 0.35 + r() * 0.15, r() < 0.5 ? PAL.avocadoDark : PAL.lettuce, 0.45);
    }
  } },
];

/**
 * What sits on top of each kind of island as its own smaller meal, so Pepper can eat the mountains and
 * volcanoes off an island before she's big enough for the whole thing: [id, x, z] in the island's own
 * model units (its 32 x 32 footprint, centred on 0,0).
 */
export const ISLAND_TOPS: Record<string, [string, number, number][]> = {
  isle: [['seapeak', -3, -2]],
  volcano: [['volcanocone', 0, 0]],
  bigisle: [['massif', -1, -1], ['seapeak', 4.5, 2.5], ['seapeak', 2, -6.5]],
  mainland: [['massif', -8, 5.5], ['massif', -3.5, 3.4], ['massif', 0.5, 1.5], ['seapeak', 5, 0.6], ['seapeak', 7.5, -0.2]],
};
