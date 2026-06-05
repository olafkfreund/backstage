# Development

## Toolchain (NixOS / Nix users)

```bash
# Once per checkout:
direnv allow

# Then the shell auto-loads the right Rust toolchain.
cargo build
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --all --check
```

The flake pins the toolchain so everyone gets identical builds.

## Toolchain (non-Nix)

`rustup` with the stable toolchain works fine — the `Cargo.toml` doesn't depend on nightly features.

## Adding routes

1. Write a handler with `#[utoipa::path(...)]` annotations
2. Add it to the router in `main.rs` via `.routes(routes!(your_handler))`
3. The OpenAPI spec auto-includes it; SwaggerUI renders the new endpoint

## Testing

```bash
cargo test
```

Integration tests live in `tests/`. They spin up the axum app in-process via `tower::ServiceExt::oneshot`.

## CI

`.github/workflows/ci.yml` runs:

- `cargo fmt --check`
- `cargo clippy -- -D warnings`
- `cargo test`
- `cargo build --release`
- `cargo audit` (security advisories)

All four jobs must pass before a PR can merge.
