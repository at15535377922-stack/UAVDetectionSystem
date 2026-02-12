"""卡尔曼滤波器用于目标运动预测"""
from __future__ import annotations

import numpy as np


class KalmanFilterTracker:
    """基于卡尔曼滤波的单目标运动预测
    状态向量: [cx, cy, w, h, vx, vy, vw, vh]
    观测向量: [cx, cy, w, h]
    """

    def __init__(self):
        self.dt = 1.0  # 时间步长

        # 状态转移矩阵 F (8x8)
        self.F = np.eye(8)
        self.F[0, 4] = self.dt
        self.F[1, 5] = self.dt
        self.F[2, 6] = self.dt
        self.F[3, 7] = self.dt

        # 观测矩阵 H (4x8)
        self.H = np.eye(4, 8)

        # 过程噪声协方差 Q
        self.Q = np.eye(8) * 0.01
        self.Q[4:, 4:] *= 10.0

        # 观测噪声协方差 R
        self.R = np.eye(4) * 1.0

        # 状态和协方差
        self.x = np.zeros(8)  # 状态向量
        self.P = np.eye(8) * 100.0  # 协方差矩阵

    def init_state(self, bbox: list[float]):
        """从 bbox [x1, y1, x2, y2] 初始化状态"""
        cx = (bbox[0] + bbox[2]) / 2
        cy = (bbox[1] + bbox[3]) / 2
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        self.x = np.array([cx, cy, w, h, 0, 0, 0, 0], dtype=np.float64)
        self.P = np.eye(8) * 100.0

    def predict(self) -> np.ndarray:
        """预测下一帧状态，返回预测的 [cx, cy, w, h]"""
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return self.x[:4]

    def update(self, measurement: np.ndarray):
        """用观测值更新状态
        Args:
            measurement: [cx, cy, w, h]
        """
        y = measurement - self.H @ self.x  # 残差
        S = self.H @ self.P @ self.H.T + self.R  # 残差协方差
        K = self.P @ self.H.T @ np.linalg.inv(S)  # 卡尔曼增益
        self.x = self.x + K @ y
        self.P = (np.eye(8) - K @ self.H) @ self.P

    def get_bbox(self) -> list[float]:
        """从状态向量获取 bbox [x1, y1, x2, y2]"""
        cx, cy, w, h = self.x[:4]
        return [cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2]
