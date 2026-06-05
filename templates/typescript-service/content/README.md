# ${{ values.name }}

${{ values.description }}

Scaffolded from the **typescript-service** template in [olafkfreund/backstage](https://github.com/olafkfreund/backstage/tree/main/templates/typescript-service). Stack: `Fastify v5` + `Zod` + `@fastify/swagger` (auto-OpenAPI) + `pino` + Nix flake + GitHub Actions.

## Quick start

```bash
# Dev (with direnv + flake — recommended on NixOS)
direnv allow              # one-time
pnpm install              # install deps
pnpm dev                  # → listening on :${{ values.listenPort }} with auto-reload

# Or without flake (any system with Node 22 + pnpm)
pnpm install
pnpm dev

# Open
curl http://localhost:${{ values.listenPort }}/health
open http://localhost:${{ values.listenPort }}/docs
```

## Endpoints

| Path | Method | Purpose |
|---|---|---|
| `/health` | GET | Liveness probe — returns `{status, version, uptime}` |
| `/echo` | POST | Echoes the JSON body — useful for verifying routing + Zod validation |
| `/openapi.json` | GET | Auto-generated OpenAPI 3.1 spec |
| `/docs` | GET | Interactive Swagger UI explorer |

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Run with `tsx watch` (auto-reload on edit) |
| `pnpm build` | Type-check + emit JS to `dist/` |
| `pnpm start` | Run the built bundle from `dist/` |
| `pnpm test` | Run the vitest suite |
| `pnpm lint` | ESLint + Prettier check |
| `pnpm lint:fix` | ESLint + Prettier autofix |
| `pnpm openapi` | Boot, fetch `/openapi.json`, write to repo root |

## Backstage integration

- **Catalog**: `catalog-info.yaml` registers this as a `Component` + a `kind: API` entity. After merging, it appears in the Backstage catalog within ~1 hour (or instantly after a Backstage restart).
- **Docs**: `mkdocs.yml` + `docs/` are wired for TechDocs — the Docs tab on the entity page builds these on first view.
- **OpenAPI**: The `kind: API` entity points at `openapi.json`. Regenerate with `pnpm openapi` and commit.

## NixOS integration

This project ships a `flake.nix` with:

- `nix develop` → dev shell with Node 22 + pnpm + direnv-friendly env
- `nix build` → builds the production bundle (output at `result/`)

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
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      serviceConfig = {
        ExecStart = "${pkgs.nodejs_22}/bin/node ${${{ values.name }}-pkg}/dist/server.js";
        DynamicUser = true;
        ProtectSystem = "strict";
        ProtectHome = true;
        NoNewPrivileges = true;
        PrivateTmp = true;
      };
      environment = {
        NODE_ENV = "production";
        PORT = toString cfg.port;
        LOG_LEVEL = "info";
      };
    };
    networking.firewall.allowedTCPPorts = [ cfg.port ];
  };
}
```

## AI coding assistants

`AGENTS.md` at the root contains the project-specific instructions any AI coding agent (Claude Code, Cursor, Copilot, Codex) should read before making changes. `.claude/skills/` has additional scoped skills for specific tasks (e.g. `add-endpoint.md`).

## CI

GitHub Actions on every push:

- **lint** — `pnpm lint` (eslint + prettier)
- **test** — `pnpm test` (vitest)
- **build** — `pnpm build` (tsc)
- **audit** — `pnpm audit --prod` for known advisories

## License

Dual-licensed under MIT or Apache-2.0.
