---
name: add-endpoint
description: Add a new HTTP endpoint to this axum service, with OpenAPI schema, integration test, and docs update.
---

# Add an endpoint to ${{ values.name }}

When the user asks to add a new endpoint to this service, follow these steps **in order**, verifying each before continuing.

## 1. Define types

In `src/main.rs` (or a new module under `src/`):

```rust
#[derive(Deserialize, ToSchema)]
struct YourRequest {
    field: String,
}

#[derive(Serialize, ToSchema)]
struct YourResponse {
    result: String,
}
```

## 2. Write the handler

```rust
#[utoipa::path(
    post,                    // or get/put/delete/patch
    path = "/your-route",
    request_body = YourRequest,   // omit for GET
    responses(
        (status = 200, body = YourResponse),
        (status = 400, body = ErrorBody),
    )
)]
async fn your_handler(
    Json(req): Json<YourRequest>,
) -> Result<Json<YourResponse>, (axum::http::StatusCode, String)> {
    // logic here
    Ok(Json(YourResponse { result: req.field }))
}
```

**Rules:**

- Return `Result<Json<T>, (StatusCode, String)>` — never panic
- Log with `tracing::{info, warn, error}` at decision points
- Don't unwrap/expect outside tests

## 3. Register the route

In `main()`:

```rust
let (router, openapi) = OpenApiRouter::with_openapi(ApiDoc::openapi())
    .routes(routes!(health))
    .routes(routes!(echo))
    .routes(routes!(your_handler))   // ← add here
    .split_for_parts();
```

## 4. Write an integration test

`tests/your_route.rs` (create file if needed):

```rust
use axum::body::Body;
use axum::http::{Request, StatusCode};
use tower::ServiceExt;

#[tokio::test]
async fn your_route_happy_path() {
    let app = ${{ values.name }}::build_app(); // expose this from main.rs
    let req = Request::post("/your-route")
        .header("content-type", "application/json")
        .body(Body::from(r#"{"field":"hello"}"#))
        .unwrap();
    let res = app.oneshot(req).await.unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}
```

## 5. Update docs

Add the new endpoint to `docs/api.md`. Use the existing entries as a template.

## 6. Verify

```bash
cargo fmt --all
cargo clippy --all-targets -- -D warnings
cargo test
cargo run --release &
sleep 2
curl -X POST http://localhost:${{ values.listenPort }}/your-route -d '{"field":"hi"}' -H 'content-type: application/json'
pkill ${{ values.name }}
```

All four commands must succeed. The OpenAPI spec at `/openapi.json` should now include `/your-route`.

## 7. Refresh the static openapi.json (if you use it for Backstage API entity)

```bash
cargo run --release &
sleep 2
curl http://localhost:${{ values.listenPort }}/openapi.json | jq > openapi.json
pkill ${{ values.name }}
```

Commit the updated `openapi.json` so Backstage's API tab shows the new endpoint.
