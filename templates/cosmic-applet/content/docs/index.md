# ${{ values.name }}

${{ values.description }}

## What it is

`${{ values.name }}` is a Rust applet for the [COSMIC desktop](https://github.com/pop-os/cosmic-epoch) built on [libcosmic](https://github.com/pop-os/libcosmic) (Iced 0.13). It runs as a tray icon in the COSMIC panel; clicking it opens a popup that renders the output of a backend command.

## Architecture

```text
┌────────────────────────────────┐
│ COSMIC panel                       │
│   └─ tray icon (this applet)  click │
│                                  │ │
│   ┌────────────────────────▼┐ │
│   │ popup window               │ │
│   │  output of                 │ │
│   │  `${{ values.backendCommand }}`         │ │
│   │  refresh every ${{ values.pollIntervalSeconds }}s          │ │
│   └─────────────────────────┘ │
└────────────────────────────────┘
```

Key pieces:

- **`src/main.rs`** — `cosmic::app::run()` entry point with `Settings::default()`.
- **`src/window.rs`** — the `cosmic::Application` impl: `view`, `update`, `subscription`. This is where the ECS message handling lives.
- **Subscription** — a `time::every(${{ values.pollIntervalSeconds }}s)` stream that fires a `Message::Tick`, which kicks off a `Task` that runs `${{ values.backendCommand }}` and feeds the stdout back into `update` as `Message::CommandResult`.
- **Popup** — opened by `cosmic::iced_runtime::core::window::Id` plumbing; the panel manages placement.

## Identity

The applet's reverse-DNS id is `${{ values.appletId }}`. COSMIC keys all per-applet state (settings, position in the panel) by this id, so do not change it after release.

## Run locally

```bash
nix build
./result/bin/${{ values.name }}
```

or for fast iteration during dev:

```bash
cargo run
```

## Next steps

- [Development guide](development.md)
