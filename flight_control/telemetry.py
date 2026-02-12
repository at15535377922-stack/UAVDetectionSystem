"""遥测数据采集"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TelemetryData:
    """遥测数据"""
    latitude: float = 0.0
    longitude: float = 0.0
    altitude: float = 0.0
    heading: float = 0.0
    speed: float = 0.0
    battery_percent: float = 100.0
    gps_satellites: int = 0
    signal_strength: float = 0.0
    flight_mode: str = "UNKNOWN"
    armed: bool = False


class TelemetryCollector:
    """遥测数据采集器"""

    def __init__(self, mavlink_client):
        self.client = mavlink_client
        self.latest: TelemetryData = TelemetryData()
        self._running = False

    async def start(self):
        """开始采集遥测数据"""
        if not self.client.system:
            print("[Telemetry] No MAVLink connection")
            return

        self._running = True
        print("[Telemetry] Started collecting")

        # TODO: 启动多个异步任务分别监听不同遥测数据流
        # - system.telemetry.position()
        # - system.telemetry.battery()
        # - system.telemetry.gps_info()
        # - system.telemetry.flight_mode()
        # - system.telemetry.armed()

    def stop(self):
        """停止采集"""
        self._running = False
        print("[Telemetry] Stopped")

    def get_latest(self) -> TelemetryData:
        """获取最新遥测数据"""
        return self.latest
