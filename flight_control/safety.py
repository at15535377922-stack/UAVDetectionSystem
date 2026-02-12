"""安全策略模块（地理围栏、电量保护）"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class GeoFence:
    """地理围栏"""
    center_lat: float
    center_lon: float
    radius: float  # 米
    max_altitude: float = 120.0
    min_altitude: float = 5.0


class SafetyManager:
    """安全策略管理器"""

    def __init__(self):
        self.geo_fences: list[GeoFence] = []
        self.min_battery_percent: float = 20.0
        self.emergency_battery_percent: float = 10.0

    def add_geo_fence(self, fence: GeoFence):
        """添加地理围栏"""
        self.geo_fences.append(fence)

    def check_position(self, lat: float, lon: float, alt: float) -> dict:
        """检查位置是否安全"""
        warnings = []

        for i, fence in enumerate(self.geo_fences):
            # 简化距离计算（实际应使用 Haversine 公式）
            dlat = (lat - fence.center_lat) * 111320
            dlon = (lon - fence.center_lon) * 111320 * 0.85  # 粗略纬度修正
            distance = (dlat ** 2 + dlon ** 2) ** 0.5

            if distance > fence.radius:
                warnings.append(f"Outside geo-fence {i}: {distance:.0f}m > {fence.radius:.0f}m")

            if alt > fence.max_altitude:
                warnings.append(f"Altitude {alt:.1f}m exceeds max {fence.max_altitude:.1f}m")
            elif alt < fence.min_altitude:
                warnings.append(f"Altitude {alt:.1f}m below min {fence.min_altitude:.1f}m")

        return {
            "safe": len(warnings) == 0,
            "warnings": warnings,
        }

    def check_battery(self, battery_percent: float) -> dict:
        """检查电量是否安全"""
        if battery_percent <= self.emergency_battery_percent:
            return {"level": "emergency", "action": "immediate_land", "message": f"Emergency battery: {battery_percent:.1f}%"}
        elif battery_percent <= self.min_battery_percent:
            return {"level": "warning", "action": "return_to_launch", "message": f"Low battery: {battery_percent:.1f}%"}
        return {"level": "ok", "action": "continue", "message": f"Battery: {battery_percent:.1f}%"}
