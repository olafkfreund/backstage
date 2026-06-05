# API

The OpenAPI 3.1 spec is auto-generated from the route handlers' Zod schemas via `@fastify/swagger` + `fastify-type-provider-zod` and served at runtime at `/openapi.json`. A static copy committed at the repo root powers Backstage's API entity.

## Endpoints

### `GET /health`

Liveness probe. Returns the service version, uptime in seconds, and a static `ok` status.

```json
{ "status": "ok", "version": "0.1.0", "uptime": 42.137 }
```

### `POST /echo`

Echoes the request body verbatim. The body is validated by Zod — invalid payloads return `400` with a structured error.

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"message":"hi"}' \
  http://localhost:${{ values.listenPort }}/echo
```

Response:

```json
{ "message": "hi", "receivedAt": "2025-01-01T00:00:00.000Z" }
```

A `message` field that is missing or not a string yields:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "body/message Required"
}
```

## Interactive explorer

Visit `http://localhost:${{ values.listenPort }}/docs` for a live Swagger UI console. The raw spec is at `http://localhost:${{ values.listenPort }}/openapi.json`.

## Regenerating the static spec

```bash
pnpm openapi    # boots the server, GETs /openapi.json, writes openapi.json, shuts down
git add openapi.json && git commit -m 'docs: refresh openapi spec'
```

Backstage's API entity reads `openapi.json` from the repo root — keep it committed and up to date when endpoints change.
