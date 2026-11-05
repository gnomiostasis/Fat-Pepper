// Drives the loading screen in index.html. It shows on its own while the game's code
// downloads (the bar creeps along by itself), then these calls move it through the
// remaining steps and fade it out once the first frame of the game is on screen.

const root = document.getElementById('loading');
const fill = root?.querySelector<HTMLElement>('.fill');
const status = root?.querySelector<HTMLElement>('.status');

/** Moves the bar to `pct` (0 to 100) and shows `text`, then waits a frame so the browser paints it. */
export function loadingStep(pct: number, text: string): Promise<void> {
  if (fill) {
    // Hand over from the CSS creep without jumping backwards.
    const now = (fill.getBoundingClientRect().width / (fill.parentElement?.getBoundingClientRect().width || 1)) * 100;
    fill.style.width = `${Math.max(now, pct)}%`;
    fill.classList.add('known');
  }
  if (status) status.textContent = text;
  return new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
}

/** Fills the bar and fades the loading screen away. */
export function loadingDone() {
  if (!root) return;
  if (fill) fill.style.width = '100%';
  setTimeout(() => {
    root.classList.add('done');
    setTimeout(() => root.remove(), 500);
  }, 250);
}
