# Development

## Toolchain (NixOS / Nix users — recommended)

libcosmic pulls a large native graph (Wayland, xkb, freetype, fontconfig, expat, libGL…). Resolving it by hand is painful; the flake does it for you.

```bash
# Once per checkout:
direnv allow

# Then the shell auto-loads the right Rust toolchain + native libs.
cargo build
cargo test
cargo clippy --all-targets -- -D warnings
cargo fmt --all --check
```

## Toolchain (non-Nix)

You will need, at minimum:

- Rust stable (>= 1.80)
- `pkg-config`
- `libxkbcommon-dev`, `libwayland-dev`, `libfontconfig1-dev`, `libfreetype-dev`, `libexpat1-dev`
- A working OpenGL / Vulkan stack

Then `cargo build` should work, but expect to chase distro-specific package names. The Nix path is much smoother.

## Project layout

```text
.
├── Cargo.toml
├── flake.nix
├── res/
│   └── ${{ values.appletId }}.desktop   # registers the applet with the COSMIC panel
└── src/
    ├── main.rs                          # entry point: cosmic::app::run
    └── window.rs                        # Application impl: view + update + subscription
```

## The message loop

libcosmic is an Elm-style framework (Iced under the hood). Everything goes through three functions:

| Function       | Purpose                                                                                  |
|----------------|------------------------------------------------------------------------------------------|
| `view`         | Pure: state → widget tree. Called every frame.                                           |
| `update`       | State × `Message` → new state + optional `Task`. The only place side effects start.      |
| `subscription` | State → stream of `Message`. We use it for the ${{ values.pollIntervalSeconds }}s timer. |

A new background action (e.g. "clear cache", "open settings") is just a new `Message` variant. See `.claude/skills/add-command.md` for a step-by-step.

## Testing

```bash
cargo test
```

Unit tests live alongside the modules they exercise. GUI integration tests are hard for libcosmic right now (no test harness equivalent to `tower::ServiceExt`), so the heavy logic should live in plain functions that don't touch `cosmic::Element` and can be tested directly.

## CI

`.github/workflows/ci.yml` runs four jobs on every push:

- `nix build` (canonical build path, resolves native deps)
- `cargo clippy --all-targets -- -D warnings`
- `cargo test`
- `cargo audit`

All four must pass before merge.

We deliberately do **not** run `cargo build` in CI — reproducing the libcosmic native graph on a vanilla GitHub runner is brittle.
