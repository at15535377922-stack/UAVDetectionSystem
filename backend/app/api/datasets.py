"""Dataset management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.dataset import Dataset
from app.schemas.dataset import (
    DatasetCreate, DatasetUpdate, DatasetResponse,
    DatasetListResponse,
)

router = APIRouter()


@router.get("/", response_model=DatasetListResponse)
async def list_datasets(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Dataset).order_by(Dataset.created_at.desc())
    if status_filter:
        query = query.where(Dataset.status == status_filter)

    count_query = select(func.count()).select_from(Dataset)
    if status_filter:
        count_query = count_query.where(Dataset.status == status_filter)
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    datasets = result.scalars().all()
    return DatasetListResponse(datasets=datasets, total=total)


@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    data: DatasetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    dataset = Dataset(
        name=data.name,
        description=data.description,
        version=data.version,
        format=data.format,
        num_classes=data.num_classes,
        class_names={"names": data.class_names} if data.class_names else None,
        split_ratio=data.split_ratio or {"train": 0.8, "val": 0.1, "test": 0.1},
        creator_id=current_user.id,
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    return dataset


@router.put("/{dataset_id}", response_model=DatasetResponse)
async def update_dataset(
    dataset_id: int,
    data: DatasetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")

    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "class_names" and value is not None:
            setattr(dataset, field, {"names": value})
        else:
            setattr(dataset, field, value)

    await db.commit()
    await db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")
    await db.delete(dataset)
    await db.commit()


@router.post("/{dataset_id}/upload", response_model=DatasetResponse)
async def upload_images(
    dataset_id: int,
    files: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload images to a dataset (placeholder — saves count only)."""
    result = await db.execute(select(Dataset).where(Dataset.id == dataset_id))
    dataset = result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="数据集不存在")

    # In production: save files to MinIO, update storage_path
    total_size = 0
    for f in files:
        content = await f.read()
        total_size += len(content)

    dataset.num_images += len(files)
    dataset.size_mb = round(dataset.size_mb + total_size / (1024 * 1024), 2)
    dataset.status = "ready" if dataset.num_images > 0 else "draft"

    await db.commit()
    await db.refresh(dataset)
    return dataset
