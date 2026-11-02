import type { Stacks } from '../game/powerups';

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
  /** game → HUD: Pepper hit a size milestone; payload is the PowerDef[] to choose from. */
  offer: 'fp-offer',
  /** HUD → game: the player picked a powerup; payload is its PowerId. */
  pick: 'fp-pick',
  /** game → HUD: Pepper's powerups changed; payload is PowerState. */
  powers: 'fp-powers',
} as const;

/** What the HUD shows about powerups. */
export interface PowerState {
  stacks: Stacks;
  /** Radius of the next pick, or null once they're all taken. */
  next: number | null;
  /** Slippery Fur saves left. */
  fur: number;
}

export interface RunStats {
  /** How the run ended. */
  outcome: 'caught' | 'ate-catcher';
  seconds: number;
  eaten: number;
  r: number;
  stacks: Stacks;
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
