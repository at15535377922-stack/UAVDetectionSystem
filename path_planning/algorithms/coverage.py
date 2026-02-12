"""区域覆盖规划算法"""
from __future__ import annotations

import numpy as np


def coverage_plan(
    grid: np.ndarray,
    start: tuple[int, int],
    direction: str = "horizontal",
) -> list[tuple[int, int]]:
    """Boustrophedon（牛耕式）区域覆盖规划
    Args:
        grid: 栅格地图 (0=可通行, 1=障碍物)
        start: 起点
        direction: 扫描方向 "horizontal" 或 "vertical"
    Returns:
        覆盖路径点列表
    """
    rows, cols = grid.shape
    path = []

    if direction == "horizontal":
        # 水平往返扫描
        for y in range(rows):
            if y % 2 == 0:
                # 从左到右
                for x in range(cols):
                    if grid[y, x] == 0:
                        path.append((x, y))
            else:
                # 从右到左
                for x in range(cols - 1, -1, -1):
                    if grid[y, x] == 0:
                        path.append((x, y))
    else:
        # 垂直往返扫描
        for x in range(cols):
            if x % 2 == 0:
                for y in range(rows):
                    if grid[y, x] == 0:
                        path.append((x, y))
            else:
                for y in range(rows - 1, -1, -1):
                    if grid[y, x] == 0:
                        path.append((x, y))

    return path


def compute_coverage_rate(grid: np.ndarray, path: list[tuple[int, int]]) -> float:
    """计算覆盖率
    Args:
        grid: 栅格地图
        path: 规划路径
    Returns:
        覆盖率 (0.0 ~ 1.0)
    """
    free_cells = set()
    rows, cols = grid.shape
    for y in range(rows):
        for x in range(cols):
            if grid[y, x] == 0:
                free_cells.add((x, y))

    if not free_cells:
        return 1.0

    visited = set(path) & free_cells
    return len(visited) / len(free_cells)
