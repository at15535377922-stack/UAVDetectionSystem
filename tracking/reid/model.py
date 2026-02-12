"""ReID 外观特征提取模型（框架）"""
from __future__ import annotations

import numpy as np


class ReIDExtractor:
    """ReID 特征提取器，用于目标外观特征提取以提升跟踪中的重识别能力"""

    def __init__(self, model_path: str | None = None, feature_dim: int = 512):
        self.model_path = model_path
        self.feature_dim = feature_dim
        self.model = None
        if model_path:
            self._load_model()

    def _load_model(self):
        """加载 ReID 模型"""
        # TODO: 加载预训练的 ReID 模型（如 OSNet, BoT）
        print(f"[ReID] Model loaded: {self.model_path}")

    def extract(self, image_crops: list[np.ndarray]) -> np.ndarray:
        """提取一批目标裁剪图的外观特征
        Args:
            image_crops: 目标裁剪图列表，每个 shape (H, W, 3)
        Returns:
            (N, feature_dim) 特征矩阵
        """
        if not image_crops:
            return np.empty((0, self.feature_dim))

        # TODO: 实际推理
        # 占位：返回随机特征
        return np.random.randn(len(image_crops), self.feature_dim).astype(np.float32)

    @staticmethod
    def cosine_distance(features_a: np.ndarray, features_b: np.ndarray) -> np.ndarray:
        """计算两组特征的余弦距离矩阵
        Args:
            features_a: (M, D)
            features_b: (N, D)
        Returns:
            (M, N) 距离矩阵，值域 [0, 2]
        """
        a_norm = features_a / (np.linalg.norm(features_a, axis=1, keepdims=True) + 1e-6)
        b_norm = features_b / (np.linalg.norm(features_b, axis=1, keepdims=True) + 1e-6)
        return 1.0 - a_norm @ b_norm.T
