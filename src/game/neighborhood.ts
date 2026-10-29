// Phase 2 level: the neighborhood outside Pepper's house.
// For now it's a made-up suburb of blocks, yards and houses, laid out fresh each
// run. A real street map can replace `buildNeighborhood` later without the game
// noticing, as long as it returns the same kind of Level.

import { PAL } from '../art/palette';
import type { Box, Building, FurnitureSpot, Level, Pt, Seg } from './level';

const ROAD = 700;
const WALK = 180;
const LOT = 1500;
const LOTS_X = 3;
const BLOCK_W = LOT * LOTS_X;
const BLOCK_H = LOT * 2;
const PX = ROAD + WALK * 2 + BLOCK_W;
const PY = ROAD + WALK * 2 + BLOCK_H;
const BLOCKS_X = 3;
const BLOCKS_Y = 3;
const SETBACK = 450;
const FENCE_T = 8;

const WALLS = [PAL.pink, PAL.sky, PAL.mustard, PAL.cream, PAL.tealLight, PAL.white];
const ROOFS = [PAL.rust, PAL.woodDark, PAL.navy, PAL.tealDark, PAL.grey];

const rect = (b: Box): Pt[] => [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function buildNeighborhood(): Level {
  const W = BLOCKS_X * PX + ROAD, H = BLOCKS_Y * PY + ROAD;
  const sidewalks: Box[] = [], roads: Box[] = [], driveways: Box[] = [];
  const marks: Level['marks'] = [];
  const buildings: Building[] = [];
  const walls: Seg[] = [];
  const furniture: FurnitureSpot[] = [];
  const rooms: Level['rooms'] = [];
  const doorways: Pt[] = [];

  // Streets in a grid, with a dashed line down the middle
  for (let i = 0; i <= BLOCKS_X; i++) roads.push({ x: i * PX, y: 0, w: ROAD, h: H });
  for (let j = 0; j <= BLOCKS_Y; j++) roads.push({ x: 0, y: j * PY, w: W, h: ROAD });
  const onCross = (x: number, y: number) => (x % PX) < ROAD + 100 && (y % PY) < ROAD + 100;
  for (let i = 0; i <= BLOCKS_X; i++) {
    for (let y = 0; y < H; y += 600) if (!onCross(i * PX + ROAD / 2, y + 150) && !onCross(i * PX + ROAD / 2, y + 450)) {
      marks.push({ box: { x: i * PX + ROAD / 2 - 7, y: y + 150, w: 14, h: 300 }, color: PAL.yellow });
    }
  }
  for (let j = 0; j <= BLOCKS_Y; j++) {
    for (let x = 0; x < W; x += 600) if (!onCross(x + 150, j * PY + ROAD / 2) && !onCross(x + 450, j * PY + ROAD / 2)) {
      marks.push({ box: { x: x + 150, y: j * PY + ROAD / 2 - 7, w: 300, h: 14 }, color: PAL.yellow });
    }
  }

  let home: Box | null = null;
  for (let by = 0; by < BLOCKS_Y; by++) for (let bx = 0; bx < BLOCKS_X; bx++) {
    const x0 = bx * PX + ROAD, y0 = by * PY + ROAD;
    // Sidewalk around the block, and the grass inside it
    const sw = { x: x0, y: y0, w: PX - ROAD, h: PY - ROAD };
    sidewalks.push(
      { x: sw.x, y: sw.y, w: sw.w, h: WALK }, { x: sw.x, y: sw.y + sw.h - WALK, w: sw.w, h: WALK },
      { x: sw.x, y: sw.y, w: WALK, h: sw.h }, { x: sw.x + sw.w - WALK, y: sw.y, w: WALK, h: sw.h },
    );
    rooms.push(
      { box: { x: sw.x, y: sw.y, w: sw.w, h: WALK } }, { box: { x: sw.x, y: sw.y + sw.h - WALK, w: sw.w, h: WALK } },
    );
    const bx0 = x0 + WALK, by0 = y0 + WALK, mid = by0 + LOT;

    // Back fence down the middle of the block, with a gate into every backyard
    const gates = Array.from({ length: LOTS_X }, (_, c) => bx0 + c * LOT + rand(300, LOT - 500));
    let fx = bx0;
    for (const g of gates) { walls.push({ a: [fx, mid], b: [g, mid], t: FENCE_T }); doorways.push([g + 100, mid]); fx = g + 200; }
    walls.push({ a: [fx, mid], b: [bx0 + BLOCK_W, mid], t: FENCE_T });

    for (let row = 0; row < 2; row++) for (let c = 0; c < LOTS_X; c++) {
      const lot: Box = { x: bx0 + c * LOT, y: by0 + row * LOT, w: LOT, h: LOT };
      const hw = rand(820, 980), hd = rand(680, 800);
      const hx = lot.x + (LOT - hw) / 2;
      // Row 0 faces the street above it, row 1 the street below.
      const hy = row === 0 ? lot.y + SETBACK : lot.y + LOT - SETBACK - hd;
      const house: Box = { x: hx, y: hy, w: hw, h: hd };
      buildings.push({ poly: rect(house), height: rand(240, 300), wall: pick(WALLS), roof: pick(ROOFS) });
      if (bx === 1 && by === 1 && row === 0 && c === 1) home = house;

      // Driveway from the garage end of the house to the sidewalk, sometimes with a car on it
      const dw: Box = row === 0
        ? { x: hx + hw - 320, y: lot.y, w: 300, h: SETBACK }
        : { x: hx + hw - 320, y: hy + hd, w: 300, h: SETBACK };
      driveways.push(dw);
      if (Math.random() < 0.55) furniture.push({ id: 'car', x: dw.x + dw.w / 2, y: dw.y + dw.h / 2, rot: 90 });

      // Side fences around the backyard, stopping at the back of the house
      const backY = row === 0 ? hy + hd : hy;
      if (c > 0) walls.push({ a: [lot.x, mid], b: [lot.x, backY + (row === 0 ? 120 : -120)], t: FENCE_T });

      // Front yard and backyard, each with their own kind of clutter, and a tree or two
      const front: Box = row === 0 ? { x: lot.x, y: lot.y, w: LOT, h: SETBACK } : { x: lot.x, y: hy + hd, w: LOT, h: SETBACK };
      const back: Box = row === 0 ? { x: lot.x, y: hy + hd, w: LOT, h: mid - hy - hd } : { x: lot.x, y: mid, w: LOT, h: hy - mid };
      rooms.push({ box: front, extras: { gnome: 1, flamingo: Math.random() < 0.4 ? 2 : 0, mailbox: 1, newspaper: 1 } });
      rooms.push({ box: back, extras: { bbq: Math.random() < 0.5 ? 1 : 0, lawnchair: 2, kiddiepool: Math.random() < 0.3 ? 1 : 0, doghouse: Math.random() < 0.3 ? 1 : 0, bike: 1, frisbee: 2 } });
      const tx = Math.random() < 0.5 ? lot.x + 260 : lot.x + LOT - 260;
      furniture.push({ id: 'tree', x: tx, y: back.y + back.h / 2 + rand(-80, 80), rot: 0 });
      if (Math.random() < 0.5) furniture.push({ id: 'tree', x: lot.x + rand(200, 500), y: front.y + front.h / 2, rot: 0 });
    }
  }

  // Pepper comes out of the dog door on the side of her house, by the driveway
  const h = home!;
  const spawn = { x: h.x + h.w + 90, y: h.y + h.h * 0.6 };

  const floors = [
    ...sidewalks.map((b) => ({ poly: rect(b), texture: 'floor-sidewalk' })),
    ...driveways.map((b) => ({ poly: rect(b), texture: 'floor-sidewalk' })),
    ...roads.map((b) => ({ poly: rect(b), texture: 'floor-asphalt' })),
  ];
  for (const r of roads) rooms.push({ box: r, extras: {} });

  return {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls, wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings,
    floors, marks, furniture, decals: [], rooms, doorways,
    wallThickness: FENCE_T, spawn,
    catcherSpawns: Array.from({ length: (BLOCKS_X + 1) * (BLOCKS_Y + 1) }, (_, i): Pt => [
      (i % (BLOCKS_X + 1)) * PX + ROAD / 2, Math.floor(i / (BLOCKS_X + 1)) * PY + ROAD / 2,
    ]),
    scatter: {
      ball: 40, frisbee: 30, newspaper: 30, sock: 30, shoe: 30, sandwich: 40, bone: 40, can: 30, donut: 40,
      book: 20, teddy: 20, slipper: 20, plant: 30, cushion: 20, box: 30, basket: 20, stool: 15,
      gnome: 30, hydrant: 20, flamingo: 20, mailbox: 15, trashcan: 50, bush: 90, lawnchair: 30, bbq: 20,
      doghouse: 15, bike: 30, kiddiepool: 15, bench: 20,
    },
    piles: [
      { id: 'cookie', piles: 20, each: 10, spread: 90 },
      { id: 'donut', piles: 12, each: 6, spread: 80 },
      { id: 'sandwich', piles: 10, each: 5, spread: 90 },
    ],
  };
}
