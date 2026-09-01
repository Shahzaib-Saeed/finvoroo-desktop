# Finvoroo Desktop

Native Windows shell (Tauri v2) for the existing Finvoroo ERP React app —
online **and** offline, no browser required, no repeated login, automatic
sync when connectivity returns. This is a **shell**, not a rewrite: every
business rule, the offline queue, POS, and printing are the same
`React-frontend` code that already runs in a browser tab today.

Full architecture rationale, phase-by-phase plan, and status live in
`/Users/apple/.claude/plans/redesign-the-entire-finvoroo-wild-bonbon.md`.
This file is the practical build/operate doc.

## How it works

```
┌─────────────────────────────────────────────┐
│ Finvoroo.exe (Tauri)                         │
│                                               │
│  WebView2 window                             │
│    → loads http://127.0.0.1:47391/           │──── real HTTP origin, so
│                                               │     BrowserRouter, cookies
│  embedded axum static server (src/server.rs) │     and X-Company-ID all
│    → serves ../webapp (built React app)      │     work unmodified
│    → SPA fallback: unmatched path → index.html│
└─────────────────────────────────────────────┘
                  │
                  │  fetch/XHR (Authorization: Bearer …)
                  ▼
        https://api.finvoroo.com/api/v1        ← real cloud API, unchanged
                  │
                  │  when unreachable, existing
                  │  React-frontend/src/offline/*
                  │  (Dexie/IndexedDB, outbox, sync-manager)
                  │  takes over automatically — no code here.
                  ▼
        Finvoroo Print Agent (separate install)
        http://127.0.0.1:17392                 ← unchanged, called exactly
                                                   as it is from a browser tab
```

There is **no local API and no local database in this project**. Offline
capability is entirely the existing `React-frontend/src/offline/` layer,
running inside this window exactly as it would in Chrome — this shell only
gives it a real origin, an installer, and a taskbar icon.

## Building

