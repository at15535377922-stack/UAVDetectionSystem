"""路径规划器统一接口"""
from __future__ import annotations

import time
from dataclasses import dataclass, field

import numpy as np


@dataclass
class PlanResult:
    """规划结果"""
    algorithm: str
    path: list[tuple[float, float]] = field(default_factory=list)
    distance: float = 0.0
    planning_time_ms: float = 0.0
    success: bool = False


class Planner:
    """路径规划器，支持切换不同算法"""

    SUPPORTED_ALGORITHMS = ["a_star", "rrt_star", "ant_colony", "d_star_lite", "coverage"]

    def __init__(self, algorithm: str = "a_star"):
        if algorithm not in self.SUPPORTED_ALGORITHMS:
            raise ValueError(f"Unsupported algorithm: {algorithm}. Choose from {self.SUPPORTED_ALGORITHMS}")
        self.algorithm = algorithm

    def plan(
        self,
        grid_map: np.ndarray,
        start: tuple[int, int],
        goal: tuple[int, int],
    ) -> PlanResult:
        """执行路径规划"""
        t0 = time.perf_counter()

        if self.algorithm == "a_star":
            from path_planning.algorithms.a_star import a_star_search
            path = a_star_search(grid_map, start, goal)
        elif self.algorithm == "rrt_star":
            from path_planning.algorithms.rrt_star import rrt_star_search
            path = rrt_star_search(grid_map, start, goal)
        elif self.algorithm == "ant_colony":
            from path_planning.algorithms.ant_colony import ant_colony_search
            path = ant_colony_search(grid_map, start, goal)
        elif self.algorithm == "d_star_lite":
            from path_planning.algorithms.d_star_lite import d_star_lite_search
            path = d_star_lite_search(grid_map, start, goal)
        elif self.algorithm == "coverage":
            from path_planning.algorithms.coverage import coverage_plan
            path = coverage_plan(grid_map, start)
        else:
            path = []

        elapsed = (time.perf_counter() - t0) * 1000
        dist = self._compute_distance(path)

        return PlanResult(
            algorithm=self.algorithm,
            path=path,
            distance=dist,
            planning_time_ms=elapsed,
            success=len(path) > 0,
        )

    @staticmethod
    def _compute_distance(path: list[tuple[float, float]]) -> float:
        if len(path) < 2:
            return 0.0
        total = 0.0
        for i in range(1, len(path)):
            dx = path[i][0] - path[i - 1][0]
            dy = path[i][1] - path[i - 1][1]
            total += (dx ** 2 + dy ** 2) ** 0.5
        return total
