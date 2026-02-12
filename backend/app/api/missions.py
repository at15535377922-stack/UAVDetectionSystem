from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.mission import Mission
from app.schemas.mission import MissionCreate, MissionUpdate, MissionResponse, MissionListResponse

router = APIRouter()


@router.get("/", response_model=MissionListResponse)
async def list_missions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
):
    query = select(Mission).order_by(Mission.created_at.desc())
    if status_filter:
        query = query.where(Mission.status == status_filter)

    # Total count
    count_query = select(func.count()).select_from(Mission)
    if status_filter:
        count_query = count_query.where(Mission.status == status_filter)
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.offset(skip).limit(limit))
    missions = result.scalars().all()
    return MissionListResponse(missions=missions, total=total)


@router.post("/", response_model=MissionResponse, status_code=status.HTTP_201_CREATED)
async def create_mission(
    data: MissionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    mission = Mission(
        name=data.name,
        description=data.description,
        mission_type=data.mission_type,
        device_id=data.device_id,
        creator_id=current_user.id,
        waypoints=data.waypoints,
        algorithm=data.algorithm,
    )
    db.add(mission)
    await db.commit()
    await db.refresh(mission)
    return mission


@router.get("/{mission_id}", response_model=MissionResponse)
async def get_mission(mission_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="任务不存在")
    return mission


@router.put("/{mission_id}", response_model=MissionResponse)
async def update_mission(
    mission_id: int,
    data: MissionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="任务不存在")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(mission, field, value)

    await db.commit()
    await db.refresh(mission)
    return mission


@router.post("/{mission_id}/start", response_model=MissionResponse)
async def start_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="任务不存在")
    if mission.status not in ("pending", "paused"):
        raise HTTPException(status_code=400, detail=f"任务状态为 {mission.status}，无法启动")

    mission.status = "running"
    mission.started_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(mission)
    return mission


@router.post("/{mission_id}/stop", response_model=MissionResponse)
async def stop_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="任务不存在")
    if mission.status != "running":
        raise HTTPException(status_code=400, detail="任务未在运行中")

    mission.status = "completed"
    mission.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(mission)
    return mission


@router.delete("/{mission_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mission(
    mission_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Mission).where(Mission.id == mission_id))
    mission = result.scalar_one_or_none()
    if not mission:
        raise HTTPException(status_code=404, detail="任务不存在")
    await db.delete(mission)
    await db.commit()
