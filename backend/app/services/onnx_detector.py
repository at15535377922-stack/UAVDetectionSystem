"""
ONNX Runtime Detection Service.

Provides accelerated inference using ONNX Runtime when .onnx model files
are available, with automatic fallback to the standard detector service.
"""

import logging
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# Try to import numpy and onnxruntime (both optional)
try:
    import numpy as np
    _HAS_NUMPY = True
except ImportError:
    np = None  # type: ignore
    _HAS_NUMPY = False
    logger.warning("numpy not installed — ONNX inference unavailable")

try:
    import onnxruntime as ort
    _HAS_ORT = True and _HAS_NUMPY
    _ORT_PROVIDERS = ort.get_available_providers()
    logger.info("ONNX Runtime available — providers: %s", _ORT_PROVIDERS)
except ImportError:
    _HAS_ORT = False
    _ORT_PROVIDERS = []
    if _HAS_NUMPY:
        logger.warning("ONNX Runtime not installed — ONNX inference unavailable")

WEIGHTS_DIR = Path(__file__).resolve().parent.parent.parent / "weights"

# Default YOLO class names (COCO-based UAV detection)
DEFAULT_CLASS_NAMES = {
    0: "drone", 1: "bird", 2: "airplane",
    3: "helicopter", 4: "uav", 5: "person",
    6: "car", 7: "truck",
}


def _preprocess_image(image_bytes: bytes, input_size: int = 640) -> np.ndarray:
    """Preprocess image bytes to ONNX input tensor [1, 3, H, W] float32."""
    try:
        from PIL import Image
        import io
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        img = img.resize((input_size, input_size))
        arr = np.array(img, dtype=np.float32) / 255.0
        # HWC -> CHW -> NCHW
        arr = arr.transpose(2, 0, 1)[np.newaxis, ...]
        return arr
    except ImportError:
        logger.warning("Pillow not installed, cannot preprocess image for ONNX")
        return np.zeros((1, 3, input_size, input_size), dtype=np.float32)


def _postprocess_yolo(
    outputs: list[np.ndarray],
    confidence: float = 0.5,
    input_size: int = 640,
    class_names: dict[int, str] | None = None,
    orig_size: tuple[int, int] | None = None,
) -> list[dict]:
    """
    Post-process YOLO ONNX output to detection list.

    Supports YOLOv8/v11 output format: [1, num_classes+4, num_boxes]
    orig_size: (width, height) of original image — used to rescale boxes.
    """
    if class_names is None:
        class_names = DEFAULT_CLASS_NAMES

    output = outputs[0]  # shape: [1, 4+num_classes, num_boxes]

    if output.ndim == 3:
        output = output[0]  # [4+num_classes, num_boxes]

    # YOLOv8 format: rows = [x_center, y_center, w, h, class_scores...]
    if output.shape[0] < output.shape[1]:
        output = output.T  # -> [num_boxes, 4+num_classes]

    # Scale factors from input_size back to original image
    if orig_size:
        sx = orig_size[0] / input_size
        sy = orig_size[1] / input_size
    else:
        sx = sy = 1.0

    detections = []
    for row in output:
        x_c, y_c, w, h = row[:4]
        class_scores = row[4:]
        class_id = int(np.argmax(class_scores))
        conf = float(class_scores[class_id])

        if conf < confidence:
            continue

        x1 = (x_c - w / 2) * sx
        y1 = (y_c - h / 2) * sy
        x2 = (x_c + w / 2) * sx
        y2 = (y_c + h / 2) * sy

        detections.append({
            "x1": round(float(x1), 1),
            "y1": round(float(y1), 1),
            "x2": round(float(x2), 1),
            "y2": round(float(y2), 1),
            "confidence": round(conf, 4),
            "class_name": class_names.get(class_id, f"class_{class_id}"),
            "class_id": class_id,
        })

    # NMS (simple greedy)
    detections.sort(key=lambda d: d["confidence"], reverse=True)
    keep = []
    for det in detections:
        overlap = False
        for kept in keep:
            iou = _compute_iou(det, kept)
            if iou > 0.45:
                overlap = True
                break
        if not overlap:
            keep.append(det)

    return keep[:100]  # max 100 detections


def _compute_iou(a: dict, b: dict) -> float:
    """Compute IoU between two detection boxes."""
    x1 = max(a["x1"], b["x1"])
    y1 = max(a["y1"], b["y1"])
    x2 = min(a["x2"], b["x2"])
    y2 = min(a["y2"], b["y2"])
    inter = max(0, x2 - x1) * max(0, y2 - y1)
    area_a = (a["x2"] - a["x1"]) * (a["y2"] - a["y1"])
    area_b = (b["x2"] - b["x1"]) * (b["y2"] - b["y1"])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class OnnxDetectorService:
    """ONNX Runtime based detection service."""

    def __init__(self):
        self._sessions: dict[str, Any] = {}

    def _get_session(self, model_name: str) -> Any:
        if model_name in self._sessions:
            return self._sessions[model_name]

        if not _HAS_ORT:
            return None

        onnx_path = WEIGHTS_DIR / f"{model_name}.onnx"
        if not onnx_path.exists():
            logger.debug("ONNX model not found: %s", onnx_path)
            return None

        # Prefer CUDA > TensorRT > CPU
        providers = []
        if "TensorrtExecutionProvider" in _ORT_PROVIDERS:
            providers.append("TensorrtExecutionProvider")
        if "CUDAExecutionProvider" in _ORT_PROVIDERS:
            providers.append("CUDAExecutionProvider")
        providers.append("CPUExecutionProvider")

        logger.info("Loading ONNX model: %s (providers: %s)", onnx_path, providers)
        session = ort.InferenceSession(str(onnx_path), providers=providers)
        self._sessions[model_name] = session
        return session

    def detect_image(
        self,
        image_bytes: bytes,
        model_name: str = "yolov8n",
        confidence: float = 0.5,
        image_size: tuple[int, int] | None = None,
    ) -> list[dict] | None:
        """
        Run ONNX inference. Returns detections list, or None if ONNX
        model is not available (caller should fallback).

        image_size: (width, height) of original image for coordinate rescaling.
        """
        session = self._get_session(model_name)
        if session is None:
            return None

        # Read original image size if not provided
        orig_size = image_size
        if orig_size is None:
            try:
                from PIL import Image
                import io
                img = Image.open(io.BytesIO(image_bytes))
                orig_size = img.size  # (width, height)
            except Exception:
                orig_size = None

        start = time.perf_counter()

        # Get input shape from model
        input_meta = session.get_inputs()[0]
        input_size = input_meta.shape[-1] if isinstance(input_meta.shape[-1], int) else 640

        tensor = _preprocess_image(image_bytes, input_size)
        outputs = session.run(None, {input_meta.name: tensor})
        detections = _postprocess_yolo(outputs, confidence, input_size, orig_size=orig_size)

        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "ONNX detection: model=%s, objects=%d, time=%.1fms",
            model_name, len(detections), elapsed_ms,
        )
        return detections

    @property
    def available_onnx_models(self) -> list[str]:
        """List model names that have .onnx files available."""
        if not WEIGHTS_DIR.exists():
            return []
        return [p.stem for p in WEIGHTS_DIR.glob("*.onnx")]

    @property
    def is_available(self) -> bool:
        return _HAS_ORT

    @property
    def providers(self) -> list[str]:
        return _ORT_PROVIDERS


# Singleton
onnx_detector_service = OnnxDetectorService()
