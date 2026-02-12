"""航线任务执行器"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Waypoint:
    """航点"""
    latitude: float
    longitude: float
    altitude: float
    speed: float = 5.0
    hover_time: float = 0.0  # 悬停时间 (秒)
    action: str = "fly"      # fly / photo / hover


class MissionExecutor:
    """航线任务执行器"""

    def __init__(self, mavlink_client):
        self.client = mavlink_client
        self.waypoints: list[Waypoint] = []
        self.current_index: int = 0
        self.is_running: bool = False

    def load_waypoints(self, waypoints: list[Waypoint]):
        """加载航点列表"""
        self.waypoints = waypoints
        self.current_index = 0
        print(f"[MissionExecutor] Loaded {len(waypoints)} waypoints")

    async def execute(self):
        """执行航线任务"""
        if not self.waypoints:
            print("[MissionExecutor] No waypoints loaded")
            return

        self.is_running = True
        print("[MissionExecutor] Mission started")

        try:
            # 解锁并起飞
            await self.client.arm()
            await self.client.takeoff(self.waypoints[0].altitude)

            # 逐个飞往航点
            for i, wp in enumerate(self.waypoints):
                if not self.is_running:
                    print("[MissionExecutor] Mission aborted")
                    break

                self.current_index = i
                print(f"[MissionExecutor] Flying to waypoint {i + 1}/{len(self.waypoints)}")
                await self.client.goto(wp.latitude, wp.longitude, wp.altitude, wp.speed)

                if wp.hover_time > 0:
                    import asyncio
                    await asyncio.sleep(wp.hover_time)

            print("[MissionExecutor] Mission completed")

        except Exception as e:
            print(f"[MissionExecutor] Error: {e}")
        finally:
            self.is_running = False

    def abort(self):
        """中止任务"""
        self.is_running = False
        print("[MissionExecutor] Abort requested")

    def get_progress(self) -> dict:
        """获取任务进度"""
        total = len(self.waypoints)
        return {
            "current": self.current_index,
            "total": total,
            "progress": self.current_index / max(total, 1),
            "is_running": self.is_running,
        }
