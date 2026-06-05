# ${{ values.name }}

${{ values.description }}

## What it does

`${{ values.name }}` is a Rust web service built on `axum` + `tokio`. It auto-generates an OpenAPI 3.1 spec via `utoipa`, exposes a SwaggerUI explorer, and ships with Nix-flake-based reproducible builds.

## Architecture

```text
┌───────────────────────────┐
│ ${{ values.name }} (axum)        │
│  /health      → liveness  │
│  /echo        → demo POST │
│  /openapi.json → spec     │
│  /swagger-ui  → UI        │
└───────────────────────────┘
```

## Run locally

```bash
cargo run               # listens on :${{ values.listenPort }}
curl http://localhost:${{ values.listenPort }}/health
```

## Next steps

- [Development guide](development.md)
- [API reference](api.md)
