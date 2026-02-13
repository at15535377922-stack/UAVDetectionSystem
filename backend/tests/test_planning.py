import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_generate_path(auth_client: AsyncClient):
    resp = await auth_client.post("/api/planning/generate", json={
        "algorithm": "a_star",
        "waypoints": [[30.5728, 104.0668], [30.5780, 104.0720]],
        "altitude": 100,
        "speed": 8,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["algorithm"] == "a_star"
    assert len(data["path"]) > 0
    assert data["total_distance_m"] > 0
    assert data["estimated_time_s"] > 0
    assert data["planning_time_ms"] >= 0


@pytest.mark.asyncio
async def test_generate_path_rrt_star(auth_client: AsyncClient):
    resp = await auth_client.post("/api/planning/generate", json={
        "algorithm": "rrt_star",
        "waypoints": [[30.57, 104.06], [30.58, 104.07], [30.59, 104.08]],
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["algorithm"] == "rrt_star"
    assert data["waypoints_count"] >= 3


@pytest.mark.asyncio
async def test_generate_path_too_few_waypoints(auth_client: AsyncClient):
    resp = await auth_client.post("/api/planning/generate", json={
        "algorithm": "a_star",
        "waypoints": [[30.57, 104.06]],
    })
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_list_algorithms(auth_client: AsyncClient):
    resp = await auth_client.get("/api/planning/algorithms")
    assert resp.status_code == 200
    data = resp.json()
    assert "algorithms" in data
    assert len(data["algorithms"]) > 0
    ids = [a["id"] for a in data["algorithms"]]
    assert "a_star" in ids


@pytest.mark.asyncio
async def test_validate_path(auth_client: AsyncClient):
    resp = await auth_client.post(
        "/api/planning/validate",
        json=[[30.57, 104.06], [30.58, 104.07]],
        params={"altitude": 100},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "valid" in data
    assert "total_distance_m" in data
