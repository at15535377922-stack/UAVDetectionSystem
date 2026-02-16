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
        image_size: tuple[int, int] | None = None,
    ) -> list[dict]:
        """
        Run detection on an image.

        Priority: ONNX Runtime → Ultralytics YOLO → Mock fallback.
        Returns list of dicts with keys:
        x1, y1, x2, y2, confidence, class_name, class_id

        image_size: (width, height) of the original image, used by mock mode.
        """
        # Try ONNX first (fastest)
        from app.services.onnx_detector import onnx_detector_service
        onnx_result = onnx_detector_service.detect_image(
            image_bytes, model_name, confidence, image_size=image_size,
        )
        if onnx_result is not None:
            return onnx_result

        # Fall back to Ultralytics
        model = self._get_model(model_name)

        if model is None:
            # Mock mode — use actual image dimensions for realistic boxes
            img_w, img_h = image_size or (640, 480)
            return self._mock_detect(model_name, confidence, img_w, img_h)

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
    def _mock_detect(
        model_name: str,
        confidence: float,
        img_w: int = 640,
        img_h: int = 480,
    ) -> list[dict]:
        """Generate mock detection results scaled to actual image size."""
        classes = [
            ("drone", 0), ("bird", 1), ("airplane", 2),
            ("helicopter", 3), ("uav", 4),
        ]
        n = random.randint(1, 4)
        detections = []
        for _ in range(n):
            cls_name, cls_id = random.choice(classes)
            conf = round(random.uniform(max(confidence, 0.5), 0.99), 4)
            # Generate box proportional to actual image dimensions
            box_w = random.uniform(img_w * 0.08, img_w * 0.30)
            box_h = random.uniform(img_h * 0.08, img_h * 0.30)
            x1 = random.uniform(img_w * 0.05, img_w - box_w - img_w * 0.05)
            y1 = random.uniform(img_h * 0.05, img_h - box_h - img_h * 0.05)
            detections.append({
                "x1": round(x1, 1),
                "y1": round(y1, 1),
                "x2": round(x1 + box_w, 1),
                "y2": round(y1 + box_h, 1),
                "confidence": conf,
                "class_name": cls_name,
                "class_id": cls_id,
            })
        return detections

    # Well-known model metadata for display purposes
    _KNOWN_MODELS: dict[str, dict] = {
        "yolov8n": {"name": "YOLOv8 Nano", "params": "3.2M", "speed": "fast"},
        "yolov8s": {"name": "YOLOv8 Small", "params": "11.2M", "speed": "medium"},
        "yolov8m": {"name": "YOLOv8 Medium", "params": "25.9M", "speed": "slow"},
        "yolov8l": {"name": "YOLOv8 Large", "params": "43.7M", "speed": "slow"},
        "yolov8x": {"name": "YOLOv8 XLarge", "params": "68.2M", "speed": "very slow"},
        "yolov5n": {"name": "YOLOv5 Nano", "params": "1.9M", "speed": "fast"},
        "yolov5s": {"name": "YOLOv5 Small", "params": "7.2M", "speed": "medium"},
        "yolov5m": {"name": "YOLOv5 Medium", "params": "21.2M", "speed": "slow"},
        "yolov11n": {"name": "YOLOv11 Nano", "params": "2.6M", "speed": "fast"},
        "yolov11s": {"name": "YOLOv11 Small", "params": "9.4M", "speed": "medium"},
        "yolov11m": {"name": "YOLOv11 Medium", "params": "20.1M", "speed": "slow"},
    }

    @property
    def available_models(self) -> list[dict]:
        """
        Dynamically scan the weights directory for .pt / .onnx files
        and return a list of available models.
        """
        found: dict[str, dict] = {}

        # Scan weights directory
        if WEIGHTS_DIR.exists():
            for f in WEIGHTS_DIR.iterdir():
                if f.suffix in (".pt", ".onnx") and f.stat().st_size > 0:
                    model_id = f.stem  # e.g. "yolov8n" from "yolov8n.pt"
                    if model_id not in found:
                        found[model_id] = {"pt": False, "onnx": False}
                    if f.suffix == ".pt":
                        found[model_id]["pt"] = True
                    else:
                        found[model_id]["onnx"] = True

        # Also check ultralytics cache for downloaded models
        if _HAS_ULTRALYTICS:
            try:
                from ultralytics import YOLO
                cache_dir = Path.home() / ".cache" / "ultralytics"
                # The hub downloads to a predictable location; also check YOLO default
                for search_dir in [cache_dir, Path.home() / "AppData" / "Roaming" / "Ultralytics"]:
                    if search_dir.exists():
                        for f in search_dir.rglob("*.pt"):
                            model_id = f.stem
                            if model_id not in found:
                                found[model_id] = {"pt": True, "onnx": False}
                            else:
                                found[model_id]["pt"] = True
            except Exception:
                pass

        # Also mark already-loaded models
        for model_id in self._models:
            if model_id not in found:
                found[model_id] = {"pt": True, "onnx": False}

        # Build result list
        models = []
        for model_id, avail in sorted(found.items()):
            meta = self._KNOWN_MODELS.get(model_id, {})
            file_size = None
            pt_path = WEIGHTS_DIR / f"{model_id}.pt"
            if pt_path.exists():
                file_size = round(pt_path.stat().st_size / (1024 * 1024), 1)
            models.append({
                "id": model_id,
                "name": meta.get("name", model_id),
                "params": meta.get("params", "—"),
                "speed": meta.get("speed", "—"),
                "weights_available": avail.get("pt", False),
                "onnx_available": avail.get("onnx", False),
                "loaded": model_id in self._models,
                "file_size_mb": file_size,
            })

        # If nothing found, show a hint list of downloadable models
        if not models and _HAS_ULTRALYTICS:
            for mid, meta in list(self._KNOWN_MODELS.items())[:5]:
                models.append({
                    "id": mid,
                    "name": meta["name"],
                    "params": meta["params"],
                    "speed": meta["speed"],
                    "weights_available": False,
                    "onnx_available": False,
                    "loaded": False,
                    "file_size_mb": None,
                })

        return models

    @property
    def is_real_mode(self) -> bool:
        return _HAS_ULTRALYTICS


# Singleton instance
detector_service = DetectorService()
