# ${{ values.name }}

${{ values.description }}

Scaffolded from the **cosmic-applet** template in [olafkfreund/backstage](https://github.com/olafkfreund/backstage/tree/main/templates/cosmic-applet). Stack: `libcosmic` (Pop!_OS COSMIC desktop framework, built on Iced 0.13) + Nix flake + GitHub Actions.

This is a **desktop applet** — it lives in the COSMIC panel as a tray icon and opens a popup window when clicked. It is **not** an HTTP service.

## Quick start

```bash
# Dev (with direnv + flake — strongly recommended; libcosmic has many native deps)
direnv allow              # one-time
nix build                 # → result/bin/${{ values.name }}
./result/bin/${{ values.name }}

# Or run the dev build directly
cargo run
```

The applet registers itself with the COSMIC panel using the reverse-DNS id `${{ values.appletId }}`. When clicked it opens a popup showing the output of `${{ values.backendCommand }}`, refreshed every ${{ values.pollIntervalSeconds }} seconds.

## Architecture

```text
┌──────────────────────────────┐
│ COSMIC panel                  │
│  └─ tray icon (this applet) ─┐│
│                          click ││
│                              ▼ │
│  ┌────────────────────────┐  │
│  │ popup window          │  │
│  │  output of            │  │
│  │  `${{ values.backendCommand }}` │  │
│  │  (refresh every ${{ values.pollIntervalSeconds }}s) │  │
│  └────────────────────────┘  │
└───────────────────────────────┘
```

## Backstage integration

- **Catalog**: `catalog-info.yaml` registers this as a `Component` of `type: tool`. No `kind: API` entity is created — this is a desktop app, not an HTTP service.
- **Docs**: `mkdocs.yml` + `docs/` are wired for TechDocs — the Docs tab on the entity page builds these on first view.

## NixOS integration

This project ships a `flake.nix` with:

- `nix develop` → dev shell with the right Rust toolchain + libcosmic native deps (libxkbcommon, wayland, fontconfig, freetype, etc.)
- `nix build` → release binary at `result/bin/${{ values.name }}`
- `nix run` → build + run

To install on a NixOS host with COSMIC desktop:

```nix
# modules/desktop/${{ values.name }}.nix
{ config, lib, pkgs, ... }:
let
  cfg = config.features.${{ values.name }};
  ${{ values.name }}-pkg = (builtins.getFlake "github:${{ values.destination.owner }}/${{ values.destination.repo }}").packages.${pkgs.system}.default;
in {
  options.features.${{ values.name }} = {
    enable = lib.mkEnableOption "${{ values.name }} COSMIC applet";
  };
  config = lib.mkIf cfg.enable {
    environment.systemPackages = [ ${{ values.name }}-pkg ];
    # The applet is launched by the COSMIC panel via its .desktop file;
    # COSMIC reads it from $XDG_DATA_DIRS so installing the package is enough.
  };
}
```

Then on the host:

```nix
features.${{ values.name }}.enable = true;
```

Log out and back in (or restart `cosmic-panel`) for the applet to appear.

## AI coding assistants

`AGENTS.md` at the root contains the project-specific instructions any AI coding agent (Claude Code, Cursor, Copilot, Codex) should read before making changes. `.claude/skills/` has additional scoped skills for specific tasks like adding a new background command/menu item.

## CI

GitHub Actions on every push:

- **nix build** — the canonical build path; uses the flake so libcosmic native deps resolve correctly
- **clippy** — `cargo clippy --all-targets -- -D warnings`
- **test** — `cargo test`
- **audit** — `cargo audit` for security advisories

We do **not** run plain `cargo build` in CI — libcosmic pulls a large native graph (Wayland, xkb, freetype, fontconfig…) that resolves cleanly under Nix and unreliably without.

## License

Dual-licensed under MIT or Apache-2.0.
