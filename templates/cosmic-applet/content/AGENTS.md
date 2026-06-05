# AI coding agent instructions

This file is read by any AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider, etc.) before making changes. It encodes project-specific guardrails.

## Project: ${{ values.name }}

${{ values.description }}

**Stack:** Rust + [libcosmic](https://github.com/pop-os/libcosmic) (Pop!_OS COSMIC desktop framework, built on Iced 0.13). Built via Nix flake — `nix build`, not `cargo build`.

This is a **desktop applet**: tray icon in the COSMIC panel + popup window. It is **not** an HTTP service. There is no listening port, no axum, no OpenAPI.

## Required before any change

1. **Read `Cargo.toml`** — understand the dependency tree (libcosmic is git-pinned to `pop-os/libcosmic`).
2. **Read `src/main.rs` and `src/window.rs`** — understand the Elm-style loop: `view`, `update`, `subscription`.
3. **Build via Nix:** `nix build` (not `cargo build` — native deps).
4. **Run tests after edits:** `cargo test` inside `nix develop`.
5. **Run clippy:** `nix develop --command cargo clippy --all-targets -- -D warnings`.
6. **Run fmt:** `cargo fmt --all`.

## Conventions

- **Message enum** — every user-visible action, timer tick, or async result is a variant of `Message` in `src/window.rs`. Keep it flat; if a variant carries data, prefer owned types (`String`, `Vec<u8>`) over borrowed.
- **No blocking in `update`** — if you need to run a shell command, network call, or filesystem read, return a `cosmic::Task` and handle the result via a follow-up `Message` variant. The UI thread must stay responsive.
- **Subscriptions** — long-lived streams (timers, file watchers, dbus signals) go in `fn subscription`. One-shot work goes in `Task`s from `update`.
- **Logging** — use `tracing::{info, warn, error, debug}` — never `println!`. The flake's dev shell sets `RUST_LOG`.
- **Popup window id** — stored on the `Window` struct as `popup: Option<Id>`. Always check before issuing destroy_popup; double-destroy panics in older libcosmic.
- **Errors in async tasks** — convert to a string and feed back as `Message::CommandError(String)` rather than panicking inside the task.

## Avoid

- Adding `unwrap()`/`expect()` outside tests.
- Using `std::process::Command` synchronously in `update` — use `tokio::process::Command` inside a `Task` instead.
- Pulling new heavy native deps (X11 libs, GTK4) — the COSMIC native graph is already large; new C deps must go through the flake.
- Pinning libcosmic to a specific commit unless absolutely required — the upstream API still moves; track `master`.
- Modifying `Cargo.lock` directly — let cargo update it.
- Hardcoding `${{ values.appletId }}` outside `res/${{ values.appletId }}.desktop` and `main.rs` — reference a constant.
- Changing the applet id (`${{ values.appletId }}`) after first release — it keys persisted COSMIC panel state.

## When adding a new background command / menu item

See `.claude/skills/add-command.md` for the full recipe. Summary:

1. Add a `Message::FooRequested` and a `Message::FooResult(String)` variant.
2. In `view`, add a button whose `on_press` emits `Message::FooRequested`.
3. In `update`, on `Message::FooRequested` return a `Task` that runs the command async and maps stdout to `Message::FooResult`.
4. In `update`, on `Message::FooResult` store the output in state; `view` re-renders automatically.

## Backstage integration (do not break)

This repo is registered in Backstage via `catalog-info.yaml`. One contract to maintain:

1. **`backstage.io/techdocs-ref: dir:.`** — Backstage's TechDocs builds from this repo's `mkdocs.yml`. Don't move or rename the docs.

There is intentionally **no `kind: API` entity** — this is a desktop application, not an HTTP service. Do not add `providesApis` to `catalog-info.yaml`.

## Out of scope without explicit ask

- Adding network listeners, HTTP servers, or RPC endpoints — this is a desktop UI.
- Adding a persistence layer beyond `cosmic_config` (which is the COSMIC-native settings store).
- Adding X11-only code paths — the applet targets Wayland/COSMIC.
- Adding GNOME / KDE / tray.rs fallbacks — COSMIC-only.
- Packaging as a Flatpak — NixOS is the deployment target.
