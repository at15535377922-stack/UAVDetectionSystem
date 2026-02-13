import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.detection_result import TrackingResult
from app.schemas.tracking import TrackResponse, TrackingSession
from app.services.tracker import tracker_service

router = APIRouter()


@router.post("/start", response_model=TrackingSession)
async def start_tracking(
    tracker_type: str = Query("deep_sort"),
    source: str = Query("rtsp://localhost:8554/stream"),
    mission_id: int | None = Query(None),
    device_id: int | None = Query(None),
):
    supported_ids = [t["id"] for t in tracker_service.supported_trackers]
    if tracker_type not in supported_ids:
        raise HTTPException(status_code=400, detail=f"不支持的跟踪器类型: {tracker_type}")

    session_id = uuid.uuid4().hex[:8]
    session = tracker_service.create_session(session_id, tracker_type, source)

    return TrackingSession(
        session_id=session.session_id,
        tracker_type=session.tracker_type,
        source=session.source,
        status=session.status,
        active_tracks=session.active_tracks,
        total_tracks=session.total_tracks,
        fps=session.fps,
    )


@router.post("/stop", response_model=TrackingSession)
async def stop_tracking(session_id: str = Query(...)):
    session = tracker_service.stop_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="跟踪会话不存在")

    return TrackingSession(
        session_id=session.session_id,
        tracker_type=session.tracker_type,
        source=session.source,
        status=session.status,
        active_tracks=session.active_tracks,
        total_tracks=session.total_tracks,
        fps=session.fps,
    )


@router.get("/sessions")
async def list_sessions():
    return {"sessions": tracker_service.list_sessions()}


@router.get("/trackers")
async def list_trackers():
    """List supported tracker types and their availability."""
    return {"trackers": tracker_service.supported_trackers}


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
