//! Finvoroo Desktop — native Windows shell for the Finvoroo ERP web app.
//!
//! Architecture (see /Users/apple/.claude/plans/redesign-the-entire-finvoroo-wild-bonbon.md
//! Phase 2 for the full rationale):
//! - The existing React-frontend SPA is built as a static bundle (`../webapp`) and
//!   served from an embedded axum HTTP server bound to 127.0.0.1:PORT — a real HTTP
//!   origin, not the Tauri asset protocol — so BrowserRouter, cookies, and the
//!   X-Company-ID header (derived from window.location.pathname) all keep working
//!   completely unmodified. See src/server.rs.
//! - All business logic runs in an embedded PHP/Laravel sidecar backed by SQLite.
//!   The axum server on 127.0.0.1:47391 serves the SPA and proxies /api/v1/* to
//!   the sidecar (local scope) or the cloud API (online-only routes).
//! - Printing goes through the separately-installed Finvoroo Print Agent
//!   (http://127.0.0.1:17392), exactly as it does from a browser tab today.

pub mod php_sidecar;
pub mod server;

use std::fs::OpenOptions;
use std::io::Write;
use std::net::TcpListener as StdTcpListener;
use std::path::PathBuf;

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Local origin the SPA is served from. MUST stay constant across versions:
/// the browser (WebView2) scopes IndexedDB/Dexie storage to this origin, so
/// changing the port on a future release would silently orphan every user's
/// offline data. See Phase 7 of the desktop plan.
///
/// Also: the production Laravel API's CORS_ALLOWED_ORIGINS must include
/// `http://127.0.0.1:47391` for API calls made from inside this shell to
/// succeed (see Laravel-api-backend/config/cors.php) — this is a deployment
/// action item, not something fixable from this crate alone.
pub const PORT: u16 = 47391;

fn resolve_webapp_dir(app: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    // Packaged app: resources/webapp next to the executable, populated from
    // bundle.resources in tauri.conf.json ("../webapp" -> "webapp").
    if let Ok(resource_dir) = app.path().resource_dir() {
        let dir = resource_dir.join("webapp");
        if dir.join("index.html").exists() {
            return Ok(dir);
        }
    }

    // `tauri dev` / running the binary straight from src-tauri/target without a
    // full bundle: fall back to the sibling webapp/ produced by
    // scripts/build-frontend.mjs.
    let dev_dir = std::env::current_dir()?.join("../webapp");
    if dev_dir.join("index.html").exists() {
        return Ok(dev_dir);
    }

    anyhow::bail!(
        "webapp bundle not found (checked resource dir and {}). Run `npm run build:frontend` first.",
        dev_dir.display()
    )
}

/// Release builds run with `windows_subsystem = "windows"` (no console), so a
/// startup failure would otherwise be completely silent to the user — the
/// window just never appears. Mirrors finvoroo-print-agent's plain
/// append-to-file logging (no extra crate) so a failure is always
/// diagnosable from `%LOCALAPPDATA%\com.finvoroo.desktop\logs\finvoroo-desktop.log`.
fn log_file_path(app: &tauri::AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_log_dir()
        .unwrap_or_else(|_| std::env::temp_dir().join("finvoroo-desktop"));
    let _ = std::fs::create_dir_all(&dir);
    dir.join("finvoroo-desktop.log")
}

fn log_line(path: &PathBuf, message: &str) {
    tracing::info!("{message}");
    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(path) {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let _ = writeln!(file, "[{now}] {message}");
    }
}

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // Second launch attempt (e.g. double-clicking the desktop icon again,
            // or Windows re-launching it) focuses the existing window instead of
            // starting a second instance that would fail to bind PORT anyway.
            // (Deliberately no autostart / no hide-to-tray here, unlike
            // finvoroo-print-agent — this is the main app the user opens to
            // work, not a silent background service, so closing its window
            // quits it normally.)
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.show();
                let _ = win.unminimize();
                let _ = win.set_focus();
            }
        }))
        .setup(|app| {
            let log_path = log_file_path(app.handle());
            log_line(&log_path, &format!("Finvoroo Desktop {} starting", VERSION));

            let webapp_dir = match resolve_webapp_dir(app.handle()) {
                Ok(dir) => dir,
                Err(err) => {
                    log_line(&log_path, &format!("FATAL: {err:#}"));
                    return Err(err.into());
                }
            };

            // Bind synchronously, before the window is created, so the webview
            // never races the server: the port is guaranteed open by the time
            // anything tries to load http://127.0.0.1:PORT/.
            let std_listener = match StdTcpListener::bind(("127.0.0.1", PORT)) {
                Ok(listener) => listener,
                Err(err) => {
                    let msg = format!(
                        "FATAL: could not bind 127.0.0.1:{PORT} ({err}). Another Finvoroo \
                         Desktop instance may already be running, or another program is \
                         using this port — it must stay free and stable across restarts \
                         and versions (see PORT's doc comment above)."
                    );
                    log_line(&log_path, &msg);
                    return Err(anyhow::anyhow!(msg).into());
                }
            };
            if let Err(err) = std_listener.set_nonblocking(true) {
                let msg = format!("FATAL: set listener nonblocking failed: {err:#}");
                log_line(&log_path, &msg);
                return Err(anyhow::anyhow!(msg).into());
            }

            log_line(
                &log_path,
                &format!(
                    "serving {} on http://127.0.0.1:{PORT}/",
                    webapp_dir.display()
                ),
            );

            match php_sidecar::resolve_laravel_root(app.handle()) {
                Ok(laravel_root) => {
                    let sidecar = php_sidecar::PhpSidecar::new(laravel_root, log_path.clone());
                    php_sidecar::PhpSidecar::spawn_supervisor(sidecar);
                    log_line(&log_path, "PHP sidecar supervisor started");
                }
                Err(err) => {
                    log_line(
                        &log_path,
                        &format!("WARN: PHP sidecar not started ({err:#}) — API proxy will fail until Laravel is bundled"),
                    );
                }
            }

            let server_log_path = log_path.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(err) = server::serve(std_listener, webapp_dir).await {
                    log_line(&server_log_path, &format!("local web server failed: {err:#}"));
                }
            });

            let url = WebviewUrl::External(
                format!("http://127.0.0.1:{PORT}/")
                    .parse()
                    .expect("valid local URL"),
            );
            WebviewWindowBuilder::new(app, "main", url)
                .title("Finvoroo")
                .inner_size(1440.0, 900.0)
                .min_inner_size(1024.0, 700.0)
                .resizable(true)
                .center()
                .build()?;

            log_line(&log_path, "window created, startup complete");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to start Finvoroo Desktop");
}
