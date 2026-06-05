# Development

## Toolchain (NixOS / Nix users)

```bash
# Once per checkout:
direnv allow

# Then the shell auto-loads Python ${{ values.pythonVersion }} + uv + ruff + mypy.
uv sync                       # install deps from pyproject.toml
uv run pytest                  # run tests
uv run ruff check .            # lint
uv run ruff format .           # format
uv run mypy --strict app/      # type-check
```

The flake pins the Python interpreter so everyone gets identical builds.

## Toolchain (non-Nix)

Install [uv](https://docs.astral.sh/uv/) — it manages its own Python toolchain:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install ${{ values.pythonVersion }}
uv sync
```

## Running the service

```bash
uv run uvicorn app.main:app --reload --port ${{ values.listenPort }}
```

`--reload` watches files and restarts on change — great for local dev, never use in production.

## Adding routes

1. Define request/response Pydantic models in `app/main.py` (or a new module under `app/`)
2. Write an `async` handler decorated with `@app.get/post/put/delete(...)`
3. FastAPI auto-includes it in the OpenAPI spec; Swagger UI renders the new endpoint
4. Add a test in `tests/`

See `.claude/skills/add-endpoint.md` for a fully-worked step-by-step.

## Testing

```bash
uv run pytest -v
```

Tests live in `tests/`. They use `httpx.AsyncClient` against the FastAPI app via `ASGITransport`, so the app is exercised in-process — no real network, no flakes.

## Linting & type-checking

```bash
uv run ruff check .            # lint
uv run ruff format --check .   # format check (CI uses this)
uv run mypy --strict app/      # strict type-check
```

`ruff` replaces flake8 + isort + pyupgrade + many more — single fast tool.

## CI

`.github/workflows/ci.yml` runs:

- `ruff check` + `ruff format --check`
- `mypy --strict app/`
- `pytest -v`
- `uv build` (wheel + sdist)

All four steps must pass before a PR can merge.
