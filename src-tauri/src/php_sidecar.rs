//! Embedded PHP/Laravel sidecar supervisor for Finvoroo Desktop.

use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};

/// True only while the embedded Laravel sidecar responds to health checks.
/// CI/release installers ship without a Laravel bundle — this stays false and
/// the axum proxy forwards API traffic to the cloud instead of returning 502.
static SIDECAR_READY: AtomicBool = AtomicBool::new(false);

pub fn sidecar_is_ready() -> bool {
    SIDECAR_READY.load(Ordering::SeqCst)
}

fn set_sidecar_ready(ready: bool) {
    SIDECAR_READY.store(ready, Ordering::SeqCst);
}
use std::sync::Arc;
use std::time::Duration;

use tauri::Manager;
use tokio::time::sleep;

/// Local Laravel API port — separate from the SPA port (47391).
pub const PHP_SIDECAR_PORT: u16 = 47392;

/// How often the supervisor invokes existing `php artisan desktop:sync`.
/// LocalSyncWorker already no-ops when the cloud is unreachable.
pub const DESKTOP_SYNC_INTERVAL: Duration = Duration::from_secs(15);

pub struct PhpSidecar {
    child: Option<Child>,
    laravel_root: PathBuf,
    log_path: PathBuf,
    stopping: Arc<AtomicBool>,
}

impl PhpSidecar {
    pub fn new(laravel_root: PathBuf, log_path: PathBuf) -> Self {
        Self {
            child: None,
            laravel_root,
            log_path,
            stopping: Arc::new(AtomicBool::new(false)),
        }
    }

    pub fn start(&mut self) -> anyhow::Result<()> {
        let php = resolve_php_binary()?;
        let artisan = self.laravel_root.join("artisan");
        if !artisan.exists() {
            anyhow::bail!(
                "Laravel artisan not found at {} — bundle Laravel-api-backend as a Tauri resource.",
                artisan.display()
            );
        }

        let mut cmd = Command::new(&php);
        cmd.current_dir(&self.laravel_root)
            .arg(artisan)
            .args([
                "serve",
                "--host=127.0.0.1",
                &format!("--port={PHP_SIDECAR_PORT}"),
            ])
            .env("FINVOROO_DESKTOP", "true")
            .env("APP_ENV", "local")
            .stdout(Stdio::null())
            .stderr(Stdio::null());

        if let Ok(db) = std::env::var("FINVOROO_SQLITE_PATH") {
            cmd.env("DB_CONNECTION", "sqlite").env("DB_DATABASE", db);
        }

        let child = cmd.spawn()?;
        self.log(&format!(
            "PHP sidecar started (pid {}) on http://127.0.0.1:{PHP_SIDECAR_PORT}/",
            child.id()
        ));
        set_sidecar_ready(false);
        self.child = Some(child);
        Ok(())
    }

    pub fn stop(&mut self) {
        self.stopping.store(true, Ordering::SeqCst);
        self.kill_serve_child();
    }

    fn kill_serve_child(&mut self) {
        if let Some(mut child) = self.child.take() {
            let _ = child.kill();
            let _ = child.wait();
            set_sidecar_ready(false);
            self.log("PHP sidecar stopped");
        }
    }

    pub fn spawn_supervisor(sidecar: PhpSidecar) {
        let laravel_root = sidecar.laravel_root.clone();
        let log_path = sidecar.log_path.clone();
        let stopping = sidecar.stopping.clone();

        tauri::async_runtime::spawn(async move {
            let mut sidecar = sidecar;
            loop {
                if sidecar.stopping.load(Ordering::SeqCst) {
                    sidecar.stop();
                    break;
                }

                if sidecar.child.is_none() {
                    if let Err(err) = sidecar.start() {
                        sidecar.log(&format!("sidecar start failed: {err:#}"));
                        sleep(Duration::from_secs(3)).await;
                        continue;
                    }
                    // artisan serve is not accept()ing yet; skip the health
                    // probe so we do not immediately kill a healthy spawn.
                    sleep(Duration::from_secs(2)).await;
                    continue;
                }

                if !sidecar.health_check().await {
                    set_sidecar_ready(false);
                    sidecar.log("sidecar unhealthy — restarting");
                    sidecar.kill_serve_child();
                    sleep(Duration::from_secs(2)).await;
                    continue;
                }

                set_sidecar_ready(true);
                sleep(Duration::from_secs(5)).await;
            }
        });

        tauri::async_runtime::spawn(async move {
            run_desktop_sync_loop(laravel_root, log_path, stopping).await;
        });
    }

