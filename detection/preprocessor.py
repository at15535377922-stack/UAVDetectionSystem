"""图像预处理模块"""
import cv2
import numpy as np


def resize_with_pad(image: np.ndarray, target_size: int = 640) -> tuple[np.ndarray, float, tuple[int, int]]:
    """等比缩放并填充到目标尺寸，返回 (padded_image, scale, padding)"""
    h, w = image.shape[:2]
    scale = target_size / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_LINEAR)

    pad_w = target_size - new_w
    pad_h = target_size - new_h
    top, left = pad_h // 2, pad_w // 2

    padded = cv2.copyMakeBorder(
        resized, top, pad_h - top, left, pad_w - left,
        cv2.BORDER_CONSTANT, value=(114, 114, 114),
    )
    return padded, scale, (left, top)


def normalize(image: np.ndarray) -> np.ndarray:
    """BGR → RGB, HWC → CHW, 归一化到 [0, 1]"""
    img = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    img = img.astype(np.float32) / 255.0
    img = np.transpose(img, (2, 0, 1))  # HWC → CHW
    return np.expand_dims(img, axis=0)  # add batch dim
