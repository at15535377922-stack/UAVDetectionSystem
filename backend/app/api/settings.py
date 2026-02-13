from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional

from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()

# In-memory settings store (per-user). In production, persist to DB.
_user_settings: dict[int, dict] = {}


class UserSettings(BaseModel):
    # Detection
    default_model: str = "yolov8n"
    confidence_threshold: float = 0.5
    nms_iou_threshold: float = 0.45
    input_size: str = "640x640"
    # Tracking
    tracker_algorithm: str = "deep_sort"
    max_lost_frames: int = 30
    # Path planning
    planning_algorithm: str = "a_star"
    safety_distance: float = 5.0


class UserSettingsUpdate(BaseModel):
    default_model: Optional[str] = None
    confidence_threshold: Optional[float] = None
    nms_iou_threshold: Optional[float] = None
    input_size: Optional[str] = None
    tracker_algorithm: Optional[str] = None
    max_lost_frames: Optional[int] = None
    planning_algorithm: Optional[str] = None
    safety_distance: Optional[float] = None


@router.get("/", response_model=UserSettings)
async def get_settings(current_user: User = Depends(get_current_user)):
    stored = _user_settings.get(current_user.id, {})
    return UserSettings(**stored)


@router.put("/", response_model=UserSettings)
async def update_settings(
    data: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
):
    stored = _user_settings.get(current_user.id, {})
    updates = data.model_dump(exclude_none=True)
    stored.update(updates)
    _user_settings[current_user.id] = stored
    return UserSettings(**stored)
