"""数据集加载与增强工具"""
from pathlib import Path

import cv2
import numpy as np


def create_data_yaml(
    train_path: str,
    val_path: str,
    class_names: list[str],
    output_path: str = "data.yaml",
):
    """生成 YOLO 格式的 data.yaml 配置文件"""
    content = f"""train: {train_path}
val: {val_path}
nc: {len(class_names)}
names: {class_names}
"""
    Path(output_path).write_text(content, encoding="utf-8")
    print(f"[Dataset] data.yaml saved to: {output_path}")


def augment_image(image: np.ndarray, seed: int | None = None) -> np.ndarray:
    """基础数据增强（随机翻转、亮度、对比度）"""
    rng = np.random.default_rng(seed)
    img = image.copy()

    # 随机水平翻转
    if rng.random() > 0.5:
        img = cv2.flip(img, 1)

    # 随机亮度调整
    brightness = rng.uniform(0.7, 1.3)
    img = np.clip(img * brightness, 0, 255).astype(np.uint8)

    # 随机对比度调整
    contrast = rng.uniform(0.8, 1.2)
    mean = img.mean()
    img = np.clip((img - mean) * contrast + mean, 0, 255).astype(np.uint8)

    return img
