# Finvoroo Desktop — Windows Manual Test Checklist

Everything in this file needs a real Windows machine, a real WebView2/NSIS
build, and (for several steps) a real network you can turn on and off — none
of it can be verified from the sandbox this code was written in. This is the
actual verification pass for Phase 7. Work through it top to bottom; each
step says what it proves and which files it exercises so a failure points
you straight at the right place.

Before starting, read `README.md`'s "Required deployment change: CORS"
section — several steps below will fail with a network/CORS error, not a
useful one, if that hasn't been done first.

## 0. Build the installer

```powershell
# Prerequisites (one-time):
#   - Node.js 20+ (LTS)
#   - Rust via rustup (https://rustup.rs) — installs the x86_64-pc-windows-msvc
#     target by default on Windows
#   - Microsoft C++ Build Tools (Rust on Windows needs the MSVC linker —
#     rustup will prompt you to install these if missing)
#   - WebView2 Runtime — preinstalled on current Windows 10/11; Tauri's
#     bundler embeds a bootstrapper for machines that don't have it
#     (see tauri.conf.json's webviewInstallMode)

# finvoroo-desktop and React-frontend must sit side by side on disk:
#   C:\finvoroo\finvoroo-desktop\
#   C:\finvoroo\React-frontend\

cd C:\finvoroo\React-frontend
npm install

cd C:\finvoroo\finvoroo-desktop
npm install
npm run build
```

`npm run build` runs `scripts/build-frontend.mjs` (builds React-frontend
into `finvoroo-desktop/webapp/`) then `tauri build --bundles nsis`, then
`publish-installer.mjs` which renames the output to
`FinvorooDesktop-Setup.exe`. Installer lands at:

```
finvoroo-desktop\dist\FinvorooDesktop-Setup.exe
finvoroo-desktop\src-tauri\target\release\bundle\nsis\FinvorooDesktop-Setup.exe
```

Or download from GitHub Actions (see README.md → "GitHub Actions") — no
local Windows build PC required once `React-frontend/` is pushed to the repo.

**Record here once confirmed**, for use in later steps:
- [ ] Build succeeded, installer file exists.
- [ ] Installer file size is reasonable (tens of MB, not KB — a near-empty
      installer usually means `webapp/` was empty when `tauri build` ran).

## 1. Fresh installation

1. On a clean-ish Windows account (or at least a PC without Finvoroo Desktop
   already installed), double-click the installer.
2. Confirm it installs **without an admin/UAC prompt** (`installMode:
   currentUser` in `tauri.conf.json` — per-user install, no elevation).
3. Confirm Start Menu shows a "Finvoroo" folder/shortcut (`startMenuFolder`
   config).
4. Confirm the app **launches automatically right after install**
   (`NSIS_HOOK_POSTINSTALL` in `src-tauri/windows/installer-hooks.nsh`).
5. **Locate the WebView2 data folder now**, before any real use, so later
   "survives update" steps have a known-good path to check. Look for an
   `EBWebView` folder under `%LOCALAPPDATA%\com.finvoroo.desktop\` (Tauri's
   usual per-user WebView2 profile location — confirm the exact path here
   since this repo's comments hedge it as "typical," not verified).
   - [ ] Path found and noted: `_______________________________`

## 2. Login

1. App window opens to the Finvoroo sign-in page (same page as the browser
   app — this is the existing `src/auth/pages/signin-page.jsx`, unmodified).
2. Confirm **"Keep me logged in for 30 days" is pre-checked** — desktop
   builds default this on (`VITE_DESKTOP_BUILD` check in
   `signin-page.jsx`).
3. Log in with real credentials, online.
4. **Open DevTools** (right-click → Inspect, or `Ctrl+Shift+I` — Tauri's
   WebView2 supports this in dev; if disabled in this release build, skip
   the console-watching parts below but keep testing the visible behavior).
   Confirm no CORS errors in the console — if you see
   `blocked by CORS policy` for `api.finvoroo.com`, the production
   `CORS_ALLOWED_ORIGINS` fix (README) was not actually applied; stop and
   fix that first, nothing past this point will work correctly otherwise.

## 3. Company selection

1. Select/enter a workspace exactly as in the browser app.
2. Confirm the URL bar (if visible) or window title reflects
   `http://127.0.0.1:47391/workspace/<id>/...` — this proves the app is
   really serving from the local origin, not `tauri://localhost`.

