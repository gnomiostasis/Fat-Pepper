import Phaser from 'phaser';
import { PAL, darken, lighten } from './palette';

/** World units (cm) covered by one floor tile texture. */
export const FLOOR_TILE_WORLD = 64;
const FLOOR_TILE_PX = 256;

/** The comic words that pop up when Pepper takes a big bite. */
export const CHOMP_WORDS = ['CHOMP!', 'NOM!', 'GULP!', 'MUNCH!'];
export const chompKey = (i: number) => `chomp-${i}`;

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = Math.ceil(w); c.height = Math.ceil(h);
  return { c, ctx: c.getContext('2d')! };
}

function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

/** The HUD's textures: a soft vignette and the bite words. */
export function makeTextures(scene: Phaser.Scene) {
  overlayTextures(scene);
}

let floors: Record<string, HTMLCanvasElement> | null = null;
/** Floor patterns for the 3D house, drawn once. */
export function floorCanvases() {
  if (!floors) {
    floors = {};
    floorTextures((key, c) => { floors![key] = c; });
  }
  return floors;
}

function floorTextures(add: (key: string, c: HTMLCanvasElement) => void) {
  const N = FLOOR_TILE_PX;

  // Kitchen: mustard and cream checkerboard linoleum
  {
    const { c, ctx } = canvas(N, N), q = N / 4;
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 ? PAL.mustard : PAL.cream;
      ctx.fillRect(x * q, y * q, q, q);
    }
    ctx.strokeStyle = 'rgba(35,26,20,0.12)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q, N); ctx.moveTo(0, i * q); ctx.lineTo(N, i * q); ctx.stroke(); }
    add('floor-kitchen', c);
  }

  // Living room: soft sage carpet with a scatter of pale dots
  {
    const { c, ctx } = canvas(N, N);
    ctx.fillStyle = PAL.tealLight; ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = lighten(PAL.tealLight, 0.3);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      ctx.beginPath(); ctx.arc(x * 64 + (y % 2) * 32 + 16, y * 64 + 32, 5, 0, Math.PI * 2); ctx.fill();
    }
    add('floor-carpet', c);
  }

  // Dining room, piano room and entry: warm wood planks
  {
    const { c, ctx } = canvas(N, N), r = rng(11), plank = N / 4;
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = i % 2 ? PAL.woodLight : lighten(PAL.woodLight, 0.12);
      ctx.fillRect(0, i * plank, N, plank);
      const cut = (i * 97) % N;
      ctx.fillStyle = 'rgba(35,26,20,0.35)'; ctx.fillRect(cut, i * plank, 2, plank);
    }
    ctx.fillStyle = 'rgba(35,26,20,0.3)';
    for (let i = 0; i <= 4; i++) ctx.fillRect(0, i * plank - 1, N, 2);
    ctx.strokeStyle = 'rgba(138,82,38,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 14; i++) { const y = r() * N, x = r() * N; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 30, y + 4, x + 60, y); ctx.stroke(); }
    add('floor-wood', c);
  }

  // Office: powder-blue carpet with little diamonds
  {
    const { c, ctx } = canvas(N, N);
    ctx.fillStyle = PAL.sky; ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = lighten(PAL.sky, 0.3);
    for (const [x, y] of [[64, 64], [192, 192], [192, 64], [64, 192]]) {
      ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 6, y); ctx.fill();
    }
    add('floor-office', c);
  }

  // Bathroom: pink and white little square tiles
  {
    const { c, ctx } = canvas(N, N), q = N / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      ctx.fillStyle = (x + y) % 2 ? PAL.pink : PAL.white;
      ctx.fillRect(x * q, y * q, q, q);
    }
    ctx.strokeStyle = 'rgba(35,26,20,0.14)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q, N); ctx.moveTo(0, i * q); ctx.lineTo(N, i * q); ctx.stroke(); }
    add('floor-bath', c);
  }

  // Garage: speckled concrete with an expansion joint
  {
    const { c, ctx } = canvas(N, N), r = rng(23);
    ctx.fillStyle = PAL.greyLight; ctx.fillRect(0, 0, N, N);
    for (let i = 0; i < 1200; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(35,26,20,0.12)' : 'rgba(255,255,255,0.25)'; ctx.fillRect(r() * N, r() * N, 2, 2); }
    ctx.fillStyle = 'rgba(35,26,20,0.18)'; ctx.fillRect(0, 0, N, 2); ctx.fillRect(0, 0, 2, N);
    add('floor-garage', c);
  }

  // Street: soft grey tarmac with faint patches
  {
    const { c, ctx } = canvas(N, N), r = rng(31);
    ctx.fillStyle = '#9a9ea6'; ctx.fillRect(0, 0, N, N);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(60,70,80,0.10)' : 'rgba(255,255,255,0.10)'; ctx.beginPath(); ctx.ellipse(r() * N, r() * N, 10 + r() * 16, 5 + r() * 8, 0, 0, Math.PI * 2); ctx.fill(); }
    add('floor-asphalt', c);
  }

  // Sidewalk and driveways: pale stone slabs
  {
    const { c, ctx } = canvas(N, N), r = rng(17);
    ctx.fillStyle = PAL.paper; ctx.fillRect(0, 0, N, N);
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(180,160,120,0.12)'; ctx.beginPath(); ctx.ellipse(r() * N, r() * N, 14 + r() * 14, 7 + r() * 6, r(), 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(150,130,100,0.25)'; ctx.fillRect(0, 0, N, 3); ctx.fillRect(0, 0, 3, N);
    add('floor-sidewalk', c);
  }

  // Outside: mint grass with pale patches and little tufts
  {
    const { c, ctx } = canvas(N, N), r = rng(7);
    ctx.fillStyle = PAL.avocado; ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = lighten(PAL.avocado, 0.15);
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(r() * N, r() * N, 30 + r() * 30, 12 + r() * 12, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = darken(PAL.avocado, 0.08);
    for (let i = 0; i < 18; i++) {
      const x = r() * N, y = r() * N;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 3, y - 9); ctx.lineTo(x + 6, y); ctx.fill();
    }
    add('floor-grass', c);
  }
}

