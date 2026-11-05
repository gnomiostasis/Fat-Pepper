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
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${m.toFixed(m < 10 ? 2 : m < 100 ? 1 : 0)} m`;
}

/** Phase 2: Pepper's size when the dog catcher spots her and gives chase. */
export const CATCHER_R = 40;
/** The dog catcher's height, which is what Pepper has to outgrow to eat him. */
export const CATCHER_SIZE = 180;
/** Pepper's size when she can finally eat the dog catcher. */
export const CATCHER_EAT_R = CATCHER_SIZE / EAT_RATIO;
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
/** Pepper's size when she has eaten enough of the island to win the run (6.4 km across). */
export const WIN_R = 320000;

/**
 * How round Pepper is at each stage of the run, as [radius, fat] pairs: a little chubby leaving the house, plump
 * by the time the catcher gives up, properly round reaching the island, and only a full ball at the very end.
 */
const FAT_STEPS: [number, number][] = [[START_R, 0], [DOOR_R, 0.2], [TOWN_R, 0.45], [ISLAND_R, 0.8], [WIN_R, 1]];

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
