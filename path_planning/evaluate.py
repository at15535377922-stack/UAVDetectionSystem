"""路径规划评估脚本"""
from __future__ import annotations

import numpy as np
from path_planning.planner import Planner
from path_planning.map_manager import MapManager
from path_planning.algorithms.coverage import compute_coverage_rate


def evaluate_planner(
    algorithm: str = "a_star",
    map_size: int = 100,
    n_obstacles: int = 20,
    seed: int = 42,
):
    """评估路径规划算法性能"""
    mm = MapManager(map_size, map_size)
    mm.random_obstacles(n_obstacles, max_size=5, seed=seed)
    grid = mm.get_grid()

    start = (5, 5)
    goal = (map_size - 5, map_size - 5)

    planner = Planner(algorithm)
    result = planner.plan(grid, start, goal)

    print(f"Algorithm     : {result.algorithm}")
    print(f"Success       : {result.success}")
    print(f"Path length   : {len(result.path)} points")
    print(f"Distance      : {result.distance:.2f}")
    print(f"Planning time : {result.planning_time_ms:.2f} ms")

    if algorithm == "coverage":
        rate = compute_coverage_rate(grid, result.path)
        print(f"Coverage rate : {rate:.2%}")

    return result


if __name__ == "__main__":
    for algo in ["a_star", "rrt_star", "d_star_lite"]:
        print(f"\n{'='*40}")
        evaluate_planner(algo)
