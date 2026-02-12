import asyncio
import json
import math
import random
import time
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections by channel."""

    def __init__(self):
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str):
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        if channel in self.active_connections:
            self.active_connections[channel] = [
                ws for ws in self.active_connections[channel] if ws != websocket
            ]
            if not self.active_connections[channel]:
                del self.active_connections[channel]

    async def broadcast(self, channel: str, data: dict):
        if channel in self.active_connections:
            message = json.dumps(data, ensure_ascii=False)
            for ws in self.active_connections[channel]:
                try:
                    await ws.send_text(message)
                except Exception:
                    pass

    @property
    def connection_count(self) -> int:
        return sum(len(conns) for conns in self.active_connections.values())


manager = ConnectionManager()


# ── Simulated UAV data generators ──────────────────────────────────

def _generate_telemetry(uav_id: str, step: int) -> dict:
    """Generate simulated telemetry data for a UAV."""
    base_lat, base_lng = 30.5728, 104.0668
    angle = step * 0.05
    radius = 0.003

    return {
        "type": "telemetry",
        "uav_id": uav_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "data": {
            "latitude": base_lat + radius * math.sin(angle),
            "longitude": base_lng + radius * math.cos(angle),
            "altitude": 100 + 10 * math.sin(step * 0.1),
            "speed": 8.0 + random.uniform(-1, 1),
            "heading": (step * 3) % 360,
            "battery": max(20, 95 - step * 0.1),
            "satellites": random.randint(10, 16),
            "signal_strength": -60 + random.randint(-10, 5),
            "flight_mode": "auto",
        },
    }


def _generate_detection_event(step: int) -> dict:
    """Generate simulated detection event."""
    classes = ["drone", "bird", "airplane", "helicopter", "unknown"]
    return {
        "type": "detection",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "frame_number": step,
        "detections": [
            {
                "class_name": random.choice(classes),
                "confidence": round(random.uniform(0.5, 0.99), 2),
                "bbox": [
                    random.randint(50, 400),
                    random.randint(50, 300),
                    random.randint(100, 200),
                    random.randint(100, 200),
                ],
            }
            for _ in range(random.randint(0, 3))
        ],
    }


def _generate_alert() -> dict | None:
    """Occasionally generate a system alert."""
    if random.random() > 0.1:
        return None
    alerts = [
        {"level": "warning", "message": "UAV-01 电量低于 30%"},
        {"level": "info", "message": "检测到新目标进入监控区域"},
        {"level": "warning", "message": "UAV-02 信号强度下降"},
        {"level": "error", "message": "UAV-03 通信中断"},
        {"level": "info", "message": "任务 M-005 已完成"},
    ]
    alert = random.choice(alerts)
    alert["type"] = "alert"
    alert["timestamp"] = datetime.now(timezone.utc).isoformat()
    return alert


# ── WebSocket Endpoints ────────────────────────────────────────────

@router.websocket("/telemetry/{uav_id}")
async def ws_telemetry(websocket: WebSocket, uav_id: str):
    """Stream real-time telemetry data for a specific UAV."""
    await manager.connect(websocket, f"telemetry:{uav_id}")
    step = 0
    try:
        while True:
            data = _generate_telemetry(uav_id, step)
            await websocket.send_text(json.dumps(data, ensure_ascii=False))
            step += 1
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket, f"telemetry:{uav_id}")


@router.websocket("/detection/{session_id}")
async def ws_detection(websocket: WebSocket, session_id: str):
    """Stream real-time detection results for a detection session."""
    await manager.connect(websocket, f"detection:{session_id}")
    step = 0
    try:
        while True:
            data = _generate_detection_event(step)
            await websocket.send_text(json.dumps(data, ensure_ascii=False))
            step += 1
            await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        manager.disconnect(websocket, f"detection:{session_id}")


@router.websocket("/dashboard")
async def ws_dashboard(websocket: WebSocket):
    """Stream aggregated real-time data for the dashboard."""
    await manager.connect(websocket, "dashboard")
    step = 0
    try:
        while True:
            # Send telemetry for all UAVs
            for uav_id in ["UAV-01", "UAV-02", "UAV-03"]:
                telemetry = _generate_telemetry(uav_id, step + hash(uav_id) % 100)
                await websocket.send_text(json.dumps(telemetry, ensure_ascii=False))

            # Occasionally send detection events
            if step % 3 == 0:
                det = _generate_detection_event(step)
                await websocket.send_text(json.dumps(det, ensure_ascii=False))

            # Occasionally send alerts
            alert = _generate_alert()
            if alert:
                await websocket.send_text(json.dumps(alert, ensure_ascii=False))

            # Send system stats
            stats = {
                "type": "stats",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "online_uavs": 3,
                "active_missions": 2,
                "today_detections": 1284 + step * random.randint(0, 3),
                "active_tracks": random.randint(3, 8),
                "connections": manager.connection_count,
            }
            await websocket.send_text(json.dumps(stats, ensure_ascii=False))

            step += 1
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket, "dashboard")


@router.websocket("/status")
async def ws_status(websocket: WebSocket):
    """Simple status heartbeat WebSocket."""
    await manager.connect(websocket, "status")
    try:
        while True:
            await websocket.send_text(json.dumps({
                "type": "heartbeat",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "connections": manager.connection_count,
                "uptime_s": int(time.time()),
            }))
            await asyncio.sleep(5)
    except WebSocketDisconnect:
        manager.disconnect(websocket, "status")