Requires: Windows, Node 20+, Rust (stable, `x86_64-pc-windows-msvc` target,
via rustup — installs the MSVC target by default on Windows), Microsoft C++
Build Tools (Rust's linker on Windows). Cannot be built or run on
macOS/Linux — WebView2 + the NSIS bundler are Windows-only, same constraint
`finvoroo-print-agent` has. Full prerequisites + step-by-step first-run
instructions are in `WINDOWS_TESTING.md` section 0.

```powershell
# finvoroo-desktop and React-frontend must sit side by side on disk
cd React-frontend
npm install

cd ..\finvoroo-desktop
npm install
npm run build     # builds React-frontend (desktop mode) into ./webapp,
                   # then `tauri build --bundles nsis`
```

Installer lands in
`src-tauri\target\release\bundle\nsis\FinvorooDesktop-Setup.exe` (after
`publish-installer.mjs` renames the Tauri output), with copies at
`finvoroo-desktop\dist\FinvorooDesktop-Setup.exe` and
`React-frontend\public\downloads\FinvorooDesktop-Setup.exe` — the exact
file the in-app download link (Settings → Print & Devices →
`DesktopAppDownloadPanel.jsx`) points at, mirroring exactly how
`FinvorooPrintAgent-Setup.exe` already gets published today.

`npm run dev` does the same frontend build once, then runs `tauri dev`
(hot-reloads Rust, not the frontend — re-run `npm run build:frontend`
after frontend changes, or point `VITE_API_BASE_URL` at a local API and run
`vite dev` separately if iterating on frontend code specifically).

### GitHub Actions (recommended — no Windows build PC required)

The Windows NSIS installer is built automatically on `windows-latest`. The
workflow lives in **this repository** (`finvoroo-desktop`), not in the Laravel
finvoroo repo — so pushing desktop changes never touches Laravel.

| Repo | GitHub | Role |
|------|--------|------|
| **finvoroo-desktop** | `Shahzaib-Saeed/finvoroo-desktop` | This repo + CI workflow |
| **React** | `Shahzaib-Saeed/React` | Cloned into `React-frontend/` at build time |
| finvoroo-print-agent | `Shahzaib-Saeed/finvoroo-print-agent` | Separate — not part of desktop CI |
| Laravel / API | separate finvoroo / Laravel repos | Separate — not part of desktop CI |

CI checks out this repo and `React` side by side (same layout as local
`scripts/build-frontend.mjs`).

**Triggers**

- Push to **finvoroo-desktop** `main`
- Manual run: GitHub → Actions → **Finvoroo Desktop Windows installer** → Run workflow
  (optional input: React branch/tag/SHA, default `main`)
- Tag push `desktop-v*` (e.g. `desktop-v0.1.0`) — also attaches
  `FinvorooDesktop-Setup.exe` to a GitHub Release
- After React-only changes: run the workflow manually (pulls latest React `main`)

**Download the installer**

1. Open **finvoroo-desktop** on GitHub → **Actions** → latest green run.
2. Scroll to **Artifacts** → download **FinvorooDesktop-Setup**.

Built installers are **never committed to Git**.

The Windows installer is built from **this repo only**. It does not clone
the Laravel API. The desktop app talks to `https://api.finvoroo.com`.

If the React repo is **private**, add a `REACT_REPO_PAT` secret (PAT with `repo` read).

### Publishing to app.finvoroo.com

1. On your Windows PC: `npm run build` (above) — produces the installer
   **and** copies it into `React-frontend/public/downloads/`.
2. From `React-frontend/`, build the web app as you normally do
   (`npm run build`) — Vite copies everything under `public/` (including
   the new installer) into `dist/`.
3. Upload `dist/` to app.finvoroo.com via FileZilla, same as always.
4. Users now see a "Finvoroo Desktop — Windows App" download card in
   **Settings → Print & Devices**, next to the existing Print Agent
   download.

If you don't want to redeploy the whole site right now, you can instead
upload just the one file —
`React-frontend/public/downloads/FinvorooDesktop-Setup.exe` — directly to
`app.finvoroo.com/downloads/FinvorooDesktop-Setup.exe` over FileZilla; the
download link is a plain static path and doesn't care how it got there.

**Keeping the version number in sync**: `DESKTOP_APP_LATEST_VERSION` in
`React-frontend/src/lib/desktop-app.js` is a separate constant from the
Tauri app's own version (`tauri.conf.json`/`Cargo.toml`/`package.json`) —
bump it by hand to match whenever you ship a new installer, the same way
`PRINT_AGENT_LATEST_VERSION` in `src/lib/print-agent.js` is kept in sync
with `finvoroo-print-agent/package.json` today.

**After building, work through `WINDOWS_TESTING.md`** — a full manual test
checklist covering install, login, every offline workflow, sync/retry
correctness, restart survival, Print Agent integration, and update-preserves-
data. Everything in this repo that touches real Windows/WebView2/IndexedDB/
installer behavior can only be verified there; it hasn't been run anywhere
yet.

## Required deployment change: CORS

The webview's origin is `http://127.0.0.1:47391`. The production Laravel API
only allows browser requests from origins listed in `CORS_ALLOWED_ORIGINS`
(`Laravel-api-backend/config/cors.php`), which defaults to
`https://finvoroo.com,https://app.finvoroo.com` and is normally overridden by
the production `.env`. **Add `http://127.0.0.1:47391` to that list in the
production environment**, or every API call from inside the desktop shell
will fail CORS before this app can be used for real. This is a config/ops
change, not something a code change here can do on its own.

## Constants that must never change

- `PORT = 47391` in `src-tauri/src/lib.rs` — WebView2 scopes IndexedDB/Dexie
  storage to this origin. Bumping the port on a future release silently
  orphans every user's offline data. See Phase 7 of the plan.
- `identifier: com.finvoroo.desktop` in `tauri.conf.json` — determines the
  `%APPDATA%` folder (WebView2 profile) and the NSIS upgrade-in-place key.

## Immediate vs. deferred effects (offline)

Per the approved plan's Phase 6, exactly which effects are immediate on an
offline device vs. deferred until sync:

| Effect | Timing | Where |
|---|---|---|
| Invoice / bill / quotation / PO / expense / credit note / debit note record created & visible | Immediate | Existing + extended Dexie stores (`documents-repository.js`, `db.js` v5) |
| Payment (standalone, against an already-synced invoice) queued | Immediate (local, then synced) | `RecordPaymentDialog.jsx` → outbox `payment.create` |
| POS payment/receipt | Immediate (local, printed from local data) | Existing Print Agent flow, unchanged |
| Product/customer/vendor lookup, pharmacy batch/expiry lookup | Immediate (cached) | Existing `masters-repository.js` |
| Displayed stock quantity reflecting an offline sale/return | Immediate (derived, read-only) | `getOfflineStockDeltas()`/`applyEffectiveStock()` in `masters-repository.js`, and `refreshPharmacyOfflineStockOverlay()` for the pharmacy POS catalog — both computed from the existing outbox, never a new stock ledger |
| Pharmacy batch/expiry lookup, incl. offline | Immediate (cached, incrementally synced) | `industries/pharmacy/lib/pharmacy-batch-store.js` — snapshot in IndexedDB (reuses the `pos_catalog` store), incremental sync piggybacked on the existing `syncPharmacyCatalog()` cadence, seeded from a new bulk endpoint (`GET /workspace/pharmacy/batches/index`, `BatchInventoryService::listAllBatchesForCompany()`) that's a pure read projection of the same tables `allocateFefo` already reads |
| FEFO batch pick for an offline/online sale | Immediate (client-side, mirrors server ordering) | `industries/pharmacy/lib/fefo.js` (`sortBatchesFefo`/`allocateFefo`/`pickFefoBatch`), sourced from `pharmacy-batch-store.js`'s cache when nothing else supplied `batches`, wired into `pharmacy-cart.js` |
| GL journal posting | Deferred to sync | `InvoiceWriteService` / `PosCheckoutOrchestrator` / `CreateCreditNoteOrchestrator` / `CreateVendorCreditOrchestrator` / `StoreCustomerPaymentOrchestrator` — all unchanged, all run at most once, at sync time |
| Authoritative stock deduction | Deferred to sync | Same — single accounting/inventory engine, by design |
| Official document numbering | Deferred to sync | Same |

Note: credit note / vendor credit ("debit note") differ from invoice/bill in
one respect — they have no separate draft→post lifecycle online either, so
GL posting for them happens synchronously the first time the mutation is
dispatched (at sync time), not on a later explicit "post" action. Still only
once, still only in Laravel. See `SyncDraftMutationService`'s docblock.

**Known gaps, not this pass:** offline credit note / debit note only support
the amount+reason path (no line-item invoice/bill returns) — that needs a
live open-invoices/bill-lines lookup this app doesn't cache yet. Offline
payment capture requires the invoice it's paid against to have already
synced (have a real server id) — paying an invoice that's itself still an
unsynced local draft isn't supported. Both fail with a clear, non-silent
error rather than doing the wrong thing. Cached batch **quantities** reflect
the last sync, not this session's offline sales — only the aggregate
product-level effective-stock overlay is live-adjusted offline; a specific
batch's displayed remaining quantity is not (the FEFO *pick* is still
correct, since it's ordered by expiry, not by live quantity).

## Status

**Phase 2** (Tauri shell): scaffolded — embedded static server with SPA
fallback, NSIS installer config, CI template. **Not build-verified** — no
Rust/Windows toolchain in the environment this was written in; the first
real build on Windows is the actual verification step, same as
`finvoroo-print-agent`'s CI. The frontend half of the pipeline
(`scripts/build-frontend.mjs`) **was** run end-to-end successfully.

**Phase 3** (connectivity): done — `isReallyOnline()` reachability check
wired into `bindConnectivitySync`; `app-version-watcher.jsx` gated off for
desktop builds; `npm run build` verified clean.

**Phase 4** (device trust): done and tested — one-active-desktop-device-per-
workspace hard-enforced server-side (`device_type`/`is_active` on
`acc_sync_devices`), with an explicit-takeover flow, verified against a real
database via `tests/Feature/Accounting/OfflineSyncPhase6Test.php`
(`test_second_desktop_device_is_rejected_then_allowed_via_explicit_takeover`).
Device *registration* itself needed no change — it already happened
automatically (`ensureDeviceRegistered()` in `sync-manager.js`).

**Phase 6** (full offline coverage): done and tested, including the pharmacy
batch-caching gap that was still open at the end of the previous pass.
- 6b effective-stock overlay + client-side FEFO + offline batch caching:
  implemented as described above; `npm run test:pharmacy-fefo` covers the
  FEFO ordering/allocation logic (9 tests); the new bulk batches endpoint is
  covered by `tests/Feature/Pharmacy/BatchesIndexEndpointTest.php` (3
  tests, including the subtle case where only a batch's *balance* row
  changes — e.g. a sale — without the batch row itself changing) against a
  real database.
- 6c new mutation types (`credit_note.create`, `debit_note.create`,
  `payment.create`): implemented in `SyncDraftMutationService`/
  `SyncPushService`, new `uuid` columns added via migration and verified
  against a real MySQL database, wired into `useCreditNoteForm.js`/
  `useVendorCreditForm.js`/`RecordPaymentDialog.jsx`. All three verified
  end-to-end — create, idempotent replay, and (for payment) exactly-once
  invoice settlement under retry — via
  `tests/Feature/Accounting/OfflineSyncPhase6Test.php` against the real
  local database (not mocked): 4/4 tests, 30 assertions, passing.

**Phase 7** (installer/CI/tests): code/config complete.
- `tauri.conf.json`/`Cargo.toml`/NSIS config finalized; `src/lib.rs` now
  logs startup (including failures) to
  `%LOCALAPPDATA%\com.finvoroo.desktop\logs\finvoroo-desktop.log` so a
  silent-window-never-appears failure (release builds have no console) is
  diagnosable.
- CI workflow (`.github/workflows/finvoroo-desktop-windows.yml`) builds
  on `windows-latest`, bundles the React-frontend production build into
  `webapp/`, produces `FinvorooDesktop-Setup.exe`, uploads it as a GitHub
  Actions artifact, and attaches it to GitHub Releases on `desktop-v*` tags.
  Requires `React-frontend/` committed at the repo root alongside
  `finvoroo-desktop/`.
- Everything automatable without a real Windows/WebView2/IndexedDB
  environment has been written and passes: `OfflineSyncPhase6Test.php`,
  `BatchesIndexEndpointTest.php`, `test:pharmacy-fefo`,
  `test:pharmacy-search`, `test:print-agent`, plus a clean `vite build` and
  `php artisan route:cache`. **`WINDOWS_TESTING.md`** is the checklist for
  everything else — build the installer, work through it, report back
  anything that fails.

**Action item, not code — verified as far as possible from here**:
production `CORS_ALLOWED_ORIGINS` must include `http://127.0.0.1:47391`.
The *code default* in `config/cors.php` was confirmed to include it (via
`php artisan tinker` → `config('cors.allowed_origins')`, live, against this
repo's local `.env`, which does not override the var). **If production's
`.env` sets `CORS_ALLOWED_ORIGINS` explicitly — check for that line — add
`http://127.0.0.1:47391` to its comma-separated value.** This repo cannot
read or edit a real production `.env`; this is the one remaining step that
has to happen outside of it.
