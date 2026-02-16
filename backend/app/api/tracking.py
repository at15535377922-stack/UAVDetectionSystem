import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from PIL import Image
import io

from app.core.database import get_db
from app.models.detection_result import TrackingResult
from app.schemas.tracking import TrackResponse, TrackingSession, TrackFrameResponse
from app.services.tracker import tracker_service
from app.services.detector import detector_service

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
        is_mock=getattr(session, 'is_mock', True),
    )


@router.post("/stop", response_model=TrackingSession)
async def stop_tracking(
    session_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    session = tracker_service.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="跟踪会话不存在")

    # Save track summaries to DB before stopping
    summaries = session.get_track_summaries()
    for s in summaries:
        tr = TrackingResult(
            tracker_type=session.tracker_type,
            track_id=s["track_id"],
            class_name=s["class_name"],
            trajectory=s["trajectory"],
            total_frames=s["total_frames"],
        )
        db.add(tr)
    if summaries:
        await db.commit()

    tracker_service.stop_session(session_id)

    return TrackingSession(
        session_id=session.session_id,
        tracker_type=session.tracker_type,
        source=session.source,
        status=session.status,
        active_tracks=session.active_tracks,
        total_tracks=session.total_tracks,
        fps=session.fps,
        is_mock=getattr(session, 'is_mock', True),
    )


@router.get("/sessions")
async def list_sessions():
    return {"sessions": tracker_service.list_sessions()}


@router.get("/trackers")
async def list_trackers():
    """List supported tracker types and their availability."""
    return {"trackers": tracker_service.supported_trackers}


@router.post("/frame", response_model=TrackFrameResponse)
async def track_frame(
    session_id: str = Query(...),
    model_name: str = Query("yolov8n"),
    confidence: float = Query(0.5, ge=0.0, le=1.0),
    file: UploadFile = File(...),
):
    """Accept a video frame, run detection, then tracking. Returns tracked objects."""
    session = tracker_service.get_session(session_id)
    if not session or session.status != "running":
        raise HTTPException(status_code=404, detail="跟踪会话不存在或已停止")

    t0 = time.perf_counter()
    image_bytes = await file.read()

    # Get image dimensions
    try:
        img = Image.open(io.BytesIO(image_bytes))
        img_w, img_h = img.size
    except Exception:
        img_w, img_h = 640, 480

    # Run detection
    detections = detector_service.detect_image(
        image_bytes, model_name, confidence, image_size=(img_w, img_h)
    )

    # Run tracking
    tracked = session.update(detections)

    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    return TrackFrameResponse(
        session_id=session_id,
        tracked_objects=tracked,
        active_tracks=session.active_tracks,
        total_tracks=session.total_tracks,
        inference_time_ms=inference_ms,
    )


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
