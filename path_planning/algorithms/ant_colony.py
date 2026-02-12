"""改进蚁群算法（ACO）用于多航点巡检顺序优化（TSP）"""
from __future__ import annotations

import numpy as np


def ant_colony_search(
    grid: np.ndarray,
    start: tuple[int, int],
    goal: tuple[int, int],
    waypoints: list[tuple[int, int]] | None = None,
    n_ants: int = 30,
    n_iterations: int = 100,
    alpha: float = 1.0,
    beta: float = 2.0,
    evaporation: float = 0.5,
    q: float = 100.0,
) -> list[tuple[int, int]]:
    """蚁群算法优化巡检航点顺序
    Args:
        grid: 栅格地图
        start: 起点
        goal: 终点
        waypoints: 必经航点列表（如果为 None，则退化为 A* 直接规划）
        n_ants: 蚂蚁数量
        n_iterations: 迭代次数
        alpha: 信息素重要度
        beta: 启发式信息重要度
        evaporation: 信息素蒸发率
        q: 信息素强度常数
    Returns:
        优化后的路径点列表
    """
    if not waypoints:
        from path_planning.algorithms.a_star import a_star_search
        return a_star_search(grid, start, goal)

    # 所有需要访问的点（起点 + 航点 + 终点）
    all_points = [start] + waypoints + [goal]
    n = len(all_points)

    # 计算距离矩阵
    dist_matrix = np.zeros((n, n))
    for i in range(n):
        for j in range(n):
            if i != j:
                dx = all_points[i][0] - all_points[j][0]
                dy = all_points[i][1] - all_points[j][1]
                dist_matrix[i, j] = (dx ** 2 + dy ** 2) ** 0.5

    # 初始化信息素
    pheromone = np.ones((n, n))
    rng = np.random.default_rng()

    best_order = None
    best_distance = float("inf")

    for _ in range(n_iterations):
        for _ in range(n_ants):
            # 构建路径（起点固定为 0，终点固定为 n-1）
            visited = {0}
            current = 0
            order = [0]
            middle_points = list(range(1, n - 1))

            while middle_points:
                unvisited = [p for p in middle_points if p not in visited]
                if not unvisited:
                    break

                # 计算转移概率
                probs = []
                for j in unvisited:
                    tau = pheromone[current, j] ** alpha
                    eta = (1.0 / (dist_matrix[current, j] + 1e-6)) ** beta
                    probs.append(tau * eta)

                probs = np.array(probs)
                probs /= probs.sum() + 1e-10

                # 轮盘赌选择
                next_idx = rng.choice(len(unvisited), p=probs)
                next_point = unvisited[next_idx]

                order.append(next_point)
                visited.add(next_point)
                current = next_point

            order.append(n - 1)  # 终点

            # 计算总距离
            total_dist = sum(dist_matrix[order[i], order[i + 1]] for i in range(len(order) - 1))

            if total_dist < best_distance:
                best_distance = total_dist
                best_order = order[:]

        # 信息素蒸发
        pheromone *= (1 - evaporation)

        # 信息素更新（最优蚂蚁）
        if best_order:
            for i in range(len(best_order) - 1):
                pheromone[best_order[i], best_order[i + 1]] += q / best_distance

    if best_order is None:
        return [start, goal]

    return [all_points[i] for i in best_order]
