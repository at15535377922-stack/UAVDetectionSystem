from pydantic import BaseModel
from datetime import datetime


class TrackPoint(BaseModel):
    frame: int
    x: float
    y: float
    w: float
    h: float
    timestamp: float | None = None


class TrackCreate(BaseModel):
    mission_id: int | None = None
    device_id: int | None = None
    tracker_type: str = "deep_sort"


class TrackResponse(BaseModel):
    id: int
    track_id: int
    mission_id: int | None = None
    class_name: str
    tracker_type: str
    trajectory: list | None = None
    total_frames: int = 0
    created_at: datetime

    model_config = {"from_attributes": True}


class TrackingSession(BaseModel):
    session_id: str
    tracker_type: str
    status: str
    active_tracks: int
    total_tracks: int
    fps: float
