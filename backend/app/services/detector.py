"""
YOLO Detection Service Layer.

Supports real Ultralytics YOLO models when available,
with automatic fallback to mock detections for development.
"""

import logging
import random
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Try to import ultralytics; if unavailable, use mock mode
try:
    from ultralytics import YOLO
    _HAS_ULTRALYTICS = True
    logger.info("Ultralytics YOLO available — real inference enabled")
except ImportError:
    _HAS_ULTRALYTICS = False
    logger.warning("Ultralytics not installed — using mock detection mode")


# Default model weights directory
WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"


class DetectorService:
    """Manages YOLO model loading and inference."""

    def __init__(self):
        self._models: dict[str, Any] = {}

    def _get_model(self, model_name: str) -> Any:
        """Load or retrieve a cached YOLO model."""
        if model_name in self._models:
            return self._models[model_name]

        if not _HAS_ULTRALYTICS:
            return None

        # Try local weights first, then Ultralytics hub download
        weight_path = WEIGHTS_DIR / f"{model_name}.pt"
        if weight_path.exists():
            logger.info("Loading model from local weights: %s", weight_path)
            model = YOLO(str(weight_path))
        else:
            logger.info("Downloading model from Ultralytics hub: %s", model_name)
            model = YOLO(f"{model_name}.pt")

        self._models[model_name] = model
        return model

    def detect_image(
        self,
        image_bytes: bytes,
        model_name: str = "yolov8n",
        confidence: float = 0.5,
    ) -> list[dict]:
        """
        Run detection on an image.

        Priority: ONNX Runtime → Ultralytics YOLO → Mock fallback.
        Returns list of dicts with keys:
        x1, y1, x2, y2, confidence, class_name, class_id
        """
        # Try ONNX first (fastest)
        from app.services.onnx_detector import onnx_detector_service
        onnx_result = onnx_detector_service.detect_image(image_bytes, model_name, confidence)
        if onnx_result is not None:
            return onnx_result

        # Fall back to Ultralytics
        model = self._get_model(model_name)

        if model is None:
            # Mock mode
            return self._mock_detect(model_name, confidence)

        # Real inference
        import tempfile, os
        tmp = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        try:
            tmp.write(image_bytes)
            tmp.flush()
            tmp.close()

            results = model.predict(
                source=tmp.name,
                conf=confidence,
                verbose=False,
            )

            detections = []
            for result in results:
                for box in result.boxes:
                    xyxy = box.xyxy[0].tolist()
                    detections.append({
                        "x1": round(xyxy[0], 1),
                        "y1": round(xyxy[1], 1),
                        "x2": round(xyxy[2], 1),
                        "y2": round(xyxy[3], 1),
                        "confidence": round(float(box.conf[0]), 4),
                        "class_name": result.names[int(box.cls[0])],
                        "class_id": int(box.cls[0]),
                    })

            logger.info(
                "Detection complete: model=%s, objects=%d",
                model_name, len(detections),
            )
            return detections
        finally:
            os.unlink(tmp.name)

    @staticmethod
    def _mock_detect(model_name: str, confidence: float) -> list[dict]:
        """Generate mock detection results for development."""
        classes = [
            ("drone", 0), ("bird", 1), ("airplane", 2),
            ("helicopter", 3), ("uav", 4),
        ]
        n = random.randint(1, 4)
        detections = []
        for _ in range(n):
            cls_name, cls_id = random.choice(classes)
            conf = round(random.uniform(max(confidence, 0.5), 0.99), 4)
            x1 = random.uniform(50, 400)
            y1 = random.uniform(50, 300)
            w = random.uniform(60, 200)
            h = random.uniform(60, 200)
            detections.append({
                "x1": round(x1, 1),
                "y1": round(y1, 1),
                "x2": round(x1 + w, 1),
                "y2": round(y1 + h, 1),
                "confidence": conf,
                "class_name": cls_name,
                "class_id": cls_id,
            })
        return detections

    @property
    def available_models(self) -> list[dict]:
        """List available model configurations."""
        models = [
            {"id": "yolov8n", "name": "YOLOv8 Nano", "params": "3.2M", "speed": "fast"},
            {"id": "yolov8s", "name": "YOLOv8 Small", "params": "11.2M", "speed": "medium"},
            {"id": "yolov8m", "name": "YOLOv8 Medium", "params": "25.9M", "speed": "slow"},
            {"id": "yolov11n", "name": "YOLOv11 Nano", "params": "2.6M", "speed": "fast"},
            {"id": "yolov11s", "name": "YOLOv11 Small", "params": "9.4M", "speed": "medium"},
        ]
        for m in models:
            weight_path = WEIGHTS_DIR / f"{m['id']}.pt"
            m["weights_available"] = weight_path.exists()
            m["loaded"] = m["id"] in self._models
        return models

    @property
    def is_real_mode(self) -> bool:
        return _HAS_ULTRALYTICS


# Singleton instance
detector_service = DetectorService()
