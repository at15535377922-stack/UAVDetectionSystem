"""数据集与训练任务模型"""
from datetime import datetime, timezone

from sqlalchemy import String, Float, DateTime, Integer, ForeignKey, JSON, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Dataset(Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    version: Mapped[str] = mapped_column(String(20), default="1.0")
    format: Mapped[str] = mapped_column(String(50), default="yolo")  # yolo / coco / voc
    num_images: Mapped[int] = mapped_column(Integer, default=0)
    num_classes: Mapped[int] = mapped_column(Integer, default=0)
    class_names: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    size_mb: Mapped[float] = mapped_column(Float, default=0.0)
    split_ratio: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"train": 0.8, "val": 0.1, "test": 0.1}
    creator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft / ready / archived
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class TrainingJob(Base):
    __tablename__ = "training_jobs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200))
    dataset_id: Mapped[int] = mapped_column(Integer, ForeignKey("datasets.id"))
    base_model: Mapped[str] = mapped_column(String(50), default="yolov8n")
    epochs: Mapped[int] = mapped_column(Integer, default=100)
    batch_size: Mapped[int] = mapped_column(Integer, default=16)
    image_size: Mapped[int] = mapped_column(Integer, default=640)
    learning_rate: Mapped[float] = mapped_column(Float, default=0.01)
    hyperparams: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending / running / completed / failed
    progress: Mapped[float] = mapped_column(Float, default=0.0)  # 0-100
    current_epoch: Mapped[int] = mapped_column(Integer, default=0)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # {"mAP50": 0.85, "mAP50-95": 0.62, ...}
    output_model_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    creator_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
