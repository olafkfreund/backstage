# Development

## Toolchain (NixOS / Nix users)

```bash
# Once per checkout:
direnv allow

# Then the shell auto-loads Node 22 + pnpm.
pnpm install
pnpm dev
pnpm test
pnpm lint
pnpm build
```

The flake pins Node 22 + pnpm so everyone gets identical tooling.

## Toolchain (non-Nix)

Any system with **Node 22** and **pnpm 9+** works. Install pnpm via `corepack`:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

## Project layout

```text
src/
  server.ts        — Fastify app factory + bootstrap
  config.ts        — env var parsing (Zod)
  routes/
    health.ts      — GET /health
    echo.ts        — POST /echo
tests/
  server.test.ts   — vitest + supertest-style fastify.inject()
```

The `buildServer()` factory in `src/server.ts` is exported so tests can drive it in-process without binding a real socket — `fastify.inject()` is used throughout.

## Adding routes

1. Create `src/routes/your-route.ts` exporting an async plugin
2. Define Zod schemas for `body`, `querystring`, and `response`
3. Register the plugin in `src/server.ts`
4. The OpenAPI spec auto-includes it; Swagger UI renders the new endpoint

See `.claude/skills/add-endpoint.md` for the step-by-step recipe.

## Testing

```bash
pnpm test           # one shot
pnpm test --watch   # watch mode
```

Tests use `fastify.inject()` to drive the app in-process without binding a port — no flakiness from port conflicts, sub-millisecond round trips.

## Linting & formatting

```bash
pnpm lint           # eslint + prettier --check
pnpm lint:fix       # autofix what's fixable
```

ESLint enforces `@typescript-eslint/strict` + `unicorn` recommended rules. Prettier handles formatting. CI fails on any violation.

## CI

`.github/workflows/ci.yml` runs:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm audit --prod --audit-level=high`

All five steps must pass before a PR can merge.

## Releasing

This template doesn't prescribe a release flow — most internal services are deployed via the NixOS systemd module shown in the README. If you publish to a registry, add a `release.yml` workflow that runs on tags.
