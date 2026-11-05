import { PAL } from './palette';
import type { ItemDef } from './items';
import type { ModelBuilder } from '../world3d/toon';

// The island, seen by a Pepper kilometres tall. Lighthouses, oil rigs and ships are snacks, hills, great
// forests, ports and airports are meals, and mountains and whole cities are the feast.
// Same modelling rules as items.ts: a w x h footprint in local units, y up, `size` in cm.

const flat = { ink: false } as const;
const ASPHALT = '#9a9ea6';
const CONCRETE = '#d6d3cc';
const SNOW = '#fbfaf6';
const ROCK = '#a7a39c';
const GLASS = ['#bcd6e8', '#9fc4de', '#cfe0ea', '#e6e2d8', '#f4ead4', '#d9d4e8'];
const BOXES = [PAL.collar, PAL.sky, PAL.mustard, PAL.tealLight, PAL.orange, PAL.navy, PAL.pink];

/** A seeded random, so each kind of thing looks the same every time it's built. */
function seeded(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** A round tree standing at height y. */
function tree(b: ModelBuilder, x: number, z: number, r: number, color = PAL.lettuce, y = 0) {
  b.cyl(x, z, r * 0.18, y, r * 0.9, PAL.woodDark).ball(x, y + r * 1.5, z, r, color);
}

/** A pointed fir. */
function fir(b: ModelBuilder, x: number, z: number, r: number, y = 0) {
  b.cyl(x, z, r * 0.15, y, r * 0.6, PAL.woodDark).cone(x, z, r, y + r * 0.5, r * 2.6, PAL.tealDark);
}

/** A ship's hull along x, `l` long and `w` wide, `h` high, with a pointed bow at +x. */
function hull(b: ModelBuilder, l: number, w: number, h: number, color: string, deck: string) {
  const s = w / Math.SQRT2;
  b.box(-l * 0.06, 0, l * 0.82, w, 0, h, color).box(l * 0.35 - w / 2, 0, s, s, 0, h, color, { ry: Math.PI / 4 });
  b.box(-l * 0.06, 0, l * 0.8, w * 0.86, h, 0.12, deck, flat);
}

/** A city seen from very high up: blocks between the streets, towers in the middle, a river and parks. */
function city(b: ModelBuilder, seed: number, towers: number, landmark: (b: ModelBuilder) => void) {
  const r = seeded(seed);
  b.cyl(0, 0, 16, 0, 0.12, '#cfd3cb', flat);
  // A ring motorway, and a river through the middle
  b.ring(0, 0.25, 0, 14.6, 0.4, ASPHALT, { ...flat, sy: 0.2 });
  b.box(0, 3, 32, 1.6, 0.13, 0.1, '#9fcbe0', { ...flat, ry: 0.35 });
  for (let gx = -13; gx <= 13; gx += 2.2) {
    for (let gz = -13; gz <= 13; gz += 2.2) {
      const d = Math.hypot(gx, gz);
      if (d > 13.6) continue;
      const across = -Math.sin(-0.35) * gx + Math.cos(-0.35) * (gz - 3);
      if (Math.abs(across) < 1.5) continue;
      if (r() < 0.07) { b.box(gx, gz, 1.8, 1.8, 0.12, 0.06, PAL.avocado, flat); tree(b, gx, gz, 0.4); continue; }
      if (d < 3.5) continue; // room for the landmark
      // Taller toward the middle
      const low = 0.5 + Math.max(0, 1 - d / 14) * (0.6 + r() * 1.6);
      const hgt = d < 7 && r() < towers ? 3 + r() * (6 + towers * 6) : low;
      b.box(gx, gz, 1.45 + r() * 0.25, 1.45 + r() * 0.25, 0.12, hgt, GLASS[Math.floor(r() * GLASS.length)]);
    }
  }
  landmark(b);
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = 14.3 + r() * 1.3;
    tree(b, Math.cos(a) * d, Math.sin(a) * d, 0.45);
  }
}

