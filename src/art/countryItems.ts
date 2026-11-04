import { PAL } from './palette';
import type { ItemDef } from './items';
import type { ModelBuilder } from '../world3d/toon';

// Phase 6: the countryside, seen by a Pepper hundreds of metres tall. Barns and silos are
// snacks, farms, forests and castles are meals, and villages and whole towns are the feast.
// Same modelling rules as items.ts: a w x h footprint in local units, y up, `size` in cm.

const flat = { ink: false } as const;
const ASPHALT = '#9a9ea6';
const WALLS = [PAL.pink, PAL.sky, PAL.mustard, PAL.cream, PAL.tealLight, PAL.white];
const ROOFS = [PAL.rust, PAL.woodDark, PAL.navy, PAL.tealDark, PAL.grey];

/** A seeded random, so each kind of town looks the same every time it's built. */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function tree(b: ModelBuilder, x: number, z: number, r: number, color = PAL.lettuce) {
  b.cyl(x, z, r * 0.18, 0, r * 0.9, PAL.woodDark).ball(x, r * 1.5, z, r, color);
}

function house(b: ModelBuilder, x: number, z: number, w: number, d: number, h: number, wall: string, roof: string, ry = 0) {
  b.box(x, z, w, d, 0, h, wall, { ry }).pyramid(x, z, w * 1.12, d * 1.12, h, h * 0.75, roof, { ry });
}

/** A town seen from high up: streets, a jumble of houses, a church spire or two, some green. */
function town(b: ModelBuilder, seed: number, n: number, towers: number) {
  const r = seeded(seed);
  b.cyl(0, 0, 16, 0, 0.12, PAL.avocadoDark, flat);
  // A ring road and a cross of main streets
  b.ring(0, 0.2, 0, 11.5, 0.45, ASPHALT, { ...flat, sy: 0.2 });
  b.box(0, 0, 31, 0.9, 0.14, 0.12, ASPHALT, flat).box(0, 0, 0.9, 31, 0.14, 0.12, ASPHALT, flat);
  // Houses everywhere, smaller and denser toward the middle
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 14.5;
    const x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (Math.abs(x) < 0.9 || Math.abs(z) < 0.9 || Math.abs(Math.hypot(x, z) - 11.5) < 0.7) continue;
    const s = 0.55 + r() * 0.5;
    house(b, x, z, s * 1.3, s, s * 0.8 + (d < 6 ? r() * 0.9 : 0), WALLS[i % WALLS.length], ROOFS[(i * 3) % ROOFS.length], Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3);
  }
  // Tall buildings in the middle
  for (let i = 0; i < towers; i++) {
    const a = r() * Math.PI * 2, d = 1.8 + r() * 4;
    b.box(Math.cos(a) * d, Math.sin(a) * d, 1.6, 1.6, 0, 4 + r() * 5, i % 2 ? PAL.sky : PAL.cream);
  }
  // A church with a spire, and a park
  b.box(-4.5, 3, 2.6, 1.3, 0, 1.6, PAL.white).box(-6, 3, 0.9, 0.9, 0, 3.4, PAL.white).cone(-6, 3, 0.7, 3.4, 2.2, PAL.navy, { ry: Math.PI / 4 });
  b.cyl(5, -5, 2.4, 0.12, 0.1, PAL.avocado, flat).cyl(5, -5, 0.9, 0.2, 0.08, PAL.sky, flat);
  for (let i = 0; i < 6; i++) tree(b, 5 + Math.cos(i) * 1.8, -5 + Math.sin(i) * 1.8, 0.45);
}

