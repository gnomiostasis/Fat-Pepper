import { PAL, darken } from './palette';
import { Pen, Pt, circ, ell, rect, rrect } from './pen';

/**
 * Everything Pepper can bump into or eat. Drawn top-down in a local box of
 * `w` x `h` units centred on 0,0; `size` is the real-world longest side in cm.
 */
export interface ItemDef {
  id: string;
  name: string;
  size: number;
  w: number;
  h: number;
  /** Furniture is placed by the level layout and collides as a rectangle. */
  furniture?: boolean;
  draw(g: Pen): void;
}

const I = PAL.ink;

export const ITEMS: ItemDef[] = [
  // ---- crumbs and bits (eaten by a tiny puppy) ----
  { id: 'crumb', name: 'crumb', size: 3, w: 16, h: 16, draw(g) {
    g.fill(circ(-3, -2, 4), PAL.bread); g.fill(circ(4, 1, 3), PAL.bread); g.fill(circ(-1, 5, 2.5), PAL.breadIn);
  } },
  { id: 'kibble', name: 'kibble', size: 2.5, w: 14, h: 14, draw(g) {
    g.fill(circ(0, 0, 6), PAL.woodDark); g.fill(circ(0, 0, 1.8), darken(PAL.woodDark, 0.4), { plain: true });
  } },
  { id: 'cheerio', name: 'cereal loop', size: 2.5, w: 14, h: 14, draw(g) {
    g.fill(circ(0, 0, 6.5), PAL.mustard); g.fill(circ(0, 0, 2.4), PAL.mustardDark, { plain: true });
  } },
  { id: 'coin', name: 'penny', size: 2, w: 14, h: 14, draw(g) {
    g.fill(circ(0, 0, 6.5), PAL.woodLight); g.line(circ(0, 0, 4.2), PAL.wood, 1, true);
  } },
  { id: 'button', name: 'button', size: 3, w: 14, h: 14, draw(g) {
    g.fill(circ(0, 0, 6.5), PAL.teal);
    for (const [x, y] of [[-1.8, -1.8], [1.8, -1.8], [-1.8, 1.8], [1.8, 1.8]]) g.fill(circ(x, y, 1), PAL.tealDark, { plain: true });
  } },
  { id: 'pea', name: 'pea', size: 1.5, w: 12, h: 12, draw(g) {
    g.fill(circ(0, 0, 5), PAL.lettuce);
  } },

  // ---- small stuff ----
  { id: 'cookie', name: 'cookie', size: 7, w: 20, h: 20, draw(g) {
    g.fill(circ(0, 0, 9), PAL.bread);
    for (const [x, y] of [[-3, -3], [3, -1], [-1, 4], [4, 4], [-5, 2]]) g.fill(circ(x, y, 1.4), PAL.woodDark, { plain: true });
  } },
  { id: 'ball', name: 'tennis ball', size: 7, w: 20, h: 20, draw(g) {
    g.fill(circ(0, 0, 9), '#cfe04a');
    g.line([[-7, -5], [-2, 0], [-7, 5]], PAL.white, 1.6); g.line([[7, -5], [2, 0], [7, 5]], PAL.white, 1.6);
  } },
  { id: 'donut', name: 'donut', size: 9, w: 24, h: 24, draw(g) {
    g.fill(circ(0, 0, 11), PAL.woodLight); g.fill(circ(0, 0, 8.6), PAL.pink, { outline: false });
    g.fill(circ(0, 0, 3.6), PAL.paper);
    const cols = [PAL.white, PAL.sky, PAL.yellow];
    for (let i = 0; i < 8; i++) { const t = (i / 8) * 6.28, d = 6.2; g.line([[Math.cos(t) * d, Math.sin(t) * d], [Math.cos(t) * d + 1.6, Math.sin(t) * d + 1]], cols[i % 3], 1.4); }
  } },
  { id: 'crayon', name: 'crayon', size: 9, w: 7, h: 28, draw(g) {
    g.fill(rect(-3, -8, 6, 20), PAL.orange); g.fill([[-3, -8], [3, -8], [0, -13]], PAL.orange);
    g.line([[-3, -3], [3, -3]], I, 1); g.line([[-3, 8], [3, 8]], I, 1);
  } },
  { id: 'mouse', name: 'squeaky mouse', size: 10, w: 16, h: 28, draw(g) {
    g.line([[0, 7], [3, 11], [0, 13]], PAL.pink, 1.4);
    g.fill(ell(0, 0, 6, 8.5), PAL.greyLight);
    g.fill(circ(-4.5, -5, 3), PAL.pink); g.fill(circ(4.5, -5, 3), PAL.pink);
    g.fill(circ(0, -8.5, 1.2), I, { plain: true });
  } },
  { id: 'bone', name: 'chew bone', size: 13, w: 30, h: 12, draw(g) {
    for (const [x, y] of [[-11, -3.5], [-11, 3.5], [11, -3.5], [11, 3.5]]) g.fill(circ(x, y, 4.2), PAL.white);
    g.fill(rect(-11, -3.2, 22, 6.4), PAL.white, { outline: false });
    g.line([[-11, -3.2], [11, -3.2]], I, 1.1); g.line([[-11, 3.2], [11, 3.2]], I, 1.1);
  } },
  { id: 'sock', name: 'sock', size: 14, w: 20, h: 28, draw(g) {
    const p: Pt[] = [[-5, -13], [5, -13], [5, 3], [9, 6], [9, 12], [-5, 12]];
    g.fill(p, PAL.orange); g.fill(rect(-5, -9, 10, 3.5), PAL.white, { plain: true });
  } },
  { id: 'sandwich', name: 'sandwich', size: 14, w: 28, h: 24, draw(g) {
    g.line([[-12, 10], [12, 10]], PAL.lettuce, 3.4);
    g.fill([[-13, 9], [13, 9], [0, -11]], PAL.bread); g.fill([[-9, 6.5], [9, 6.5], [0, -6.5]], PAL.breadIn, { plain: true });
  } },

  // ---- medium stuff ----
  { id: 'banana', name: 'banana', size: 18, w: 30, h: 16, draw(g) {
    const p: Pt[] = [];
    for (let i = 0; i <= 12; i++) { const t = Math.PI * (0.15 + 0.7 * i / 12); p.push([Math.cos(t) * -13, 6 - Math.sin(t) * 10]); }
    for (let i = 12; i >= 0; i--) { const t = Math.PI * (0.15 + 0.7 * i / 12); p.push([Math.cos(t) * -11, 6 - Math.sin(t) * 6]); }
    g.fill(p, PAL.yellow);
  } },
  { id: 'truck', name: 'toy truck', size: 20, w: 18, h: 30, draw(g) {
    for (const [x, y] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) g.fill(rect(x - 2, y - 3.5, 4, 7), I, { plain: true });
    g.fill(rrect(-7, -13, 14, 9, 2), PAL.sky); g.fill(rect(-7, -3, 14, 16), PAL.orange);
    g.fill(rect(-5, -11.5, 10, 3), PAL.paper, { plain: true });
  } },
  { id: 'book', name: 'comic book', size: 22, w: 24, h: 30, draw(g) {
    g.fill(rect(-11, -14, 22, 28), PAL.teal); g.fill(rect(-11, -14, 4, 28), PAL.tealDark);
    g.fill(circ(3, -3, 6), PAL.yellow); g.line([[-3, 6], [9, 6]], PAL.white, 1.8); g.line([[-3, 9.5], [7, 9.5]], PAL.white, 1.8);
  } },
  { id: 'teddy', name: 'teddy bear', size: 24, w: 26, h: 30, draw(g) {
    g.fill(circ(-8, 6, 4), PAL.wood); g.fill(circ(8, 6, 4), PAL.wood);
    g.fill(ell(0, 4, 8, 9), PAL.wood); g.fill(circ(-6, -12, 3.5), PAL.wood); g.fill(circ(6, -12, 3.5), PAL.wood);
    g.fill(circ(0, -7, 7.5), PAL.wood); g.fill(ell(0, -4.5, 3, 2.2), PAL.woodLight);
    g.fill(circ(-2.6, -8.5, 0.9), I, { plain: true }); g.fill(circ(2.6, -8.5, 0.9), I, { plain: true });
  } },
  { id: 'slipper', name: 'fuzzy slipper', size: 26, w: 16, h: 30, draw(g) {
    g.fill(ell(0, 1, 6.5, 13.5), PAL.pink); g.fill(ell(0, -5, 5.5, 6), PAL.white, { outline: false });
    g.fill(circ(0, -9, 3.2), PAL.white);
  } },

  // ---- big stuff (needed to reach dog door size) ----
  { id: 'plant', name: 'potted plant', size: 30, w: 30, h: 30, draw(g) {
    g.fill(circ(0, 0, 9), PAL.rust);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; g.push(0, 0, a); g.fill(ell(0, -8, 3.4, 7), i % 2 ? PAL.teal : PAL.tealLight); g.pop(); }
    g.fill(circ(0, 0, 3.5), PAL.tealDark);
  } },
  { id: 'cushion', name: 'cushion', size: 32, w: 30, h: 30, draw(g) {
    g.fill(rrect(-13, -13, 26, 26, 6), PAL.mustard);
    g.line([[-13, 0], [13, 0]], PAL.mustardDark, 1); g.line([[0, -13], [0, 13]], PAL.mustardDark, 1);
    g.fill(circ(0, 0, 2), PAL.orange);
  } },
  { id: 'stool', name: 'footstool', size: 34, w: 30, h: 30, draw(g) {
    g.fill(circ(0, 0, 13.5), PAL.teal);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28; g.fill(circ(Math.cos(a) * 7, Math.sin(a) * 7, 1.1), PAL.tealDark, { plain: true }); }
    g.fill(circ(0, 0, 1.3), PAL.tealDark, { plain: true });
  } },
  { id: 'basket', name: 'laundry basket', size: 34, w: 32, h: 24, draw(g) {
    g.fill(rrect(-15, -11, 30, 22, 4), PAL.woodLight);
    g.fill(ell(-5, -2, 7, 5), PAL.sky); g.fill(ell(4, 1, 7, 5), PAL.orange); g.fill(ell(-1, 5, 5, 3), PAL.white);
    for (const x of [-10, 10]) g.line([[x, -11], [x, 11]], PAL.wood, 1.2);
  } },

  // ---- furniture: obstacles for now, dinner later ----
  { id: 'sofa', name: 'sofa', size: 200, w: 32, h: 14, furniture: true, draw(g) {
    g.fill(rrect(-16, -7, 32, 14, 2.5), PAL.orange);
    g.fill(rrect(-14, -3, 13.6, 9, 1.5), PAL.orange); g.fill(rrect(0.4, -3, 13.6, 9, 1.5), PAL.orange);
    g.line([[-15, -3.5], [15, -3.5]], PAL.rust, 0.8);
  } },
  { id: 'armchair', name: 'armchair', size: 90, w: 30, h: 30, furniture: true, draw(g) {
    g.fill(rrect(-15, -15, 30, 30, 5), PAL.teal); g.fill(rrect(-10, -7, 20, 20, 3), PAL.tealLight);
    g.fill(circ(0, 3, 1.5), PAL.tealDark, { plain: true });
  } },
  { id: 'coffeetable', name: 'coffee table', size: 110, w: 32, h: 18, furniture: true, draw(g) {
    g.fill(ell(0, 0, 16, 8.5), PAL.woodLight);
    g.fill(rect(-9, -4, 8, 6), PAL.yellow); g.fill(circ(7, 1, 2.5), PAL.white);
  } },
  { id: 'tv', name: 'TV console', size: 150, w: 32, h: 10, furniture: true, draw(g) {
    g.fill(rect(-16, -5, 32, 10), PAL.wood);
    g.fill(rrect(-6, -3.8, 12, 6, 1), PAL.greyLight); g.fill(rect(-4.5, -2.8, 9, 3.2), PAL.navy, { plain: true });
    for (const x of [-13, -10.5, 10.5, 13]) g.fill(circ(x, 0, 0.9), PAL.woodDark, { plain: true });
  } },
  { id: 'bookcase', name: 'bookcase', size: 120, w: 32, h: 10, furniture: true, draw(g) {
    g.fill(rect(-16, -5, 32, 10), PAL.woodDark);
    const cols = [PAL.orange, PAL.teal, PAL.mustard, PAL.sky, PAL.pink, PAL.lettuce];
    for (let i = 0; i < 12; i++) g.fill(rect(-15 + i * 2.5, -4, 2.2, 7), cols[i % cols.length], { plain: true });
  } },
  { id: 'counter', name: 'kitchen counter', size: 300, w: 32, h: 6.4, furniture: true, draw(g) {
    g.fill(rect(-16, -3.2, 32, 6.4), PAL.white);
    g.fill(rrect(-9, -2.4, 6, 4.8, 1), PAL.greyLight); g.fill(circ(-6, 0, 0.5), I, { plain: true });
    for (const [x, y] of [[5, -1.2], [8, -1.2], [5, 1.2], [8, 1.2]]) g.line(circ(x, y, 1), I, 0.35, true);
  } },
  { id: 'fridge', name: 'fridge', size: 75, w: 30, h: 28, furniture: true, draw(g) {
    g.fill(rrect(-15, -14, 30, 28, 3), PAL.tealLight); g.line([[-15, 4], [15, 4]], PAL.tealDark, 1);
    g.fill(rect(-12, -10, 3, 9), PAL.white, { plain: true });
  } },
  { id: 'table', name: 'dining table', size: 140, w: 32, h: 20, furniture: true, draw(g) {
    g.fill(rrect(-16, -10, 32, 20, 2), PAL.wood);
    g.fill(circ(0, 0, 3.5), PAL.white); g.fill(circ(0, 0, 2), PAL.orange, { plain: true });
    g.fill(circ(-9, -4, 2.6), PAL.white); g.fill(circ(9, 4, 2.6), PAL.white);
  } },
  { id: 'chair', name: 'chair', size: 45, w: 30, h: 30, furniture: true, draw(g) {
    g.fill(rrect(-13, -13, 26, 26, 3), PAL.mustard); g.fill(rect(-13, -13, 26, 6), PAL.mustardDark);
  } },
];

export const ITEM_BY_ID: Record<string, ItemDef> = Object.fromEntries(ITEMS.map((d) => [d.id, d]));
