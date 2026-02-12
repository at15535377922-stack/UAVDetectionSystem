"""模型导出工具（ONNX / TensorRT）"""
from pathlib import Path


def export_to_onnx(model_path: str, output_path: str | None = None, img_size: int = 640):
    """将 YOLOv8 模型导出为 ONNX 格式"""
    from ultralytics import YOLO
    model = YOLO(model_path)
    output = output_path or str(Path(model_path).with_suffix(".onnx"))
    model.export(format="onnx", imgsz=img_size)
    print(f"[Export] ONNX model saved to: {output}")
    return output


def export_to_tensorrt(model_path: str, output_path: str | None = None, img_size: int = 640, half: bool = True):
    """将 YOLOv8 模型导出为 TensorRT 格式"""
    from ultralytics import YOLO
    model = YOLO(model_path)
    output = output_path or str(Path(model_path).with_suffix(".engine"))
    model.export(format="engine", imgsz=img_size, half=half)
    print(f"[Export] TensorRT engine saved to: {output}")
    return output


if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python export.py <model_path> [onnx|tensorrt]")
        sys.exit(1)

    model = sys.argv[1]
    fmt = sys.argv[2] if len(sys.argv) > 2 else "onnx"

    if fmt == "onnx":
        export_to_onnx(model)
    elif fmt == "tensorrt":
        export_to_tensorrt(model)
    else:
        print(f"Unknown format: {fmt}")
