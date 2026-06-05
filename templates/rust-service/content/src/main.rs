//! ${{ values.name }} — ${{ values.description }}
//!
//! HTTP entry point. The OpenAPI spec is auto-generated and served at
//! `/openapi.json`; SwaggerUI is mounted at `/swagger-ui`.

use axum::Json;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use utoipa::{OpenApi, ToSchema};
use utoipa_axum::{router::OpenApiRouter, routes};
use utoipa_swagger_ui::SwaggerUi;

#[derive(Serialize, ToSchema)]
struct Health {
    status: &'static str,
    version: &'static str,
}

#[derive(Deserialize, Serialize, ToSchema)]
struct Echo {
    message: String,
}

#[utoipa::path(
    get,
    path = "/health",
    responses((status = 200, body = Health))
)]
async fn health() -> Json<Health> {
    Json(Health {
        status: "ok",
        version: env!("CARGO_PKG_VERSION"),
    })
}

#[utoipa::path(
    post,
    path = "/echo",
    request_body = Echo,
    responses((status = 200, body = Echo))
)]
async fn echo(Json(body): Json<Echo>) -> Json<Echo> {
    Json(body)
}

#[derive(OpenApi)]
#[openapi(
    info(
        title = "${{ values.name }}",
        description = "${{ values.description }}",
        version = env!("CARGO_PKG_VERSION"),
    )
)]
struct ApiDoc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "info,${{ values.name }}=debug".into()))
        .with(tracing_subscriber::fmt::layer().json())
        .init();

    let (router, openapi) = OpenApiRouter::with_openapi(ApiDoc::openapi())
        .routes(routes!(health))
        .routes(routes!(echo))
        .split_for_parts();

    let app = router
        .merge(SwaggerUi::new("/swagger-ui").url("/openapi.json", openapi))
        .layer(tower_http::trace::TraceLayer::new_for_http());

    let addr: SocketAddr = "0.0.0.0:${{ values.listenPort }}".parse()?;
    tracing::info!(%addr, "starting ${{ values.name }}");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;
    Ok(())
}
