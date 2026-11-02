// Roguelike powerups: at each size milestone Pepper picks 1 of 3, and picks stack for the rest of the run.

export type PowerId =
  | 'zoomies' | 'magnet' | 'jaws' | 'appetite' | 'tongue'
  | 'streak' | 'rush' | 'fur' | 'sneaky' | 'treats';

export interface PowerDef {
  id: PowerId;
  name: string;
  /** Shown on the pick card. `n` is how many Pepper will have after taking it. */
  blurb: (n: number) => string;
  icon: string;
  color: string;
  /** How many times it can be taken in one run. */
  max: number;
  /** Relative chance of being offered. */
  weight: number;
}

export const POWERS: PowerDef[] = [
  { id: 'zoomies', name: 'Zoomies', icon: '💨', color: '#9fc4de', max: 5, weight: 10,
    blurb: (n) => `Pepper runs ${Math.round(ZOOMIES * 100)}% faster.${n > 1 ? ` (${Math.round(n * ZOOMIES * 100)}% in all)` : ''}` },
  { id: 'magnet', name: 'Snack Magnet', icon: '🧲', color: '#f2b3bf', max: 4, weight: 9,
    blurb: (n) => n === 1 ? 'Snacks nearby slide toward Pepper on their own.' : 'The magnet pulls from further away, and faster.' },
  { id: 'jaws', name: 'Big Jaws', icon: '🦷', color: '#fbf4e4', max: 3, weight: 7,
    blurb: () => `Eat things ${Math.round((JAWS / 1.25) * 100)}% bigger than before. The dog catcher too, eventually!` },
  { id: 'appetite', name: 'Bottomless Belly', icon: '🍖', color: '#ef9a7a', max: 5, weight: 9,
    blurb: () => `Every bite makes Pepper grow ${Math.round(APPETITE * 100)}% more.` },
  { id: 'tongue', name: 'Long Tongue', icon: '👅', color: '#f2b3bf', max: 3, weight: 8,
    blurb: () => 'Slurp up food from further away.' },
  { id: 'streak', name: 'Munch Streak', icon: '🔥', color: '#f6d77a', max: 3, weight: 7,
    blurb: () => 'Quick bites in a row build a streak. Each bite in a streak grows Pepper a bit more.' },
  { id: 'rush', name: 'Sugar Rush', icon: '🍬', color: '#b9a3dc', max: 3, weight: 7,
    blurb: () => 'Every bite gives Pepper a burst of speed for a second.' },
  { id: 'fur', name: 'Slippery Fur', icon: '🛡️', color: '#9ccdc4', max: 3, weight: 6,
    blurb: (n) => `The dog catcher's net slips right off. Saves Pepper ${n === 1 ? 'once' : `${n} times`}.` },
  { id: 'sneaky', name: 'Sneaky Paws', icon: '🐾', color: '#a8d08d', max: 3, weight: 6,
    blurb: () => `The dog catcher is ${Math.round(SNEAKY * 100)}% slower to chase Pepper.` },
  { id: 'treats', name: 'Treat Rain', icon: '🦴', color: '#e9c27c', max: 99, weight: 5,
    blurb: () => 'A shower of snacks lands all around Pepper, right now.' },
];

export const POWER_BY_ID = Object.fromEntries(POWERS.map((p) => [p.id, p])) as Record<PowerId, PowerDef>;

// ---- what each stack does (see GameScene for where they're used) ----
/** Top speed bonus per Zoomies. */
export const ZOOMIES = 0.15;
/** Added to EAT_RATIO per Big Jaws. */
export const JAWS = 0.14;
/** Extra growth per Bottomless Belly. */
export const APPETITE = 0.15;
/** Extra eating reach, in Pepper radii, per Long Tongue. */
export const TONGUE = 0.45;
/** Extra growth per bite of streak, per Munch Streak, up to STREAK_CAP bites. */
export const STREAK = 0.04;
export const STREAK_CAP = 10;
/** Seconds between bites that keep a streak going. */
export const STREAK_GAP = 1.2;
/** Speed bonus per Sugar Rush, fading over RUSH_TIME seconds after a bite. */
export const RUSH = 0.3;
export const RUSH_TIME = 1;
/** Catcher speed cut per Sneaky Paws. */
export const SNEAKY = 0.1;

/** Pepper's radius at each powerup pick. The dog door is at 28 and the catcher shows up at 40. */
export const MILESTONES = [9, 13, 18, 24, 33, 46, 62, 82, 105, 130];

export type Stacks = Partial<Record<PowerId, number>>;

/** Three different powerups to choose from, weighted, skipping any Pepper has maxed out. */
export function rollChoices(have: Stacks, n = 3): PowerDef[] {
  const pool = POWERS.filter((p) => (have[p.id] ?? 0) < p.max);
  const out: PowerDef[] = [];
  while (out.length < n && pool.length) {
    let t = Math.random() * pool.reduce((s, p) => s + p.weight, 0);
    let i = 0;
    for (; i < pool.length - 1; i++) { t -= pool[i].weight; if (t <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
