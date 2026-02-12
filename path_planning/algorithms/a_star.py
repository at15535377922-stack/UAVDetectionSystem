"""A* 路径规划算法"""
from __future__ import annotations

import heapq
import numpy as np


def heuristic(a: tuple[int, int], b: tuple[int, int]) -> float:
    """欧几里得距离启发函数"""
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5


def a_star_search(
    grid: np.ndarray,
    start: tuple[int, int],
    goal: tuple[int, int],
) -> list[tuple[int, int]]:
    """A* 搜索算法
    Args:
        grid: 栅格地图 (0=可通行, 1=障碍物)
        start: 起点 (x, y)
        goal: 终点 (x, y)
    Returns:
        路径点列表 [(x, y), ...]
    """
    rows, cols = grid.shape

    # 8 方向移动
    neighbors = [
        (0, 1), (1, 0), (0, -1), (-1, 0),
        (1, 1), (1, -1), (-1, 1), (-1, -1),
    ]
    costs = [1.0, 1.0, 1.0, 1.0, 1.414, 1.414, 1.414, 1.414]

    open_set = [(0.0, start)]
    came_from: dict[tuple[int, int], tuple[int, int]] = {}
    g_score: dict[tuple[int, int], float] = {start: 0.0}

    while open_set:
        _, current = heapq.heappop(open_set)

        if current == goal:
            # 回溯路径
            path = [current]
            while current in came_from:
                current = came_from[current]
                path.append(current)
            return path[::-1]

        for (dx, dy), cost in zip(neighbors, costs):
            nx, ny = current[0] + dx, current[1] + dy

            if 0 <= nx < cols and 0 <= ny < rows and grid[ny, nx] == 0:
                tentative_g = g_score[current] + cost

                if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                    g_score[(nx, ny)] = tentative_g
                    f_score = tentative_g + heuristic((nx, ny), goal)
                    heapq.heappush(open_set, (f_score, (nx, ny)))
                    came_from[(nx, ny)] = current

    return []  # 未找到路径
