"""Alert management API endpoints."""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.alert import AlertRule, Alert
from app.schemas.alert import (
    AlertRuleCreate, AlertRuleUpdate, AlertRuleResponse, AlertRuleListResponse,
    AlertCreate, AlertResponse, AlertListResponse, AlertStats,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Alert Rules ──────────────────────────────────────────────

@router.get("/rules", response_model=AlertRuleListResponse)
async def list_rules(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    total = (await db.execute(select(func.count()).select_from(AlertRule))).scalar() or 0
    result = await db.execute(
        select(AlertRule).order_by(AlertRule.created_at.desc()).offset(skip).limit(limit)
    )
    return AlertRuleListResponse(rules=result.scalars().all(), total=total)


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_rule(
    data: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.trigger_type not in ("detection", "geofence", "battery", "signal", "custom"):
        raise HTTPException(status_code=400, detail=f"不支持的触发类型: {data.trigger_type}")
    rule = AlertRule(
        name=data.name,
        description=data.description,
        enabled=data.enabled,
        severity=data.severity,
        trigger_type=data.trigger_type,
        conditions=data.conditions,
        cooldown_seconds=data.cooldown_seconds,
        creator_id=current_user.id,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    logger.info("Alert rule created: id=%d, type=%s", rule.id, rule.trigger_type)
    return rule


@router.put("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_rule(
    rule_id: int,
    data: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="告警规则不存在")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.commit()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rule(
    rule_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="告警规则不存在")
    await db.delete(rule)
    await db.commit()


# ── Alerts ───────────────────────────────────────────────────

@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    severity: str | None = Query(None),
    acknowledged: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = select(Alert).order_by(Alert.created_at.desc())
    count_query = select(func.count()).select_from(Alert)

    if severity:
        query = query.where(Alert.severity == severity)
        count_query = count_query.where(Alert.severity == severity)
    if acknowledged is not None:
        query = query.where(Alert.acknowledged == acknowledged)
        count_query = count_query.where(Alert.acknowledged == acknowledged)

    total = (await db.execute(count_query)).scalar() or 0
    result = await db.execute(query.offset(skip).limit(limit))
    return AlertListResponse(alerts=result.scalars().all(), total=total)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    data: AlertCreate,
    db: AsyncSession = Depends(get_db),
):
    alert = Alert(
        rule_id=data.rule_id,
        severity=data.severity,
        title=data.title,
        message=data.message,
        source=data.source,
        device_id=data.device_id,
        mission_id=data.mission_id,
        metadata_json=data.metadata_json,
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    logger.info("Alert created: id=%d, severity=%s, title=%s", alert.id, alert.severity, alert.title)
    return alert


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    if alert.acknowledged:
        raise HTTPException(status_code=400, detail="告警已确认")
    alert.acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    if alert.resolved:
        raise HTTPException(status_code=400, detail="告警已解决")
    alert.resolved = True
    alert.resolved_at = datetime.now(timezone.utc)
    if not alert.acknowledged:
        alert.acknowledged = True
        alert.acknowledged_by = current_user.id
        alert.acknowledged_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="告警不存在")
    await db.delete(alert)
    await db.commit()


@router.get("/stats", response_model=AlertStats)
async def alert_stats(db: AsyncSession = Depends(get_db)):
    total = (await db.execute(select(func.count()).select_from(Alert))).scalar() or 0
    unack = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.acknowledged == False)
    )).scalar() or 0
    critical = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.severity == "critical")
    )).scalar() or 0
    warning = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.severity == "warning")
    )).scalar() or 0
    info = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.severity == "info")
    )).scalar() or 0
    resolved = (await db.execute(
        select(func.count()).select_from(Alert).where(Alert.resolved == True)
    )).scalar() or 0
    return AlertStats(
        total=total, unacknowledged=unack,
        critical=critical, warning=warning, info=info, resolved=resolved,
    )
