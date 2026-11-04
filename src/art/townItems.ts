import { PAL } from './palette';
import type { ItemDef } from './items';
import type { ModelBuilder } from '../world3d/toon';

// Phase 5: things in town, from lampposts and buses up to shops, churches, the town hall
// and whole neighborhoods. Same modelling rules as items.ts: a local footprint of w x h
// units centred on 0,0, y up, and `size` is the real longest side in cm.

const flat = { ink: false } as const;
const ASPHALT = '#9a9ea6';

function wheels(b: ModelBuilder, xs: number[], z: number, r: number) {
  for (const x of xs) for (const s of [-1, 1]) b.rod(x, r, s * z, r, 1.6, 'z', PAL.ink);
}

/** A row of flat windows across one face of a block, for buildings. */
function windows(b: ModelBuilder, w: number, d: number, y0: number, rows: number, cols: number, rowH: number, color: string) {
  const cw = w / cols, ww = cw * 0.55, wh = rowH * 0.5;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = -w / 2 + cw * (c + 0.5), y = y0 + r * rowH + rowH * 0.25;
    for (const s of [-1, 1]) b.box(x, s * (d / 2 + 0.05), ww, 0.2, y, wh, color, flat);
  }
}

/** A little house, in whichever colours. Each colour way is its own kind so the town isn't all one colour. */
function cottage(id: string, wall: string, roof: string): ItemDef {
  return {
    id, name: 'house', size: 850, w: 32, h: 26, furniture: true, model(b) {
      b.box(0, 0, 30, 24, 0, 14, wall).pyramid(0, 0, 34, 28, 14, 10, roof);
      b.box(-6, 12.1, 5, 0.3, 0, 9, PAL.woodDark, flat);
      for (const x of [4, 11]) b.box(x, 12.1, 4.5, 0.3, 6, 4.5, PAL.navy, flat);
      for (const x of [-9, 0, 9]) b.box(x, -12.1, 4.5, 0.3, 6, 4.5, PAL.navy, flat);
      b.box(9, -4, 3, 3, 18, 7, PAL.greyLight);
    },
  };
}

/** A whole neighborhood: little houses round a cul-de-sac, or down a street, inside a hedge. */
function hood(id: string, kind: 'loop' | 'row'): ItemDef {
  const walls = [PAL.pink, PAL.sky, PAL.mustard, PAL.cream, PAL.tealLight, PAL.white];
  const roofs = [PAL.rust, PAL.woodDark, PAL.navy, PAL.tealDark, PAL.grey];
  return {
    id, name: 'neighborhood', size: 5600, w: 32, h: 32, furniture: true, model(b) {
      b.box(0, 0, 32, 32, 0, 0.25, PAL.avocado, flat);
      // Hedge all the way round
      for (const s of [-1, 1]) {
        b.box(0, s * 15.6, 32, 0.8, 0, 1.1, PAL.avocadoDark).box(s * 15.6, 0, 0.8, 32, 0, 1.1, PAL.avocadoDark);
      }
      const house = (x: number, z: number, ry: number, n: number) => {
        const w = walls[n % walls.length], r = roofs[(n * 3 + 1) % roofs.length];
        b.box(x, z, 4.6, 3.8, 0, 2.2, w, { ry }).pyramid(x, z, 5.4, 4.6, 2.2, 1.7, r, { ry });
      };
      if (kind === 'loop') {
        b.cyl(0, 0, 9, 0.2, 0.15, ASPHALT, flat).cyl(0, 0, 5.5, 0.25, 0.15, PAL.avocado, flat);
        b.box(0, 12.5, 3.4, 7, 0.2, 0.15, ASPHALT, flat);
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2 + 0.35;
          house(Math.cos(a) * 12, Math.sin(a) * 12, -a + Math.PI / 2, i);
        }
        for (const [x, z] of [[0, 0], [-2, 1.5], [2, -1]]) b.cyl(x, z, 0.3, 0, 1.4, PAL.woodDark).ball(x, 2, z, 1.3, PAL.lettuce);
      } else {
        b.box(0, 0, 32, 3.6, 0.2, 0.15, ASPHALT, flat);
        for (let i = 0; i < 5; i++) for (const s of [-1, 1]) house(-12 + i * 6, s * 6, s > 0 ? Math.PI : 0, i * 2 + (s > 0 ? 1 : 0));
        for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
          const x = -15 + i * 6, z = s * 12.5;
          b.cyl(x, z, 0.3, 0, 1.4, PAL.woodDark).ball(x, 2.1, z, 1.4, i % 2 ? PAL.lettuce : PAL.avocadoDark);
        }
        for (const x of [-9, 3, 10]) b.box(x, -1, 2, 1, 0.3, 0.8, PAL.collar);
      }
    },
  };
}

