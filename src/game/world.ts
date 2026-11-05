// The whole game is one world, laid out fresh each run: Pepper's house sits on a lot in the
// neighborhood, the neighborhood sits on the west edge of the market town (its main road carries on as
// the high street), the town sits in the middle of the countryside on the motorway, and the countryside
// sits in the middle of an island, its motorway running on to the cities and its rivers to the sea, and the
// island sits in the open ocean among other islands and the mainland. Each part is
// built in its own coordinates and drawn at its own scale, then they're fitted together here, with
// Pepper's house at the origin.

import { PAL } from '../art/palette';
import type { Box, Level, Pt } from './level';
import { buildHouse } from './house';
import { buildNeighborhood } from './neighborhood';
import { buildTown } from './town';
import { buildCountry } from './country';
import { buildIsland } from './island';
import { buildOcean } from './ocean';

export type RegionName = 'house' | 'hood' | 'town' | 'country' | 'island' | 'ocean';

/** One part of the world, already moved into place. */
export interface Region {
  name: RegionName;
  /** Its square of the world. */
  box: Box;
  /** Its own level, in world coordinates, for the things only it has (where to scatter snacks, the dog catcher's street corners). */
  level: Level;
  /** How many times bigger its floor patterns are drawn. */
  tile: number;
}

export interface World {
  /** Everything in one level, for drawing and for bumping into. */
  level: Level;
  /** From the inside out: the house, the neighborhood, the town, the countryside, the island, the ocean. */
  regions: Region[];
}

const move = (p: Pt, dx: number, dy: number): Pt => [p[0] + dx, p[1] + dy];
const moveBox = (b: Box, dx: number, dy: number): Box => ({ ...b, x: b.x + dx, y: b.y + dy });

/** A level slid over by dx,dy. */
function shift(l: Level, dx: number, dy: number): Level {
  return {
    ...l,
    bounds: moveBox(l.bounds, dx, dy),
    walls: l.walls.map((s) => ({ ...s, a: move(s.a, dx, dy), b: move(s.b, dx, dy) })),
    counters: l.counters.map((s) => ({ ...s, a: move(s.a, dx, dy), b: move(s.b, dx, dy) })),
    frontDoor: l.frontDoor && { ...l.frontDoor, a: move(l.frontDoor.a, dx, dy), b: move(l.frontDoor.b, dx, dy) },
    stairs: l.stairs && moveBox(l.stairs, dx, dy),
    buildings: l.buildings.map((b) => ({ ...b, poly: b.poly.map((p) => move(p, dx, dy)) })),
    floors: l.floors.map((f) => ({ ...f, poly: f.poly.map((p) => move(p, dx, dy)) })),
    marks: l.marks.map((m) => ({ ...m, box: moveBox(m.box, dx, dy) })),
    furniture: l.furniture.map((f) => ({ ...f, x: f.x + dx, y: f.y + dy })),
    decals: l.decals.map((f) => ({ ...f, x: f.x + dx, y: f.y + dy })),
    rooms: l.rooms.map((r) => ({ ...r, box: moveBox(r.box, dx, dy) })),
    doorways: l.doorways.map((p) => move(p, dx, dy)),
    door: l.door && { ...l.door, x: l.door.x + dx, y: l.door.y + dy },
    water: l.water?.map((poly) => poly.map((p) => move(p, dx, dy))),
    paths: l.paths?.map((p) => ({ ...p, pts: p.pts.map((q) => move(q, dx, dy)) })),
    spawn: { x: l.spawn.x + dx, y: l.spawn.y + dy },
    catcherSpawns: l.catcherSpawns?.map((p) => move(p, dx, dy)),
  };
}

export function buildWorld(): World {
  const house = buildHouse();
  const hood = buildNeighborhood(house.bounds);
  const town = buildTown({ w: hood.level.bounds.w, h: hood.level.bounds.h, west: hood.west, east: hood.east });
  const country = buildCountry({ w: town.level.bounds.w, h: town.level.bounds.h, west: town.west, east: town.east });
  const island = buildIsland({ w: country.level.bounds.w, h: country.level.bounds.h, west: country.west, east: country.east, rivers: country.rivers });
  const ocean = buildOcean({ w: island.level.bounds.w, h: island.level.bounds.h });

  // Where each part's own origin lands, with the house's at 0,0
  const islandAt = ocean.islandAt;
  const countryAt = move(islandAt, ...island.countryAt);
  const townAt = move(countryAt, ...country.townAt);
  const hoodAt = move(townAt, ...town.hoodAt);
  const houseAt = move(hoodAt, ...hood.homeAt);
  const at = (p: Pt) => [p[0] - houseAt[0], p[1] - houseAt[1]] as const;
  const parts: [RegionName, Level, Pt, number][] = [
    ['house', house, [0, 0], 1],
    ['hood', hood.level, at(hoodAt) as Pt, 1],
    ['town', town.level, at(townAt) as Pt, town.level.tile ?? 1],
    ['country', country.level, at(countryAt) as Pt, country.level.tile ?? 1],
    ['island', island.level, at(islandAt) as Pt, island.level.tile ?? 1],
    ['ocean', ocean.level, at([0, 0]) as Pt, ocean.level.tile ?? 1],
  ];
  const regions: Region[] = parts.map(([name, l, [dx, dy], tile]) => {
    const level = shift(l, dx, dy);
    return { name, level, tile, box: level.bounds };
  });
  const [H, N, T, C, I, O] = regions.map((r) => r.level);

  // House walls keep their own look among the yard fences. The front door is just more wall to eat.
  const houseWalls = H.walls.map((s) => ({ ...s, color: H.wallStyle.color, h: H.wallStyle.height }));
  if (H.frontDoor) houseWalls.push({ ...H.frontDoor, t: H.frontDoor.t - 4, color: PAL.wood, h: H.wallStyle.height - 2 });
  // Floors and paint, drawn from the outside in, each at its own part's scale
  const tiled = <T extends object>(list: T[], tile: number) => list.map((f) => ({ ...f, tile }));

  const level: Level = {
    bounds: O.bounds,
    walls: [...houseWalls, ...N.walls],
    wallStyle: N.wallStyle,
    counters: H.counters,
    stairs: H.stairs,
    buildings: N.buildings,
    floors: [...tiled(I.floors, regions[4].tile), ...tiled(C.floors, regions[3].tile), ...tiled(T.floors, regions[2].tile), ...tiled(N.floors, 1), ...H.floors],
    marks: [...tiled(T.marks, regions[2].tile), ...tiled(N.marks, 1)],
    furniture: [...H.furniture, ...N.furniture, ...T.furniture, ...C.furniture, ...I.furniture, ...O.furniture],
    decals: H.decals,
    rooms: [],
    doorways: H.doorways,
    door: H.door,
    wallThickness: H.wallThickness,
    water: [...(N.water ?? []), ...(T.water ?? []), ...(C.water ?? []), ...(I.water ?? [])],
    paths: [...(N.paths ?? []), ...(T.paths ?? []), ...(C.paths ?? []), ...(I.paths ?? [])],
    spawn: H.spawn,
    catcherSpawns: N.catcherSpawns,
    scatter: {},
    piles: [],
  };
  return { level, regions };
}
