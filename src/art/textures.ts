import Phaser from 'phaser';
import { drawDog, drawDogPaw, drawDogTail } from './dog';
import { ITEMS } from './items';
import { PAL, darken, lighten } from './palette';
import { Pen } from './pen';

/** Canvas pixels per local unit for item textures. */
export const ITEM_K = 8;
/** Canvas pixels per local unit for Pepper's textures. */
export const DOG_K = 5;
/** Pepper is pre-drawn at this many fatness steps. */
export const DOG_FAT_STEPS = 12;
/** World units covered by one floor tile texture. */
export const FLOOR_TILE_WORLD = 64;
const FLOOR_TILE_PX = 256;

export const dogKey = (step: number) => `dog-${step}`;
export const itemKey = (id: string) => `item-${id}`;
/** Where the tail texture's hinge sits, as a fraction of the texture size. */
export const TAIL_ORIGIN = { x: 10 / 30, y: 6 / 30 };
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

export function makeTextures(scene: Phaser.Scene) {
  const tex = scene.textures;

  for (let i = 0; i < DOG_FAT_STEPS; i++) {
    const L = 120, { c, ctx } = canvas(L * DOG_K, L * DOG_K);
    drawDog(new Pen(ctx, DOG_K, c.width / 2, c.height / 2), i / (DOG_FAT_STEPS - 1));
    tex.addCanvas(dogKey(i), c);
  }
  {
    const { c, ctx } = canvas(12 * DOG_K, 12 * DOG_K);
    drawDogPaw(new Pen(ctx, DOG_K, c.width / 2, c.height / 2));
    tex.addCanvas('dog-paw', c);
  }
  {
    const { c, ctx } = canvas(30 * DOG_K, 30 * DOG_K);
    drawDogTail(new Pen(ctx, DOG_K, c.width * TAIL_ORIGIN.x, c.height * TAIL_ORIGIN.y));
    tex.addCanvas('dog-tail', c);
  }

  for (const d of ITEMS) {
    const pad = 6, { c, ctx } = canvas((d.w + pad) * ITEM_K, (d.h + pad) * ITEM_K);
    d.draw(new Pen(ctx, ITEM_K, c.width / 2, c.height / 2));
    tex.addCanvas(itemKey(d.id), c);
  }

  floorTextures(scene);
  overlayTextures(scene);
}

function floorTextures(scene: Phaser.Scene) {
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
    scene.textures.addCanvas('floor-kitchen', c);
  }

  // Living room: avocado shag carpet with starbursts
  {
    const { c, ctx } = canvas(N, N), r = rng(42);
    ctx.fillStyle = PAL.avocado; ctx.fillRect(0, 0, N, N);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(80,90,40,0.18)' : 'rgba(255,250,220,0.14)';
      ctx.fillRect(r() * N, r() * N, 2, 3);
    }
    ctx.strokeStyle = lighten(PAL.avocado, 0.35); ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (const [sx, sy] of [[64, 70], [190, 180]]) {
      for (let j = 0; j < 8; j++) {
        const t = (j / 8) * Math.PI * 2, R = j % 2 ? 10 : 20;
        ctx.beginPath(); ctx.moveTo(sx + Math.cos(t) * 4, sy + Math.sin(t) * 4); ctx.lineTo(sx + Math.cos(t) * R, sy + Math.sin(t) * R); ctx.stroke();
      }
    }
    scene.textures.addCanvas('floor-carpet', c);
  }

  // Outside: grass with boomerangs, peeking past the walls
  {
    const { c, ctx } = canvas(N, N), r = rng(7);
    ctx.fillStyle = '#bcc47c'; ctx.fillRect(0, 0, N, N);
    ctx.fillStyle = darken('#bcc47c', 0.08);
    for (let i = 0; i < 6; i++) {
      const x = r() * N, y = r() * N, s = 14 + r() * 10, a = r() * 6.28;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.beginPath();
      ctx.moveTo(-s, 0); ctx.quadraticCurveTo(0, -s * 1.2, s, 0); ctx.quadraticCurveTo(0, -s * 0.45, -s, 0); ctx.fill(); ctx.restore();
    }
    scene.textures.addCanvas('floor-grass', c);
  }
}

function overlayTextures(scene: Phaser.Scene) {
  // Film grain, tiled over the whole screen
  {
    const N = 256, { c, ctx } = canvas(N, N), r = rng(99);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(60,40,20,0.10)' : 'rgba(255,245,220,0.14)';
      ctx.fillRect(r() * N, r() * N, 1.5, 1.5);
    }
    scene.textures.addCanvas('grain', c);
  }
  // Warm vignette, stretched over the screen
  {
    const N = 512, { c, ctx } = canvas(N, N);
    const v = ctx.createRadialGradient(N / 2, N / 2, N * 0.28, N / 2, N / 2, N * 0.72);
    v.addColorStop(0, 'rgba(255,240,200,0)'); v.addColorStop(1, 'rgba(120,80,30,0.32)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, N, N);
    scene.textures.addCanvas('vignette', c);
  }
  // Comic starbursts for big bites
  CHOMP_WORDS.forEach((word, i) => {
    const W = 260, H = 170, { c, ctx } = canvas(W, H), n = 14;
    ctx.beginPath();
    for (let j = 0; j <= n * 2; j++) {
      const a = (j / (n * 2)) * Math.PI * 2, rr = j % 2 ? 0.72 : 1;
      const x = W / 2 + Math.cos(a) * (W / 2 - 8) * rr, y = H / 2 + Math.sin(a) * (H / 2 - 8) * rr;
      if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.save(); ctx.translate(6, -4); ctx.fillStyle = PAL.yellow; ctx.fill(); ctx.restore();
    ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.strokeStyle = PAL.ink; ctx.stroke();
    ctx.font = '400 46px "Lilita One", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = PAL.ink; ctx.strokeText(word, W / 2, H / 2 + 2);
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
