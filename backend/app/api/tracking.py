import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.detection_result import TrackingResult
from app.schemas.tracking import TrackResponse, TrackingSession

router = APIRouter()

# In-memory tracking sessions (in production, use Redis)
_tracking_sessions: dict[str, dict] = {}


@router.post("/start", response_model=TrackingSession)
async def start_tracking(
    tracker_type: str = Query("deep_sort"),
    source: str = Query("rtsp://localhost:8554/stream"),
    mission_id: int | None = Query(None),
    device_id: int | None = Query(None),
):
    if tracker_type not in ("deep_sort", "byte_track", "bot_sort"):
        raise HTTPException(status_code=400, detail=f"不支持的跟踪器类型: {tracker_type}")

    session_id = uuid.uuid4().hex[:8]
    session = {
        "session_id": session_id,
        "tracker_type": tracker_type,
        "source": source,
        "mission_id": mission_id,
        "device_id": device_id,
        "status": "running",
        "active_tracks": 0,
        "total_tracks": 0,
        "fps": 0.0,
    }
    _tracking_sessions[session_id] = session

    # TODO: Start actual tracking pipeline in background task
    return TrackingSession(**session)


@router.post("/stop", response_model=TrackingSession)
async def stop_tracking(session_id: str = Query(...)):
    session = _tracking_sessions.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="跟踪会话不存在")

    session["status"] = "stopped"
    # TODO: Stop the tracking pipeline
    return TrackingSession(**session)


@router.get("/sessions")
async def list_sessions():
    return {"sessions": list(_tracking_sessions.values())}


@router.get("/tracks", response_model=list[TrackResponse])
async def list_tracks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    mission_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(TrackingResult).order_by(TrackingResult.created_at.desc())
    if mission_id is not None:
        query = query.where(TrackingResult.mission_id == mission_id)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/tracks/{track_id}", response_model=TrackResponse)
async def get_track(track_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrackingResult).where(TrackingResult.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="跟踪记录不存在")
    return track


@router.get("/tracks/{track_id}/trajectory")
async def get_trajectory(track_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrackingResult).where(TrackingResult.id == track_id))
    track = result.scalar_one_or_none()
    if not track:
        raise HTTPException(status_code=404, detail="跟踪记录不存在")
    return {
        "track_id": track.id,
        "tracker_type": track.tracker_type,
        "trajectory": track.trajectory or [],
    }
