// The shape of a level: Pepper's house in Phase 1, the neighborhood in Phase 2.
// Everything is in centimetres, top-down, with y running down the screen.

export interface Box { x: number; y: number; w: number; h: number }
export type Pt = [number, number];

/** A straight wall (or counter, or fence) of thickness `t`, from `a` to `b`. */
export interface Seg { a: Pt; b: Pt; t: number }

export interface FurnitureSpot { id: string; x: number; y: number; rot: 0 | 90 | 180 | 270 }

/** A building seen from outside: a solid block with a roof. */
export interface Building { poly: Pt[]; height: number; wall: string; roof: string }

export interface Level {
  /** Outer extent of the playable area. */
  bounds: Box;
  walls: Seg[];
  wallStyle: { color: string; height: number };
  /** Kitchen counter: solid, drawn as countertop. */
  counters: Seg[];
  /** The closed front door, drawn as a door rather than a wall. */
  frontDoor?: Seg;
  stairs?: Box;
  buildings: Building[];
  floors: { poly: Pt[]; texture: string }[];
  /** Paint on the ground, like the dashes down the middle of a street. */
  marks: { box: Box; color: string }[];
  furniture: FurnitureSpot[];
  /** Flat things on the floor that Pepper walks over. */
  decals: FurnitureSpot[];
  /** Areas where loose items get scattered, with optional extras just for that area. */
  rooms: { box: Box; extras?: Record<string, number> }[];
  /** Openings Pepper has to fit through; big items are kept out of them so she never gets stuck. */
  doorways: Pt[];
  /** The dog door: a gap in the garage's outside wall. `x` is the wall's inner face. */
  door?: { x: number; y: number; half: number };
  wallThickness: number;
  spawn: { x: number; y: number };
  /** Where the dog catcher can come from (Phase 2). */
  catcherSpawns?: Pt[];
  /** How many loose items of each kind to scatter. */
  scatter: Record<string, number>;
  /** Little spills of tiny food, so there's always a snack trail nearby. */
  piles: { id: string; piles: number; each: number; spread: number }[];
}
