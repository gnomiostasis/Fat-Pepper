import { PAL } from './palette';
import { Pen, circ, ell } from './pen';

/** Half-width of Pepper's body in local units when not fat at all. */
export const DOG_BODY_RX = 14;

/**
 * Pepper seen from above, facing up (-y), centred on her body.
 * `fat` runs from 0 (skinny puppy) to 1 (absolute unit).
 */
export function drawDog(g: Pen, fat: number) {
  const coat = PAL.dogBlack, fur = PAL.dogWhite, nose = PAL.ink;
  const rx = DOG_BODY_RX * (1 + fat), ry = 22 * (1 + fat * 0.28), hs = 1 + fat * 0.25;

  // Tail: slim and black with a white tip
  g.line([[0, ry - 2], [3, ry + 7], [7, ry + 10.5]], coat, 5);
  g.line([[7, ry + 10.5], [10, ry + 13]], fur, 5);

  // White feet poking out from under the body
  const paws: [number, number][] = [
    [-(rx - 3 * (1 + fat)), -ry * 0.55], [rx - 3 * (1 + fat), -ry * 0.55],
    [-(rx - 2 * (1 + fat)), ry * 0.6], [rx - 2 * (1 + fat), ry * 0.6],
  ];
  for (const [px, py] of paws) g.fill(circ(px * (1 - fat * 0.08) + Math.sign(px) * 3, py, 4.2), fur);

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
  for (const side of [-1, 1]) {
    g.fill(circ(side * 5 * hs, hy - 2.5, 2.3), fur, { plain: true });
    g.fill(circ(side * 5 * hs, hy - 2.7, 1.4), nose, { plain: true });
  }
}
