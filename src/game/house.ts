// Phase 1 level: Pepper's real house, traced from the floor plan the owner drew.
// Coordinates below are in pixels of that drawing; `S` turns them into centimetres.

export interface Box { x: number; y: number; w: number; h: number }
export type Pt = [number, number];

/** A straight wall (or counter) of thickness `t`, from `a` to `b`. */
export interface Seg { a: Pt; b: Pt; t: number }

export interface FurnitureSpot { id: string; x: number; y: number; rot: 0 | 90 | 180 | 270 }

export interface HouseLayout {
  /** Outer extent of the house. */
  bounds: Box;
  walls: Seg[];
  /** The closed front door, drawn as a door rather than a wall. */
  frontDoor: Seg;
  /** Kitchen counter: solid, drawn as countertop. */
  counters: Seg[];
  stairs: Box;
  floors: { poly: Pt[]; texture: string }[];
  furniture: FurnitureSpot[];
  /** Flat things on the floor that Pepper walks over. */
  decals: FurnitureSpot[];
  /** Areas where loose items get scattered, with optional extras just for that room. */
  rooms: { box: Box; extras?: Record<string, number> }[];
  /** Openings between rooms; big items are kept out of them so Pepper never gets stuck. */
  doorways: Pt[];
  /** The dog door: a gap in the garage's outside wall. `x` is the wall's inner face. */
  door: { x: number; y: number; half: number };
  wallThickness: number;
  spawn: { x: number; y: number };
}

/** Centimetres per pixel of the floor plan drawing. */
const S = 1.2;
const OX = 180, OY = 140;
const P = (x: number, y: number): Pt => [(x - OX) * S, (y - OY) * S];
const X = (x: number) => (x - OX) * S;
const Y = (y: number) => (y - OY) * S;
const box = (x0: number, y0: number, x1: number, y1: number): Box => ({ x: X(x0), y: Y(y0), w: (x1 - x0) * S, h: (y1 - y0) * S });
const spot = (id: string, x: number, y: number, rot: FurnitureSpot['rot'] = 0): FurnitureSpot => ({ id, x: X(x), y: Y(y), rot });

const T = 14;

