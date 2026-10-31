// The garden pastel palette: soft, flat colours for a cozy English-village look.
// The names come from the old 60s palette (mustard is now butter, orange is coral,
// avocado is mint grass) so every model keeps its colour role.
export const PAL = {
  ink: '#3d4148',
  cream: '#fbf4e4',
  paper: '#f4ead4',
  mustard: '#f3d27e',
  mustardDark: '#d9b45e',
  avocado: '#a8d08d',
  avocadoDark: '#8fbf78',
  teal: '#6fa9a1',
  tealLight: '#9ccdc4',
  tealDark: '#4f8a82',
  orange: '#ef9a7a',
  rust: '#d07a62',
  pink: '#f2b3bf',
  sky: '#9fc4de',
  navy: '#6f8fb3',
  wood: '#d6a577',
  woodLight: '#e9c79f',
  woodDark: '#b48558',
  bread: '#e9c27c',
  breadIn: '#fbf0d2',
  lettuce: '#9ccf7a',
  grey: '#b3b1ad',
  greyLight: '#e0ddd6',
  yellow: '#f6d77a',
  purple: '#b9a3dc',
  white: '#fdfbf5',

  // Pepper, a black-and-white border collie (charcoal, so she sits softly in the pastels)
  dogBlack: '#3b3d45',
  dogWhite: '#fbfaf6',
  collar: '#e0685f',
  tag: '#f6d77a',
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
