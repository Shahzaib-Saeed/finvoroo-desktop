import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const here = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.resolve(here, '..');
const reactRoot = path.resolve(desktopRoot, '..', 'React-frontend');
const outDir = path.join(desktopRoot, 'webapp');

if (!fs.existsSync(reactRoot)) {
  console.error(`React-frontend not found at ${reactRoot}. finvoroo-desktop must sit next to React-frontend.`);
  process.exit(1);
}

console.log(`Building React-frontend (desktop mode) -> ${outDir}`);

const env = {
  ...process.env,
  VITE_OUT_DIR: outDir,
  VITE_BASE_URL: '/',
  // Read by app-version-watcher.jsx (disables the "new deploy" reload prompt —
  // desktop updates come via the installer, not a same-origin redeploy) and by
  // signin-page.jsx (defaults "keep me logged in" on for a paired device).
  VITE_DESKTOP_BUILD: 'true',
  // Real cloud API. The existing offline layer (Dexie/outbox/sync-manager)
  // already handles the cloud-unreachable case automatically — there is no
  // separate "local API" to stand up for data, only this shell + a local
  // static-file server (see src-tauri/src/server.rs).
  VITE_API_BASE_URL: process.env.VITE_API_BASE_URL || 'https://api.finvoroo.com/api/v1',
};

const result = spawnSync('npm', ['run', 'build:app'], {
  cwd: reactRoot,
  stdio: 'inherit',
  env,
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  console.error('React-frontend build failed.');
  process.exit(result.status ?? 1);
}

const indexHtml = path.join(outDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error(`Frontend build did not produce ${indexHtml}.`);
  process.exit(1);
}

const assetsDir = path.join(outDir, 'assets');
if (!fs.existsSync(assetsDir) || fs.readdirSync(assetsDir).length === 0) {
  console.error(`Frontend build did not produce assets in ${assetsDir}.`);
  process.exit(1);
}

console.log('Frontend build complete:', outDir);
