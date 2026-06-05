---
name: add-endpoint
description: Add a new HTTP endpoint to this Fastify service, with Zod schemas, integration test, and docs update.
---

# Add an endpoint to ${{ values.name }}

When the user asks to add a new endpoint to this service, follow these steps **in order**, verifying each before continuing.

## 1. Create the route file

New file: `src/routes/your-route.ts`

```ts
import { z } from 'zod';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

const BodySchema = z.object({
  field: z.string().min(1).describe('A non-empty string field'),
});

const ResponseSchema = z.object({
  result: z.string(),
});

const plugin: FastifyPluginAsyncZod = async (fastify) => {
  fastify.post('/your-route', {
    schema: {
      tags: ['your-route'],
      summary: 'One-line description',
      body: BodySchema,
      response: { 200: ResponseSchema },
    },
  }, async (req) => {
    // Body is fully typed from Zod — no manual cast needed.
    return { result: req.body.field };
  });
};

export default plugin;
```

**Rules:**

- Use the `FastifyPluginAsyncZod` type — it wires the Zod type-provider so request/response types are inferred.
- Declare schemas for every `body`, `querystring`, `params`, and each response status.
- Throw `fastify.httpErrors.badRequest(...)` / `notFound(...)` etc. for known error paths — never plain `Error`.
- Log decision points with `req.log.info({ ... }, 'message')` — never `console.log`.
- Don't unwrap with `!` outside tests.

## 2. Register the route

In `src/server.ts`, add the import + register call:

```ts
import yourRoute from './routes/your-route.js';
// ...
await app.register(healthRoute);
await app.register(echoRoute);
await app.register(yourRoute);   // ← add here
```

Note the `.js` extension on the import — this is an ESM project and `tsc` does not rewrite extensions.

## 3. Write a vitest test

New file: `tests/your-route.test.ts`

```ts
import { describe, it, expect, afterEach } from 'vitest';
import { buildServer } from '../src/server.js';

describe('POST /your-route', () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  afterEach(async () => {
    await app?.close();
  });

  it('returns 200 with the echoed field', async () => {
    app = await buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/your-route',
      payload: { field: 'hello' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ result: 'hello' });
  });

  it('returns 400 when body is invalid', async () => {
    app = await buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/your-route',
      payload: { field: '' },
    });
    expect(res.statusCode).toBe(400);
  });
});
```

Use `fastify.inject()` — no real port binding, no flake.

## 4. Update docs

Add the new endpoint to `docs/api.md`. Use the existing `/echo` entry as a template (path, method, request body, response, curl example).

## 5. Verify

```bash
pnpm lint
pnpm test
pnpm build
pnpm dev &
sleep 2
curl -X POST http://localhost:${{ values.listenPort }}/your-route \
  -H 'content-type: application/json' \
  -d '{"field":"hi"}'
kill %1
```

All four commands must succeed. The OpenAPI spec at `/openapi.json` should now include `/your-route`.

## 6. Refresh the static openapi.json (for Backstage API entity)

```bash
pnpm openapi
```

This boots the server, GETs `/openapi.json`, writes it to the repo root, and shuts the server down. Commit the updated `openapi.json` so Backstage's API tab shows the new endpoint.
