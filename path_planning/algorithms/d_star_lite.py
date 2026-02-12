"""D* Lite 动态重规划算法"""
from __future__ import annotations

import heapq
import numpy as np


def d_star_lite_search(
    grid: np.ndarray,
    start: tuple[int, int],
    goal: tuple[int, int],
) -> list[tuple[int, int]]:
    """D* Lite 搜索（简化版）
    用于动态环境中的增量重规划。当检测到新障碍物时，
    可以高效地更新路径而无需从头规划。

    Args:
        grid: 栅格地图
        start: 起点
        goal: 终点
    Returns:
        路径点列表
    """
    # 简化实现：当前使用反向 A* 作为基础
    # 完整的 D* Lite 需要维护 rhs 值和优先队列的增量更新
    rows, cols = grid.shape

    neighbors = [
        (0, 1), (1, 0), (0, -1), (-1, 0),
        (1, 1), (1, -1), (-1, 1), (-1, -1),
    ]
    costs = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414]

    # 反向搜索：从 goal 到 start
    open_set = [(0.0, goal)]
    came_from: dict[tuple[int, int], tuple[int, int]] = {}
    g_score: dict[tuple[int, int], float] = {goal: 0.0}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == start:
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return path  # 不需要反转，因为是反向搜索

        for (dx, dy), cost in zip(neighbors, costs):
            nx, ny = current[0] + dx, current[1] + dy

            if 0 <= nx < cols and 0 <= ny < rows and grid[ny, nx] == 0:
                tentative_g = g_score[current] + cost

                if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                    g_score[(nx, ny)] = tentative_g
                    h = ((nx - start[0]) ** 2 + (ny - start[1]) ** 2) ** 0.5
                    heapq.heappush(open_set, (tentative_g + h, (nx, ny)))
                    came_from[(nx, ny)] = current

    return []
