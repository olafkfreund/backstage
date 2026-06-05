# ${{ values.name }}

${{ values.description }}

## What it does

`${{ values.name }}` is a TypeScript web service built on `Fastify v5`. It auto-generates an OpenAPI 3.1 spec from `Zod` schemas via `@fastify/swagger` + `fastify-type-provider-zod`, exposes a Swagger UI explorer at `/docs`, and ships with Nix-flake-based reproducible builds.

## Architecture

```text
┌───────────────────────────────┐
│ ${{ values.name }} (Fastify)         │
│  /health        → liveness       │
│  /echo          → demo POST      │
│  /openapi.json  → spec           │
│  /docs          → Swagger UI     │
└───────────────────────────────┘
          │
          ▼
  pino structured logs (JSON)
```

## Run locally

```bash
pnpm install
pnpm dev                # listens on :${{ values.listenPort }} with hot reload
curl http://localhost:${{ values.listenPort }}/health
```

## Configuration

All configuration is via environment variables (see `src/config.ts`):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `${{ values.listenPort }}` | HTTP listen port |
| `HOST` | `0.0.0.0` | HTTP bind address |
| `LOG_LEVEL` | `info` | pino log level (`fatal`, `error`, `warn`, `info`, `debug`, `trace`) |
| `NODE_ENV` | `development` | When set to `production`, pretty-printing is disabled |

## Next steps

- [Development guide](development.md)
- [API reference](api.md)
