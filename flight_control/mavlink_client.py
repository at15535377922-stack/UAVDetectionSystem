"""MAVLink 通信客户端"""
from __future__ import annotations

import asyncio


class MAVLinkClient:
    """MAVLink 通信客户端，用于与无人机飞控通信"""

    def __init__(self, connection_string: str = "udp://:14540"):
        self.connection_string = connection_string
        self.system = None
        self.connected = False

    async def connect(self):
        """连接到无人机飞控"""
        try:
            from mavsdk import System
            self.system = System()
            await self.system.connect(system_address=self.connection_string)
            print(f"[MAVLink] Connecting to {self.connection_string}...")

            async for state in self.system.core.connection_state():
                if state.is_connected:
                    self.connected = True
                    print("[MAVLink] Connected!")
                    break

        except ImportError:
            print("[MAVLink] MAVSDK not installed. Run: pip install mavsdk")
        except Exception as e:
            print(f"[MAVLink] Connection failed: {e}")

    async def arm(self):
        """解锁电机"""
        if self.system:
            await self.system.action.arm()
            print("[MAVLink] Armed")

    async def disarm(self):
        """锁定电机"""
        if self.system:
            await self.system.action.disarm()
            print("[MAVLink] Disarmed")

    async def takeoff(self, altitude: float = 10.0):
        """起飞到指定高度"""
        if self.system:
            await self.system.action.set_takeoff_altitude(altitude)
            await self.system.action.takeoff()
            print(f"[MAVLink] Taking off to {altitude}m")

    async def land(self):
        """降落"""
        if self.system:
            await self.system.action.land()
            print("[MAVLink] Landing")

    async def return_to_launch(self):
        """返航"""
        if self.system:
            await self.system.action.return_to_launch()
            print("[MAVLink] Returning to launch")

    async def goto(self, lat: float, lon: float, alt: float, speed: float = 5.0):
        """飞往指定坐标"""
        if self.system:
            await self.system.action.goto_location(lat, lon, alt, 0)
            print(f"[MAVLink] Going to ({lat}, {lon}, {alt})")

    async def disconnect(self):
        """断开连接"""
        self.connected = False
        self.system = None
        print("[MAVLink] Disconnected")
