//! Signed auto-update for the desktop shell.
//!
//! Unlike the tray Print Agent, this app has a cashier actively looking at a
//! window, so an update is never force-installed the instant it's ready.
//! Instead: check + download + signature-verify entirely in the background
//! (see `tauri.conf.json` -> `plugins.updater`), then emit `finvoroo://update-ready`
//! so the React UI can show a small "Restart to update" toast. The frontend
//! calls the `install_pending_update` command either when the cashier clicks
//! that toast, or on its own after a grace period of user inactivity — this
//! module never restarts the app on a timer by itself, since it has no
//! visibility into "is a sale in progress" from the Rust side.

use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_updater::{Update, UpdaterExt};
use tokio::sync::Mutex;

/// Give the local axum server + PHP sidecar (see `lib.rs`) time to come up
/// before the first check adds to startup network/CPU load.
const STARTUP_DELAY: Duration = Duration::from_secs(45);
/// Long-running desktop session: keep re-checking, not just once at launch.
const RECHECK_INTERVAL: Duration = Duration::from_secs(90 * 60);

#[derive(Default)]
pub struct PendingUpdate {
    inner: Mutex<Option<(Update, Vec<u8>)>>,
}

#[derive(Serialize, Clone)]
struct UpdateReadyPayload {
    version: String,
}

pub fn spawn(app: AppHandle) {
    app.manage(PendingUpdate::default());
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(STARTUP_DELAY).await;
        loop {
            check_once(&app).await;
            tokio::time::sleep(RECHECK_INTERVAL).await;
        }
    });
}

async fn check_once(app: &AppHandle) {
    let state = app.state::<PendingUpdate>();
    if state.inner.lock().await.is_some() {
        // Already downloaded and waiting on the UI/idle-timer — nothing to do
        // until the pending one is installed or the app restarts.
        return;
    }

    let updater = match app.updater() {
        Ok(updater) => updater,
        Err(err) => {
            tracing::warn!("updater not available: {err:#}");
            return;
        }
    };

    let update = match updater.check().await {
        Ok(Some(update)) => update,
        Ok(None) => return,
        Err(err) => {
            tracing::info!("update check skipped: {err:#}");
            return;
        }
    };

    tracing::info!(
        current = %update.current_version,
        available = %update.version,
        "desktop update found, downloading"
    );

    // `download()` verifies the minisign signature before returning bytes —
    // nothing reaches the UI or the installer unsigned.
    let bytes = match update.download(|_, _| {}, || {}).await {
        Ok(bytes) => bytes,
        Err(err) => {
            tracing::error!("update download/verify failed: {err:#}");
            return;
        }
    };
    tracing::info!("desktop update downloaded and verified, notifying UI");

    let version = update.version.clone();
    *state.inner.lock().await = Some((update, bytes));
    if let Err(err) = app.emit("finvoroo://update-ready", UpdateReadyPayload { version }) {
        tracing::warn!("could not notify UI of pending update: {err:#}");
    }
}

/// Invoked from React — either the cashier clicked "Restart now" on the
/// update toast, or the toast's own inactivity timer fired. Installs the
/// already-downloaded, already-verified update and restarts the process.
#[tauri::command]
pub async fn install_pending_update(app: AppHandle) -> Result<(), String> {
    let state = app.state::<PendingUpdate>();
    let pending = state.inner.lock().await.take();
    let Some((update, bytes)) = pending else {
        return Err("No update is ready to install".into());
    };
    update.install(bytes).map_err(|err| err.to_string())?;
    app.restart();
}