/** Walls as a chain of points, split into segments. */
function chain(...pts: [number, number][]): Seg[] {
  const out: Seg[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push({ a: P(...pts[i]), b: P(...pts[i + 1]), t: T });
  return out;
}

export function buildHouse(): HouseLayout {
  const doorWallX = 1215;

  const walls: Seg[] = [
    // Outside: dining nook, across the top, down the garage to the dog door
    ...chain([405, 305], [405, 200], [455, 153], [525, 153], [565, 195], [565, 243], [doorWallX, 243], [doorWallX, 578]),
    ...chain([doorWallX, 632], [doorWallX, 975], [855, 975], [855, 830], [647, 830], [647, 785], [595, 785]),
    ...chain([537, 785], [187, 785], [187, 305], [405, 305]),
    // Kitchen / dining divider, open at the bottom
    ...chain([405, 305], [405, 410]),
    // Dining room / piano room stubs
    ...chain([187, 532], [227, 532]),
    ...chain([360, 533], [400, 533]),
    // Living room / garage, and the living room's bottom wall with the pantry door
    ...chain([978, 243], [978, 560], [935, 560]),
    ...chain([862, 560], [715, 560]),
    // Office: angled corner with its door, then down to the entry opening
    ...chain([715, 560], [700, 573]),
    ...chain([656, 612], [647, 628], [647, 738]),
    // Pantry: left and bottom walls, a short stub on the right, and a wide-open door into the garage
    ...chain([855, 560], [855, 637], [940, 637]),
    ...chain([940, 560], [940, 566]),
  ];

  const frontDoor: Seg = { a: P(537, 785), b: P(595, 785), t: T };

  // The curved kitchen peninsula, traced along its middle
  const counters: Seg[] = chain([400, 503], [575, 503], [625, 452], [622, 388], [570, 342], [505, 342])
    .map((s) => ({ ...s, t: 36 }));

  const doorY = 605;

  return {
    bounds: box(187, 153, doorWallX, 975),
    walls,
    frontDoor,
    counters,
    stairs: box(400, 518, 480, 688),
    floors: [
      // Wood through the dining room, piano room, entry and under everything else
      { texture: 'floor-wood', poly: [P(187, 305), P(405, 305), P(405, 243), P(978, 243), P(978, 560), P(855, 560), P(855, 830), P(647, 830), P(647, 785), P(187, 785)] },
      // Kitchen and dining nook
      { texture: 'floor-kitchen', poly: [P(405, 305), P(405, 200), P(455, 153), P(525, 153), P(565, 195), P(565, 243), P(640, 243), P(640, 515), P(405, 515)] },
      { texture: 'floor-carpet', poly: [P(640, 243), P(978, 243), P(978, 560), P(640, 560)] },
      { texture: 'floor-office', poly: [P(715, 560), P(855, 560), P(855, 830), P(647, 830), P(647, 628)] },
      { texture: 'floor-garage', poly: [P(978, 243), P(doorWallX, 243), P(doorWallX, 975), P(855, 975), P(855, 560), P(978, 560)] },
      { texture: 'floor-kitchen', poly: [P(855, 560), P(940, 560), P(940, 637), P(855, 637)] },
    ],
    furniture: [
      // Living room
      spot('sofa', 810, 282),
      spot('coffeetable', 810, 372),
      spot('armchair', 690, 330, 90),
      spot('tv', 958, 410, 270),
      // Dining nook
      spot('roundtable', 485, 232),
      spot('chair', 438, 232, 270),
      spot('chair', 532, 232, 90),
      // Kitchen
      spot('fridge', 435, 335, 90),
      // Dining room
      spot('table', 292, 420),
      spot('chair', 255, 372), spot('chair', 330, 372),
      spot('chair', 255, 468, 180), spot('chair', 330, 468, 180),
      // Piano room
      spot('piano', 260, 752),
      spot('armchair', 345, 600, 180),
      // Office
      spot('desk', 760, 800, 180),
      spot('chair', 760, 760, 180),
      spot('bookcase', 838, 690, 90),
      // Garage
      spot('car', 1030, 880),
      spot('workbench', 1188, 380, 90),
    ],
    decals: [spot('dogbed', 870, 470)],
    rooms: [
      { box: box(196, 314, 398, 525) },                                   // dining room
      { box: box(196, 542, 394, 776) },                                   // piano room
      { box: box(412, 250, 600, 492), extras: { kibble: 8 } },             // kitchen
      { box: box(415, 205, 558, 300) },                                   // dining nook
      { box: box(648, 250, 970, 552) },                                   // living room
      { box: box(486, 522, 640, 776), extras: { shoe: 5 } },              // entry way
      { box: box(656, 632, 848, 822) },                                   // office
      { box: box(862, 567, 933, 630), extras: { can: 6, cheerio: 6 } },   // pantry
      { box: box(986, 250, 1207, 556), extras: { box: 4, can: 2 } },      // garage, top
      { box: box(862, 645, 1207, 830), extras: { box: 3 } },              // garage, bottom
    ],
    doorways: [P(899, 560), P(940, 600), P(678, 593), P(647, 762), P(438, 440), P(440, 736), P(293, 532), P(560, 280)],
    door: { x: X(doorWallX) - T / 2, y: Y(doorY), half: ((632 - 578) / 2) * S },
    wallThickness: T,
    spawn: { x: X(870), y: Y(470) },
  };
}

/** How many loose items of each kind to scatter around the house. */
export const SCATTER: Record<string, number> = {
  crumb: 80, kibble: 50, cheerio: 45, coin: 22, button: 26, pea: 40,
  cookie: 20, ball: 14, donut: 12, crayon: 16, mouse: 12, bone: 12, sock: 16, sandwich: 10, can: 4,
  banana: 8, truck: 10, book: 12, teddy: 8, slipper: 10, shoe: 4,
  plant: 6, cushion: 8, stool: 5, basket: 5, box: 2,
};

/** Little spills of tiny food, so a puppy always has a snack trail nearby. */
export const PILES: { id: string; piles: number; each: number; spread: number }[] = [
  { id: 'kibble', piles: 12, each: 14, spread: 22 },
  { id: 'cheerio', piles: 10, each: 12, spread: 24 },
  { id: 'crumb', piles: 13, each: 10, spread: 18 },
  { id: 'pea', piles: 7, each: 9, spread: 14 },
];
