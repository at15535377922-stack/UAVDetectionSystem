import math
import time
import random

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter()


class Waypoint(BaseModel):
    lat: float
    lng: float
    altitude: float = 100.0
    speed: float = 8.0


class PlanRequest(BaseModel):
    algorithm: str = "a_star"
    waypoints: list[list[float]] = []
    obstacles: list[list[float]] = []
    altitude: float = 100.0
    speed: float = 8.0


class PlanResponse(BaseModel):
    algorithm: str
    path: list[list[float]]
    waypoints_count: int
    total_distance_m: float
    estimated_time_s: float
    planning_time_ms: float


def _haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two GPS coordinates."""
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _interpolate_path(waypoints: list[list[float]], algorithm: str) -> list[list[float]]:
    """Generate smooth path between waypoints with algorithm-specific behavior."""
    if len(waypoints) < 2:
        return waypoints

    path: list[list[float]] = []
    for i in range(len(waypoints) - 1):
        a = waypoints[i]
        b = waypoints[i + 1]
        steps = 15

        for s in range(steps + 1):
            t = s / steps
            # Different algorithms produce different path characteristics
            if algorithm == "rrt_star":
                # RRT* has slight randomness
                jitter_lat = random.gauss(0, 0.00003)
                jitter_lng = random.gauss(0, 0.00003)
            elif algorithm == "ant_colony":
                # Ant colony tends to curve
                jitter_lat = math.sin(t * math.pi) * 0.0004
                jitter_lng = math.cos(t * math.pi) * 0.0002
            elif algorithm == "d_star_lite":
                # D* Lite has sharper turns
                jitter_lat = math.sin(t * math.pi * 2) * 0.0002
                jitter_lng = 0
            else:
                # A* is smooth and direct
                jitter_lat = math.sin(t * math.pi) * 0.0001
                jitter_lng = math.sin(t * math.pi) * 0.0001

            lat = a[0] + (b[0] - a[0]) * t + jitter_lat
            lng = a[1] + (b[1] - a[1]) * t + jitter_lng
            path.append([round(lat, 7), round(lng, 7)])

    return path


@router.post("/generate", response_model=PlanResponse)
async def generate_path(request: PlanRequest):
    start_time = time.perf_counter()

    if len(request.waypoints) < 2:
        return PlanResponse(
            algorithm=request.algorithm,
            path=request.waypoints,
            waypoints_count=len(request.waypoints),
            total_distance_m=0.0,
            estimated_time_s=0.0,
            planning_time_ms=0.0,
        )

    path = _interpolate_path(request.waypoints, request.algorithm)

    # Calculate total distance
    total_dist = 0.0
    for i in range(1, len(path)):
        total_dist += _haversine(path[i - 1][0], path[i - 1][1], path[i][0], path[i][1])

    planning_time = (time.perf_counter() - start_time) * 1000

    return PlanResponse(
        algorithm=request.algorithm,
        path=path,
        waypoints_count=len(request.waypoints),
        total_distance_m=round(total_dist, 2),
        estimated_time_s=round(total_dist / request.speed, 2),
        planning_time_ms=round(planning_time, 2),
    )


@router.get("/algorithms")
async def list_algorithms():
    return {
        "algorithms": [
            {"id": "a_star", "name": "A* 算法", "type": "global", "description": "全局最优，适合静态环境"},
            {"id": "rrt_star", "name": "RRT* 算法", "type": "sampling", "description": "采样规划，适合复杂空间"},
            {"id": "ant_colony", "name": "改进蚁群算法", "type": "optimization", "description": "多航点顺序优化"},
            {"id": "d_star_lite", "name": "D* Lite", "type": "dynamic", "description": "动态避障，增量重规划"},
            {"id": "coverage", "name": "区域覆盖规划", "type": "coverage", "description": "牛耕式全覆盖扫描"},
        ]
    }


@router.post("/validate")
async def validate_path(
    waypoints: list[list[float]],
    max_distance_m: float = Query(50000),
    min_altitude: float = Query(30),
    max_altitude: float = Query(500),
    altitude: float = Query(100),
):
    """Validate a planned path against safety constraints."""
    errors = []

    if len(waypoints) < 2:
        errors.append("至少需要2个航点")

    if altitude < min_altitude:
        errors.append(f"飞行高度 {altitude}m 低于最低限制 {min_altitude}m")
    if altitude > max_altitude:
        errors.append(f"飞行高度 {altitude}m 超过最高限制 {max_altitude}m")

    # Check total distance
    total_dist = 0.0
    for i in range(1, len(waypoints)):
        total_dist += _haversine(waypoints[i - 1][0], waypoints[i - 1][1], waypoints[i][0], waypoints[i][1])

    if total_dist > max_distance_m:
        errors.append(f"总航程 {total_dist:.0f}m 超过最大限制 {max_distance_m:.0f}m")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "total_distance_m": round(total_dist, 2),
        "waypoints_count": len(waypoints),
    }
