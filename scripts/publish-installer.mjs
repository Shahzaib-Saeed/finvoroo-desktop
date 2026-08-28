#!/usr/bin/env node
/**
 * Copies the Tauri NSIS setup.exe to the client-facing name:
 *   FinvorooDesktop-Setup.exe
 * and drops it into:
 *   - finvoroo-desktop/dist/ (CI artifact + manual upload)
 *   - src-tauri/target/release/bundle/nsis/ (stable path for tooling)
 *   - React-frontend/public/downloads/ (in-app download link, optional deploy copy)
 *
 * Mirrors finvoroo-print-agent/scripts/publish-installer.mjs.
 * Run after `tauri build --bundles nsis` (wired into `npm run build`).
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nsisDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const distDir = join(root, 'dist');
const publicDownloadsDir = join(root, '..', 'React-frontend', 'public', 'downloads');
const destName = 'FinvorooDesktop-Setup.exe';

if (!existsSync(nsisDir)) {
  console.error(`NSIS output not found: ${nsisDir}`);
  console.error('Build the Windows installer first: npm run build');
  process.exit(1);
}

const exes = readdirSync(nsisDir).filter((name) => name.toLowerCase().endsWith('.exe'));
const setup =
  exes.find((name) => name.toLowerCase().endsWith('-setup.exe') && name !== destName) ||
  exes.find((name) => name === destName);

if (!setup) {
  console.error(`No NSIS setup .exe in ${nsisDir}`);
  process.exit(1);
}

const source = join(nsisDir, setup);
mkdirSync(distDir, { recursive: true });
const nsisDest = join(nsisDir, destName);
const distDest = join(distDir, destName);
copyFileSync(source, nsisDest);
copyFileSync(source, distDest);

if (existsSync(join(root, '..', 'React-frontend'))) {
  mkdirSync(publicDownloadsDir, { recursive: true });
  copyFileSync(source, join(publicDownloadsDir, destName));
}

console.log('Installer ready (no Node/Rust required on the customer PC):');
console.log(`  ${nsisDest}`);
console.log(`  ${distDest}`);
if (existsSync(join(publicDownloadsDir, destName))) {
  console.log(`  ${join(publicDownloadsDir, destName)}`);
}
