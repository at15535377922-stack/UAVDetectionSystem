"""任务模型"""
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Mission(Base):
    __tablename__ = "missions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / running / completed / failed
    mission_type: Mapped[str] = mapped_column(String(50), default="inspection")  # inspection / patrol / survey
    device_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("devices.id"), nullable=True)
    creator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    waypoints: Mapped[list | None] = mapped_column(JSON, nullable=True)
    algorithm: Mapped[str | None] = mapped_column(String(50), nullable=True)
    total_distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
