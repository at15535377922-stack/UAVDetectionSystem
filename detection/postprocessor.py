"""检测后处理模块（NMS 等）"""
import numpy as np


def nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float = 0.45) -> list[int]:
    """非极大值抑制
    Args:
        boxes: (N, 4) [x1, y1, x2, y2]
        scores: (N,)
        iou_threshold: IoU 阈值
    Returns:
        保留的索引列表
    """
    if len(boxes) == 0:
        return []

    x1 = boxes[:, 0]
    y1 = boxes[:, 1]
    x2 = boxes[:, 2]
    y2 = boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)

    order = scores.argsort()[::-1]
    keep = []

    while order.size > 0:
        i = order[0]
        keep.append(int(i))

        if order.size == 1:
            break

        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])

        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-6)

        inds = np.where(iou <= iou_threshold)[0]
        order = order[inds + 1]

    return keep


def scale_boxes(boxes: np.ndarray, scale: float, padding: tuple[int, int]) -> np.ndarray:
    """将检测框从预处理后的坐标映射回原图坐标"""
    pad_x, pad_y = padding
    boxes_out = boxes.copy()
    boxes_out[:, [0, 2]] = (boxes[:, [0, 2]] - pad_x) / scale
    boxes_out[:, [1, 3]] = (boxes[:, [1, 3]] - pad_y) / scale
    return boxes_out
