# AI coding agent instructions

This file is read by any AI coding assistant (Claude Code, Cursor, Copilot, Codex, Aider, etc.) before making changes. It encodes project-specific guardrails.

## Project: ${{ values.name }}

${{ values.description }}

**Stack:** Python ${{ values.pythonVersion }} + FastAPI + Pydantic v2 + uvicorn + structlog. Dependencies managed by `uv`. Built with `uv build` or via Nix flake.

## Required before any change

1. **Read `pyproject.toml`** — understand the dependency tree before adding new packages
2. **Read `app/main.py`** — understand the route registration pattern and existing models
3. **Run linter after edits:** `uv run ruff check . && uv run ruff format .`
4. **Type-check:** `uv run mypy --strict app/`
5. **Run tests:** `uv run pytest -v`

## Conventions

- **Routes**: every handler is `async def` and uses `@app.get/post/...` decorators — FastAPI auto-includes them in OpenAPI
- **Models**: every request/response shape is a `pydantic.BaseModel` subclass — never raw dicts
- **Type hints everywhere**: this project runs `mypy --strict`. Every parameter and return value annotated. No untyped `def`s.
- **Errors**: raise `fastapi.HTTPException(status_code=..., detail=...)` — never return raw 500s. Never `print()` on the error path.
- **Logging**: use `structlog.get_logger(__name__)` — never `print()`, never the stdlib `logging` directly
- **Tests**: use `httpx.AsyncClient` with `ASGITransport(app=app)` — see `tests/test_main.py` for the canonical pattern
- **Async-first**: this is an ASGI app on uvicorn. All I/O goes through async libraries (`httpx`, `asyncpg`, `aiofiles`, …) — never block the event loop with `requests`, `psycopg2`, `time.sleep`, etc.

## Avoid

- Bare `except:` or `except Exception:` without re-raise — be specific
- Mutable default arguments (`def f(x=[])`)
- Top-level side effects in `app/` modules — only definitions
- Hardcoding `localhost:${{ values.listenPort }}` — read host/port from environment (`PORT`, `HOST`)
- Adding `requirements.txt` — `pyproject.toml` + `uv.lock` is the source of truth
- Pinning Python in `pyproject.toml` looser than `requires-python = ">=${{ values.pythonVersion }}"`
- Editing `uv.lock` by hand — run `uv lock` instead

## When adding a new endpoint

```python
from pydantic import BaseModel, Field

class YourRequest(BaseModel):
    field: str = Field(..., min_length=1, description="What this is")

class YourResponse(BaseModel):
    result: str

@app.post("/your-route", response_model=YourResponse, tags=["your-group"])
async def your_handler(req: YourRequest) -> YourResponse:
    logger.info("your_route_called", field=req.field)
    return YourResponse(result=req.field)
```

FastAPI takes care of:

- Request body validation (rejects bad payloads with 422 + helpful error)
- Response serialisation
- OpenAPI schema generation — your new route appears at `/docs` and `/openapi.json` automatically

See `.claude/skills/add-endpoint.md` for the full step-by-step including tests + docs update.

## Backstage integration (do not break)

This repo is registered in Backstage via `catalog-info.yaml`. Two contracts to maintain:

1. **`backstage.io/techdocs-ref: dir:.`** — Backstage's TechDocs builds from this repo's `mkdocs.yml`. Don't move or rename the docs.
2. **`spec.providesApis: [${{ values.name }}-api]`** — the API entity references `openapi.json` at the repo root. After route changes, regenerate it:

   ```bash
   uv run uvicorn app.main:app --port ${{ values.listenPort }} &
   sleep 2
   curl -s http://localhost:${{ values.listenPort }}/openapi.json | jq > openapi.json
   kill %1
   ```

   Commit the updated `openapi.json` so Backstage's API tab shows the new endpoint.

## Out of scope without explicit ask

- Adding a database / persistence layer
- Adding auth — this skeleton is intentionally unauthenticated
- Adding metrics export / Prometheus — easy to add but not in the template
- Adding K8s manifests
- Switching from `uv` to `pip` / `poetry` / `pdm`
