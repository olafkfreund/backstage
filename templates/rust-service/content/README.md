# ${{ values.name }}

${{ values.description }}

Scaffolded from the **rust-service** template in [olafkfreund/backstage](https://github.com/olafkfreund/backstage/tree/main/templates/rust-service). Stack: `axum` + `tokio` + `utoipa` (auto-OpenAPI) + Nix flake + GitHub Actions.

## Quick start

```bash
# Dev (with direnv + flake — recommended on NixOS)
direnv allow              # one-time
cargo run                 # → listening on :${{ values.listenPort }}

# Or without flake
cargo run --release

# Open
curl http://localhost:${{ values.listenPort }}/health
open http://localhost:${{ values.listenPort }}/swagger-ui
```

## Endpoints

| Path | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness probe — returns `{status, version}` |
| `/echo` | POST | Echoes the JSON body — useful for verifying routing |
| `/openapi.json` | GET | Auto-generated OpenAPI 3.1 spec |
| `/swagger-ui` | GET | Interactive API explorer |

## Backstage integration

- **Catalog**: `catalog-info.yaml` registers this as a `Component` + a `kind: API` entity. After merging, it appears in the Backstage catalog within ~1 hour (or instantly after a Backstage restart).
- **Docs**: `mkdocs.yml` + `docs/` are wired for TechDocs — the Docs tab on the entity page builds these on first view.
- **OpenAPI**: The `kind: API` entity points at `openapi.json`, which is generated at build time (see `build.rs` if added) or by running the service and saving the response.

## NixOS integration

This project ships a `flake.nix` with:

- `nix develop` → dev shell with the right Rust toolchain
- `nix build` → release binary at `result/bin/${{ values.name }}`
- `nix run` → build + run

To deploy on a NixOS host, add a systemd unit:

```nix
# modules/services/${{ values.name }}.nix
{ config, lib, pkgs, ... }:
let
  cfg = config.features.${{ values.name }};
  ${{ values.name }}-pkg = pkgs.callPackage (
    builtins.fetchTree { type = "github"; owner = "${{ values.destination.owner }}"; repo = "${{ values.destination.repo }}"; }
  ) {};
in {
  options.features.${{ values.name }} = {
    enable = lib.mkEnableOption "${{ values.name }}";
    port = lib.mkOption { type = lib.types.port; default = ${{ values.listenPort }}; };
  };
  config = lib.mkIf cfg.enable {
    systemd.services.${{ values.name }} = {
      wantedBy = [ "multi-user.target" ];
      serviceConfig = {
        ExecStart = "${${{ values.name }}-pkg}/bin/${{ values.name }}";
        DynamicUser = true;
        ProtectSystem = "strict";
        NoNewPrivileges = true;
      };
      environment = { RUST_LOG = "info"; };
    };
    networking.firewall.allowedTCPPorts = [ cfg.port ];
  };
}
```

## AI coding assistants

`AGENTS.md` at the root contains the project-specific instructions any AI coding agent (Claude Code, Cursor, Copilot, Codex) should read before making changes. `.claude/skills/` has additional scoped skills for specific tasks.

## CI

GitHub Actions on every push:

- **build** — `cargo build --release`
- **test** — `cargo test`
- **clippy** — fail on warnings
- **fmt** — `cargo fmt --check`
- **audit** — `cargo audit` for security advisories

## License

Dual-licensed under MIT or Apache-2.0.
