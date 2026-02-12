"""轨迹预测模块"""
from __future__ import annotations

import numpy as np


def linear_predict(trajectory: list[list[float]], steps: int = 5) -> list[list[float]]:
    """基于线性外推预测未来轨迹点
    Args:
        trajectory: 历史轨迹点列表 [[x, y], ...]
        steps: 预测步数
    Returns:
        预测的未来轨迹点列表
    """
    if len(trajectory) < 2:
        return [trajectory[-1]] * steps if trajectory else []

    pts = np.array(trajectory[-10:])  # 取最近 10 个点
    velocity = np.mean(np.diff(pts, axis=0), axis=0)

    predictions = []
    last_pt = pts[-1]
    for i in range(1, steps + 1):
        pred = last_pt + velocity * i
        predictions.append(pred.tolist())

    return predictions


def polynomial_predict(trajectory: list[list[float]], steps: int = 5, degree: int = 2) -> list[list[float]]:
    """基于多项式拟合预测未来轨迹点
    Args:
        trajectory: 历史轨迹点列表 [[x, y], ...]
        steps: 预测步数
        degree: 多项式阶数
    Returns:
        预测的未来轨迹点列表
    """
    if len(trajectory) < degree + 1:
        return linear_predict(trajectory, steps)

    pts = np.array(trajectory)
    t = np.arange(len(pts))

    # 分别拟合 x 和 y
    coeffs_x = np.polyfit(t, pts[:, 0], degree)
    coeffs_y = np.polyfit(t, pts[:, 1], degree)

    predictions = []
    for i in range(1, steps + 1):
        t_pred = len(pts) - 1 + i
        x_pred = np.polyval(coeffs_x, t_pred)
        y_pred = np.polyval(coeffs_y, t_pred)
        predictions.append([float(x_pred), float(y_pred)])

    return predictions
