use std::net::TcpListener as StdTcpListener;
use std::path::PathBuf;

use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

/// Serves the built React SPA (`webapp_dir`, produced by
/// `scripts/build-frontend.mjs` / `bundle.resources` in tauri.conf.json) on the
/// given already-bound listener, with history-API fallback: any request path
/// that isn't a real static file (e.g. `/workspace/42/pos`, a client-side
/// BrowserRouter route) falls back to `index.html`, exactly like a normal SPA
/// static host (Netlify/Vercel/nginx try_files) would serve it.
///
/// This is deliberately plain static-file serving, not a "local API" — the
/// existing offline layer (Dexie/IndexedDB, outbox, sync-manager) already
/// handles the cloud-unreachable case from inside the SPA itself. Serving over
/// a real `http://127.0.0.1:<port>` origin (rather than the `tauri://` asset
/// protocol) is the whole point: it keeps BrowserRouter, cookies
/// (`erp_auth_token`) and the `X-Company-ID` header (derived from
/// `window.location.pathname` in `src/lib/api.js`) working completely
/// unmodified, exactly as they do in a real browser tab.
pub async fn serve(std_listener: StdTcpListener, webapp_dir: PathBuf) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::from_std(std_listener)?;
    let addr = listener.local_addr()?;
    tracing::info!(
        "Finvoroo Desktop serving {} on http://{addr}",
        webapp_dir.display()
    );
    axum::serve(listener, router(webapp_dir)).await?;
    Ok(())
}

pub fn router(webapp_dir: PathBuf) -> Router {
    let index = webapp_dir.join("index.html");
    let serve_dir = ServeDir::new(&webapp_dir).not_found_service(ServeFile::new(index));

    Router::new().fallback_service(serve_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use axum::http::{Request, StatusCode};
    use tower::ServiceExt;

    fn fixture_dir() -> PathBuf {
        let dir = std::env::temp_dir().join(format!(
            "finvoroo-desktop-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        std::fs::create_dir_all(&dir).unwrap();
        std::fs::write(dir.join("index.html"), "<html>root</html>").unwrap();
        std::fs::write(dir.join("app.js"), "console.log('hi')").unwrap();
        dir
    }

    #[tokio::test]
    async fn serves_real_static_file() {
        let dir = fixture_dir();
        let app = router(dir);
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/app.js")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn falls_back_to_index_for_client_side_routes() {
        let dir = fixture_dir();
        let app = router(dir);
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/workspace/42/pos")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }
}
