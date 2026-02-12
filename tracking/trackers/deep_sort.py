"""DeepSORT 跟踪器实现（框架）"""
from __future__ import annotations

import numpy as np
from tracking.motion.kalman_filter import KalmanFilterTracker


class DeepSORTTracker:
    """DeepSORT: 结合外观特征 (ReID) + 运动预测 (Kalman) + 匈牙利匹配"""

    def __init__(self, max_age: int = 30, min_hits: int = 3, iou_threshold: float = 0.3):
        self.max_age = max_age
        self.min_hits = min_hits
        self.iou_threshold = iou_threshold
        self.trackers: list[KalmanFilterTracker] = []
        self._next_id = 1

    def update(self, detections: np.ndarray, features: np.ndarray | None = None) -> np.ndarray:
        """更新跟踪状态
        Args:
            detections: (N, 5) [x1, y1, x2, y2, score]
            features: (N, D) ReID 外观特征向量（可选）
        Returns:
            (M, 5) [x1, y1, x2, y2, track_id]
        """
        # TODO: 实现完整的 DeepSORT 流程
        # 1. 预测：对所有现有轨迹进行卡尔曼预测
        # 2. 匹配：级联匹配（外观特征 + IoU）
        # 3. 更新：匹配成功的轨迹更新状态
        # 4. 创建：未匹配的检测创建新轨迹
        # 5. 删除：超过 max_age 的轨迹删除
        return np.empty((0, 5))

    def reset(self):
        self.trackers.clear()
        self._next_id = 1
