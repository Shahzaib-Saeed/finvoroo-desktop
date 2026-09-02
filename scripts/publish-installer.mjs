#!/usr/bin/env node
/**
 * Copies FinvorooDesktop-Setup.exe and writes desktop-latest.json.
 * The manifest serves both the manual download panel and the Tauri updater.
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const nsisDir = join(root, 'src-tauri', 'target', 'release', 'bundle', 'nsis');
const distDir = join(root, 'dist');
const publicDownloadsDir = join(root, 'React-frontend', 'public', 'downloads');
const destName = 'FinvorooDesktop-Setup.exe';
const manifestName = 'desktop-latest.json';

function readVersion() {
  try {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (pkg?.version) return String(pkg.version);
  } catch {
    /* ignore */
  }
  return '0.0.0';
}

function findSignatureFile(setupExeName) {
  const direct = join(nsisDir, `${setupExeName}.sig`);
  if (existsSync(direct)) return direct;

  const sigs = readdirSync(nsisDir).filter((name) => name.toLowerCase().endsWith('.sig'));
  if (sigs.length === 1) return join(nsisDir, sigs[0]);

  const stem = setupExeName.toLowerCase().replace(/\.exe$/i, '');
  const match = sigs.find((name) => name.toLowerCase().includes(stem));
  return match ? join(nsisDir, match) : null;
}

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

const version = readVersion();
const source = join(nsisDir, setup);
mkdirSync(distDir, { recursive: true });
const nsisDest = join(nsisDir, destName);
const distDest = join(distDir, destName);
copyFileSync(source, nsisDest);
copyFileSync(source, distDest);

const manifest = {
  version,
  latest_version: version,
  download_url: `/downloads/${destName}`,
  notes: 'Finvoroo Desktop Windows shell update',
  published_at: new Date().toISOString(),
};

const sigPath = findSignatureFile(setup);
if (sigPath) {
  manifest.pub_date = manifest.published_at;
  manifest.platforms = {
    'windows-x86_64': {
      signature: readFileSync(sigPath, 'utf8').trim(),
      url: `https://app.finvoroo.com/downloads/${destName}`,
    },
  };
} else {
  console.log(
    `No .sig found in ${nsisDir} — ${manifestName} will work for manual downloads only ` +
      '(set createUpdaterArtifacts: true and TAURI_SIGNING_PRIVATE_KEY for auto-update).',
  );
  if (process.env.CI === 'true' && process.env.GITHUB_REF?.includes('/tags/desktop-v')) {
    console.error('Tag release requires a signed updater manifest.');
    process.exit(1);
  }
}

const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(join(distDir, manifestName), manifestJson);

if (existsSync(join(root, 'React-frontend'))) {
  mkdirSync(publicDownloadsDir, { recursive: true });
  copyFileSync(source, join(publicDownloadsDir, destName));
  writeFileSync(join(publicDownloadsDir, manifestName), manifestJson);
}

console.log('Installer ready (no Node/Rust required on the customer PC):');
console.log(`  ${nsisDest}`);
console.log(`  ${distDest}`);
console.log(`  ${join(distDir, manifestName)} (v${version})`);
if (existsSync(join(publicDownloadsDir, destName))) {
  console.log(`  ${join(publicDownloadsDir, destName)}`);
  console.log(`  ${join(publicDownloadsDir, manifestName)}`);
}
