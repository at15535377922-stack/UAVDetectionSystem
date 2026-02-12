"""地图与障碍物管理"""
from __future__ import annotations

import numpy as np


class MapManager:
    """栅格地图管理器
    0 = 可通行, 1 = 障碍物
    """

    def __init__(self, width: int = 100, height: int = 100):
        self.width = width
        self.height = height
        self.grid = np.zeros((height, width), dtype=np.int8)

    def set_obstacle(self, x: int, y: int):
        """设置单个障碍物"""
        if 0 <= x < self.width and 0 <= y < self.height:
            self.grid[y, x] = 1

    def set_obstacle_rect(self, x1: int, y1: int, x2: int, y2: int):
        """设置矩形障碍物区域"""
        x1, x2 = max(0, min(x1, x2)), min(self.width, max(x1, x2))
        y1, y2 = max(0, min(y1, y2)), min(self.height, max(y1, y2))
        self.grid[y1:y2, x1:x2] = 1

    def set_obstacle_circle(self, cx: int, cy: int, radius: int):
        """设置圆形障碍物区域"""
        for y in range(max(0, cy - radius), min(self.height, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(self.width, cx + radius + 1)):
                if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                    self.grid[y, x] = 1

    def is_free(self, x: int, y: int) -> bool:
        """检查位置是否可通行"""
        if 0 <= x < self.width and 0 <= y < self.height:
            return self.grid[y, x] == 0
        return False

    def add_safety_margin(self, margin: int = 1):
        """为障碍物添加安全边距（膨胀）"""
        from scipy.ndimage import binary_dilation
        struct = np.ones((2 * margin + 1, 2 * margin + 1))
        self.grid = binary_dilation(self.grid, structure=struct).astype(np.int8)

    def random_obstacles(self, count: int = 20, max_size: int = 5, seed: int | None = None):
        """随机生成障碍物（用于测试）"""
        rng = np.random.default_rng(seed)
        for _ in range(count):
            x = rng.integers(0, self.width)
            y = rng.integers(0, self.height)
            w = rng.integers(1, max_size + 1)
            h = rng.integers(1, max_size + 1)
            self.set_obstacle_rect(x, y, x + w, y + h)

    def get_grid(self) -> np.ndarray:
        return self.grid.copy()
