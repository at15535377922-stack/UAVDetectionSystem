"""RRT* 路径规划算法"""
from __future__ import annotations

import numpy as np


class Node:
    def __init__(self, x: float, y: float, parent: Node | None = None):
        self.x = x
        self.y = y
        self.parent = parent
        self.cost = 0.0


def rrt_star_search(
    grid: np.ndarray,
    start: tuple[int, int],
    goal: tuple[int, int],
    max_iter: int = 5000,
    step_size: float = 5.0,
    goal_threshold: float = 5.0,
    search_radius: float = 15.0,
) -> list[tuple[float, float]]:
    """RRT* 搜索算法
    Args:
        grid: 栅格地图
        start: 起点
        goal: 终点
        max_iter: 最大迭代次数
        step_size: 扩展步长
        goal_threshold: 到达目标的距离阈值
        search_radius: 重连搜索半径
    Returns:
        路径点列表
    """
    rows, cols = grid.shape
    rng = np.random.default_rng()

    start_node = Node(start[0], start[1])
    nodes = [start_node]

    best_goal_node = None

    for _ in range(max_iter):
        # 随机采样（10% 概率直接采样目标点）
        if rng.random() < 0.1:
            rand_x, rand_y = goal
        else:
            rand_x = rng.uniform(0, cols)
            rand_y = rng.uniform(0, rows)

        # 找最近节点
        nearest = min(nodes, key=lambda n: (n.x - rand_x) ** 2 + (n.y - rand_y) ** 2)

        # 向随机点扩展
        dx = rand_x - nearest.x
        dy = rand_y - nearest.y
        dist = (dx ** 2 + dy ** 2) ** 0.5
        if dist < 1e-6:
            continue
        dx, dy = dx / dist * min(step_size, dist), dy / dist * min(step_size, dist)
        new_x, new_y = nearest.x + dx, nearest.y + dy

        # 边界检查
        if not (0 <= new_x < cols and 0 <= new_y < rows):
            continue

        # 碰撞检测
        if not _collision_free(grid, nearest.x, nearest.y, new_x, new_y):
            continue

        new_node = Node(new_x, new_y, nearest)
        new_node.cost = nearest.cost + ((dx ** 2 + dy ** 2) ** 0.5)

        # RRT* 重连：在搜索半径内寻找更优父节点
        for node in nodes:
            d = ((node.x - new_x) ** 2 + (node.y - new_y) ** 2) ** 0.5
            if d < search_radius and _collision_free(grid, node.x, node.y, new_x, new_y):
                potential_cost = node.cost + d
                if potential_cost < new_node.cost:
                    new_node.parent = node
                    new_node.cost = potential_cost

        nodes.append(new_node)

        # 检查是否到达目标
        goal_dist = ((new_x - goal[0]) ** 2 + (new_y - goal[1]) ** 2) ** 0.5
        if goal_dist < goal_threshold:
            if best_goal_node is None or new_node.cost < best_goal_node.cost:
                best_goal_node = new_node

    if best_goal_node is None:
        return []

    # 回溯路径
    path = []
    node = best_goal_node
    while node is not None:
        path.append((node.x, node.y))
        node = node.parent
    return path[::-1]


def _collision_free(grid: np.ndarray, x1: float, y1: float, x2: float, y2: float, step: float = 0.5) -> bool:
    """检查两点之间是否无碰撞"""
    dist = ((x2 - x1) ** 2 + (y2 - y1) ** 2) ** 0.5
    steps = max(int(dist / step), 1)
    for i in range(steps + 1):
        t = i / steps
        x = x1 + t * (x2 - x1)
        y = y1 + t * (y2 - y1)
        ix, iy = int(round(x)), int(round(y))
        if 0 <= iy < grid.shape[0] and 0 <= ix < grid.shape[1]:
            if grid[iy, ix] == 1:
                return False
        else:
            return False
    return True