export const ISLAND_ITEMS: ItemDef[] = [
  // ---- snacks ----
  { id: 'lighthouse', name: 'lighthouse', size: 6000, w: 12, h: 12, model(b) {
    b.cyl(0, 0, 5.5, 0, 1.2, ROCK, { r2: 6 }).cyl(0, 0, 1.4, 1.2, 12, PAL.white, { r2: 2 });
    for (const y of [3.5, 7.5]) b.cyl(0, 0, 1.85 - (y - 1) * 0.04, y, 2, PAL.collar, flat);
    b.cyl(0, 0, 1.5, 13.2, 1.6, PAL.yellow).cone(0, 0, 1.8, 14.8, 1.6, PAL.collar);
    b.box(3, 2, 3, 2.4, 1.2, 1.8, PAL.cream).pyramid(3, 2, 3.3, 2.7, 3, 1.2, PAL.collar);
  } },
  { id: 'oilrig', name: 'oil rig', size: 9000, w: 16, h: 16, model(b) {
    for (const [x, z] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) b.cyl(x, z, 0.8, 0, 7, PAL.mustardDark);
    b.box(0, 0, 14, 14, 7, 1.2, PAL.grey).box(-2, -2, 7, 6, 8.2, 3, PAL.collar).box(3, 3, 5, 5, 8.2, 2, PAL.white);
    b.cyl(4, -4, 1.2, 8.2, 10, PAL.greyLight, { r2: 2.6 }).box(-5, 5, 4, 4, 8.3, 0.2, PAL.mustard, flat);
    b.ball(-6, 13, -6, 1, PAL.orange).cyl(-6, -6, 0.3, 8.2, 4, PAL.grey);
  } },
  { id: 'ferry', name: 'ferry', size: 14000, w: 32, h: 8, model(b) {
    hull(b, 30, 7, 2.4, PAL.white, PAL.navy);
    b.box(-3, 0, 20, 6.4, 2.6, 2.6, PAL.white).box(-3, 0, 20.2, 6.6, 3.6, 0.8, PAL.navy, flat).box(-3, 0, 14, 5.6, 5.2, 2, PAL.white);
    b.box(5, 0, 2.4, 5.8, 5.2, 2.2, PAL.sky).cyl(-8, 0, 1, 7.2, 2.8, PAL.collar).cyl(-8, 0, 1.05, 9.5, 0.6, PAL.ink, flat);
  } },
  { id: 'ship', name: 'cargo ship', size: 25000, w: 32, h: 6, model(b) {
    const r = seeded(17);
    hull(b, 31, 5, 2, PAL.navy, PAL.collar);
    for (let x = -10; x <= 9; x += 2.6) {
      for (const z of [-1.5, 0, 1.5]) {
        const stack = 1 + Math.floor(r() * 3);
        for (let k = 0; k < stack; k++) b.box(x, z, 2.4, 1.35, 2.15 + k * 0.9, 0.86, BOXES[Math.floor(r() * BOXES.length)]);
      }
    }
    b.box(-13, 0, 3, 4.6, 2.15, 4.6, PAL.white).box(-13, 0, 3.4, 5.2, 6.4, 0.4, PAL.white).cyl(-14.2, 0, 0.6, 6.8, 1.8, PAL.collar);
  } },

  // ---- meals ----
  { id: 'hill', name: 'hill', size: 70000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(29), H = 15.5 * 0.3;
    b.ball(0, 0, 0, 15.5, PAL.avocado, { sy: 0.3 }).ball(-5, 0.5, 6, 5, PAL.lettuce, { sy: 0.25 });
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = 3 + r() * 10.5;
      tree(b, Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 0.5, r() < 0.5 ? PAL.avocadoDark : PAL.lettuce, H * Math.sqrt(1 - (d / 15.5) ** 2) - 0.3);
    }
    // A little chapel and its path on top
    b.box(0, 0, 1.6, 1, H - 0.2, 1.2, PAL.white).pyramid(0, 0, 1.8, 1.2, H + 1, 0.8, PAL.rust);
  } },
  { id: 'bigforest', name: 'great forest', size: 100000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(31);
    b.cyl(0, 0, 15.8, 0, 0.12, '#7fb070', flat).cyl(3, -4, 2.8, 0.12, 0.08, '#9fcbe0', flat);
    for (let i = 0; i < 150; i++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 14.6, x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (Math.hypot(x - 3, z + 4) < 3.3) continue;
      if (r() < 0.45) fir(b, x, z, 0.7 + r() * 0.4);
      else tree(b, x, z, 0.8 + r() * 0.5, r() < 0.5 ? PAL.lettuce : PAL.avocadoDark);
    }
  } },
  { id: 'harbour', name: 'port', size: 100000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(37);
    // Quays round a basin
    b.box(0, -6, 30, 18, 0, 0.6, CONCRETE).box(-12, 8, 6, 14, 0, 0.6, CONCRETE).box(12, 8, 6, 14, 0, 0.6, CONCRETE);
    b.box(0, 9, 18, 12, 0, 0.1, '#86b9d6', flat);
    // Stacks of containers and the cranes over them
    for (let i = 0; i < 40; i++) {
      const x = -13 + (i % 10) * 2.8, z = -12 + Math.floor(i / 10) * 2.2;
      b.box(x, z, 2.4, 1.4, 0.6, 0.8 + Math.floor(r() * 3) * 0.8, BOXES[Math.floor(r() * BOXES.length)]);
    }
    for (const x of [-8, -2, 4, 10]) {
      b.box(x - 1, 2, 0.4, 0.4, 0.6, 7, PAL.collar).box(x + 1, 2, 0.4, 0.4, 0.6, 7, PAL.collar);
      b.box(x, 3, 0.6, 9, 7.6, 0.6, PAL.collar).box(x, 1.2, 2.4, 1.6, 7, 1.6, PAL.white);
    }
    // Ships tied up in the basin
    for (const [x, z, c] of [[0, 7, PAL.navy], [0, 11.5, PAL.tealDark]] as const) {
      b.box(x, z, 14, 2.6, 0, 1.2, c).box(x - 5, z, 2, 2.2, 1.2, 2.2, PAL.white);
      for (let k = -3; k <= 4; k++) b.box(x + k * 1.3, z, 1.2, 2, 1.2, 0.8, BOXES[(k + 7) % BOXES.length]);
    }
    // Warehouses
    for (const z of [-13.5, -9]) b.box(11, z, 6, 3, 0.6, 2, PAL.greyLight).box(11, z, 6.2, 3.2, 2.6, 0.4, PAL.sky);
  } },
  { id: 'airport', name: 'airport', size: 120000, w: 32, h: 32, furniture: true, model(b) {
    b.box(0, 0, 32, 32, 0, 0.1, '#bfd9a4', flat);
    // Two runways with their centre lines, and taxiways
    for (const [z, ry] of [[-7, 0], [6, 0.5]] as const) {
      b.box(0, z, 30, 2.4, 0.1, 0.1, ASPHALT, { ...flat, ry });
      for (let k = -6; k <= 6; k++) b.box(Math.cos(ry) * k * 2.2, z - Math.sin(ry) * k * 2.2, 1.1, 0.18, 0.2, 0.04, PAL.white, { ...flat, ry });
    }
    b.box(-4, -2, 20, 1, 0.1, 0.1, ASPHALT, flat);
    // The apron, the terminal with its piers, and the control tower
    b.box(-6, 10, 14, 6, 0.1, 0.12, CONCRETE, flat);
    b.box(-6, 13.5, 14, 2.6, 0.2, 1.6, PAL.white).box(-6, 13.5, 14.4, 3, 1.8, 0.3, PAL.sky);
    for (const x of [-11, -6, -1]) b.box(x, 10.5, 0.8, 4, 0.2, 0.8, PAL.greyLight);
    b.cyl(5, 12, 0.6, 0.1, 5, PAL.white).cyl(5, 12, 1.2, 5.1, 1.2, PAL.sky).cone(5, 12, 1.3, 6.3, 0.6, PAL.navy);
    // Planes at the gates
    for (const x of [-13.5, -8.5, -3.5]) {
      b.rod(x, 0.7, 9.5, 0.45, 4, 'z', PAL.white).box(x, 9.2, 5, 0.9, 0.55, 0.15, PAL.white).box(x, 7.8, 2, 0.5, 0.7, 0.12, PAL.white).box(x, 7.8, 0.15, 0.7, 0.8, 1, PAL.collar);
    }
  } },
  { id: 'mountain', name: 'mountain', size: 160000, w: 32, h: 32, furniture: true, model(b) {
    const r = seeded(41);
    // A big peak and two shoulders, rock above the trees and snow on top
    for (const [x, z, rad, h] of [[1, -1, 13, 17], [-7, 5, 8, 10], [7, 7, 7, 8]]) {
      b.cone(x, z, rad, 0, h, ROCK).cone(x, z, rad * 0.38, h * 0.62, h * 0.38, SNOW);
      b.cyl(x, z, rad * 1.04, 0, h * 0.12, '#b7c99a', { r2: rad * 1.12, ink: false });
    }
    for (let i = 0; i < 40; i++) {
      const a = r() * Math.PI * 2, d = 11 + r() * 4.5;
      fir(b, Math.cos(a) * d, Math.sin(a) * d, 0.6 + r() * 0.3);
    }
  } },
  { id: 'city', name: 'city', size: 200000, w: 32, h: 32, furniture: true, model(b) {
    city(b, 43, 0.35, (m) => {
      // A cathedral on the square
      m.box(0, 0, 6, 6, 0.12, 0.06, PAL.greyLight, flat);
      m.box(0, 0, 4, 1.6, 0.12, 2.4, PAL.cream).box(-1.8, 0, 1.2, 1.2, 0.12, 4.4, PAL.cream).cone(-1.8, 0, 0.9, 4.5, 3, PAL.tealDark, { ry: Math.PI / 4 });
    });
  } },
  { id: 'capital', name: 'capital city', size: 320000, w: 32, h: 32, furniture: true, model(b) {
    city(b, 47, 0.7, (m) => {
      // A palace with its dome and gardens, and a stadium
      m.box(0, 0, 6.6, 6.6, 0.12, 0.06, PAL.avocado, flat);
      m.box(0, -1, 5, 2, 0.12, 1.6, PAL.cream).ball(0, 1.7, -1, 1.1, PAL.tealLight, { sy: 0.9 }).cyl(0, -1, 0.12, 2.6, 1.4, PAL.mustard);
      for (const x of [-2, 2]) m.ball(x, 0.6, 1.8, 0.5, PAL.lettuce);
      m.cyl(-2, 2, 0.5, 0.12, 0.3, '#9fcbe0', flat);
    });
    b.cyl(8, -8, 2, 0, 1.4, PAL.white, { sz: 1.4 }).cyl(8, -8, 1.5, 0.2, 1.25, PAL.lettuce, { ...flat, sz: 1.4 });
  } },
];
