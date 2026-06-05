"""Integration tests for ${{ values.name }} routes.

Uses ``httpx.AsyncClient`` with ``ASGITransport`` so the FastAPI app is
exercised entirely in-process — no real network, no flakes.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app import __version__
from app.main import app


@pytest.mark.asyncio
async def test_health_returns_ok() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    body = response.json()
    assert body == {"status": "ok", "version": __version__}


@pytest.mark.asyncio
async def test_echo_round_trips_message() -> None:
    payload = {"message": "hello world"}
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/echo", json=payload)

    assert response.status_code == 200
    assert response.json() == payload


@pytest.mark.asyncio
async def test_echo_rejects_empty_message() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/echo", json={"message": ""})

    # Pydantic ``min_length=1`` triggers a 422 with a structured error body.
    assert response.status_code == 422
    body = response.json()
    assert "detail" in body


@pytest.mark.asyncio
async def test_echo_rejects_missing_field() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/echo", json={})

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_openapi_spec_is_published() -> None:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/openapi.json")

    assert response.status_code == 200
    spec = response.json()
    assert spec["openapi"].startswith("3.")
    assert spec["info"]["title"] == "${{ values.name }}"
    assert "/health" in spec["paths"]
    assert "/echo" in spec["paths"]
