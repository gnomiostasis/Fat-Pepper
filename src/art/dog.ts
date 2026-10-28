import { PAL } from './palette';
import { Pen, circ, ell } from './pen';

/** Half-width of Pepper's body in local units when not fat at all. */
export const DOG_BODY_RX = 14;
/** Radius of one of Pepper's white paws, in local units. */
export const DOG_PAW_R = 4.2;

/** Body half-sizes for a given fatness; the head and paws hang off these. */
export function dogBody(fat: number) {
  return { rx: DOG_BODY_RX * (1 + fat), ry: 22 * (1 + fat * 0.28) };
}

/**
 * Where Pepper's paws rest (front-left, front-right, back-left, back-right)
 * and where her tail joins her body, in local units around her body centre.
 */
export function dogRig(fat: number) {
  const { rx, ry } = dogBody(fat);
  const side = (inset: number) => (rx - inset * (1 + fat)) * (1 - fat * 0.08) + 3;
  return {
    paws: [
      { x: -side(3), y: -ry * 0.55 }, { x: side(3), y: -ry * 0.55 },
      { x: -side(2), y: ry * 0.6 }, { x: side(2), y: ry * 0.6 },
    ],
    tail: { x: 0, y: ry - 2 },
  };
}

/**
 * Pepper seen from above, facing up (-y), centred on her body.
 * `fat` runs from 0 (skinny puppy) to 1 (absolute unit).
 * The game draws her paws and tail as separate pieces so they can move;
 * pass `withLimbs` to draw them in place too.
 */
export function drawDog(g: Pen, fat: number, withLimbs = false) {
  const coat = PAL.dogBlack, fur = PAL.dogWhite, nose = PAL.ink;
  const { rx, ry } = dogBody(fat), hs = 1 + fat * 0.25;

  if (withLimbs) {
    const rig = dogRig(fat);
    g.push(rig.tail.x, rig.tail.y); drawDogTail(g); g.pop();
    for (const p of rig.paws) { g.push(p.x, p.y); drawDogPaw(g); g.pop(); }
  }

  // Body, small white patch on the lower back, white neck and shoulders
  g.fill(ell(0, 0, rx, ry), coat);
  g.fill(ell(0, ry * 0.55, rx * 0.25, ry * 0.142), fur, { plain: true });
  g.fill(ell(0, -ry * 0.66, rx * 0.74, ry * 0.36), fur, { plain: true });

  // Collar and tag
  g.line([[-rx * 0.62, -ry + 5], [0, -ry + 2.5], [rx * 0.62, -ry + 5]], PAL.collar, 3.4);
  g.fill(circ(0, -ry + 4.5, 2.2), PAL.tag);

  // Head, ears, white blaze and muzzle, eyes
  const hy = -ry - 7 * hs;
  g.fill(circ(0, hy, 11 * hs), coat);
  g.fill(ell(-10.5 * hs, hy + 2, 4.2, 8.5, 0.35), coat);
  g.fill(ell(10.5 * hs, hy + 2, 4.2, 8.5, -0.35), coat);
  g.fill(ell(0, hy - 3, 2.2 * hs, 8), fur, { plain: true });
  g.fill(ell(0, hy - 9 * hs, 5.4 * hs, 5.4), fur);
  g.fill(ell(0, hy - 13 * hs, 2.8, 2.1), nose, { plain: true });
  for (const sideX of [-1, 1]) {
    g.fill(circ(sideX * 5 * hs, hy - 2.5, 2.3), fur, { plain: true });
    g.fill(circ(sideX * 5 * hs, hy - 2.7, 1.4), nose, { plain: true });
  }
}

/** One white paw, centred on 0,0. */
export function drawDogPaw(g: Pen) {
  g.fill(circ(0, 0, DOG_PAW_R), PAL.dogWhite);
}

/** Slim black tail with a white tip, hanging from 0,0 toward +y. */
export function drawDogTail(g: Pen) {
  g.line([[0, 0], [3, 9], [7, 12.5]], PAL.dogBlack, 5);
  g.line([[7, 12.5], [10, 15]], PAL.dogWhite, 5);
}
