import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// Build label shown in the corner of the screen, e.g. "v0.1.0 · 6b21272".
function buildVersion() {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  let sha = process.env.GITHUB_SHA ?? '';
  if (!sha) {
    try {
      sha = execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    } catch {
      sha = '';
    }
  }
  return `v${version} · ${sha ? sha.slice(0, 7) : 'dev'}`;
}

// Relative base so the build works from GitHub Pages or any sub-folder.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion()) },
});
