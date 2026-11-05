// Game feel numbers. World units are centimetres; Pepper's size is her radius.

/** Starting radius of puppy Pepper. */
export const START_R = 6;
/** Pepper can eat anything whose longest side is up to this many times her radius. */
export const EAT_RATIO = 1.25;
/** How much of an item's footprint turns into Pepper (r² += GROW_K · (size/2)²). */
export const GROW_K = 0.2;
/** Radius Pepper needs to jump out of the dog door. */
export const DOOR_R = 28;
/** Radius where Pepper is too big for the house's doorways, so she starts chomping through the inside walls instead. */
export const WALL_R = 20;
/** Indoors, Pepper hops over furniture she can't eat yet once its short side is no wider than she is. */
export const canHop = (r: number, shortSide: number) => shortSide <= r * 2;

export const canEat = (r: number, size: number) => size <= r * EAT_RATIO;

export const grownRadius = (r: number, size: number) => Math.sqrt(r * r + GROW_K * (size / 2) ** 2);

/** Top speed in cm/s; grows with Pepper so she feels about as quick on screen at every size. */
export const speedFor = (r: number) => 95 * Math.pow(r / START_R, 0.85);

/** How many cm of house the camera shows across the screen's short side, so Pepper stays about the same size on screen. */
export const viewFor = (r: number) => 105 * Math.pow(r / START_R, 0.85);

/** Outdoors the camera pulls back this much further, so there's more neighborhood on screen. */
export const OUTDOOR_ZOOM = 1.35;

/** Pepper's size as shown to the player: her width, in cm or m. */
export function formatSize(r: number) {
  const cm = r * 2;
  if (cm < 100) return `${cm.toFixed(cm < 20 ? 1 : 0)} cm`;
  const m = cm / 100;
  if (m >= 1000) { const km = m / 1000; return km >= 1000 ? `${Math.round(km).toLocaleString('en-US')} km` : `${km.toFixed(km < 10 ? 2 : km < 100 ? 1 : 0)} km`; }
  return `${m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)} m`;
}

/** Phase 2: Pepper's size when the dog catcher spots her and gives chase. */
export const CATCHER_R = 40;
/** The dog catcher's height, which is how much of a meal he makes. */
export const CATCHER_SIZE = 180;
/** Pepper's size when she can finally eat the dog catcher: 5 m across. Until then his net keeps growing to fit her. */
export const CATCHER_EAT_R = 250;
/** How much bigger than normal the dog catcher's net is for a Pepper this size, so its hoop is always about as wide as she is. */
export const catcherNet = (r: number) => Math.max(1, (r * 0.95) / 20);
/** His walking speed in cm/s; he speeds up to keep pace as Pepper grows. */
export const CATCHER_SPEED = 330;
/** His collision radius in cm. */
export const CATCHER_RAD = 35;

/** A house counts as this much of its longest side when deciding if Pepper can eat it, so smaller houses go first. */
export const HOUSE_BITE = 0.55;
/** Pepper's size when the dog catcher gives up: she's far too big for his net. */
export const TOWN_R = 700;
/**
 * Pepper's size when she's too wide for the town's streets (24 m across, sidewalks included). From then on
 * she steps over anything she can't eat yet, anywhere, so nothing in the world can ever box her in.
 */
export const STREET_R = 1100;
/** Pepper's size when she has outgrown the countryside, and the island is where the food is. */
export const ISLAND_R = 40000;
/** Pepper's size when she has outgrown the island (6.4 km across), and the open ocean is where the food is. */
export const OCEAN_R = 320000;
/** Pepper's size when her head is up above the clouds (20 km across), and the sky starts to darken. */
export const SPACE_R = 1000000;
/** Pepper's size when her head pokes out of the top of the sky (100 km across, the edge of space): the win. */
export const WIN_R = 5000000;

/** How far into space Pepper's head is: 0 under a blue sky, 1 among the stars at the win. */
export const spaceFor = (r: number) => Math.min(1, Math.max(0, Math.log(r / SPACE_R) / Math.log(WIN_R / SPACE_R)));

/**
 * How round Pepper is at each stage of the run, as [radius, fat] pairs: a little chubby leaving the house, plump
 * by the time the catcher gives up, properly round reaching the island, nearly a ball out on the ocean, and only a full ball at the edge of space.
 */
const FAT_STEPS: [number, number][] = [[START_R, 0], [DOOR_R, 0.2], [TOWN_R, 0.45], [ISLAND_R, 0.8], [OCEAN_R, 0.9], [WIN_R, 1]];

/** 0 = skinny puppy, 1 = a ball. Eases up through each stage of the run (in log size) so she never maxes out early. */
export function fatFor(r: number) {
  if (r <= START_R) return 0;
  for (let i = 1; i < FAT_STEPS.length; i++) {
    const [r1, f1] = FAT_STEPS[i];
    if (r < r1) {
      const [r0, f0] = FAT_STEPS[i - 1];
      return f0 + (f1 - f0) * (Math.log(r / r0) / Math.log(r1 / r0));
    }
  }
  return 1;
}