    async fn health_check(&self) -> bool {
        let url = format!("http://127.0.0.1:{PHP_SIDECAR_PORT}/api/v1/workspace/sync/status");
        match reqwest::Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
        {
            Ok(client) => client
                .get(&url)
                .send()
                .await
                .map(|r| r.status().is_success() || r.status().as_u16() == 401)
                .unwrap_or(false),
            Err(_) => false,
        }
    }

    fn log(&self, message: &str) {
        tracing::info!("{message}");
        if let Ok(mut file) = std::fs::OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.log_path)
        {
            use std::io::Write;
            let _ = writeln!(file, "[sidecar] {message}");
        }
    }
}

impl Drop for PhpSidecar {
    fn drop(&mut self) {
        self.stop();
    }
}

async fn run_desktop_sync_loop(
    laravel_root: PathBuf,
    log_path: PathBuf,
    stopping: Arc<AtomicBool>,
) {
    let mut sync_child: Option<Child> = None;
    loop {
        if stopping.load(Ordering::SeqCst) {
            kill_child(&mut sync_child);
            break;
        }

        try_spawn_desktop_sync(&laravel_root, &log_path, &mut sync_child);
        sleep(DESKTOP_SYNC_INTERVAL).await;
    }
}

/// Spawn `php artisan desktop:sync` unless a previous invocation is still running.
fn try_spawn_desktop_sync(
    laravel_root: &PathBuf,
    log_path: &PathBuf,
    sync_child: &mut Option<Child>,
) {
    if reap_sync_child(log_path, sync_child) {
        sidecar_log(log_path, "desktop:sync skipped — previous run still in progress");
        return;
    }

    match spawn_desktop_sync(laravel_root) {
        Ok(child) => {
            sidecar_log(
                log_path,
                &format!("desktop:sync started (pid {})", child.id()),
            );
            *sync_child = Some(child);
        }
        Err(err) => sidecar_log(log_path, &format!("desktop:sync spawn failed: {err:#}")),
    }
}

fn spawn_desktop_sync(laravel_root: &PathBuf) -> anyhow::Result<Child> {
    let php = resolve_php_binary()?;
    let artisan = laravel_root.join("artisan");
    if !artisan.exists() {
        anyhow::bail!("Laravel artisan not found at {}", artisan.display());
    }

    let mut cmd = Command::new(&php);
    cmd.current_dir(laravel_root)
        .arg(&artisan)
        .arg("desktop:sync")
        .env("FINVOROO_DESKTOP", "true")
        .env("APP_ENV", "local")
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    if let Ok(company) = std::env::var("DESKTOP_COMPANY_ID") {
        if !company.is_empty() {
            cmd.arg(format!("--company={company}"));
        }
    }
    if let Ok(user) = std::env::var("DESKTOP_SYNC_USER_ID") {
        if !user.is_empty() {
            cmd.arg(format!("--user={user}"));
        }
    }
    if let Ok(device) = std::env::var("DESKTOP_SYNC_DEVICE_UUID") {
        if !device.is_empty() {
            cmd.arg(format!("--device={device}"));
        }
    }

    if let Ok(db) = std::env::var("FINVOROO_SQLITE_PATH") {
        cmd.env("DB_CONNECTION", "sqlite").env("DB_DATABASE", db);
    }

    Ok(cmd.spawn()?)
}

