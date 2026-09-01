use std::net::TcpListener as StdTcpListener;
use std::path::PathBuf;

use axum::body::Body;
use axum::extract::Request;
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::Response;
use axum::Router;
use tower_http::services::{ServeDir, ServeFile};

use crate::php_sidecar::{cloud_api_base, is_cloud_only_api_path, sidecar_base_url, PHP_SIDECAR_PORT};

/// Serves the React SPA and proxies API traffic to the embedded PHP sidecar
/// (local scope) or the cloud Laravel API (online-only routes).
pub async fn serve(std_listener: StdTcpListener, webapp_dir: PathBuf) -> anyhow::Result<()> {
    let listener = tokio::net::TcpListener::from_std(std_listener)?;
    let addr = listener.local_addr()?;
    tracing::info!(
        "Finvoroo Desktop serving {} on http://{addr} (API sidecar :{PHP_SIDECAR_PORT})",
        webapp_dir.display()
    );
    axum::serve(listener, router(webapp_dir)).await?;
    Ok(())
}

pub fn router(webapp_dir: PathBuf) -> Router {
    let index = webapp_dir.join("index.html");
    let serve_dir = ServeDir::new(&webapp_dir).not_found_service(ServeFile::new(index));

    Router::new()
        .fallback_service(serve_dir)
        .layer(axum::middleware::from_fn(api_proxy_middleware))
}

async fn api_proxy_middleware(request: Request, next: axum::middleware::Next) -> Response {
    let path = request.uri().path().to_string();

    if !path.starts_with("/api/v1/") {
        return next.run(request).await;
    }

    if is_cloud_only_api_path(&path) {
        return proxy_request(cloud_api_base(), request).await;
    }

    proxy_request(sidecar_base_url(), request).await
}

async fn proxy_request(base: String, request: Request) -> Response {
    let path_and_query = request
        .uri()
        .path_and_query()
        .map(|pq| pq.as_str())
        .unwrap_or("/")
        .to_string();

    let target = format!("{}{}", base.trim_end_matches('/'), path_and_query);
    let method = request.method().clone();
    let headers = clone_forward_headers(request.headers());
    let body_bytes = match axum::body::to_bytes(request.into_body(), 32 * 1024 * 1024).await {
        Ok(bytes) => bytes,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("Failed to read request body"))
                .unwrap();
        }
    };

    let client = match reqwest::Client::builder().build() {
        Ok(c) => c,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::BAD_GATEWAY)
                .body(Body::from("Proxy client unavailable"))
                .unwrap();
        }
    };

    let mut builder = client.request(method.clone(), &target);
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
        Err(err) => Response::builder()
            .status(StatusCode::BAD_GATEWAY)
            .body(Body::from(format!("Upstream unavailable: {err}")))
            .unwrap(),
    }
}

fn clone_forward_headers(headers: &HeaderMap) -> reqwest::header::HeaderMap {
    let mut out = reqwest::header::HeaderMap::new();
    for (name, value) in headers.iter() {
        if name == axum::http::header::HOST {
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
