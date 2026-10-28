// Phase 1 house layout. Step 2 of the plan replaces this with a generated house.

export interface Box { x: number; y: number; w: number; h: number }

export interface FurnitureSpot { id: string; x: number; y: number; rot: 0 | 90 | 180 | 270 }

export interface HouseLayout {
  /** Interior size; walls sit just outside it. */
  width: number;
  height: number;
  wallThickness: number;
  walls: Box[];
  floors: { box: Box; texture: string }[];
  furniture: FurnitureSpot[];
  /** Areas where loose items get scattered. */
  rooms: Box[];
  /** The dog door: a gap in the right-hand wall. */
  door: { x: number; y: number; half: number };
  spawn: { x: number; y: number };
}

export function buildHouse(): HouseLayout {
  const W = 900, H = 650, T = 14;
  const divX = 520, gapTop = 250, gapBottom = 370;
  const door = { x: W, y: 470, half: 34 };

  return {
    width: W,
    height: H,
    wallThickness: T,
    walls: [
      { x: -T, y: -T, w: W + T * 2, h: T },
      { x: -T, y: H, w: W + T * 2, h: T },
      { x: -T, y: 0, w: T, h: H },
      { x: W, y: 0, w: T, h: door.y - door.half },
      { x: W, y: door.y + door.half, w: T, h: H - door.y - door.half },
      { x: divX, y: 0, w: 12, h: gapTop },
      { x: divX, y: gapBottom, w: 12, h: H - gapBottom },
    ],
    floors: [
      { box: { x: 0, y: 0, w: divX + 6, h: H }, texture: 'floor-carpet' },
      { box: { x: divX + 6, y: 0, w: W - divX - 6, h: H }, texture: 'floor-kitchen' },
    ],
    furniture: [
      // Living room
      { id: 'sofa', x: 230, y: 58, rot: 0 },
      { id: 'coffeetable', x: 230, y: 190, rot: 0 },
      { id: 'armchair', x: 70, y: 300, rot: 270 },
      { id: 'tv', x: 250, y: 620, rot: 180 },
      { id: 'bookcase', x: 20, y: 520, rot: 270 },
      // Kitchen
      { id: 'counter', x: 690, y: 32, rot: 0 },
      { id: 'fridge', x: 860, y: 608, rot: 0 },
      { id: 'table', x: 715, y: 330, rot: 0 },
      { id: 'chair', x: 680, y: 262, rot: 0 },
      { id: 'chair', x: 750, y: 262, rot: 0 },
      { id: 'chair', x: 680, y: 398, rot: 180 },
      { id: 'chair', x: 750, y: 398, rot: 180 },
    ],
    rooms: [
      { x: 16, y: 16, w: divX - 32, h: H - 32 },
      { x: divX + 28, y: 16, w: W - divX - 44, h: H - 32 },
      { x: divX - 20, y: gapTop + 10, w: 52, h: gapBottom - gapTop - 20 },
    ],
    door,
    spawn: { x: 270, y: 380 },
  };
}

/** How many loose items of each kind to scatter around the house. */
export const SCATTER: Record<string, number> = {
  crumb: 50, kibble: 30, cheerio: 30, coin: 14, button: 16, pea: 25,
  cookie: 12, ball: 8, donut: 7, crayon: 10, mouse: 7, bone: 7, sock: 10, sandwich: 6,
  banana: 5, truck: 6, book: 7, teddy: 5, slipper: 6,
  plant: 3, cushion: 5, stool: 3, basket: 3,
};

/** Little spills of tiny food, so a puppy always has a snack trail nearby. */
export const PILES: { id: string; piles: number; each: number; spread: number }[] = [
  { id: 'kibble', piles: 7, each: 14, spread: 22 },
  { id: 'cheerio', piles: 6, each: 12, spread: 24 },
  { id: 'crumb', piles: 8, each: 10, spread: 18 },
  { id: 'pea', piles: 4, each: 9, spread: 14 },
];
