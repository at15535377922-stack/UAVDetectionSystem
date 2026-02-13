import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_mission(auth_client: AsyncClient):
    resp = await auth_client.post("/api/missions/", json={
        "name": "测试巡检任务",
        "description": "单元测试任务",
        "mission_type": "inspection",
        "device_id": 1,
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "测试巡检任务"
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_list_missions(auth_client: AsyncClient):
    # Create two missions
    await auth_client.post("/api/missions/", json={"name": "任务A", "device_id": 1})
    await auth_client.post("/api/missions/", json={"name": "任务B", "device_id": 1})
    resp = await auth_client.get("/api/missions/")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["missions"]) >= 2


@pytest.mark.asyncio
async def test_get_mission(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/missions/", json={"name": "详情任务", "device_id": 1})
    mid = create_resp.json()["id"]
    resp = await auth_client.get(f"/api/missions/{mid}")
    assert resp.status_code == 200
    assert resp.json()["name"] == "详情任务"


@pytest.mark.asyncio
async def test_start_stop_mission(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/missions/", json={"name": "启停任务", "device_id": 1})
    mid = create_resp.json()["id"]

    # Start
    resp = await auth_client.post(f"/api/missions/{mid}/start")
    assert resp.status_code == 200
    assert resp.json()["status"] == "running"

    # Stop
    resp = await auth_client.post(f"/api/missions/{mid}/stop")
    assert resp.status_code == 200
    assert resp.json()["status"] == "completed"


@pytest.mark.asyncio
async def test_delete_mission(auth_client: AsyncClient):
    create_resp = await auth_client.post("/api/missions/", json={"name": "删除任务", "device_id": 1})
    mid = create_resp.json()["id"]
    resp = await auth_client.delete(f"/api/missions/{mid}")
    assert resp.status_code == 200

    # Verify deleted
    resp = await auth_client.get(f"/api/missions/{mid}")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_missions_unauthorized(client: AsyncClient):
    resp = await client.get("/api/missions/")
    assert resp.status_code == 401
