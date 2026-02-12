from pydantic import BaseModel
from datetime import datetime


class MissionBase(BaseModel):
    name: str
    description: str | None = None
    mission_type: str = "inspection"


class MissionCreate(MissionBase):
    device_id: int
    waypoints: list[list[float]] = []
    algorithm: str | None = None
    altitude: float = 100.0
    speed: float = 8.0


class MissionUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None


class MissionResponse(MissionBase):
    id: int
    status: str
    device_id: int | None = None
    creator_id: int | None = None
    waypoints: list[list[float]] | None = None
    algorithm: str | None = None
    total_distance: float | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MissionListResponse(BaseModel):
    missions: list[MissionResponse]
    total: int
