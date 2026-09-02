use std::convert::Infallible;
use std::net::TcpListener as StdTcpListener;
use std::path::PathBuf;
use std::time::Duration;

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::Router;
use serde::Serialize;
use tower::service_fn;
use tower::Service;
use tower_http::services::{ServeDir, ServeFile};

use crate::php_sidecar::{cloud_api_base, is_cloud_only_api_path, sidecar_base_url, PHP_SIDECAR_PORT};

/// Production SPA origin — when reachable, the desktop shell serves the live
/// React bundle from here so frontend deploys reach installed apps without
/// rebuilding the Windows installer. Falls back to the embedded `webapp/` offline.
pub const CLOUD_SPA_ORIGIN: &str = "https://app.finvoroo.com";

const CLOUD_FETCH_TIMEOUT: Duration = Duration::from_secs(4);

#[derive(Clone)]
struct AppServerState {
    webapp_dir: PathBuf,
    cloud_origin: String,
    client: reqwest::Client,
    version: String,
}

#[derive(Serialize)]
struct DesktopStatus {
    ok: bool,
    version: String,
    cloud_spa_origin: String,
    cloud_spa: bool,
}

/// Serves the React SPA and proxies API traffic to the embedded PHP sidecar
/// (local scope) or the cloud Laravel API (online-only routes).
pub async fn serve(std_listener: StdTcpListener, webapp_dir: PathBuf, version: String) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::from_std(std_listener)?;
    let addr = listener.local_addr()?;
    tracing::info!(
        "Finvoroo Desktop v{version} serving {} on http://{addr} (cloud SPA {CLOUD_SPA_ORIGIN}, API sidecar :{PHP_SIDECAR_PORT})",
        webapp_dir.display()
    );
    axum::serve(listener, router(webapp_dir, version)).await?;
    Ok(())
}

pub fn router(webapp_dir: PathBuf, version: String) -> Router {
    let cloud_origin = std::env::var("FINVOROO_CLOUD_ORIGIN")
        .unwrap_or_else(|_| CLOUD_SPA_ORIGIN.to_string())
        .trim_end_matches('/')
        .to_string();

    let client = reqwest::Client::builder()
        .timeout(CLOUD_FETCH_TIMEOUT)
        .redirect(reqwest::redirect::Policy::limited(4))
        .build()
        .unwrap_or_else(|_| reqwest::Client::new());

    let state = AppServerState {
        webapp_dir,
        cloud_origin,
        client,
        version,
    };

    let spa_state = state.clone();
    let spa_service = service_fn(move |request: Request| {
        let state = spa_state.clone();
        async move { Ok::<Response, Infallible>(handle_spa_request(state, request).await) }
    });

    Router::new()
        .route("/__finvoroo/status", get(desktop_status))
        .fallback_service(spa_service)
        .with_state(state)
        .layer(axum::middleware::from_fn(api_proxy_middleware))
}

async fn desktop_status(State(state): State<AppServerState>) -> impl IntoResponse {
    let cloud_spa = cloud_reachable(&state).await;
    JsonStatus(DesktopStatus {
        ok: true,
        version: state.version.clone(),
        cloud_spa_origin: state.cloud_origin.clone(),
        cloud_spa,
    })
}

#[derive(Serialize)]
struct JsonStatus<T: Serialize>(T);

impl<T: Serialize> IntoResponse for JsonStatus<T> {
    fn into_response(self) -> Response {
        axum::Json(self.0).into_response()
    }
}

async fn cloud_reachable(state: &AppServerState) -> bool {
    let url = format!("{}/version.json", state.cloud_origin);
    state
        .client
        .get(&url)
        .header(reqwest::header::CACHE_CONTROL, "no-cache")
        .send()
        .await
        .map(|res| res.status().is_success())
        .unwrap_or(false)
}

