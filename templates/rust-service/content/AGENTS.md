# AI coding agent instructions

This file is read by any AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider, etc.) before making changes. It encodes project-specific guardrails.

## Project: ${{ values.name }}

${{ values.description }}

**Stack:** Rust + axum + tokio + utoipa (OpenAPI). Built with `cargo` or via Nix flake.

## Required before any change

1. **Read `Cargo.toml`** — understand the dependency tree before adding new crates
2. **Read `src/main.rs`** — understand the route registration pattern
3. **Run tests after edits:** `cargo test`
4. **Run clippy:** `cargo clippy --all-targets -- -D warnings`
5. **Run fmt:** `cargo fmt --all`

## Conventions

- **Routes**: every handler has `#[utoipa::path(...)]` so the OpenAPI spec stays current
- **Errors**: return `Result<Json<T>, (StatusCode, String)>` for endpoints — convert errors at the boundary, never panic
- **Logging**: use `tracing::{info, warn, error, debug}` — never `println!`
- **Tests**: integration tests in `tests/` use `tower::ServiceExt::oneshot` to drive the axum app in-process

## Avoid

- Adding unwrap/expect outside tests
- Adding async-trait bounds when AsyncFn would do
- Adding non-Send futures (this is a tokio multi-thread runtime)
- Modifying `Cargo.lock` directly — let cargo update it
- Hardcoding `localhost:${{ values.listenPort }}` — use the bind address from config

## When adding a new endpoint

```rust
#[derive(Deserialize, ToSchema)]
struct Request {  // ... }
#[derive(Serialize, ToSchema)]
struct Response {  // ... }

#[utoipa::path(
    post,
    path = "/your-route",
    request_body = Request,
    responses((status = 200, body = Response))
)]
async fn your_handler(Json(req): Json<Request>) -> Json<Response> {
    // ...
}
```

Then in `main()`:

```rust
let (router, openapi) = OpenApiRouter::with_openapi(ApiDoc::openapi())
    .routes(routes!(health))
    .routes(routes!(echo))
    .routes(routes!(your_handler))   // <-- add here
    .split_for_parts();
```

The OpenAPI spec auto-updates; no manual schema work needed.

## Backstage integration (do not break)

This repo is registered in Backstage via `catalog-info.yaml`. Two contracts to maintain:

1. **`backstage.io/techdocs-ref: dir:.`** — Backstage's TechDocs builds from this repo's `mkdocs.yml`. Don't move or rename the docs.
2. **`spec.providesApis: [${{ values.name }}-api]`** — the API entity references `openapi.json` at the repo root. To regenerate:

   ```bash
   cargo run --release &
   curl http://localhost:${{ values.listenPort }}/openapi.json > openapi.json
   pkill ${{ values.name }}
   ```

## Out of scope without explicit ask

- Adding a database / persistence layer
- Adding auth — this skeleton is intentionally unauthenticated
- Adding metrics export / Prometheus — easy to add but not in the template
- Adding K8s manifests
