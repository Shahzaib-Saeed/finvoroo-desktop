#!/usr/bin/env node
/**
 * LOCAL PREVIEW ONLY — not the production deploy path.
 *
 * Production deploys the marketing site and the ERP app to two separate
 * subdomains (finvoroo.com and app.finvoroo.com) as two independent builds —
 * see `npm run build:marketing` (saas/, static export) and `npm run build:app`
 * (vite build, standalone at its own domain root). Use those two outputs for
 * real deploys.
 *
 * This script only exists so a developer can `serve dist/` locally and click
 * through both the landing page and the ERP app under one origin, without
 * dealing with CORS/subdomains in local testing. It merges them into one
 * dist/ folder with the landing at the root and the SPA nested under /react/.
 *
 * Output: dist/
 *   index.html          ← landing page
 *   _next/              ← landing assets
 *   react/index.html    ← ERP SPA
 *   react/assets/       ← ERP bundles
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const saasDir = path.join(root, 'saas');
const landingOut = path.join(saasDir, 'out');
const reactOut = path.join(root, 'dist-react');
const finalDist = path.join(root, 'dist');

function run(cmd, cwd = root, env = {}) {
  execSync(cmd, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

console.log('\n📦 Building Finvoroo landing (Next.js)…');
run('npm run build', saasDir);

console.log('\n📦 Building ERP app (Vite)…');
rmrf(reactOut);
run('npm run build', root, {
  VITE_BASE_URL: '/react/',
  VITE_ROUTER_BASENAME: '/',
  VITE_OUT_DIR: 'dist-react',
});

if (!fs.existsSync(landingOut)) {
  console.error('Landing build failed: saas/out not found.');
  process.exit(1);
}

console.log('\n📦 Merging dist/…');
rmrf(finalDist);
fs.mkdirSync(finalDist, { recursive: true });

copyDir(landingOut, finalDist);
fs.mkdirSync(path.join(finalDist, 'react'), { recursive: true });
copyDir(reactOut, path.join(finalDist, 'react'));

const htaccess = path.join(root, 'public', '.htaccess');
if (fs.existsSync(htaccess)) {
  fs.copyFileSync(htaccess, path.join(finalDist, '.htaccess'));
}

console.log('\n✅ Done. Deploy the dist/ folder to your domain root.');
console.log('   Landing:  https://your-domain.com/');
console.log('   Login:    https://your-domain.com/auth/signin\n');
