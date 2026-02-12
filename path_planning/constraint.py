"""约束条件处理"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class FlightConstraints:
    """飞行约束条件"""
    max_altitude: float = 120.0       # 最大飞行高度 (m)
    min_altitude: float = 30.0        # 最小飞行高度 (m)
    max_speed: float = 15.0           # 最大飞行速度 (m/s)
    max_distance: float = 5000.0      # 最大飞行距离 (m)
    battery_capacity: float = 100.0   # 电池容量 (%)
    min_battery: float = 20.0         # 最低返航电量 (%)
    no_fly_zones: list = None         # 禁飞区列表 [(cx, cy, radius), ...]
    safety_distance: float = 5.0      # 障碍物安全距离 (m)

    def __post_init__(self):
        if self.no_fly_zones is None:
            self.no_fly_zones = []

    def check_altitude(self, altitude: float) -> bool:
        return self.min_altitude <= altitude <= self.max_altitude

    def check_battery(self, remaining: float, distance_to_home: float, speed: float) -> bool:
        """检查电量是否足够返航"""
        time_to_home = distance_to_home / max(speed, 0.1)
        battery_needed = (time_to_home / 60) * 2.0  # 粗略估算：每分钟消耗 2% 电量
        return remaining - battery_needed >= self.min_battery

    def check_no_fly_zone(self, x: float, y: float) -> bool:
        """检查是否在禁飞区内"""
        for cx, cy, radius in self.no_fly_zones:
            if (x - cx) ** 2 + (y - cy) ** 2 <= radius ** 2:
                return False
        return True

    def is_valid_position(self, x: float, y: float, altitude: float) -> bool:
        return self.check_altitude(altitude) and self.check_no_fly_zone(x, y)
