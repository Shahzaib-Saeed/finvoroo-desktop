; Finvoroo Desktop — NSIS hooks for the Windows installer.
;
; Offline data (Dexie/IndexedDB) lives in WebView2's per-app profile, keyed by
; this app's identifier (com.finvoroo.desktop) and scoped to its local origin
; (http://127.0.0.1:47391 — see src-tauri/src/lib.rs::PORT). The exact folder
; (typically under %LOCALAPPDATA%\com.finvoroo.desktop\EBWebView, WebView2's
; usual convention for a per-user Tauri install) should be confirmed once on
; a real Windows machine — see the "IndexedDB location" step in the Windows
; Manual Test Checklist — but wherever it is, it lives OUTSIDE $INSTDIR, so
; the default NSIS/Tauri uninstaller (which only removes $INSTDIR and
; registry entries, never %APPDATA%/%LOCALAPPDATA%) does not touch it. These
; hooks exist to make that explicit and to stop anyone from "cleaning up"
; that folder here later: it MUST survive installer upgrades and
; uninstall-then-reinstall, or unsynchronized offline invoices/POS sales/
; outbox mutations would be lost.

!macro NSIS_HOOK_PREINSTALL
!macroend

!macro NSIS_HOOK_POSTINSTALL
  ; Launch the app so the user lands straight in Finvoroo after install.
  Exec '"$INSTDIR\${MAINBINARYNAME}.exe"'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Leave %APPDATA%\com.finvoroo.desktop (WebView2 profile / offline data) in
  ; place on uninstall — a reinstall must not lose unsynced offline records.
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
!macroend
