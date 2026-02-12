from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PlanRequest(BaseModel):
    algorithm: str = "a_star"
    start: list[float] = [0.0, 0.0]
    goal: list[float] = [100.0, 100.0]
    obstacles: list[list[float]] = []
    altitude: float = 100.0
    speed: float = 8.0


@router.post("/generate")
async def generate_path(request: PlanRequest):
    return {
        "algorithm": request.algorithm,
        "waypoints": [],
        "distance": 0.0,
        "planning_time_ms": 0.0,
        "message": "Path generation - TODO",
    }


@router.get("/algorithms")
async def list_algorithms():
    return {
        "algorithms": [
            {"id": "a_star", "name": "A* 算法", "type": "global"},
            {"id": "rrt_star", "name": "RRT* 算法", "type": "sampling"},
            {"id": "ant_colony", "name": "改进蚁群算法", "type": "optimization"},
            {"id": "d_star_lite", "name": "D* Lite", "type": "dynamic"},
            {"id": "coverage", "name": "区域覆盖规划", "type": "coverage"},
        ]
    }
