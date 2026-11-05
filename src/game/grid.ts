// A spatial hash: the map split into square cells, each listing what overlaps it.
// It lets the game look only at things near Pepper instead of every thing on the
// map, which is what keeps big levels (a whole town) as smooth as the house.

import type { Box } from './level';

export class Grid<T> {
  private cells = new Map<number, T[]>();
  private where = new Map<T, number[]>();

  constructor(private cell: number) {}

  private key(ix: number, iy: number) {
    return (ix + 32768) * 65536 + (iy + 32768);
  }

  /** Adds `t`, covering the box from x0,y0 to x1,y1. */
  insert(t: T, x0: number, y0: number, x1: number, y1: number) {
    const keys: number[] = [];
    const c = this.cell;
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) {
      for (let iy = Math.floor(y0 / c); iy <= Math.floor(y1 / c); iy++) {
        const k = this.key(ix, iy);
        let list = this.cells.get(k);
        if (!list) { list = []; this.cells.set(k, list); }
        list.push(t);
        keys.push(k);
      }
    }
    this.where.set(t, keys);
  }

  insertBox(t: T, b: Box) {
    this.insert(t, b.x, b.y, b.x + b.w, b.y + b.h);
  }

  remove(t: T) {
    const keys = this.where.get(t);
    if (!keys) return;
    for (const k of keys) {
      const list = this.cells.get(k)!;
      const i = list.indexOf(t);
      if (i >= 0) list.splice(i, 1);
    }
    this.where.delete(t);
  }

  /** Everything that might overlap the box from x0,y0 to x1,y1, each once. */
  query(x0: number, y0: number, x1: number, y1: number): T[] {
    const c = this.cell, out: T[] = [], seen = new Set<T>();
    for (let ix = Math.floor(x0 / c); ix <= Math.floor(x1 / c); ix++) {
      for (let iy = Math.floor(y0 / c); iy <= Math.floor(y1 / c); iy++) {
        const list = this.cells.get(this.key(ix, iy));
        if (!list) continue;
        for (const t of list) if (!seen.has(t)) { seen.add(t); out.push(t); }
      }
    }
    return out;
  }

  /** Everything that might be within `r` of x,y. */
  near(x: number, y: number, r: number) {
    return this.query(x - r, y - r, x + r, y + r);
  }
}

/**
 * Spatial hashes stacked by size, for a world that holds crumbs and whole towns. Each thing goes in the
 * finest grid whose cells are at least twice its size, so a crumb shares its cell with a few other
 * crumbs, not with a whole house's worth. A search over a wide area skips the grids whose things are
 * far too small to matter at that size (a crumb, to a Pepper the size of a church).
 */
export class Tiers<T> {
  private grids: Grid<T>[];
  private tier = new Map<T, number>();

  constructor(private cells: number[]) {
    this.grids = cells.map((c) => new Grid<T>(c));
  }

  insert(t: T, x0: number, y0: number, x1: number, y1: number) {
    const size = Math.max(x1 - x0, y1 - y0);
    let i = this.cells.findIndex((c) => size * 2 <= c);
    if (i < 0) i = this.cells.length - 1;
    this.grids[i].insert(t, x0, y0, x1, y1);
    this.tier.set(t, i);
  }

  insertBox(t: T, b: Box) {
    this.insert(t, b.x, b.y, b.x + b.w, b.y + b.h);
  }

  remove(t: T) {
    const i = this.tier.get(t);
    if (i === undefined) return;
    this.grids[i].remove(t);
    this.tier.delete(t);
  }

  /** Everything that might be within `r` of x,y, leaving out things under about a thirtieth of `r`. */
  near(x: number, y: number, r: number): T[] {
    const out: T[] = [];
    this.grids.forEach((g, i) => {
      if (i < this.grids.length - 1 && r > this.cells[i] * 15) return;
      for (const t of g.near(x, y, r)) out.push(t);
    });
    return out;
  }
}
