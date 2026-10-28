/** Events passed between the game and the HUD on `game.events`. */
export const EV = {
  /** HUD → game: the player pressed start. */
  start: 'fp-start',
  /** game → HUD: Pepper ate something; payload is its name. */
  eat: 'fp-eat',
  /** game → HUD: Pepper's radius changed. */
  size: 'fp-size',
  /** game → HUD: show a short message. */
  toast: 'fp-toast',
  /** game → HUD: Pepper made it out of the house; payload is RunStats. */
  done: 'fp-done',
} as const;

export interface RunStats {
  seconds: number;
  eaten: number;
  r: number;
}