## 4. Initial offline data / bootstrap

1. While online, open a page that triggers `bootstrapMasters()` (e.g. the
   Invoices → Create page, or POS) so customers/products/tax rates get
   cached into Dexie (`src/offline/sync-manager.js`).
2. Check DevTools → Application → IndexedDB → `finvoroo.offline.<companyId>`
   → confirm `customers`, `products`, `tax_rates` stores have rows.
3. For a pharmacy-industry company: also open the POS page once online so
   `pharmacy-catalog-store.js` and the new `pharmacy-batch-store.js`
   populate. Check IndexedDB → `pos_catalog` store for keys
   `pharmacy_pos_catalog` and `pharmacy_batches` (both present).

## 5. Online invoice (baseline — confirm nothing regressed)

1. With internet connected, create a normal invoice.
2. Confirm it saves immediately with a real invoice number, exactly like
   the browser app. This is the "everything else still works" sanity check.

## 6. Offline invoice

1. Disconnect the network (see "How to go offline" below).
2. Create an invoice. Confirm: a toast says something like "saved offline —
   will sync when you reconnect"; the invoice appears in the list with an
   offline/pending indicator and a provisional number (not a real
   `IN-`/`YY-####`-style number yet).
3. Reopen the invoice (click into it) — confirm it still shows correctly
   (proves Dexie persistence, not just in-memory state).

**How to go offline**, in order of preference:
- Physically disconnect Wi-Fi/Ethernet (most realistic).
- Windows Settings → Network → toggle off.
- If you must simulate at the app level instead, note that DevTools'
  "offline" throttling only affects the WebView's own network stack — it's
  a reasonable stand-in but a real disconnect is the stronger test,
  especially for step 14/15 below.

## 7. Offline credit note