export const TOWN_ITEMS: ItemDef[] = [
  // ---- street stuff (loose) ----
  { id: 'hotdog', name: 'hot dog cart', size: 250, w: 32, h: 20, model(b) {
    wheels(b, [-8], 8, 3);
    b.box(0, 0, 26, 16, 4, 11, PAL.white).box(0, 0, 26.4, 16.4, 15, 2, PAL.collar);
    b.cyl(6, 0, 0.6, 17, 10, PAL.grey).cone(6, 0, 14, 26, 5, PAL.yellow);
    b.rod(-1, 18.5, 0, 2, 12, 'x', PAL.bread);
  } },
  { id: 'busstop', name: 'bus stop', size: 450, w: 32, h: 12, model(b) {
    for (const x of [-15, 15]) b.box(x, -4, 1, 1, 0, 16, PAL.navy);
    b.box(0, -5, 30, 0.6, 2, 13, PAL.sky).box(0, -1, 34, 12, 16, 1.2, PAL.navy).box(0, -2, 22, 4, 4, 1.2, PAL.wood);
    b.box(10, -4.6, 7, 0.4, 6, 8, PAL.mustard, flat);
  } },
  { id: 'lamppost', name: 'lamppost', size: 500, w: 8, h: 8, model(b) {
    b.cyl(0, 0, 1.4, 0, 0.6, PAL.navy).cyl(0, 0, 0.4, 0, 7.4, PAL.navy).ball(0, 7.6, 0, 1, PAL.yellow);
  } },
  { id: 'van', name: 'delivery van', size: 550, w: 32, h: 15, model(b) {
    wheels(b, [-10, 10], 6.6, 2.6);
    b.box(0, 0, 32, 14, 1.5, 13, PAL.white).box(13.5, 0, 5, 13.4, 8, 5, PAL.sky, flat);
    b.box(-3, 7.1, 16, 0.3, 6, 5, PAL.orange, flat).box(-3, -7.1, 16, 0.3, 6, 5, PAL.orange, flat);
  } },
  { id: 'statue', name: 'statue', size: 600, w: 16, h: 16, model(b) {
    b.box(0, 0, 14, 14, 0, 7, PAL.greyLight).box(0, 0, 10, 10, 7, 2, PAL.grey);
    b.cyl(0, 0, 2.6, 9, 9, PAL.tealLight, { r2: 3.4 }).ball(0, 20.5, 0, 2.4, PAL.tealLight).rod(3.6, 17, 0, 0.9, 7, 'x', PAL.tealLight, { rz: 1 });
  } },
  { id: 'icecream', name: 'ice cream truck', size: 650, w: 32, h: 15, model(b) {
    wheels(b, [-10, 10], 6.6, 2.6);
    b.box(0, 0, 32, 14, 1.5, 12, PAL.pink).box(13.5, 0, 5, 13.4, 8, 4.5, PAL.sky, flat).box(-3, 7.1, 10, 0.3, 6, 5, PAL.white, flat);
    b.cone(-4, 0, 3, 14, 7, PAL.bread, { rx: Math.PI }).ball(-4, 21.5, 0, 3.2, PAL.cream).ball(-4, 24.5, 0, 1, PAL.collar);
  } },
  { id: 'fountain', name: 'fountain', size: 700, w: 32, h: 32, model(b) {
    b.cyl(0, 0, 16, 0, 3, PAL.greyLight).cyl(0, 0, 14.5, 2.8, 0.4, PAL.sky, flat);
    b.cyl(0, 0, 2, 0, 9, PAL.greyLight).cyl(0, 0, 6, 9, 1, PAL.greyLight).ball(0, 11, 0, 2.6, PAL.sky);
  } },
  { id: 'firetruck', name: 'fire engine', size: 1000, w: 32, h: 10, model(b) {
    wheels(b, [-11, -4, 11], 4.4, 2);
    b.box(0, 0, 32, 9.4, 1.4, 7, PAL.collar).box(12, 0, 8, 9.4, 8.4, 3, PAL.collar).box(12.5, 0, 6.5, 9.6, 8.8, 2, PAL.sky, flat);
    b.box(-3, 0, 22, 2.4, 8.6, 0.6, PAL.greyLight).box(-3, 0, 22, 9.6, 4.5, 0.6, PAL.white, flat).ball(12, 11.8, 0, 0.9, PAL.sky);
  } },
  { id: 'bus', name: 'bus', size: 1200, w: 32, h: 9, model(b) {
    wheels(b, [-10, 10], 4.1, 1.8);
    b.box(0, 0, 32, 8.4, 1.2, 8, PAL.mustard).box(0, 0, 32.2, 8.6, 5, 2.4, PAL.sky, flat).box(0, 0, 32.2, 8.6, 2.6, 0.6, PAL.white, flat);
    b.box(0, 0, 31, 7.6, 9.2, 0.4, PAL.mustardDark);
  } },

  // ---- buildings (placed by the town layout) ----
  cottage('cottage', PAL.pink, PAL.rust),
  cottage('cottage2', PAL.sky, PAL.navy),
  cottage('cottage3', PAL.mustard, PAL.tealDark),
  { id: 'gazebo', name: 'gazebo', size: 900, w: 24, h: 24, furniture: true, model(b) {
    b.cyl(0, 0, 12, 0, 1.4, PAL.wood);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.cyl(Math.cos(a) * 10.5, Math.sin(a) * 10.5, 0.6, 1.4, 10, PAL.white); }
    b.cone(0, 0, 13.5, 11.4, 7, PAL.rust).ball(0, 18.8, 0, 0.9, PAL.yellow);
  } },
  { id: 'playground', name: 'playground', size: 1100, w: 32, h: 24, furniture: true, model(b) {
    b.box(-8, 2, 14, 14, 0, 0.4, PAL.bread, flat);
    for (const x of [-15, -1]) b.box(x, -2, 0.8, 0.8, 0, 12, PAL.collar).box(x, 6, 0.8, 0.8, 0, 12, PAL.collar);
    b.box(-8, -2, 15, 0.8, 11.4, 0.8, PAL.collar).box(-8, 6, 15, 0.8, 11.4, 0.8, PAL.collar);
    for (const x of [-11, -5]) b.box(x, 2, 2.6, 1.2, 4, 0.4, PAL.mustard);
    b.box(10, -4, 6, 6, 0, 8, PAL.sky).box(10, 5, 4, 12, 3.5, 0.8, PAL.yellow, { rx: 0.55 });
  } },
  { id: 'cafe', name: 'café', size: 1400, w: 32, h: 24, furniture: true, model(b) {
    b.box(0, -2, 30, 18, 0, 13, PAL.cream).box(0, -2, 31, 19, 13, 1, PAL.woodDark);
    for (let i = 0; i < 6; i++) b.box(-12.5 + i * 5, 7.6, 5, 2, 9, 0.8, i % 2 ? PAL.white : PAL.teal, { rx: -0.4 });
    b.box(-4, 7.05, 14, 0.3, 2, 6, PAL.sky, flat).box(8, 7.05, 4, 0.3, 0, 8, PAL.woodDark, flat);
    for (const x of [-10, 0, 10]) b.cyl(x, 10, 1.6, 0, 3, PAL.white).cyl(x, 10, 0.2, 3, 4, PAL.grey).cone(x, 10, 3, 7, 1.5, PAL.orange);
  } },
  { id: 'shop', name: 'shop', size: 1600, w: 32, h: 22, furniture: true, model(b) {
    b.box(0, 0, 30, 20, 0, 14, PAL.tealLight).box(0, 0, 31, 21, 14, 1.4, PAL.white);
    b.box(0, 10.6, 22, 2.6, 9, 0.8, PAL.collar, { rx: -0.4 });
    b.box(-4, 10.05, 16, 0.3, 1.5, 6.5, PAL.sky, flat).box(9, 10.05, 4, 0.3, 0, 8, PAL.woodDark, flat);
    b.box(0, 10.1, 16, 0.3, 11, 2.4, PAL.cream, flat);
  } },
  { id: 'gasstation', name: 'gas station', size: 2200, w: 32, h: 24, furniture: true, model(b) {
    b.box(0, 0, 32, 24, 0, 0.3, PAL.greyLight, flat);
    for (const [x, z] of [[-10, -3], [4, -3], [-10, 5], [4, 5]]) b.box(x, z, 0.8, 0.8, 0, 8, PAL.white);
    b.box(-3, 1, 18, 12, 8, 1.4, PAL.collar);
    for (const x of [-10, 4]) b.box(x, 1, 2, 1.6, 0, 3.2, PAL.mustard);
    b.box(10, -6, 10, 10, 0, 6, PAL.cream).box(10, -6, 10.4, 10.4, 6, 0.8, PAL.collar).box(10, -0.9, 6, 0.2, 1, 3.5, PAL.sky, flat);
    b.box(-14, 10, 0.8, 0.8, 0, 12, PAL.grey).box(-14, 10, 5, 0.8, 12, 4, PAL.collar);
  } },
  { id: 'watertower', name: 'water tower', size: 2400, w: 14, h: 14, furniture: true, model(b) {
    for (const [x, z] of [[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]]) b.box(x, z, 0.6, 0.6, 0, 11, PAL.grey);
    b.cyl(0, 0, 6.5, 11, 5, PAL.sky).cone(0, 0, 7, 16, 2.5, PAL.navy).box(0, 6.55, 5, 0.2, 12.4, 2, PAL.white, flat);
  } },
  { id: 'church', name: 'church', size: 2600, w: 32, h: 18, furniture: true, model(b) {
    b.box(3, 0, 24, 13, 0, 9, PAL.white).pyramid(3, 0, 25.5, 14.5, 9, 6, PAL.rust);
    for (const x of [-3, 3, 9]) for (const s of [-1, 1]) b.box(x, s * 6.55, 2, 0.2, 3, 4.5, PAL.sky, flat);
    b.box(-11, 0, 6, 6, 0, 16, PAL.white).cone(-11, 0, 4.4, 16, 11, PAL.navy, { ry: Math.PI / 4 });
    b.box(-11, 3.05, 2.4, 0.2, 0, 5, PAL.woodDark, flat).cyl(-11, 3.05, 1.2, 12, 0.2, PAL.mustard, { rx: Math.PI / 2 });
  } },
  { id: 'apartments', name: 'apartment block', size: 2800, w: 32, h: 20, furniture: true, model(b) {
    b.box(0, 0, 30, 18, 0, 26, PAL.cream).box(0, 0, 31, 19, 26, 1, PAL.rust);
    windows(b, 30, 18, 1, 6, 6, 4.2, PAL.navy);
    b.box(0, 9.1, 5, 0.3, 0, 3.6, PAL.woodDark, flat).box(8, 0, 4, 4, 27, 2.5, PAL.greyLight);
  } },
  { id: 'office', name: 'office tower', size: 2900, w: 24, h: 24, furniture: true, model(b) {
    b.box(0, 0, 22, 22, 0, 44, PAL.sky).box(0, 0, 23, 23, 44, 1.2, PAL.navy);
    for (let i = 0; i < 9; i++) for (const s of [-1, 1]) {
      b.box(0, s * 11.05, 22.2, 0.2, 2 + i * 4.8, 0.9, PAL.white, flat).box(s * 11.05, 0, 0.2, 22.2, 2 + i * 4.8, 0.9, PAL.white, flat);
    }
    b.box(0, 0, 6, 6, 45, 3, PAL.greyLight).cyl(3, 3, 0.2, 48, 5, PAL.grey);
  } },
  { id: 'school', name: 'school', size: 3600, w: 32, h: 26, furniture: true, model(b) {
    b.box(-4, -6, 24, 12, 0, 10, PAL.orange).box(10, 2, 10, 22, 0, 10, PAL.orange);
    b.box(-4, -6, 24.6, 12.6, 10, 0.8, PAL.cream).box(10, 2, 10.6, 22.6, 10, 0.8, PAL.cream);
    windows(b, 24, 12, 1, 2, 6, 4.4, PAL.sky);
    b.box(-6, 7, 18, 10, 0, 0.3, PAL.greyLight, flat).box(-6, 7, 14, 0.4, 0.32, 0.05, PAL.white, flat);
    b.cyl(-15, 10, 0.25, 0, 14, PAL.grey).box(-13.6, 10, 2.6, 0.2, 12, 1.7, PAL.collar, flat);
    b.cyl(-4, -6, 1.8, 10.8, 1.2, PAL.white).cyl(-4, -6.05, 1.3, 11, 1, PAL.cream, flat);
  } },
  { id: 'townhall', name: 'town hall', size: 3800, w: 32, h: 24, furniture: true, model(b) {
    b.box(0, 0, 32, 24, 0, 1.4, PAL.greyLight).box(0, -2, 28, 16, 1.4, 12, PAL.cream).box(0, -2, 29, 17, 13.4, 1.2, PAL.greyLight);
    for (let i = 0; i < 7; i++) b.cyl(-9 + i * 3, 7.5, 0.7, 1.4, 12, PAL.white);
    b.pyramid(0, 7.5, 22, 3, 13.4, 3, PAL.cream);
    b.box(0, -3, 7, 7, 14.6, 8, PAL.cream).cyl(0, -3, 3.4, 22.6, 0.8, PAL.greyLight).ball(0, 23.4, -3, 3.3, PAL.tealLight, { sy: 0.9 });
    b.cyl(0, 0.55, 2, 18, 0.3, PAL.white, { rx: Math.PI / 2 }).ball(0, 26.6, -3, 0.6, PAL.yellow);
  } },
  hood('hood', 'loop'),
  hood('hoodrow', 'row'),
];