/// Returns true when a previous `desktop:sync` child is still running.
fn reap_sync_child(log_path: &PathBuf, sync_child: &mut Option<Child>) -> bool {
    let Some(child) = sync_child.as_mut() else {
        return false;
    };

    match child.try_wait() {
        Ok(None) => true,
        Ok(Some(status)) => {
            sidecar_log(log_path, &format!("desktop:sync exited ({status})"));
            *sync_child = None;
            false
        }
        Err(err) => {
            sidecar_log(log_path, &format!("desktop:sync wait failed: {err}"));
            *sync_child = None;
            false
        }
    }
}

fn kill_child(child: &mut Option<Child>) {
    if let Some(mut running) = child.take() {
        let _ = running.kill();
        let _ = running.wait();
    }
}

fn sidecar_log(log_path: &PathBuf, message: &str) {
    tracing::info!("{message}");
    if let Ok(mut file) = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(log_path)
    {
        use std::io::Write;
        let _ = writeln!(file, "[sidecar] {message}");
    }
}

pub fn resolve_laravel_root(app: &tauri::AppHandle) -> anyhow::Result<PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        let bundled = resource_dir.join("laravel");
        if bundled.join("artisan").exists() {
            return Ok(bundled);
        }
    }

    let dev = std::env::current_dir()?.join("../../Laravel-api-backend");
    if dev.join("artisan").exists() {
        return Ok(dev);
    }

    anyhow::bail!(
        "Laravel backend not found (checked bundle resource and {})",
        dev.display()
    )
}

fn resolve_php_binary() -> anyhow::Result<PathBuf> {
    if let Ok(path) = std::env::var("FINVOROO_PHP_BIN") {
        let p = PathBuf::from(path);
        if p.exists() {
            return Ok(p);
        }
    }

    for candidate in ["php", "php.exe"] {
        if let Ok(output) = Command::new(candidate).arg("-v").output() {
            if output.status.success() {
                return Ok(PathBuf::from(candidate));
            }
        }
    }

    anyhow::bail!("PHP binary not found — set FINVOROO_PHP_BIN or bundle static PHP.")
}

pub fn sidecar_base_url() -> String {
    format!("http://127.0.0.1:{PHP_SIDECAR_PORT}")
}

pub fn is_cloud_only_api_path(path: &str) -> bool {
    const CLOUD_PREFIXES: &[&str] = &[
        "/api/v1/workspace/pharmacy/invoices/ocr",
        "/api/v1/workspace/pharmacy/invoices/parse",
        "/api/v1/workspace/pharmacy/invoices/extract",
        "/api/v1/workspace/purchases",
        "/api/v1/workspace/bills",
        "/api/v1/workspace/purchase-orders",
        "/api/v1/workspace/employees",
        "/api/v1/workspace/reports",
    ];

    CLOUD_PREFIXES
        .iter()
        .any(|prefix| path.starts_with(prefix))
}

pub fn cloud_api_base() -> String {
    std::env::var("FINVOROO_CLOUD_API")
        .unwrap_or_else(|_| "https://api.finvoroo.com".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_log() -> PathBuf {
        let path = std::env::temp_dir().join(format!(
            "finvoroo-sync-test-{}-{}.log",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        let _ = std::fs::write(&path, "");
        path
    }

    #[test]
    fn skips_spawn_while_previous_sync_running() {
        let log = temp_log();
        let mut child = Some(Command::new("sleep").arg("60").spawn().expect("sleep"));
        let pid = child.as_ref().unwrap().id();
        try_spawn_desktop_sync(&PathBuf::from("/nonexistent-laravel"), &log, &mut child);
        assert_eq!(child.as_ref().unwrap().id(), pid, "must not replace a running sync child");
        let log_text = std::fs::read_to_string(&log).unwrap_or_default();
        assert!(
            log_text.contains("still in progress"),
            "expected skip log, got: {log_text}"
        );
        kill_child(&mut child);
    }

    #[test]
    fn reaps_finished_sync_child() {
        let log = temp_log();
        let finished = Command::new("true").spawn().expect("true");
        let mut child = Some(finished);
        std::thread::sleep(Duration::from_millis(50));
        assert!(!reap_sync_child(&log, &mut child));
        assert!(child.is_none());
    }
}
