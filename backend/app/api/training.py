"""Training job management API endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset, TrainingJob
from app.schemas.dataset import (
    TrainingJobCreate, TrainingJobResponse, TrainingJobListResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/", response_model=TrainingJobListResponse)
async def list_training_jobs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(TrainingJob).order_by(TrainingJob.created_at.desc())
    if status_filter:
        query = query.where(TrainingJob.status == status_filter)

    count_query = select(func.count()).select_from(TrainingJob)
    if status_filter:
        count_query = count_query.where(TrainingJob.status == status_filter)
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    jobs = result.scalars().all()
    return TrainingJobListResponse(jobs=jobs, total=total)


@router.post("/", response_model=TrainingJobResponse, status_code=status.HTTP_201_CREATED)
async def create_training_job(
    data: TrainingJobCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify dataset exists
    ds_result = await db.execute(select(Dataset).where(Dataset.id == data.dataset_id))
    dataset = ds_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="数据集未就绪，请先上传数据")

    job = TrainingJob(
        name=data.name,
        dataset_id=data.dataset_id,
        base_model=data.base_model,
        epochs=data.epochs,
        batch_size=data.batch_size,
        image_size=data.image_size,
        learning_rate=data.learning_rate,
        hyperparams=data.hyperparams,
        creator_id=current_user.id,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    logger.info("Training job created: id=%d, model=%s, dataset=%d", job.id, job.base_model, job.dataset_id)
    return job


@router.get("/{job_id}", response_model=TrainingJobResponse)
async def get_training_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    return job


@router.post("/{job_id}/start", response_model=TrainingJobResponse)
async def start_training_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    if job.status not in ("pending", "failed"):
        raise HTTPException(status_code=400, detail=f"任务状态为 {job.status}，无法启动")

    # In production: launch actual training via Celery/subprocess
    # For now: simulate start
    job.status = "running"
    job.started_at = datetime.now(timezone.utc)
    job.progress = 0.0
    job.current_epoch = 0
    job.error_message = None

    await db.commit()
    await db.refresh(job)
    logger.info("Training job started: id=%d", job.id)
    return job


@router.post("/{job_id}/stop", response_model=TrainingJobResponse)
async def stop_training_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    if job.status != "running":
        raise HTTPException(status_code=400, detail="任务未在运行中")

    job.status = "failed"
    job.error_message = "用户手动停止"
    job.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(job)
    logger.info("Training job stopped: id=%d", job.id)
    return job


@router.post("/{job_id}/simulate-progress", response_model=TrainingJobResponse)
async def simulate_progress(
    job_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Dev-only: simulate training progress by advancing epochs."""
    result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    if job.status != "running":
        raise HTTPException(status_code=400, detail="任务未在运行中")

    import random
    job.current_epoch = min(job.current_epoch + max(1, job.epochs // 10), job.epochs)
    job.progress = round((job.current_epoch / job.epochs) * 100, 1)

    # Simulate improving metrics
    base_map = 0.3 + (job.progress / 100) * 0.55
    job.metrics = {
        "mAP50": round(min(base_map + random.uniform(0, 0.05), 0.95), 4),
        "mAP50-95": round(min(base_map * 0.7 + random.uniform(0, 0.03), 0.75), 4),
        "precision": round(min(base_map + random.uniform(0, 0.08), 0.96), 4),
        "recall": round(min(base_map - 0.02 + random.uniform(0, 0.06), 0.93), 4),
        "loss": round(max(0.01, 1.5 - job.progress / 100 * 1.4 + random.uniform(-0.05, 0.05)), 4),
    }

    if job.current_epoch >= job.epochs:
        job.status = "completed"
        job.completed_at = datetime.now(timezone.utc)
        job.output_model_path = f"weights/train_{job.id}_best.pt"

    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_training_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(TrainingJob).where(TrainingJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="训练任务不存在")
    if job.status == "running":
        raise HTTPException(status_code=400, detail="运行中的任务无法删除")
    await db.delete(job)
    await db.commit()
