"""检测结果模型"""
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mission_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("missions.id"), nullable=True)
    device_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("devices.id"), nullable=True)
    image_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    model_name: Mapped[str] = mapped_column(String(100), default="yolov8n")
    detections: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # [{class_name, confidence, bbox}, ...]
    detection_count: Mapped[int] = mapped_column(Integer, default=0)
    inference_time_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class TrackingResult(Base):
    __tablename__ = "tracking_results"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mission_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("missions.id"), nullable=True)
    tracker_type: Mapped[str] = mapped_column(String(50), default="deep_sort")
    track_id: Mapped[int] = mapped_column(Integer)
    class_name: Mapped[str] = mapped_column(String(100))
    trajectory: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # [[x, y], ...]
    total_frames: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
