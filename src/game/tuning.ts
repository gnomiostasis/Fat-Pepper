// Game feel numbers. World units are centimetres; Pepper's size is her radius.

/** Starting radius of puppy Pepper. */
export const START_R = 6;
/** Pepper can eat anything whose longest side is up to this many times her radius. */
export const EAT_RATIO = 1.25;
/** How much of an item's footprint turns into Pepper (r² += GROW_K · (size/2)²). */
export const GROW_K = 0.2;
/** Radius Pepper needs to jump out of the dog door. */
export const DOOR_R = 28;

export const canEat = (r: number, size: number) => size <= r * EAT_RATIO;

export const grownRadius = (r: number, size: number) => Math.sqrt(r * r + GROW_K * (size / 2) ** 2);

/** Top speed in cm/s; grows with Pepper so she feels about as quick on screen at every size. */
export const speedFor = (r: number) => 95 * Math.pow(r / START_R, 0.85);

/** 0 = skinny puppy, approaching 1 as she gets enormous. Rises quickly early so the chub shows. */
export const fatFor = (r: number) => Math.min(1, Math.max(0, 1 - Math.exp(-Math.log(r / START_R) * 0.55)));

/** How many cm of house the camera shows across the screen's short side, so Pepper stays about the same size on screen. */
export const viewFor = (r: number) => 105 * Math.pow(r / START_R, 0.85);

/** Pepper's size as shown to the player: her width, in cm or m. */
export function formatSize(r: number) {
  const cm = r * 2;
  if (cm < 100) return `${cm.toFixed(cm < 20 ? 1 : 0)} cm`;
  return `${(cm / 100).toFixed(2)} m`;
}
