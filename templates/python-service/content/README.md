# ${{ values.name }}

${{ values.description }}

Scaffolded from the **python-service** template in [olafkfreund/backstage](https://github.com/olafkfreund/backstage/tree/main/templates/python-service). Stack: `FastAPI` + `Pydantic v2` + `uvicorn` + `structlog` + `uv` + Nix flake + GitHub Actions.

## Quick start

```bash
# Dev (with direnv + flake — recommended on NixOS)
direnv allow              # one-time
uv sync                   # install deps from pyproject.toml
uv run uvicorn app.main:app --reload --port ${{ values.listenPort }}

# Or without flake (uv installs its own Python)
uv sync
uv run uvicorn app.main:app --reload --port ${{ values.listenPort }}

# Open
curl http://localhost:${{ values.listenPort }}/health
open http://localhost:${{ values.listenPort }}/docs        # Swagger UI
open http://localhost:${{ values.listenPort }}/redoc       # ReDoc
```

## Endpoints

| Path | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness probe — returns `{status, version}` |
| `/echo` | POST | Echoes the JSON body — useful for verifying routing |
| `/openapi.json` | GET | Auto-generated OpenAPI 3.1 spec |
| `/docs` | GET | Swagger UI — interactive API explorer |
| `/redoc` | GET | ReDoc — alternative API documentation |

## Backstage integration

- **Catalog**: `catalog-info.yaml` registers this as a `Component` + a `kind: API` entity. After merging, it appears in the Backstage catalog within ~1 hour (or instantly after a Backstage restart).
- **Docs**: `mkdocs.yml` + `docs/` are wired for TechDocs — the Docs tab on the entity page builds these on first view.
- **OpenAPI**: The `kind: API` entity points at `openapi.json`. Regenerate it after route changes by running the service and curling `/openapi.json`.

## NixOS integration

This project ships a `flake.nix` with:

- `nix develop` → dev shell with Python ${{ values.pythonVersion }} + uv + ruff + mypy
- `nix build` → builds a wheel installable into any Python ${{ values.pythonVersion }} env
- `nix run` → boots the service

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
        ProtectHome = true;
        NoNewPrivileges = true;
        PrivateTmp = true;
      };
      environment = {
        LOG_LEVEL = "info";
        PORT = toString cfg.port;
      };
    };
    networking.firewall.allowedTCPPorts = [ cfg.port ];
  };
}
```

## AI coding assistants

`AGENTS.md` at the root contains the project-specific instructions any AI coding agent (Claude Code, Cursor, Copilot, Codex) should read before making changes. `.claude/skills/` has additional scoped skills for specific tasks.

## CI

GitHub Actions on every push:

- **lint** — `ruff check` + `ruff format --check`
- **typecheck** — `mypy --strict app/`
- **test** — `pytest -v`
- **build** — `uv build` (wheel + sdist)

## License

Dual-licensed under MIT or Apache-2.0.
