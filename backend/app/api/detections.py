import io
import time
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.detection_result import DetectionResult
from app.schemas.detection import DetectionResultResponse, DetectionStats
from app.services.detector import detector_service

router = APIRouter()


def _read_image_size(image_bytes: bytes) -> tuple[int, int]:
    """Try to read (width, height) from image bytes using PIL, fallback to (640, 480)."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(image_bytes))
        return img.size  # (width, height)
    except Exception:
        return (640, 480)


@router.post("/image", response_model=DetectionResultResponse)
async def detect_image(
    file: UploadFile = File(...),
    model_name: str = Query("yolov8n"),
    confidence: float = Query(0.5, ge=0.0, le=1.0),
    mission_id: int | None = Query(None),
    device_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # Save uploaded file (placeholder — in production, save to MinIO)
    file_id = uuid.uuid4().hex[:12]
    image_path = f"uploads/detections/{file_id}_{file.filename}"

    # Read image bytes and dimensions
    image_bytes = await file.read()
    img_w, img_h = _read_image_size(image_bytes)

    # Run YOLO inference (real model or mock fallback)
    t0 = time.perf_counter()
    detections_list = detector_service.detect_image(
        image_bytes, model_name, confidence, image_size=(img_w, img_h),
    )
    inference_ms = round((time.perf_counter() - t0) * 1000, 1)

    result = DetectionResult(
        mission_id=mission_id,
        device_id=device_id,
        image_path=image_path,
        model_name=model_name,
        detections=detections_list,
        detection_count=len(detections_list),
        inference_time_ms=inference_ms,
    )
    db.add(result)
    await db.commit()
    await db.refresh(result)
    return result


@router.post("/stream/start")
async def start_stream_detection(
    source: str = Query("rtsp://localhost:8554/stream"),
    model_name: str = Query("yolov8n"),
    confidence: float = Query(0.5, ge=0.0, le=1.0),
):
    # TODO: Start real-time detection pipeline via background task
    session_id = uuid.uuid4().hex[:8]
    return {
        "session_id": session_id,
        "source": source,
        "model_name": model_name,
        "confidence": confidence,
        "status": "started",
        "message": "实时检测流已启动（WebSocket 推送检测结果）",
        "ws_url": f"/api/ws/detection/{session_id}",
    }


@router.post("/stream/stop")
async def stop_stream_detection(session_id: str = Query(...)):
    # TODO: Stop the detection pipeline for this session
    return {"session_id": session_id, "status": "stopped", "message": "实时检测流已停止"}


@router.get("/models")
async def list_models():
    """List available detection models and their status."""
    return {
        "models": detector_service.available_models,
        "mode": "real" if detector_service.is_real_mode else "mock",
    }


@router.get("/results", response_model=list[DetectionResultResponse])
async def list_detection_results(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    mission_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(DetectionResult).order_by(DetectionResult.created_at.desc())
    if mission_id is not None:
        query = query.where(DetectionResult.mission_id == mission_id)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/results/{result_id}", response_model=DetectionResultResponse)
async def get_detection_result(result_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DetectionResult).where(DetectionResult.id == result_id))
    det = result.scalar_one_or_none()
    if not det:
        raise HTTPException(status_code=404, detail="检测结果不存在")
    return det


@router.get("/stats", response_model=DetectionStats)
async def get_detection_stats(db: AsyncSession = Depends(get_db)):
    # Total
    total = (await db.execute(select(func.count()).select_from(DetectionResult))).scalar() or 0

    # Today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_count = (await db.execute(
        select(func.count()).select_from(DetectionResult).where(DetectionResult.created_at >= today_start)
    )).scalar() or 0

    # Class distribution (from recent 100 results)
    recent = await db.execute(
        select(DetectionResult).order_by(DetectionResult.created_at.desc()).limit(100)
    )
    class_dist: dict[str, int] = {}
    for r in recent.scalars().all():
        if r.detections:
            for det in r.detections:
                cls = det.get("class_name", "unknown")
                class_dist[cls] = class_dist.get(cls, 0) + 1

    # Recent 7-day trend
    trend = []
    for i in range(6, -1, -1):
        day = today_start - timedelta(days=i)
        next_day = day + timedelta(days=1)
        count = (await db.execute(
            select(func.count()).select_from(DetectionResult)
            .where(DetectionResult.created_at >= day, DetectionResult.created_at < next_day)
        )).scalar() or 0
        trend.append({"date": day.strftime("%m-%d"), "count": count})

    return DetectionStats(
        total_detections=total,
        today_detections=today_count,
        class_distribution=class_dist,
        recent_trend=trend,
    )