1. Still offline, create a credit note using the **amount + reason** field
   (not "add line items" — offline credit notes only support the
   amount-only path today, see README's "Known gap" section).
2. Confirm it saves offline with a toast and a provisional number.
3. Attempt a **line-item** credit note offline — confirm it shows a clear
   error telling you to reconnect (`useCreditNoteForm.js`), not a silent
   failure or a wrong result.

## 8. Offline debit note

Same as #7 but on the Vendor Credits (debit notes) page — amount-only
works offline, line-item returns show a clear "needs a connection" error
(`useVendorCreditForm.js`).

## 9. Offline payment

1. Pick an invoice that was created **online** (has a real ID) before you
   went offline.
2. Open "Record payment" on it, still offline, enter an amount, submit.
3. Confirm a toast says it was saved offline.
4. Now try "Record payment" on the offline invoice from step 6 (the one
   with a provisional number, no real ID yet) — confirm it shows a clear
   error explaining the invoice needs to sync first
   (`RecordPaymentDialog.jsx`), not a wrong/silent result.

## 10. Offline POS sale

1. Still offline, go to POS, scan/add a product, complete a sale (cash).
2. Confirm the receipt data is available immediately (see #13) and the sale
   appears as a pending/offline invoice.

## 11. Offline stock display

1. Note a product's stock quantity before the offline POS sale in #10.
2. After the sale, confirm the SAME product's displayed stock has dropped
   by the sold quantity — **immediately, still offline** — without a page
   reload doing anything special. This is the effective-stock overlay
   (`getOfflineStockDeltas`/`applyEffectiveStock` in
   `masters-repository.js`, and `refreshPharmacyOfflineStockOverlay` for
   the pharmacy POS catalog).
3. If applicable, create an offline credit note (#7) with a returned item
   linked to an invoice line — confirm displayed stock goes back UP by the
   returned quantity.

## 12. Offline pharmacy batch/FEFO selection

(Pharmacy-industry companies only.)

1. Confirm step 4's bootstrap already cached batch data
   (`pharmacy_batches` in IndexedDB).
2. Still offline, add a product with multiple batches to the POS cart.
3. Confirm a batch gets auto-selected ("Auto FEFO") and it's the one with
   the **soonest expiry date** among batches with stock — this is
   `industries/pharmacy/lib/fefo.js`'s `pickFefoBatch`, sourced from
   `pharmacy-batch-store.js`'s cache via `pharmacy-cart.js`.
4. Open the batch picker — confirm it lists all cached batches for that
   product with correct expiry dates, not an empty list.
5. **Known limitation to confirm, not a bug**: batch quantities shown here
   reflect the last **online** sync, not this session's offline sales (only
   the aggregate product-level stock in #11 is live-adjusted). Multiple
   offline sales against the same batch won't visibly decrement that
   batch's displayed quantity until the next sync.

## 13. Offline receipt printing

Requires the separate Finvoroo Print Agent installed
(`public/downloads/FinvorooPrintAgent-Setup.exe`, installable from inside
the app if not already present — confirm that download link works too).

1. With the Print Agent installed, running, and paired (PIN pairing, same
   flow as the browser app), print the receipt from the offline POS sale
   in #10 — still offline.
2. Confirm it prints. This proves `src/lib/print-agent.js`'s calls to
   `http://127.0.0.1:17392` work from inside the desktop shell with zero
   code changes — the print agent's own CORS allowlist
   (`finvoroo-print-agent/src-tauri/src/auth.rs::origin_is_allowed`) already
   accepts any `127.0.0.1` origin regardless of port, verified by reading
   the code, but confirm it here for real.

## 14. Internet disconnection during a transaction

1. Start creating an invoice **while online** (fill in fields, don't submit
   yet).
2. Disconnect the network mid-way, then submit.
3. Confirm it falls back to the offline save path cleanly (same result as
   #6), not a hung request or a confusing error.

## 15. Internet restoration

1. From any offline state with pending items (outbox has entries), reconnect
   the network.
2. Confirm sync starts automatically within a few seconds, with **no manual
   "sync now" click required** — this is `bindConnectivitySync`'s
   `isReallyOnline()` reachability check in `src/offline/connectivity.js`
   firing on the browser `online` event.
3. Watch for the sync status banner/indicator going from "pending" to
   "synced".

## 16. Automatic synchronization

1. After #15, confirm every offline item created in this session (invoice,
   credit note, debit note, payment, POS sale) now shows its **real** number
   (`IN-...`/`YY-####`-style, not a provisional one) and a real server ID.
2. Confirm stock quantities shown now match the server's actual post-sync
   values (the offline overlay from #11 should have reconciled to zero —
   i.e. displayed stock shouldn't change again on sync, just stop being
   "derived").

## 17. Duplicate/retry protection

This is the single most important correctness property — it's already
proven server-side by
`Laravel-api-backend/tests/Feature/Accounting/OfflineSyncPhase6Test.php`
(automated, passing), but confirm it holds under a real flaky connection
too:

1. Create an offline invoice or POS sale.
2. Reconnect, but **disconnect again within a couple seconds** (during the
   sync push) to simulate a dropped connection mid-sync.
3. Reconnect again and let it finish.
4. In the cloud/admin view (or the Sync Admin page under Accounting →
   Offline Sync in the app itself), confirm **exactly one** record was
   created for that mutation — not zero, not two.

## 18. App restart while offline

1. While offline with pending outbox items, fully close the Finvoroo
   Desktop window (not just minimize).
2. Relaunch it (still offline).
3. Confirm all pending items are still visible (invoices list, POS
   history, etc.) — this proves Dexie/IndexedDB survived a normal app
   restart, independent of any sync.

## 19. Windows restart while offline

Same as #18 but restart Windows itself in between (not just the app).
Proves IndexedDB survived a full OS restart, not just an app-level one —
these are not guaranteed to behave identically, hence testing both.

## 20. Pending outbox survives restart

Explicitly check the outbox count, not just the visible document list:

1. Before restarting (#18 or #19), note the pending-sync count shown in the
   offline sync banner/indicator.
2. After restarting, confirm the same count is shown before any sync runs.
3. Reconnect and confirm all of them sync (not a subset).

## 21. Print Agent communication

Beyond #13's happy path:

1. Confirm the app can detect whether the Print Agent is running/paired vs.
   not installed (whatever status indicator the browser app already shows
   for this — should be identical here).
2. If the Print Agent isn't installed, confirm the in-app download link
   (`public/downloads/FinvorooPrintAgent-Setup.exe`, served from the
   desktop app's own local server) actually downloads a working installer.

## 22. Logout / login behavior

1. Log out.
2. Confirm you land back on the sign-in page (not a blank/broken state).
3. Log back in — confirm "keep me logged in" is pre-checked again (desktop
   default), and that this doesn't re-trigger `sync/devices/register` in a
   way that causes a `desktop_device_conflict` (same device_uuid persists
   in IndexedDB across logout — confirm no error here; if there IS a 409
   here, that's a real bug to report, since re-logging in on the SAME
   physical device must not look like a second device).

## 23. Device registration

1. On first login on this PC, confirm (via DevTools → Network, or the Sync
   Admin page) that `POST /workspace/sync/devices/register` was called with
   `device_type: "desktop"`.
2. Confirm the Sync Admin page (Accounting → Offline Sync) lists this
   device with `device_type: desktop` and `is_active: true`.

## 24. Second offline-device rejection

This is already proven server-side by
`OfflineSyncPhase6Test::test_second_desktop_device_is_rejected_then_allowed_via_explicit_takeover`
(automated, passing) — confirm it holds for real with two machines/devices:

1. Install Finvoroo Desktop on a **second** Windows PC (or a second Windows
   user profile on the same PC, which gets its own `%LOCALAPPDATA%` and
   thus its own device UUID).
2. Log into the same workspace on both.
3. Confirm the second device gets a clear "offline mode already active on
   another device" error (409 `desktop_device_conflict`) rather than
   silently working — there's no UI "transfer device" button yet (see
   README's Phase 4 note), so this will surface as a raw sync error message
   for now; confirm it's at least visible and non-silent, not a crash.

## 25. Application update over an existing installation

1. Bump the version in `tauri.conf.json`, `package.json`, and
   `src-tauri/Cargo.toml` (keep them in sync, matching
   `finvoroo-print-agent`'s convention) and rebuild.
2. Before installing, create some offline pending items on the OLD version
   (go offline, create an invoice, don't sync yet).
3. Run the NEW version's installer over the existing install (same
   `currentUser` NSIS install, same identifier `com.finvoroo.desktop` —
   should install in place, not side-by-side).
4. Launch the new version.

## 26. IndexedDB / data preservation after update

Directly following #25:

1. Confirm the pending offline invoice created on the old version is still
   there after the update.
2. Confirm you're still logged in (no forced re-login).
3. Confirm the WebView2 data folder path noted in step 1.5 is unchanged.
4. Reconnect and confirm that pre-update offline item still syncs correctly
   (proves the update didn't just preserve the data, but left it in a
   still-valid state).

## 27. Cloud verification after synchronization

For every "offline X" step above (6–13), after its data has synced (#16),
independently verify in the actual cloud database / admin UI — not just the
desktop app's own view of itself — that:

- [ ] The invoice from #6 exists with correct customer, lines, and total.
- [ ] The credit note from #7 exists and applied correctly if linked to an
      invoice.
- [ ] The debit note from #8 exists.
- [ ] The payment from #9 shows against the correct invoice, and that
      invoice's balance/status updated.
- [ ] The POS sale from #10 exists as a real invoice, and — per the
      documented deferred-effects model — its GL journal entry and
      authoritative stock deduction now exist too (these happen once, at
      sync time, in `InvoiceWriteService`/`PosCheckoutOrchestrator` —
      confirm they actually ran, not just that the invoice row exists).
- [ ] No duplicates anywhere from the retry in #17.

---

If everything above passes, Finvoroo Desktop is ready for real use. Report
back anything that fails with: which numbered step, what you expected vs.
what happened, and (if available) the contents of
`%LOCALAPPDATA%\com.finvoroo.desktop\logs\finvoroo-desktop.log`.
