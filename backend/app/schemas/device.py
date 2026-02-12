from pydantic import BaseModel
from datetime import datetime


class DeviceBase(BaseModel):
    name: str
    device_type: str = "quadcopter"
    serial_number: str


class DeviceCreate(DeviceBase):
    pass


class DeviceUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None
    battery: float | None = None


class DeviceResponse(DeviceBase):
    id: int
    status: str
    latitude: float | None = None
    longitude: float | None = None
    altitude: float | None = None
    battery: float | None = None
    owner_id: int | None = None
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
