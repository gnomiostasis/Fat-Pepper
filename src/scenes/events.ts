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
  /** game → HUD: the run is over; payload is RunStats. */
  done: 'fp-done',
  /** game → HUD: what Pepper is growing toward now; payload is Goal. */
  goal: 'fp-goal',
} as const;

export interface RunStats {
  /** How the run ended. */
  outcome: 'caught' | 'ate-catcher';
  seconds: number;
  eaten: number;
  r: number;
}

/** The HUD's progress bar: from one size to the next milestone. */
export interface Goal {
  from: number;
  to: number;
  /** Shown before the milestone, followed by its size, like "Dog door at 56 cm". */
  label: string;
  /** Shown once Pepper reaches it. */
  reached: string;
}
