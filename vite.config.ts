import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

function git(cmd: string) {
  try {
    return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

// Which PR this build came from: the PR being checked in CI, or the PR whose
// merge commit is being deployed from main.
function prNumber() {
  const fromRef = process.env.GITHUB_REF?.match(/^refs\/pull\/(\d+)\//)?.[1];
  if (fromRef) return fromRef;
  return git('log -1 --format=%s').match(/^Merge pull request #(\d+)/)?.[1] ?? '';
}

// Build label shown in the corner of the screen, e.g. "v0.1.0 · PR #16 · 6b21272".
function buildVersion() {
  const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
  const sha = process.env.GITHUB_SHA || git('rev-parse HEAD');
  const pr = prNumber();
  return [`v${version}`, pr && `PR #${pr}`, sha ? sha.slice(0, 7) : 'dev'].filter(Boolean).join(' · ');
}

// Relative base so the build works from GitHub Pages or any sub-folder.
export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { __BUILD_VERSION__: JSON.stringify(buildVersion()) },
});
