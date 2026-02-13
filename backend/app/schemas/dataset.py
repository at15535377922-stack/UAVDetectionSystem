from pydantic import BaseModel
from datetime import datetime


class DatasetCreate(BaseModel):
    name: str
    description: str | None = None
    version: str = "1.0"
    format: str = "yolo"
    num_classes: int = 0
    class_names: list[str] | None = None
    split_ratio: dict | None = None


class DatasetUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    version: str | None = None
    status: str | None = None
    num_images: int | None = None
    num_classes: int | None = None
    class_names: list[str] | None = None


class DatasetResponse(BaseModel):
    id: int
    name: str
    description: str | None = None
    version: str
    format: str
    num_images: int
    num_classes: int
    class_names: dict | None = None
    storage_path: str | None = None
    size_mb: float
    split_ratio: dict | None = None
    status: str
    creator_id: int | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    datasets: list[DatasetResponse]
    total: int


class TrainingJobCreate(BaseModel):
    name: str
    dataset_id: int
    base_model: str = "yolov8n"
    epochs: int = 100
    batch_size: int = 16
    image_size: int = 640
    learning_rate: float = 0.01
    hyperparams: dict | None = None


class TrainingJobResponse(BaseModel):
    id: int
    name: str
    dataset_id: int
    base_model: str
    epochs: int
    batch_size: int
    image_size: int
    learning_rate: float
    hyperparams: dict | None = None
    status: str
    progress: float
    current_epoch: int
    metrics: dict | None = None
    output_model_path: str | None = None
    error_message: str | None = None
    creator_id: int | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class TrainingJobListResponse(BaseModel):
    jobs: list[TrainingJobResponse]
    total: int