function overlayTextures(scene: Phaser.Scene) {
  // Faint green vignette, stretched over the screen
  {
    const N = 512, { c, ctx } = canvas(N, N);
    const v = ctx.createRadialGradient(N / 2, N / 2, N * 0.28, N / 2, N / 2, N * 0.72);
    v.addColorStop(0, 'rgba(255,240,200,0)'); v.addColorStop(1, 'rgba(52,92,50,0.14)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, N, N);
    scene.textures.addCanvas('vignette', c);
  }
  // Soft starbursts for big bites
  CHOMP_WORDS.forEach((word, i) => {
    const W = 260, H = 170, { c, ctx } = canvas(W, H), n = 14;
    ctx.beginPath();
    for (let j = 0; j <= n * 2; j++) {
      const a = (j / (n * 2)) * Math.PI * 2, rr = j % 2 ? 0.72 : 1;
      const x = W / 2 + Math.cos(a) * (W / 2 - 8) * rr, y = H / 2 + Math.sin(a) * (H / 2 - 8) * rr;
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.save(); ctx.translate(4, 6); ctx.fillStyle = 'rgba(52,92,50,0.2)'; ctx.fill(); ctx.restore();
    ctx.fillStyle = PAL.yellow; ctx.fill();
    ctx.font = '400 46px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = PAL.white; ctx.fillText(word, W / 2 + 2, H / 2 + 5);
    ctx.fillStyle = PAL.orange; ctx.fillText(word, W / 2, H / 2 + 2);
    scene.textures.addCanvas(chompKey(i), c);
  });
  // Small round particle for chomp crumbs
  {
    const { c, ctx } = canvas(16, 16);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill();
    scene.textures.addCanvas('dot', c);
  }
}
