"""路径可视化工具"""
from __future__ import annotations

import numpy as np


def visualize_path(
    grid: np.ndarray,
    path: list[tuple[float, float]],
    start: tuple[int, int] | None = None,
    goal: tuple[int, int] | None = None,
    title: str = "Path Planning Result",
    save_path: str | None = None,
):
    """可视化路径规划结果
    Args:
        grid: 栅格地图
        path: 路径点列表
        start: 起点
        goal: 终点
        title: 图表标题
        save_path: 保存路径（None 则显示）
    """
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(1, 1, figsize=(10, 10))

    # 绘制地图
    ax.imshow(grid, cmap="Greys", origin="lower", alpha=0.5)

    # 绘制路径
    if path:
        px = [p[0] for p in path]
        py = [p[1] for p in path]
        ax.plot(px, py, "b-", linewidth=2, label="Path")

    # 绘制起点和终点
    if start:
        ax.plot(start[0], start[1], "go", markersize=15, label="Start")
    if goal:
        ax.plot(goal[0], goal[1], "r*", markersize=15, label="Goal")

    ax.set_title(title)
    ax.legend()
    ax.set_xlabel("X")
    ax.set_ylabel("Y")
    ax.grid(True, alpha=0.3)

    if save_path:
        plt.savefig(save_path, dpi=150, bbox_inches="tight")
        print(f"[Visualizer] Saved to: {save_path}")
    else:
        plt.show()

    plt.close(fig)
