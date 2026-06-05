---
name: add-endpoint
description: Add a new FastAPI endpoint to this service, with Pydantic request/response models, a pytest httpx test, and a docs update.
---

# Add an endpoint to ${{ values.name }}

When the user asks to add a new endpoint to this service, follow these steps **in order**, verifying each before continuing.

## 1. Define Pydantic models

In `app/main.py` (or a new module under `app/`):

```python
from pydantic import BaseModel, Field

class YourRequest(BaseModel):
    field: str = Field(..., min_length=1, description="What this field represents")

class YourResponse(BaseModel):
    result: str
```

**Rules:**

- Always subclass `pydantic.BaseModel` — never use plain dicts as the request/response shape
- Use `Field(..., description="...")` on every field — descriptions land in the OpenAPI spec
- Add validation constraints (`min_length`, `ge`, `le`, `pattern`, …) where they apply

## 2. Write the handler

```python
@app.post(
    "/your-route",
    response_model=YourResponse,
    tags=["your-group"],
    summary="One-line summary that shows up in Swagger UI",
)
async def your_handler(req: YourRequest) -> YourResponse:
    logger.info("your_route_called", field=req.field)
    return YourResponse(result=req.field)
```

**Rules:**

- Always `async def` — this is an ASGI app on uvicorn
- Annotate the return type — `mypy --strict` will reject untyped handlers
- Raise `HTTPException(status_code=..., detail=...)` on errors — never return raw 500s, never `print()`
- Log with `structlog` (`logger = structlog.get_logger(__name__)`) — never stdlib `logging` or `print()`
- Don't block the event loop — use `httpx` not `requests`, `asyncpg` not `psycopg2`, etc.

## 3. (Optional) GET endpoint with query params

```python
@app.get("/items/{item_id}", response_model=YourResponse, tags=["your-group"])
async def get_item(item_id: int, q: str | None = None) -> YourResponse:
    return YourResponse(result=f"{item_id}:{q}")
```

Path parameters and query parameters are auto-extracted by FastAPI based on the signature.

## 4. Write a test

Append to `tests/test_main.py` (or create a new `tests/test_your_route.py`):

```python
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_your_route_happy_path() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/your-route", json={"field": "hello"})
    assert response.status_code == 200
    assert response.json() == {"result": "hello"}


@pytest.mark.asyncio
async def test_your_route_rejects_empty_field() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/your-route", json={"field": ""})
    assert response.status_code == 422  # Pydantic min_length=1 rejection
```

## 5. Update docs

Add the new endpoint to `docs/api.md`. Use the existing entries as a template — show:

- HTTP method + path
- One-line purpose
- Request body shape (if applicable)
- Response body shape
- A `curl` example

## 6. Verify locally

```bash
uv run ruff check .
uv run ruff format .
uv run mypy --strict app/
uv run pytest -v
uv run uvicorn app.main:app --port ${{ values.listenPort }} &
sleep 2
curl -X POST http://localhost:${{ values.listenPort }}/your-route \
  -H 'content-type: application/json' \
  -d '{"field":"hi"}'
kill %1
```

All five steps must succeed. The OpenAPI spec at `/openapi.json` and Swagger UI at `/docs` should now include `/your-route` with the right schemas.

## 7. Refresh the static `openapi.json` (Backstage API entity)

```bash
uv run uvicorn app.main:app --port ${{ values.listenPort }} &
sleep 2
curl -s http://localhost:${{ values.listenPort }}/openapi.json | jq > openapi.json
kill %1
```

Commit the updated `openapi.json` so Backstage's API tab shows the new endpoint after the next catalog refresh.
