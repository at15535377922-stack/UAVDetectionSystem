from pydantic import BaseModel
from datetime import datetime


class AlertRuleCreate(BaseModel):
    name: str
    description: str | None = None
    enabled: bool = True
    severity: str = "warning"
    trigger_type: str
    conditions: dict | None = None
    cooldown_seconds: int = 60


class AlertRuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    enabled: bool | None = None
    severity: str | None = None
    conditions: dict | None = None
    cooldown_seconds: int | None = None


class AlertRuleResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    enabled: bool
    severity: str
    trigger_type: str
    conditions: dict | None = None
    cooldown_seconds: int
    creator_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AlertRuleListResponse(BaseModel):
    rules: list[AlertRuleResponse]
    total: int


class AlertCreate(BaseModel):
    rule_id: int | None = None
    severity: str = "warning"
    title: str
    message: str | None = None
    source: str = "manual"
    device_id: int | None = None
    mission_id: int | None = None
    metadata_json: dict | None = None


class AlertResponse(BaseModel):
    id: int
    rule_id: int | None = None
    severity: str
    title: str
    message: str | None = None
    source: str
    device_id: int | None = None
    mission_id: int | None = None
    metadata_json: dict | None = None
    acknowledged: bool
    acknowledged_by: int | None = None
    acknowledged_at: datetime | None = None
    resolved: bool
    resolved_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


class AlertStats(BaseModel):
    total: int
    unacknowledged: int
    critical: int
    warning: int
    info: int
    resolved: int
