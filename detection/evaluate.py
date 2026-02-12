"""模型评估脚本"""
from ultralytics import YOLO


def evaluate(
    model_path: str = "yolov8n.pt",
    data_yaml: str = "data.yaml",
    img_size: int = 640,
):
    """评估模型性能（mAP, Precision, Recall）"""
    model = YOLO(model_path)
    metrics = model.val(data=data_yaml, imgsz=img_size)
    print(f"mAP@0.5     : {metrics.box.map50:.4f}")
    print(f"mAP@0.5:0.95: {metrics.box.map:.4f}")
    print(f"Precision    : {metrics.box.mp:.4f}")
    print(f"Recall       : {metrics.box.mr:.4f}")
    return metrics


if __name__ == "__main__":
    evaluate()
