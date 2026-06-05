# API

The OpenAPI 3.1 spec is auto-generated from the route handlers via `utoipa` and served at runtime at `/openapi.json`. A static copy committed at the repo root powers Backstage's API entity.

## Endpoints

### `GET /health`

Liveness probe. Returns the service version and a static `ok` status.

```json
{ "status": "ok", "version": "0.1.0" }
```

### `POST /echo`

Echoes the request body verbatim. Useful for verifying request routing + serde.

```bash
curl -X POST -H 'Content-Type: application/json' \
  -d '{"message":"hi"}' \
  http://localhost:${{ values.listenPort }}/echo
```

## Interactive explorer

Visit `http://localhost:${{ values.listenPort }}/swagger-ui` for a live API console.
