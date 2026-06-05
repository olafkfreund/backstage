# AI coding agent instructions

This file is read by any AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider, etc.) before making changes. It encodes project-specific guardrails.

## Project: ${{ values.name }}

${{ values.description }}

**Stack:** TypeScript 5 + Fastify v5 + Zod + `@fastify/swagger` (OpenAPI) + `pino`. Built with `pnpm` or via Nix flake. Node 22.

## Required before any change

1. **Read `package.json`** — understand the dependency tree before adding new packages
2. **Read `src/server.ts`** — understand the route registration pattern
3. **Run tests after edits:** `pnpm test`
4. **Run lint:** `pnpm lint` (fail-fast on warnings)
5. **Run build:** `pnpm build` (verifies the TypeScript compiles end-to-end)

## Conventions

- **Routes**: each route is its own file under `src/routes/`, exporting an `async function` that takes a `FastifyInstance` and registers itself. Use the `ZodTypeProvider` for full inference.
- **Schemas**: every route declares Zod schemas for `body`, `querystring`, `params`, and `response[<status>]`. Never use `any` for request/response bodies — the type-provider derives types from the schemas.
- **Errors**: throw `fastify.httpErrors.badRequest(...)` / `notFound(...)` / etc.; the `@fastify/sensible` plugin formats them consistently. Never `throw new Error(...)` from a handler.
- **Logging**: use the request logger `req.log.info(...)` / `req.log.error(...)` — never `console.log`. The root `fastify.log` is fine outside requests.
- **Tests**: use `fastify.inject({ method, url, payload })` for in-process testing — no real sockets. Each test should `await app.close()` in a `finally` or `afterEach`.

## Avoid

- `any` (use `unknown` + Zod parsing)
- Non-null assertions (`!`) outside tests
- `console.log` / `console.error` (use the pino logger)
- Direct `process.exit(...)` in business logic (let Fastify shut down cleanly)
- Modifying `pnpm-lock.yaml` by hand — let pnpm regenerate it
- Hardcoding `localhost:${{ values.listenPort }}` — read from `config.port`
- Adding CommonJS — this project is `"type": "module"` (ESM only)

## When adding a new endpoint

Create `src/routes/your-route.ts`:

```ts
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const BodySchema = z.object({ field: z.string().min(1) });
const ResponseSchema = z.object({ result: z.string() });

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/your-route', {
    schema: {
      tags: ['your-route'],
      body: BodySchema,
      response: { 200: ResponseSchema },
    },
  }, async (req) => {
    return { result: req.body.field };
  });
};

export default plugin;
```

Then in `src/server.ts`:

```ts
import yourRoute from './routes/your-route.js';
// ...
await app.register(yourRoute);
```

The OpenAPI spec auto-updates; no manual schema work needed.

## Backstage integration (do not break)

This repo is registered in Backstage via `catalog-info.yaml`. Two contracts to maintain:

1. **`backstage.io/techdocs-ref: dir:.`** — Backstage's TechDocs builds from this repo's `mkdocs.yml`. Don't move or rename the docs.
2. **`spec.providesApis: [${{ values.name }}-api]`** — the API entity references `openapi.json` at the repo root. To regenerate:

   ```bash
   pnpm openapi
   ```

## Out of scope without explicit ask

- Adding a database / persistence layer
- Adding auth — this skeleton is intentionally unauthenticated
- Adding metrics export / Prometheus — easy to add (`fastify-metrics`) but not in the template
- Adding K8s manifests
- Switching to npm/yarn — this project is pnpm-only (Corepack-managed)
