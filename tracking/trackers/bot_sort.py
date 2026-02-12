"""BoT-SORT 跟踪器实现（框架）"""
from __future__ import annotations

import numpy as np


class BoTSORTTracker:
    """BoT-SORT: 结合 BoT (Bag of Tricks) 优化的 SORT 跟踪器
    融合 CMC (Camera Motion Compensation) + ReID + IoU 匹配"""

    def __init__(self, max_age: int = 30, min_hits: int = 3):
        self.max_age = max_age
        self.min_hits = min_hits
        self._next_id = 1

    def update(self, detections: np.ndarray, features: np.ndarray | None = None) -> np.ndarray:
        """更新跟踪状态
        Args:
            detections: (N, 5) [x1, y1, x2, y2, score]
            features: (N, D) ReID 特征（可选）
        Returns:
            (M, 5) [x1, y1, x2, y2, track_id]
        """
        # TODO: 实现完整的 BoT-SORT 流程
        # 1. 相机运动补偿 (CMC)
        # 2. 卡尔曼预测
        # 3. 融合 ReID + IoU 进行匹配
        # 4. 更新/创建/删除轨迹
        return np.empty((0, 5))

    def reset(self):
        self._next_id = 1
