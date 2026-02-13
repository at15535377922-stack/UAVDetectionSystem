"""Flight controller API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.flight_controller import flight_controller_service, FlightCommand

router = APIRouter()


class MissionUploadRequest(BaseModel):
    waypoints: list[dict]
    altitude: float = 100.0
    speed: float = 8.0


class GotoRequest(BaseModel):
    lat: float
    lng: float
    altitude: float = 100.0


@router.post("/connect")
async def connect_uav(
    uav_id: str = Query(...),
    connection_string: str | None = Query(None),
):
    """Connect to a UAV (real MAVLink or simulated)."""
    conn = await flight_controller_service.connect_uav(uav_id, connection_string)
    return {"success": conn.connected, "uav_id": uav_id, "telemetry": conn.get_telemetry()}


@router.post("/disconnect")
async def disconnect_uav(uav_id: str = Query(...)):
    await flight_controller_service.disconnect_uav(uav_id)
    return {"success": True, "uav_id": uav_id}


@router.get("/connections")
async def list_connections():
    """List all connected UAVs and their telemetry."""
    return {"connections": flight_controller_service.list_connections()}


@router.post("/command/arm")
async def arm_uav(uav_id: str = Query(...)):
    conn = flight_controller_service.get_uav(uav_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"UAV {uav_id} not connected")
    result = await conn.arm()
    return {"success": result, "telemetry": conn.get_telemetry()}


@router.post("/command/disarm")
async def disarm_uav(uav_id: str = Query(...)):
    conn = flight_controller_service.get_uav(uav_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"UAV {uav_id} not connected")
    result = await conn.disarm()
    return {"success": result, "telemetry": conn.get_telemetry()}


@router.post("/command/takeoff")
async def takeoff(uav_id: str = Query(...), altitude: float = Query(10.0)):
    return await flight_controller_service.send_command(uav_id, FlightCommand.TAKEOFF, altitude=altitude)


@router.post("/command/land")
async def land(uav_id: str = Query(...)):
    return await flight_controller_service.send_command(uav_id, FlightCommand.LAND)


@router.post("/command/rtl")
async def return_to_launch(uav_id: str = Query(...)):
    return await flight_controller_service.send_command(uav_id, FlightCommand.RTL)


@router.post("/command/hover")
async def hover(uav_id: str = Query(...)):
    return await flight_controller_service.send_command(uav_id, FlightCommand.HOVER)


@router.post("/command/goto")
async def goto_position(uav_id: str = Query(...), data: GotoRequest = ...):
    return await flight_controller_service.send_command(
        uav_id, FlightCommand.GOTO, lat=data.lat, lng=data.lng, altitude=data.altitude,
    )


@router.post("/mission/upload")
async def upload_mission(uav_id: str = Query(...), data: MissionUploadRequest = ...):
    """Upload a mission (waypoints) to a connected UAV."""
    conn = flight_controller_service.get_uav(uav_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"UAV {uav_id} not connected")

    # Ensure each waypoint has altitude
    waypoints = []
    for wp in data.waypoints:
        waypoints.append({
            "lat": wp.get("lat", wp.get("latitude", 0)),
            "lng": wp.get("lng", wp.get("longitude", 0)),
            "altitude": wp.get("altitude", data.altitude),
            "speed": wp.get("speed", data.speed),
        })

    result = await conn.upload_mission(waypoints)
    return {"success": result, "waypoints_count": len(waypoints), "telemetry": conn.get_telemetry()}


@router.post("/mission/start")
async def start_mission(uav_id: str = Query(...)):
    return await flight_controller_service.send_command(uav_id, FlightCommand.MISSION_START)


@router.get("/telemetry")
async def get_telemetry(uav_id: str = Query(...)):
    conn = flight_controller_service.get_uav(uav_id)
    if not conn:
        raise HTTPException(status_code=404, detail=f"UAV {uav_id} not connected")
    return conn.get_telemetry()


@router.get("/status")
async def flight_status():
    """Get flight controller service status."""
    return {
        "mode": "real" if flight_controller_service.is_real_mode else "simulated",
        "connected_uavs": len(flight_controller_service.list_connections()),
        "connections": flight_controller_service.list_connections(),
    }
