"""ByteTrack 跟踪器实现（框架）"""
from __future__ import annotations

import numpy as np


class ByteTracker:
    """ByteTrack: 利用低置信度检测框进行二次匹配，提升跟踪召回率"""

    def __init__(self, track_thresh: float = 0.5, match_thresh: float = 0.8, max_age: int = 30):
        self.track_thresh = track_thresh
        self.match_thresh = match_thresh
        self.max_age = max_age
        self._next_id = 1

    def update(self, detections: np.ndarray) -> np.ndarray:
        """更新跟踪状态
        Args:
            detections: (N, 5) [x1, y1, x2, y2, score]
        Returns:
            (M, 5) [x1, y1, x2, y2, track_id]
        """
        # TODO: 实现完整的 ByteTrack 流程
        # 1. 将检测分为高置信度和低置信度两组
        # 2. 第一次匹配：高置信度检测 vs 活跃轨迹
        # 3. 第二次匹配：低置信度检测 vs 未匹配轨迹
        # 4. 处理未匹配的检测和轨迹
        return np.empty((0, 5))

    def reset(self):
        self._next_id = 1
