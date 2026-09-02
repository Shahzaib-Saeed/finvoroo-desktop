# Finvoroo Desktop — updates

## Two kinds of updates

| What changed | User action | How it reaches installed apps |
|--------------|-------------|--------------------------------|
| **React UI / frontend bugs** (POS, print, screens) | Deploy to `app.finvoroo.com` | **Automatic** when the till is online — the desktop shell loads the live SPA from the cloud |
| **Windows shell** (Rust/Tauri, WebView2 wrapper) | Bump version + rebuild installer | **Fully automatic**, signed, in the background (see below) |

Pharmacies install `FinvorooDesktop-Setup.exe` **once**. No manual reinstall, no browser download, no Node/Rust/dev tools on the till PC — ever again.

## Automatic frontend updates (online)

When Finvoroo Desktop starts and the internet is available:

1. The local server on `http://127.0.0.1:47391` tries to load the UI from `https://app.finvoroo.com`
2. If that succeeds, users get the **same build** as browser users on the same deploy
3. If the internet drops, the embedded offline bundle is used instead

**Your workflow for UI fixes:** deploy React to production — done. No new `.exe` for every bug fix.

## Automatic shell updates (`.exe`)

Rebuild the installer when the Rust shell changes (ports, proxy, WebView2, sidecar). From here it's hands-off:

1. `src-tauri/src/updater.rs` checks `plugins.updater.endpoints` (`tauri.conf.json`) on startup and every 90 minutes.
2. A newer signed release is downloaded in the background and its **minisign signature is verified** before anything happens — nothing unsigned is ever installed.
3. React shows a small **"Update ready — Restart now"** toast (`src/components/desktop-update-watcher.jsx`). If the cashier ignores it, it auto-applies after 5 minutes of no keyboard/mouse/touch activity — it never interrupts an active sale.
4. Restarting runs the installer silently (`windows.installMode: "quiet"`) and relaunches the app. IndexedDB offline data and all settings are preserved — NSIS `currentUser` installs never touch AppData.

This uses [tauri-plugin-updater](https://v2.tauri.app/plugin/updater/) with an Ed25519 (minisign) keypair generated once offline — independent of a Windows Authenticode certificate (optional, only affects SmartScreen warnings on a manual download, not required for the signature verification above).

## Publishing a shell release

1. Bump version in `package.json`, `tauri.conf.json`, `Cargo.toml`, and `React-frontend/src/lib/desktop-app.js`.
2. CI (`.github/workflows/finvoroo-desktop-windows.yml`) builds with `TAURI_SIGNING_PRIVATE_KEY` / `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` secrets set, so `tauri build` (`createUpdaterArtifacts: true`) emits a `.sig` next to the NSIS installer.
3. `npm run build` (which runs `scripts/publish-installer.mjs`) writes `dist/desktop-latest.json` — now carrying **both** the original bespoke fields (still read by `DesktopAppDownloadPanel.jsx`'s manual "check for updates" Settings panel) **and** the `platforms` field the real updater needs, built from that `.sig`.
4. Upload `FinvorooDesktop-Setup.exe` **and** `desktop-latest.json` to `app.finvoroo.com/downloads/` (manual upload today; see the CI artifact for both files).
5. Installed apps pick it up on their next check (startup, or within 90 minutes) — no user action required beyond the "Restart now" toast (or its automatic idle fallback).

## Keys

The signing keypair (`tauri signer generate`) was generated once, offline. The private key + its password live **only** in this repo's GitHub Actions secrets (`TAURI_SIGNING_PRIVATE_KEY`, `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`) — never in git. The public key is committed in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`).

## Developer checklist

- **Frontend-only deploy:** `npm run build` in React-frontend → upload to app.finvoroo.com
- **Shell deploy:** bump version → `npm run build` in finvoroo-desktop (with signing secrets set) → upload `.exe` + `desktop-latest.json`
- **Verify on a till:** Settings → Print & Devices → Desktop panel should show “Live from app.finvoroo.com” when online
