import { PAL } from './palette';
import type { ModelBuilder } from '../world3d/toon';

/**
 * Everything Pepper can bump into or eat. Modelled in a local box of `w` x `h`
 * units (x across, z down the screen) centred on 0,0, with y up in the same
 * units; `size` is the real-world longest side in cm.
 */
export interface ItemDef {
  id: string;
  name: string;
  size: number;
  w: number;
  h: number;
  /** Furniture is placed by the level layout and collides as a rectangle. */
  furniture?: boolean;
  model(b: ModelBuilder): void;
}

const TENNIS = '#d3dc4a';
const flat = { ink: false } as const;

export const ITEMS: ItemDef[] = [
  // ---- crumbs and bits (eaten by a tiny puppy) ----
  { id: 'crumb', name: 'crumb', size: 3, w: 16, h: 16, model(b) {
    b.ball(-3, 1.5, -2, 4, PAL.bread, { sy: 0.55 }).ball(4, 1.3, 1, 3, PAL.bread, { sy: 0.55 }).ball(-1, 1, 5, 2.5, PAL.breadIn, { sy: 0.5 });
  } },
  { id: 'kibble', name: 'kibble', size: 2.5, w: 14, h: 14, model(b) {
    b.cyl(0, 0, 6, 0, 4.5, PAL.woodDark);
  } },
  { id: 'cheerio', name: 'cereal loop', size: 2.5, w: 14, h: 14, model(b) {
    b.ring(0, 2.3, 0, 4.4, 2.3, PAL.mustard);
  } },
  { id: 'coin', name: 'penny', size: 2, w: 14, h: 14, model(b) {
    b.cyl(0, 0, 6.5, 0, 1.4, PAL.woodLight).ring(0, 1.4, 0, 4.2, 0.4, PAL.wood, flat);
  } },
  { id: 'button', name: 'button', size: 3, w: 14, h: 14, model(b) {
    b.cyl(0, 0, 6.5, 0, 2, PAL.teal);
    for (const [x, z] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) b.cyl(x, z, 0.9, 1.9, 0.3, PAL.tealDark, flat);
  } },
  { id: 'pea', name: 'pea', size: 1.5, w: 12, h: 12, model(b) {
    b.ball(0, 5, 0, 5, PAL.lettuce);
  } },

  // ---- snacks and small stuff ----
  { id: 'cookie', name: 'cookie', size: 7, w: 20, h: 20, model(b) {
    b.cyl(0, 0, 9, 0, 3, PAL.bread);
    for (const [x, z] of [[-3, -3], [3.5, -1], [-1, 4], [4, 4]]) b.ball(x, 3, z, 1.3, PAL.woodDark, flat);
  } },
  { id: 'ball', name: 'tennis ball', size: 7, w: 20, h: 20, model(b) {
    b.ball(0, 9, 0, 9, TENNIS).ring(0, 9, 0, 9, 0.5, PAL.white, { ...flat, rx: 0.5 });
  } },
  { id: 'donut', name: 'donut', size: 9, w: 24, h: 24, model(b) {
    b.ring(0, 3.6, 0, 7, 4.2, PAL.bread).ring(0, 5.6, 0, 7, 3.3, PAL.pink, { ...flat, sy: 0.6 });
    for (let i = 0; i < 6; i++) { const a = i * 1.05; b.box(Math.cos(a) * 7, Math.sin(a) * 7, 1.2, 0.5, 7.4, 0.4, [PAL.yellow, PAL.sky, PAL.white][i % 3], { ...flat, ry: a }); }
  } },
  { id: 'crayon', name: 'crayon', size: 9, w: 7, h: 28, model(b) {
    b.rod(0, 3, 2, 3, 22, 'z', PAL.orange).rod(0, 3, 2, 3.2, 10, 'z', PAL.paper, flat);
    b.coneAt(0, 3, -12.5, 3, 6, PAL.orange, { rx: -Math.PI / 2 });
  } },
  { id: 'mouse', name: 'squeaky mouse', size: 10, w: 16, h: 28, model(b) {
    b.ball(0, 6, 2, 7, PAL.greyLight, { sz: 1.5 });
    b.ball(-4, 10, -5, 3, PAL.pink).ball(4, 10, -5, 3, PAL.pink).ball(0, 5, -9, 1.6, PAL.pink);
    b.rod(0, 2, 15, 0.8, 9, 'z', PAL.pink);
  } },
  { id: 'bone', name: 'chew bone', size: 13, w: 30, h: 12, model(b) {
    b.rod(0, 3.5, 0, 2.6, 22, 'x', PAL.white);
    for (const [x, z] of [[11, 2.8], [11, -2.8], [-11, 2.8], [-11, -2.8]]) b.ball(x, 3.5, z, 3.8, PAL.white);
  } },
  { id: 'sock', name: 'sock', size: 14, w: 20, h: 28, model(b) {
    b.box(-2, -3, 9, 20, 0, 5, PAL.sky).box(2, 8, 14, 9, 0, 5, PAL.sky).box(-2, -12, 9.6, 4, 0, 5.4, PAL.white);
  } },
  { id: 'sandwich', name: 'sandwich', size: 14, w: 28, h: 24, model(b) {
    b.box(0, 0, 26, 22, 0, 3, PAL.bread).box(0, 0, 27.5, 23.5, 3, 1.6, PAL.lettuce, flat).box(0, 0, 26, 22, 4.6, 3, PAL.bread);
  } },
  { id: 'can', name: 'soup can', size: 10, w: 20, h: 20, model(b) {
    b.cyl(0, 0, 9, 0, 14, PAL.greyLight).cyl(0, 0, 9.25, 3, 8, PAL.orange, flat);
  } },
  { id: 'banana', name: 'banana', size: 18, w: 30, h: 16, model(b) {
    b.ring(0, 3.5, -6, 13, 3.6, PAL.yellow, { arc: Math.PI * 0.75, ry: Math.PI * 0.125 + Math.PI });
  } },
  { id: 'truck', name: 'toy truck', size: 20, w: 18, h: 30, model(b) {
    b.box(0, -9, 14, 10, 3, 11, PAL.orange).box(0, 5, 16, 18, 3, 6, PAL.sky).box(0, -12.5, 11, 2.5, 8, 4, PAL.paper, flat);
    for (const [x, z] of [[-8.5, -9], [8.5, -9], [-8.5, 8], [8.5, 8]]) b.rod(x, 3.5, z, 3.5, 3, 'x', PAL.ink);
  } },
  { id: 'book', name: 'comic book', size: 22, w: 24, h: 30, model(b) {
    b.box(0, 0, 24, 30, 0, 4, PAL.teal).box(1, 0, 23.4, 28.6, 0.8, 2.4, PAL.paper, flat);
    b.cyl(2, -4, 5, 4, 0.4, PAL.mustard, flat).box(-4, 8, 12, 2, 4, 0.4, PAL.white, flat);
  } },
  { id: 'teddy', name: 'teddy bear', size: 24, w: 26, h: 30, model(b) {
    b.ball(0, 8, 4, 9, PAL.wood).ball(0, 12, -7, 7, PAL.wood);
    b.ball(-5, 16, -11, 3, PAL.wood).ball(5, 16, -11, 3, PAL.wood).ball(0, 11, -13, 2.8, PAL.bread);
    b.ball(-9, 6, 2, 3.5, PAL.wood).ball(9, 6, 2, 3.5, PAL.wood).ball(-6, 4, 11, 4, PAL.wood).ball(6, 4, 11, 4, PAL.wood);
  } },
  { id: 'slipper', name: 'fuzzy slipper', size: 26, w: 16, h: 30, model(b) {
    b.box(0, 0, 15, 29, 0, 4, PAL.pink).ball(0, 5, -7, 7.5, PAL.white, { sy: 0.6, sz: 1.2 });
  } },
  { id: 'shoe', name: 'sneaker', size: 26, w: 16, h: 30, model(b) {
    b.box(0, 0, 15, 29, 0, 3, PAL.white).box(0, 4, 13, 20, 3, 7, PAL.navy).ball(0, 4, -9, 6.5, PAL.navy, { sy: 0.75 });
    b.box(0, -1, 6, 8, 10, 0.6, PAL.white, flat);
  } },
  { id: 'duck', name: 'rubber duck', size: 9, w: 22, h: 20, model(b) {
    b.ball(-1, 6, 1, 8, PAL.yellow, { sz: 0.85 }).ball(5, 13, -1, 5, PAL.yellow).ball(10, 12, -1, 2.6, PAL.orange, { sx: 1.3, sy: 0.6 });
    b.ball(6.5, 14.5, -4.5, 0.9, PAL.ink, flat).ball(6.5, 14.5, 2.5, 0.9, PAL.ink, flat);
  } },
  { id: 'toiletpaper', name: 'toilet paper', size: 12, w: 22, h: 22, model(b) {
    b.cyl(0, 0, 10, 0, 11, PAL.white).cyl(0, 0, 3.5, 0.2, 11, PAL.woodLight, flat);
  } },
  { id: 'plant', name: 'potted plant', size: 30, w: 30, h: 30, model(b) {
    b.cyl(0, 0, 10, 0, 14, PAL.orange, { r2: 8 });
    for (const [x, z, r] of [[0, 0, 8], [6, 4, 6], [-6, 3, 6], [1, -6, 6], [-3, 6, 5]]) b.ball(x, 19 + r * 0.2, z, r, PAL.lettuce);
  } },
  { id: 'cushion', name: 'cushion', size: 32, w: 30, h: 30, model(b) {
    b.ball(0, 5, 0, 15, PAL.orange, { sy: 0.33 }).ball(0, 9.7, 0, 1.6, PAL.rust, flat);
  } },
  { id: 'stool', name: 'footstool', size: 34, w: 30, h: 30, model(b) {
    b.cyl(0, 0, 14, 10, 5, PAL.mustard);
    for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) b.cyl(x, z, 1.6, 0, 10, PAL.woodDark);
  } },
  { id: 'basket', name: 'laundry basket', size: 34, w: 32, h: 24, model(b) {
    b.box(0, 0, 32, 24, 0, 13, PAL.woodLight).box(0, 0, 28, 20, 0.5, 12.6, PAL.wood, flat);
    b.ball(-6, 12, 0, 8, PAL.sky, { sy: 0.45 }).ball(6, 12, 2, 7, PAL.pink, { sy: 0.45 }).ball(1, 13, -5, 5, PAL.white, { sy: 0.45 });
  } },
  { id: 'box', name: 'cardboard box', size: 34, w: 30, h: 30, model(b) {
    b.box(0, 0, 26, 26, 0, 22, PAL.woodLight).box(0, 0, 26.4, 4, 21.9, 0.5, PAL.paper, flat).box(0, 0, 0.6, 26.2, 22, 0.3, PAL.wood, flat);
  } },

  // ---- outside: yards, sidewalks and streets ----
  { id: 'frisbee', name: 'frisbee', size: 25, w: 24, h: 24, model(b) {
    b.cyl(0, 0, 11.5, 0, 2, PAL.orange).ring(0, 2, 0, 9, 0.6, PAL.rust, flat);
  } },
  { id: 'newspaper', name: 'newspaper', size: 30, w: 30, h: 12, model(b) {
    b.rod(0, 5, 0, 5, 28, 'x', PAL.paper).rod(0, 5, 0, 5.3, 3, 'x', PAL.orange, flat);
  } },
  { id: 'gnome', name: 'garden gnome', size: 40, w: 20, h: 20, model(b) {
    b.cyl(0, 0, 7, 0, 12, PAL.sky, { r2: 8 }).ball(0, 15, 0, 5, PAL.bread).coneAt(0, 13.5, -3, 4, 7, PAL.white, { rx: Math.PI });
    b.coneAt(0, 22, 0, 5, 10, PAL.collar).ball(0, 15, -5, 1.6, PAL.pink, flat);
  } },
  { id: 'hydrant', name: 'fire hydrant', size: 45, w: 20, h: 20, model(b) {
    b.cyl(0, 0, 9, 0, 2, PAL.collar).cyl(0, 0, 6.5, 2, 18, PAL.collar).ball(0, 20, 0, 6.5, PAL.collar, { sy: 0.8 });
    b.rod(0, 13, 0, 2.5, 18, 'x', PAL.collar).cyl(0, 0, 1.5, 24, 2, PAL.mustard);
  } },
  { id: 'flamingo', name: 'lawn flamingo', size: 70, w: 20, h: 30, model(b) {
    b.cyl(-1, 4, 0.5, 0, 20, PAL.ink).cyl(1, 4, 0.5, 0, 20, PAL.ink);
    b.ball(0, 23, 3, 6, PAL.pink, { sz: 1.4 }).rod(0, 30, -4, 1.3, 10, 'z', PAL.pink, { rx: 1.0 }).ball(0, 35, -8, 2.8, PAL.pink);
    b.coneAt(0, 34, -11.5, 1.2, 3, PAL.ink, { rx: -Math.PI / 2 });
  } },
  { id: 'mailbox', name: 'mailbox', size: 60, w: 14, h: 30, model(b) {
    b.box(0, 4, 3, 3, 0, 22, PAL.wood).rod(0, 26, 0, 6, 24, 'z', PAL.navy).box(5.5, 4, 1, 2, 26, 9, PAL.collar);
  } },
  { id: 'trashcan', name: 'trash can', size: 80, w: 26, h: 26, model(b) {
    b.cyl(0, 0, 11, 0, 26, PAL.grey, { r2: 10 }).cyl(0, 0, 12, 26, 2, PAL.greyLight).box(0, 0, 6, 1.6, 28, 1.4, PAL.ink);
  } },
  { id: 'bush', name: 'bush', size: 120, w: 30, h: 30, model(b) {
    for (const [x, z, r, c] of [[0, 0, 10, PAL.lettuce], [8, 4, 7, PAL.avocadoDark], [-8, 3, 7, PAL.lettuce], [2, -8, 7, PAL.avocadoDark], [-4, 9, 6, PAL.lettuce]] as const) {
      b.ball(x, r * 0.85, z, r, c);
    }
  } },
  { id: 'lawnchair', name: 'lawn chair', size: 90, w: 20, h: 32, model(b) {
    b.box(-9, 0, 1.2, 30, 0, 6, PAL.greyLight).box(9, 0, 1.2, 30, 0, 6, PAL.greyLight);
    for (let i = 0; i < 7; i++) b.box(0, -13 + i * 4, 17, 3.4, 5, 1, i % 2 ? PAL.white : PAL.teal, flat);
    b.box(0, -14, 18, 2, 6, 12, PAL.teal);
  } },
  { id: 'bbq', name: 'barbecue grill', size: 100, w: 24, h: 24, model(b) {
    for (const a of [0, 2.1, 4.2]) b.cyl(Math.cos(a) * 6, Math.sin(a) * 6, 0.8, 0, 16, PAL.greyLight);
    b.ball(0, 20, 0, 11, PAL.dogBlack, { sy: 0.8 }).box(0, 0, 4, 1.5, 28.5, 1.5, PAL.greyLight);
  } },
  { id: 'doghouse', name: 'doghouse', size: 130, w: 30, h: 30, model(b) {
    b.box(0, 0, 26, 26, 0, 18, PAL.orange).pyramid(0, 0, 32, 32, 18, 12, PAL.woodDark);
    b.box(0, 13.1, 10, 0.4, 2, 12, PAL.ink, flat).box(0, 13.3, 8, 0.4, 15, 2, PAL.white, flat);
  } },
  { id: 'bike', name: 'bicycle', size: 170, w: 32, h: 12, model(b) {
    b.wheel(-10, 6, 0, 5.5, 0.9, PAL.ink).wheel(10, 6, 0, 5.5, 0.9, PAL.ink);
    b.rod(0, 8, 0, 0.8, 18, 'x', PAL.collar).rod(-3, 10, 0, 0.8, 11, 'x', PAL.collar, { rz: Math.PI / 2 + 0.6 });
    b.box(-4, 0, 4, 2.5, 13, 1, PAL.ink).box(9, 0, 1, 9, 14, 1, PAL.greyLight);
  } },
  { id: 'kiddiepool', name: 'kiddie pool', size: 180, w: 32, h: 32, model(b) {
    b.ring(0, 2.4, 0, 13.5, 2.4, PAL.sky).cyl(0, 0, 13.5, 0, 3.6, PAL.white, flat).cyl(0, 0, 12.5, 0.2, 3.7, PAL.tealLight, flat);
    b.ball(4, 4.2, -3, 2.4, PAL.yellow);
  } },
  { id: 'bench', name: 'park bench', size: 180, w: 32, h: 10, model(b) {
    for (const x of [-12, 12]) b.box(x, 0, 1.5, 9, 0, 7, PAL.ink);
    for (let i = 0; i < 3; i++) b.box(0, -3 + i * 2.6, 32, 2, 7, 1, PAL.woodLight);
    b.box(0, -4.5, 32, 1, 8, 6, PAL.woodLight);
  } },

  // ---- furniture: obstacles for now, dinner later ----
  { id: 'sofa', name: 'sofa', size: 200, w: 32, h: 14, furniture: true, model(b) {
    b.box(0, 0.5, 32, 13, 0, 6, PAL.rust).box(0, -5.5, 32, 3, 0, 12, PAL.rust);
    b.box(-14.5, 0.5, 3, 13, 0, 9, PAL.rust).box(14.5, 0.5, 3, 13, 0, 9, PAL.rust);
    b.box(-6.5, 1.5, 12.6, 9.5, 6, 2.4, PAL.orange).box(6.5, 1.5, 12.6, 9.5, 6, 2.4, PAL.orange);
  } },
  { id: 'armchair', name: 'armchair', size: 90, w: 30, h: 30, model(b) {
    b.box(0, 0, 30, 30, 0, 9, PAL.teal).box(0, -12, 30, 6, 0, 22, PAL.teal);
    b.box(-12.5, 2, 5, 26, 0, 15, PAL.teal).box(12.5, 2, 5, 26, 0, 15, PAL.teal);
    b.box(0, 3, 20, 20, 9, 3, PAL.tealLight);
  }, furniture: true },
  { id: 'coffeetable', name: 'coffee table', size: 110, w: 32, h: 18, furniture: true, model(b) {
    b.cyl(0, 0, 16, 6, 1.4, PAL.woodLight, { sz: 8.5 / 16 });
    for (const [x, z] of [[-9, -4], [9, -4], [-9, 4], [9, 4]]) b.cyl(x, z, 0.9, 0, 6, PAL.wood);
    b.box(-5, -1, 8, 6, 7.4, 0.5, PAL.yellow).cyl(7, 1, 2.4, 7.4, 3, PAL.white);
  } },
  { id: 'tv', name: 'TV console', size: 150, w: 32, h: 10, furniture: true, model(b) {
    b.box(0, 0, 32, 10, 0, 8, PAL.wood).box(0, -1, 12, 4, 8, 9, PAL.greyLight).box(0, 1.1, 10, 0.3, 9, 6.5, PAL.navy, flat);
    for (const x of [-13, -10.5, 10.5, 13]) b.ball(x, 5, 5, 0.9, PAL.woodDark, flat);
  } },
  { id: 'bookcase', name: 'bookcase', size: 120, w: 32, h: 10, furniture: true, model(b) {
    b.box(0, -4.5, 32, 1, 0, 20, PAL.woodDark).box(-15.5, 0, 1, 10, 0, 20, PAL.woodDark).box(15.5, 0, 1, 10, 0, 20, PAL.woodDark);
    b.box(0, 0, 32, 10, 0, 1, PAL.woodDark).box(0, 0, 32, 10, 9.5, 1, PAL.woodDark).box(0, 0, 32, 10, 19, 1.5, PAL.woodDark);
    const cols = [PAL.orange, PAL.teal, PAL.mustard, PAL.sky, PAL.pink, PAL.lettuce];
    for (let i = 0; i < 12; i++) for (const y of [1, 10.5]) b.box(-13.8 + i * 2.5, 0.5, 2.2, 8, y, 7 + ((i * 3 + y) % 2), cols[(i + y) % cols.length], flat);
  } },
  { id: 'counter', name: 'kitchen counter', size: 300, w: 32, h: 6.4, furniture: true, model(b) {
    b.box(0, 0, 32, 6.4, 0, 6, PAL.white);
  } },
  { id: 'fridge', name: 'fridge', size: 75, w: 30, h: 28, furniture: true, model(b) {
    b.box(0, 0, 30, 28, 0, 34, PAL.tealLight).box(0, 14.05, 30, 0.3, 21, 0.6, PAL.tealDark, flat);
    b.box(-11, 14.6, 2, 1.2, 9, 10, PAL.white).box(-11, 14.6, 2, 1.2, 24, 7, PAL.white);
  } },
  { id: 'table', name: 'dining table', size: 140, w: 32, h: 20, furniture: true, model(b) {
    b.box(0, 0, 32, 20, 10, 1.5, PAL.wood);
    for (const [x, z] of [[-14, -8], [14, -8], [-14, 8], [14, 8]]) b.box(x, z, 2, 2, 0, 10, PAL.woodDark);
    b.cyl(0, 0, 3.5, 11.5, 0.5, PAL.white).cyl(0, 0, 2, 12, 2.5, PAL.orange);
    b.cyl(-9, -4, 2.6, 11.5, 0.5, PAL.white).cyl(9, 4, 2.6, 11.5, 0.5, PAL.white);
  } },
  { id: 'chair', name: 'chair', size: 45, w: 30, h: 30, furniture: true, model(b) {
    b.box(0, 0, 26, 26, 14, 3, PAL.mustard).box(0, -11.5, 26, 3, 14, 18, PAL.mustardDark);
    for (const [x, z] of [[-11, -11], [11, -11], [-11, 11], [11, 11]]) b.box(x, z, 2.5, 2.5, 0, 14, PAL.woodDark);
  } },
  { id: 'roundtable', name: 'breakfast table', size: 90, w: 30, h: 30, furniture: true, model(b) {
    b.cyl(0, 0, 14, 13, 1.5, PAL.woodLight).cyl(0, 0, 1.8, 0, 13, PAL.wood).cyl(0, 0, 6, 0, 1.4, PAL.wood);
    b.cyl(-4, -3, 4, 14.5, 0.5, PAL.white).ball(-4, 15, -3, 2.2, PAL.yellow, { sy: 0.4 }).cyl(5, 4, 2.4, 14.5, 2.5, PAL.orange);
  } },
  { id: 'piano', name: 'piano', size: 150, w: 32, h: 13, furniture: true, model(b) {
    b.box(0, -2, 32, 9, 0, 16, PAL.dogBlack).box(0, 4.3, 30, 4.2, 0, 8, PAL.dogBlack);
    b.box(0, 4.3, 28, 3.4, 8, 0.6, PAL.white, flat);
    for (let i = 0; i < 13; i++) if (i % 7 !== 2 && i % 7 !== 6) b.box(-13 + i * 2.1, 3.6, 1, 2, 8.6, 0.5, PAL.ink, flat);
    b.box(0, -3, 12, 0.6, 16, 4, PAL.paper);
  } },
  { id: 'desk', name: 'desk', size: 140, w: 32, h: 16, furniture: true, model(b) {
    b.box(0, 0, 32, 16, 12, 1.5, PAL.wood).box(-14, 0, 3, 15, 0, 12, PAL.woodDark).box(14, 0, 3, 15, 0, 12, PAL.woodDark);
    b.box(0, -4, 10, 1.6, 13.5, 7, PAL.greyLight).box(0, -3.1, 8.6, 0.3, 14.3, 5.4, PAL.navy, flat);
    b.box(10, 1, 6, 8, 13.5, 0.4, PAL.white).cyl(-11, 2, 2.2, 13.5, 3, PAL.orange);
  } },
  { id: 'car', name: 'car', size: 360, w: 32, h: 14, furniture: true, model(b) {
    for (const [x, z] of [[-9, -6], [9, -6], [-9, 6], [9, 6]]) b.rod(x, 2.6, z, 2.6, 2.4, 'z', PAL.ink);
    b.box(0, 0, 32, 13, 1.5, 4.5, PAL.teal).box(-1, 0, 15, 11, 6, 4, PAL.tealLight);
    b.box(6.6, 0, 0.4, 9.6, 6.4, 3, PAL.paper, flat).box(-8.6, 0, 0.4, 9.6, 6.4, 3, PAL.paper, flat);
    b.ball(16, 4.5, -4, 1.3, PAL.yellow).ball(16, 4.5, 4, 1.3, PAL.yellow);
    b.box(-11, 0, 10, 0.6, 6, 0.3, PAL.white, flat).box(11, 0, 10, 0.6, 6, 0.3, PAL.white, flat);
  } },
  { id: 'workbench', name: 'workbench', size: 180, w: 32, h: 11, furniture: true, model(b) {
    b.box(0, 0, 32, 11, 11, 1.5, PAL.woodDark);
    for (const [x, z] of [[-14.5, -4], [14.5, -4], [-14.5, 4], [14.5, 4]]) b.box(x, z, 2, 2, 0, 11, PAL.woodDark);
    b.box(-8, -1, 8, 5, 12.5, 4, PAL.collar).box(-8, -1, 6, 1, 16.5, 0.8, PAL.ink).box(6, 0, 5, 4, 12.5, 3, PAL.grey);
  } },
  { id: 'tree', name: 'tree', size: 450, w: 32, h: 32, furniture: true, model(b) {
    b.cyl(0, 0, 2, 0, 9, PAL.woodDark, { r2: 2.6 });
    for (const [x, z, y, r, c] of [[0, 0, 15, 11, PAL.lettuce], [7, 5, 12, 8, PAL.avocadoDark], [-8, 4, 13, 8, PAL.lettuce], [3, -8, 13, 8, PAL.avocadoDark], [-5, -6, 17, 7, PAL.lettuce]] as const) {
      b.ball(x, y, z, r, c);
    }
  } },
  { id: 'dogbed', name: "Pepper's bed", size: 80, w: 30, h: 30, furniture: true, model(b) {
    b.ring(0, 2.5, 0, 11.5, 3, PAL.orange, { sy: 0.9 }).cyl(0, 0, 11, 0, 2, PAL.cream, flat).box(0, 13, 6, 1.6, 1, 3, PAL.white, flat);
  } },
  { id: 'toilet', name: 'toilet', size: 70, w: 21, h: 30, furniture: true, model(b) {
    b.box(0, -11, 20, 8, 0, 16, PAL.white).cyl(0, 4, 9, 0, 9, PAL.white, { sz: 11 / 9 }).cyl(0, 5, 5.5, 8.6, 0.6, PAL.sky, { ...flat, sz: 7.5 / 5.5 });
    b.box(0, -11, 6, 2, 16, 0.6, PAL.greyLight, flat);
  } },
  { id: 'bathtub', name: 'bathtub', size: 140, w: 32, h: 15, furniture: true, model(b) {
    b.box(0, 0, 32, 15, 0, 9, PAL.pink).box(0, 0, 27, 10.6, 8.7, 0.5, PAL.white, flat).box(0, 0, 24, 7.6, 8.9, 0.5, PAL.sky, flat);
    b.rod(13.5, 10, 0, 0.8, 3, 'x', PAL.greyLight).ball(-8, 9.4, -1, 1.6, PAL.white, flat);
  } },
  { id: 'sink', name: 'bathroom sink', size: 90, w: 32, h: 18, furniture: true, model(b) {
    b.box(0, 0, 32, 18, 0, 14, PAL.pink).cyl(0, 1, 7.5, 14, 0.5, PAL.white, { sz: 0.73 }).cyl(0, 1.5, 5, 14.3, 0.4, PAL.sky, { ...flat, sz: 0.7 });
    b.box(0, -6, 2, 4, 14, 3, PAL.greyLight).box(11.5, -1, 5, 7, 14, 2.5, PAL.mustard);
  } },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((d) => [d.id, d]));