async fn handle_spa_request(state: AppServerState, request: Request) -> Response {
    let method = request.method().clone();
    if method != Method::GET && method != Method::HEAD {
        return serve_local(&state, request).await;
    }

    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/")
        .to_string();

    if let Some(response) = try_cloud_spa(&state, &method, &path_and_query).await {
        return response;
    }

    serve_local(&state, request).await
}

async fn try_cloud_spa(
    state: &AppServerState,
    method: &Method,
    path_and_query: &str,
) -> Option<Response> {
    if path_and_query.starts_with("/__finvoroo/") {
        return None;
    }

    let target = format!("{}{}", state.cloud_origin, path_and_query);
    let mut builder = state.client.request(method.clone(), &target);

    if method == Method::GET {
        builder = builder.header(reqwest::header::CACHE_CONTROL, "no-cache");
    }

    let upstream = builder.send().await.ok()?;
    if !upstream.status().is_success() {
        return None;
    }

    let status = StatusCode::from_u16(upstream.status().as_u16()).ok()?;
    let mut response = Response::builder().status(status);
    let headers = response.headers_mut()?;

    for (name, value) in upstream.headers().iter() {
        if name == reqwest::header::TRANSFER_ENCODING {
            continue;
        }
        if let (Ok(hname), Ok(hval)) = (
            HeaderName::from_bytes(name.as_str().as_bytes()),
            HeaderValue::from_bytes(value.as_bytes()),
        ) {
            headers.insert(hname, hval);
        }
    }

    if path_and_query == "/" || path_and_query.ends_with("index.html") {
        headers.insert(
            HeaderName::from_static("cache-control"),
            HeaderValue::from_static("no-store, no-cache, must-revalidate"),
        );
    }

    let bytes = upstream.bytes().await.ok()?;
    response.body(Body::from(bytes)).ok()
}

async fn serve_local(state: &AppServerState, request: Request) -> Response {
    let index = state.webapp_dir.join("index.html");
    let mut service = ServeDir::new(&state.webapp_dir).not_found_service(ServeFile::new(index));
    match service.call(request).await {
        Ok(response) => response.into_response(),
        Err(_) => Response::builder()
            .status(StatusCode::INTERNAL_SERVER_ERROR)
            .body(Body::from("Failed to serve local webapp"))
            .unwrap(),
    }
}

/// CI installers do not bundle PHP/Laravel, so the sidecar on :47392 is almost
/// never running. Prefer the sidecar only when it is healthy; otherwise (and on
/// sidecar 502) forward to the cloud API instead of failing login with 502.
fn select_api_upstream(path: &str) -> String {
    if crate::php_sidecar::sidecar_is_ready() && !is_cloud_only_api_path(path) {
        sidecar_base_url()
    } else {
        cloud_api_base()
    }
}

fn proxy_http_client() -> &'static reqwest::Client {
    static CLIENT: std::sync::OnceLock<reqwest::Client> = std::sync::OnceLock::new();
    CLIENT.get_or_init(|| {
        reqwest::Client::builder()
            .timeout(Duration::from_secs(30))
            .connect_timeout(Duration::from_secs(10))
            .redirect(reqwest::redirect::Policy::limited(4))
            .user_agent(format!(
                "FinvorooDesktop/{}",
                env!("CARGO_PKG_VERSION")
            ))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new())
    })
}

async fn api_proxy_middleware(request: Request, next: axum::middleware::Next) -> Response {
    let path = request.uri().path().to_string();

    if !path.starts_with("/api/v1/") {
        return next.run(request).await;
    }

    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/")
        .to_string();
    let method = request.method().clone();
    let headers = clone_forward_headers(request.headers());
    let body_bytes = match axum::body::to_bytes(request.into_body(), 32 * 1024 * 1024).await {
        Ok(bytes) => bytes.to_vec(),
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("Failed to read request body"))
                .unwrap();
        }
    };

    let primary = select_api_upstream(&path);
    if primary == sidecar_base_url() {
        let sidecar_response = proxy_prepared(
            primary,
            method.clone(),
            &path_and_query,
            headers.clone(),
            &body_bytes,
        )
        .await;
        if sidecar_response.status() != StatusCode::BAD_GATEWAY {
            return sidecar_response;
        }
        tracing::warn!(
            path = %path,
            "PHP sidecar returned 502 — retrying against {}",
            cloud_api_base()
        );
    }

    // Sidecar is not bundled in the Windows installer. Always land on the
    // cloud API here so login/POS do not 502 against 127.0.0.1:47392.
    proxy_prepared(
        cloud_api_base(),
        method,
        &path_and_query,
        headers,
        &body_bytes,
    )
    .await
}

