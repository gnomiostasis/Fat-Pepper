// The 60s cartoon palette: mustard, teal, avocado and orange, with a warm ink for outlines.
export const PAL = {
  ink: '#231a14',
  cream: '#f3ead2',
  paper: '#f0e3c4',
  mustard: '#e2b13c',
  mustardDark: '#b98a22',
  avocado: '#a9b16a',
  avocadoDark: '#8f9752',
  teal: '#3f8577',
  tealLight: '#5fa596',
  tealDark: '#2c5e55',
  orange: '#d9643a',
  rust: '#a5442a',
  pink: '#e98aa0',
  sky: '#3f7f9a',
  navy: '#2b5366',
  wood: '#b9773a',
  woodLight: '#d39a5a',
  woodDark: '#8a5226',
  bread: '#e2b56f',
  breadIn: '#f6e3b4',
  lettuce: '#7aa83f',
  grey: '#9a948a',
  greyLight: '#c9c3b6',
  yellow: '#f0cf4a',
  purple: '#7d5ba6',
  white: '#fbf6ea',

  // Pepper, a black-and-white border collie
  dogBlack: '#2b2522',
  dogWhite: '#f3ead2',
  collar: '#c8392e',
  tag: '#f2d04b',
};

function hx(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(c: string, t: string, a: number): string {
  const A = hx(c), B = hx(t);
  return 'rgb(' + A.map((v, i) => Math.round(v + (B[i] - v) * a)).join(',') + ')';
}
export const lighten = (c: string, a: number) => mix(c, '#ffffff', a);
export const darken = (c: string, a: number) => mix(c, '#000000', a);

/** Hex string to the 0xRRGGBB number Phaser wants. */
export const hexNum = (c: string) => parseInt(c.slice(1), 16);
