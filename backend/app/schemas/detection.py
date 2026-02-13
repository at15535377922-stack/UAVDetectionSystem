from pydantic import BaseModel
from datetime import datetime


class DetectionBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_name: str
    class_id: int


class DetectionResultCreate(BaseModel):
    mission_id: int | None = None
    device_id: int | None = None
    image_path: str | None = None
    model_name: str = "yolov8n"
    detections: list[DetectionBox] = []


class DetectionResultResponse(BaseModel):
    id: int
    mission_id: int | None = None
    device_id: int | None = None
    image_path: str | None = None
    model_name: str
    detections: list[dict] = []
    detection_count: int = 0
    inference_time_ms: float | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DetectionStats(BaseModel):
    total_detections: int
    today_detections: int
    class_distribution: dict[str, int]
    recent_trend: list[dict]