async fn proxy_prepared(
    base: String,
    method: Method,
    path_and_query: &str,
    headers: reqwest::header::HeaderMap,
    body_bytes: &[u8],
) -> Response {
    let target = format!("{}{}", base.trim_end_matches('/'), path_and_query);
    let mut builder = proxy_http_client().request(method, &target);
    builder = builder.headers(headers);
    if !body_bytes.is_empty() {
        builder = builder.body(body_bytes.to_vec());
    }

    match builder.send().await {
        Ok(upstream) => {
            let status = StatusCode::from_u16(upstream.status().as_u16())
                .unwrap_or(StatusCode::BAD_GATEWAY);
            let mut response = Response::builder().status(status);
            if let Some(headers) = response.headers_mut() {
                for (name, value) in upstream.headers().iter() {
                    if name == reqwest::header::TRANSFER_ENCODING {
                        continue;
                    }
                    if let (Ok(hname), Ok(hval)) = (
                        HeaderName::from_bytes(name.as_str().as_bytes()),
                        HeaderValue::from_bytes(value.as_bytes()),
                    ) {
                        headers.insert(hname, hval);
                    }
                }
            }
            let bytes = upstream.bytes().await.unwrap_or_default();
            response.body(Body::from(bytes)).unwrap_or_else(|_| {
                Response::builder()
                    .status(StatusCode::BAD_GATEWAY)
                    .body(Body::from("Bad gateway"))
                    .unwrap()
            })
        }
        Err(err) => {
            tracing::error!(target = %target, "API proxy upstream unavailable: {err:#}");
            Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from(format!("Upstream unavailable: {err}")))
                .unwrap()
        }
    }
}

fn clone_forward_headers(headers: &HeaderMap) -> reqwest::header::HeaderMap {
    let mut out = reqwest::header::HeaderMap::new();
    for (name, value) in headers.iter() {
        if name == axum::http::header::HOST
            || name == axum::http::header::ACCEPT_ENCODING
            || name == axum::http::header::CONNECTION
            || name == axum::http::header::TRANSFER_ENCODING
            || name == axum::http::header::CONTENT_LENGTH
        {
            continue;
        }
        if let (Ok(hname), Ok(hval)) = (
            reqwest::header::HeaderName::from_bytes(name.as_str().as_bytes()),
            reqwest::header::HeaderValue::from_bytes(value.as_bytes()),
        ) {
            out.insert(hname, hval);
        }
    }
    out
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
        let app = router(dir, "0.1.4".into());
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
        let app = router(dir, "0.1.4".into());
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

    #[tokio::test]
    async fn desktop_status_endpoint() {
        let dir = fixture_dir();
        let app = router(dir, "0.1.4".into());
        let res = app
            .oneshot(
                Request::builder()
                    .uri("/__finvoroo/status")
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[test]
    fn login_uses_cloud_api_when_sidecar_is_not_running() {
        assert!(
            !crate::php_sidecar::sidecar_is_ready(),
            "tests run without a PHP sidecar"
        );
        assert_eq!(
            select_api_upstream("/api/v1/auth/login"),
            cloud_api_base(),
            "installer builds must proxy login to api.finvoroo.com, not :47392"
        );
    }

    #[test]
    fn cloud_only_paths_never_select_sidecar() {
        assert_eq!(
            select_api_upstream("/api/v1/workspace/reports/profit-loss"),
            cloud_api_base()
        );
    }
}
