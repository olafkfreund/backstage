# ${{ values.name }}

${{ values.description }}

## What it does

`${{ values.name }}` is a Python web service built on `FastAPI` + `Pydantic v2` + `uvicorn`. FastAPI auto-generates an OpenAPI 3.1 spec from the route decorators and Pydantic models, and serves both Swagger UI and ReDoc out of the box. Dependencies are managed by `uv` for fast, reproducible installs.

## Architecture

```text
┌───────────────────────────────────┐
│ ${{ values.name }} (FastAPI / uvicorn)   │
│  /health       → liveness         │
│  /echo         → demo POST        │
│  /openapi.json → spec             │
│  /docs         → Swagger UI       │
│  /redoc        → ReDoc            │
└───────────────────────────────────┘
```

## Run locally

```bash
uv sync
uv run uvicorn app.main:app --reload --port ${{ values.listenPort }}
curl http://localhost:${{ values.listenPort }}/health
```

## Next steps

- [Development guide](development.md)
- [API reference](api.md)
