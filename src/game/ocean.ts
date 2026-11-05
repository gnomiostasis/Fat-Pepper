// The open ocean, 480 km across, with Pepper's island somewhere near the middle. By now Pepper is so tall
// her head is up among the clouds: she snacks on icebergs, naval fleets, atolls and clouds, then whole
// islands, volcanoes and hurricanes, then big islands and stretches of the mainland, until at 100 km
// across her head pokes out of the top of the sky and into space.

import { PAL } from '../art/palette';
import type { FurnitureSpot, Level, Pt } from './level';

export const OCEAN_SIZE = 48000000;
const W = OCEAN_SIZE, H = OCEAN_SIZE;

const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export interface Ocean {
  level: Level;
  /** Where the island goes: add this to the island's own coordinates. */
  islandAt: Pt;
}

/** The ocean, with room near the middle for Pepper's island (`island`, its size). */
export function buildOcean(island: { w: number; h: number }): Ocean {
  const islandAt: Pt = [W / 2 - island.w / 2 + rand(-3000000, 3000000), H / 2 - island.h / 2 + rand(-3000000, 3000000)];
  /** How far x,y is from the island's square (0 inside it). */
  const fromIsland = (x: number, y: number) => Math.hypot(
    Math.max(islandAt[0] - x, 0, x - islandAt[0] - island.w), Math.max(islandAt[1] - y, 0, y - islandAt[1] - island.h));
  const furniture: FurnitureSpot[] = [];
  const placed: { x: number; y: number; rad: number }[] = [];

  /** Land and things on the water keep apart; clouds and storms float over whatever they like. */
  const put = (id: string, rad: number, n: number, opts: { tries?: number; floats?: boolean; zone?: () => Pt } = {}) => {
    for (let i = 0; i < n; i++) {
      for (let t = 0; t < (opts.tries ?? 60); t++) {
        const [x, y] = opts.zone ? opts.zone() : [rand(0, W), rand(0, H)];
        if (x < rad || y < rad || x > W - rad || y > H - rad || fromIsland(x, y) < rad + (opts.floats ? 0 : 800000)) continue;
        if (!opts.floats && placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.rad + rad) * 0.95)) continue;
        furniture.push({ id, x, y, rot: Math.round(rand(0, 360)) });
        if (!opts.floats) placed.push({ x, y, rad });
        break;
      }
    }
  };

  // The biggest first, so they get room
  put('mainland', 2500000, 12, { tries: 300 });
  put('bigisle', 1300000, 30, { tries: 200 });
  put('volcano', 500000, 45);
  put('isle', 350000, 120);
  put('atoll', 200000, 130);
  // Icebergs drift down from the north, fleets sail everywhere
  put('iceberg', 150000, 160, { zone: () => [rand(0, W), rand(0, H * 0.3)] });
  put('fleet', 125000, 100);
  // Weather, over land and sea alike
  put('hurricane', 800000, 16, { floats: true });
  put('cloud', 175000, 320, { floats: true });

  const level: Level = {
    bounds: { x: 0, y: 0, w: W, h: H },
    walls: [], wallStyle: { color: PAL.white, height: 75 }, counters: [], buildings: [],
    // The island's sea carries on out under all of this.
    floors: [],
    tile: 10240,
    marks: [], furniture, decals: [],
    rooms: [{ box: { x: 0, y: 0, w: W, h: H }, extras: {} }],
    doorways: [], wallThickness: 10, spawn: { x: W / 2, y: H / 2 },
    scatter: {}, piles: [],
  };
  return { level, islandAt };
}
