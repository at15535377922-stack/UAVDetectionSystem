"""YOLOv8 模型训练脚本"""
from ultralytics import YOLO


def train(
    model_name: str = "yolov8n.pt",
    data_yaml: str = "data.yaml",
    epochs: int = 100,
    img_size: int = 640,
    batch_size: int = 16,
    project: str = "runs/train",
    name: str = "exp",
):
    """训练 YOLOv8 模型"""
    model = YOLO(model_name)
    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=img_size,
        batch=batch_size,
        project=project,
        name=name,
        patience=20,
        save=True,
        plots=True,
    )
    return results


if __name__ == "__main__":
    train()