export const COUNTRY_ITEMS: ItemDef[] = [
  // ---- snacks ----
  { id: 'haybale', name: 'hay bale', size: 300, w: 20, h: 20, model(b) {
    b.rod(0, 7, 0, 7, 16, 'x', PAL.yellow).ring(-8, 7, 0, 5, 0.6, PAL.mustardDark, { ...flat, rz: Math.PI / 2 });
  } },
  { id: 'tractor', name: 'tractor', size: 500, w: 32, h: 20, model(b) {
    b.wheel(-8, 8, -8, 7, 2, PAL.ink).wheel(-8, 8, 8, 7, 2, PAL.ink).wheel(9, 5, -7, 4.4, 1.6, PAL.ink).wheel(9, 5, 7, 4.4, 1.6, PAL.ink);
    b.box(3, 0, 20, 10, 4, 7, PAL.collar).box(-6, 0, 9, 10, 11, 9, PAL.collar).box(-6, 0, 9.4, 10.4, 14, 4, PAL.sky, flat);
    b.cyl(8, 3, 0.8, 11, 6, PAL.ink);
  } },
  { id: 'silo', name: 'grain silo', size: 1500, w: 16, h: 16, model(b) {
    b.cyl(0, 0, 7.6, 0, 22, PAL.greyLight).ball(0, 22, 0, 7.6, PAL.grey, { sy: 0.55 });
    for (const y of [5, 11, 17]) b.ring(0, y, 0, 7.6, 0.25, PAL.grey, flat);
  } },
  { id: 'barn', name: 'barn', size: 2000, w: 32, h: 20, model(b) {
    b.box(0, 0, 30, 18, 0, 11, PAL.collar);
    for (const s of [-1, 1]) b.box(0, s * 4.6, 32, 10, 13, 1, PAL.ink, { rx: s * 0.75 });
    b.box(0, 9.1, 9, 0.4, 0, 8, PAL.white, flat).box(0, 9.2, 7.6, 0.4, 0.6, 6.8, PAL.collar, flat);
    b.box(0, 9.3, 0.6, 0.3, 0.6, 6.8, PAL.white, { ...flat, rz: 0.84 }).box(0, 9.3, 0.6, 0.3, 0.6, 6.8, PAL.white, { ...flat, rz: -0.84 });
  } },
  { id: 'windmill', name: 'windmill', size: 2200, w: 16, h: 16, model(b) {
    b.cyl(0, 0, 4, 0, 18, PAL.cream, { r2: 6.5 }).cone(0, 0, 4.6, 18, 4.5, PAL.woodDark).box(0, 4.6, 2, 0.3, 0, 4, PAL.woodDark, flat);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.4;
      b.box(Math.cos(a) * 6, 4.6, 12, 0.3, 17 + Math.sin(a) * 6 - 1.2, 2.4, PAL.white, { rz: a });
    }
  } },
  { id: 'turbine', name: 'wind turbine', size: 6000, w: 8, h: 8, model(b) {
    b.cyl(0, 0, 0.12, 0, 9, PAL.white, { r2: 0.22 }).box(0, 0.15, 0.4, 0.8, 8.8, 0.4, PAL.white).ball(0, 9, 0.6, 0.18, PAL.white);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.3;
      b.box(Math.cos(a) * 1.8, 0.62, 3.6, 0.06, 9 + Math.sin(a) * 1.8 - 0.1, 0.2, PAL.white, { rz: a });
    }
  } },

  // ---- meals (placed by the layout) ----
  { id: 'forest', name: 'forest', size: 6000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(11);
    b.cyl(0, 0, 15.5, 0, 0.1, PAL.avocadoDark, flat);
    for (let i = 0; i < 46; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 13.5;
      tree(b, Math.cos(a) * d, Math.sin(a) * d, 1.4 + r() * 1.2, r() < 0.5 ? PAL.lettuce : PAL.avocadoDark);
    }
  } },
  { id: 'farm', name: 'farm', size: 7000, w: 32, h: 32, furniture: true, model(b) {
    b.box(-8, -8, 15, 15, 0, 0.1, '#f1d98c', flat).box(8, -8, 15, 15, 0, 0.1, '#b9da8f', flat).box(-8, 8, 15, 15, 0, 0.1, '#d8b48a', flat);
    b.box(8, 8, 15, 15, 0, 0.08, PAL.avocado, flat);
    house(b, 5, 6, 4, 3, 2.6, PAL.cream, PAL.rust);
    b.box(11, 11, 6, 4, 0, 3.4, PAL.collar).box(11, 11, 6.4, 4.4, 3.4, 0.8, PAL.ink);
    b.cyl(13, 6, 1.2, 0, 5, PAL.greyLight).ball(13, 5, 6, 1.2, PAL.grey, { sy: 0.6 });
    for (const [x, z] of [[2, 12], [3, 3], [14, 2]]) tree(b, x, z, 0.9);
    for (const [x, z] of [[-5, 5], [-11, 10], [-6, 12]]) b.rod(x, 0.5, z, 0.5, 1, 'x', PAL.yellow);
  } },
  { id: 'castle', name: 'castle', size: 9000, w: 32, h: 32, furniture: true, model(b) {
    b.cyl(0, 0, 15.5, 0, 0.3, PAL.avocadoDark, flat).ring(0, 0.3, 0, 14.2, 0.9, '#9fcbe0', { ...flat, sy: 0.2 });
    for (const s of [-1, 1]) b.box(0, s * 9, 18, 1.4, 0, 5, PAL.greyLight).box(s * 9, 0, 1.4, 18, 0, 5, PAL.greyLight);
    for (const [x, z] of [[-9, -9], [9, -9], [-9, 9], [9, 9]]) b.cyl(x, z, 2, 0, 7, PAL.greyLight).cone(x, z, 2.4, 7, 3.6, PAL.navy);
    b.box(0, 0, 8, 8, 0, 10, PAL.grey).box(0, 0, 8.4, 8.4, 10, 0.8, PAL.greyLight).cyl(2, 2, 0.15, 10.8, 4, PAL.ink).box(3, 2, 2, 0.15, 13.3, 1.4, PAL.collar, flat);
    b.box(0, 9.8, 3, 0.4, 0, 3.4, PAL.woodDark, flat);
  } },

  // ---- the feast ----
  { id: 'village', name: 'village', size: 15000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(5);
    b.cyl(0, 0, 15.5, 0, 0.12, PAL.avocadoDark, flat).cyl(0, 0, 5, 0.12, 0.08, PAL.avocado, flat);
    b.box(0, 0, 30, 1.2, 0.14, 0.1, ASPHALT, flat).box(8, 6, 1, 14, 0.14, 0.1, ASPHALT, flat);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, d = 7 + r() * 6.5;
      house(b, Math.cos(a) * d, Math.sin(a) * d, 1.8, 1.4, 1.3, WALLS[i % WALLS.length], ROOFS[(i * 2) % ROOFS.length], -a);
    }
    b.box(0, -1.6, 3.6, 1.8, 0, 2.2, PAL.white).box(-2.2, -1.6, 1.2, 1.2, 0, 4.6, PAL.white).cone(-2.2, -1.6, 0.9, 4.6, 3, PAL.navy, { ry: Math.PI / 4 });
    for (let i = 0; i < 10; i++) tree(b, (r() - 0.5) * 26, (r() - 0.5) * 26, 0.6);
  } },
  { id: 'smalltown', name: 'town', size: 26000, w: 32, h: 32, furniture: true, model(b) { town(b, 21, 150, 3); } },
  { id: 'bigtown', name: 'big town', size: 40000, w: 32, h: 32, furniture: true, model(b) {
    town(b, 37, 230, 9);
    // A football ground and a river through the edge of town
    b.cyl(-6, -6, 2.2, 0, 1.2, PAL.white, { sz: 1.5 }).cyl(-6, -6, 1.7, 0.2, 1.05, PAL.lettuce, { ...flat, sz: 1.5 });
  } },
];
