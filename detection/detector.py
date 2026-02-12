"""目标检测器统一接口"""
from __future__ import annotations

import time
from pathlib import Path
from dataclasses import dataclass, field

import cv2
import numpy as np


@dataclass
class Detection:
    """单个检测结果"""
    class_id: int
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2]


@dataclass
class DetectionResult:
    """一帧的检测结果"""
    detections: list[Detection] = field(default_factory=list)
    inference_time_ms: float = 0.0
    image_shape: tuple[int, int] = (0, 0)


class Detector:
    """YOLOv8/v11 检测器封装"""

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        conf_threshold: float = 0.5,
        iou_threshold: float = 0.45,
        img_size: int = 640,
        device: str = "auto",
    ):
        self.model_path = model_path
        self.conf_threshold = conf_threshold
        self.iou_threshold = iou_threshold
        self.img_size = img_size
        self.device = device
        self.model = None
        self._load_model()

    def _load_model(self):
        """加载模型"""
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            print(f"[Detector] Model loaded: {self.model_path}")
        except Exception as e:
            print(f"[Detector] Failed to load model: {e}")
            self.model = None

    def detect(self, image: np.ndarray) -> DetectionResult:
        """对单张图片进行检测"""
        if self.model is None:
            return DetectionResult(image_shape=image.shape[:2])

        start = time.perf_counter()
        results = self.model.predict(
            source=image,
            conf=self.conf_threshold,
            iou=self.iou_threshold,
            imgsz=self.img_size,
            verbose=False,
        )
        elapsed = (time.perf_counter() - start) * 1000

        detections = []
        if results and len(results) > 0:
            result = results[0]
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = result.names[cls_id]
                conf = float(box.conf[0])
                xyxy = box.xyxy[0].tolist()
                detections.append(Detection(
                    class_id=cls_id,
                    class_name=cls_name,
                    confidence=conf,
                    bbox=xyxy,
                ))

        return DetectionResult(
            detections=detections,
            inference_time_ms=elapsed,
            image_shape=image.shape[:2],
        )

    def detect_image_file(self, image_path: str) -> DetectionResult:
        """检测图片文件"""
        image = cv2.imread(image_path)
        if image is None:
            raise FileNotFoundError(f"Cannot read image: {image_path}")
        return self.detect(image)

    def draw_detections(self, image: np.ndarray, result: DetectionResult) -> np.ndarray:
        """在图片上绘制检测结果"""
        img = image.copy()
        for det in result.detections:
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            color = (0, 255, 0)
            cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
            label = f"{det.class_name} {det.confidence:.2f}"
            cv2.putText(img, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        return img
