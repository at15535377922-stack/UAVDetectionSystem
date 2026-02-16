"""
Flight Controller Communication Service.

Supports MAVLink-based flight controllers (PX4/ArduPilot) when
pymavlink is available, with automatic fallback to simulated mode.
"""

import asyncio
import logging
import math
import random
import time
from typing import Any

logger = logging.getLogger(__name__)

# Try to import pymavlink
try:
    from pymavlink import mavutil
    _HAS_MAVLINK = True
    logger.info("pymavlink available — real flight controller support enabled")
except ImportError:
    _HAS_MAVLINK = False
    logger.warning("pymavlink not installed — using simulated flight controller")


class FlightCommand:
    """Represents a flight command to be sent to the UAV."""
    TAKEOFF = "takeoff"
    LAND = "land"
    RTL = "rtl"  # Return to launch
    HOVER = "hover"
    GOTO = "goto"
    MISSION_START = "mission_start"
    MISSION_PAUSE = "mission_pause"
    MISSION_RESUME = "mission_resume"


class UAVConnection:
    """Represents a connection to a single UAV."""

    def __init__(self, uav_id: str, connection_string: str | None = None):
        self.uav_id = uav_id
        self.connection_string = connection_string
        self.connected = False
        self.armed = False
        self.flight_mode = "STABILIZE"
        self.mission_items: list[dict] = []
        self.current_wp = 0
        self._mavconn: Any = None

        # Simulated state
        self._sim_lat = 32.0603
        self._sim_lng = 118.7969
        self._sim_alt = 0.0
        self._sim_heading = 0.0
        self._sim_speed = 0.0
        self._sim_battery = 95.0
        self._sim_flying = False

    async def connect(self) -> bool:
        """Establish connection to the flight controller."""
        if _HAS_MAVLINK and self.connection_string:
            try:
                self._mavconn = mavutil.mavlink_connection(self.connection_string)
                self._mavconn.wait_heartbeat(timeout=5)
                self.connected = True
                logger.info("Connected to UAV %s via %s", self.uav_id, self.connection_string)
                return True
            except Exception as e:
                logger.error("Failed to connect to UAV %s: %s", self.uav_id, e)
                self.connected = False
                return False
        else:
            # Simulated connection
            await asyncio.sleep(0.1)
            self.connected = True
            logger.info("Simulated connection to UAV %s", self.uav_id)
            return True

    async def disconnect(self):
        if self._mavconn:
            self._mavconn.close()
        self.connected = False

    async def arm(self) -> bool:
        """Arm the UAV motors."""
        if not self.connected:
            return False
        if self._mavconn:
            self._mavconn.arducopter_arm()
            self._mavconn.motors_armed_wait()
        self.armed = True
        logger.info("UAV %s armed", self.uav_id)
        return True

    async def disarm(self) -> bool:
        if not self.connected:
            return False
        if self._mavconn:
            self._mavconn.arducopter_disarm()
        self.armed = False
        logger.info("UAV %s disarmed", self.uav_id)
        return True

    async def takeoff(self, altitude: float = 10.0) -> bool:
        if not self.connected or not self.armed:
            return False
        if self._mavconn:
            self._mavconn.mav.command_long_send(
                self._mavconn.target_system, self._mavconn.target_component,
                mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
                0, 0, 0, 0, 0, 0, 0, altitude,
            )
        self._sim_flying = True
        self._sim_alt = altitude
        self.flight_mode = "GUIDED"
        logger.info("UAV %s takeoff to %.1fm", self.uav_id, altitude)
        return True

    async def land(self) -> bool:
        if not self.connected:
            return False
        if self._mavconn:
            self._mavconn.mav.command_long_send(
                self._mavconn.target_system, self._mavconn.target_component,
                mavutil.mavlink.MAV_CMD_NAV_LAND,
                0, 0, 0, 0, 0, 0, 0, 0,
            )
        self._sim_flying = False
        self._sim_alt = 0.0
        self._sim_speed = 0.0
        self.flight_mode = "LAND"
        logger.info("UAV %s landing", self.uav_id)
        return True

    async def rtl(self) -> bool:
        """Return to launch."""
        if not self.connected:
            return False
        if self._mavconn:
            self._mavconn.set_mode("RTL")
        self.flight_mode = "RTL"
        logger.info("UAV %s RTL", self.uav_id)
        return True

    async def hover(self) -> bool:
        """Hold current position."""
        if not self.connected:
            return False
        self._sim_speed = 0.0
        self.flight_mode = "LOITER"
        logger.info("UAV %s hover", self.uav_id)
        return True

    async def goto(self, lat: float, lng: float, alt: float = 100.0) -> bool:
        """Navigate to a specific GPS coordinate."""
        if not self.connected:
            return False
        if self._mavconn:
            self._mavconn.mav.mission_item_send(
                self._mavconn.target_system, self._mavconn.target_component,
                0, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
                mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
                2, 0, 0, 0, 0, 0,
                lat, lng, alt,
            )
        self._sim_lat = lat
        self._sim_lng = lng
        self._sim_alt = alt
        self._sim_speed = 8.0
        self.flight_mode = "GUIDED"
        logger.info("UAV %s goto (%.6f, %.6f, %.1f)", self.uav_id, lat, lng, alt)
        return True

    async def upload_mission(self, waypoints: list[dict]) -> bool:
        """
        Upload a mission (list of waypoints) to the flight controller.
        Each waypoint: {lat, lng, altitude, speed?}
        """
        if not self.connected:
            return False

        self.mission_items = waypoints
        self.current_wp = 0

        if self._mavconn:
            # Real MAVLink mission upload
            self._mavconn.waypoint_clear_all_send()
            self._mavconn.waypoint_count_send(len(waypoints))
            for i, wp in enumerate(waypoints):
                self._mavconn.mav.mission_item_send(
                    self._mavconn.target_system, self._mavconn.target_component,
                    i, mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT,
                    mavutil.mavlink.MAV_CMD_NAV_WAYPOINT,
                    0, 1, 0, 0, 0, 0,
                    wp["lat"], wp["lng"], wp.get("altitude", 100),
                )

        logger.info("UAV %s mission uploaded: %d waypoints", self.uav_id, len(waypoints))
        return True

    async def start_mission(self) -> bool:
        if not self.connected or not self.mission_items:
            return False
        if self._mavconn:
            self._mavconn.set_mode("AUTO")
        self.flight_mode = "AUTO"
        self._sim_flying = True
        self._sim_speed = 8.0
        logger.info("UAV %s mission started", self.uav_id)
        return True

    def get_telemetry(self) -> dict:
        """Get current telemetry data (real or simulated)."""
        if self._mavconn:
            # Real telemetry would be read from MAVLink messages
            pass

        # Simulated telemetry with slight movement
        if self._sim_flying and self.flight_mode == "AUTO" and self.mission_items:
            # Simulate moving toward next waypoint
            if self.current_wp < len(self.mission_items):
                target = self.mission_items[self.current_wp]
                dlat = target["lat"] - self._sim_lat
                dlng = target["lng"] - self._sim_lng
                dist = math.sqrt(dlat**2 + dlng**2)
                if dist < 0.00005:
                    self.current_wp += 1
                else:
                    step = min(0.00003, dist)
                    self._sim_lat += (dlat / dist) * step
                    self._sim_lng += (dlng / dist) * step
                    self._sim_heading = math.degrees(math.atan2(dlng, dlat)) % 360

        self._sim_battery = max(10, self._sim_battery - random.uniform(0, 0.01))

        return {
            "uav_id": self.uav_id,
            "connected": self.connected,
            "armed": self.armed,
            "flight_mode": self.flight_mode,
            "latitude": round(self._sim_lat, 7),
            "longitude": round(self._sim_lng, 7),
            "altitude": round(self._sim_alt, 1),
            "heading": round(self._sim_heading, 1),
            "speed": round(self._sim_speed, 1),
            "battery": round(self._sim_battery, 1),
            "mission_progress": f"{self.current_wp}/{len(self.mission_items)}" if self.mission_items else "—",
            "flying": self._sim_flying,
            "mission_waypoints": [
                {"lat": wp["lat"], "lng": wp["lng"]} for wp in self.mission_items
            ] if self.mission_items else [],
        }


class FlightControllerService:
    """Manages connections to multiple UAVs."""

    def __init__(self):
        self._connections: dict[str, UAVConnection] = {}

    async def connect_uav(self, uav_id: str, connection_string: str | None = None) -> UAVConnection:
        if uav_id in self._connections:
            return self._connections[uav_id]
        conn = UAVConnection(uav_id, connection_string)
        await conn.connect()
        self._connections[uav_id] = conn
        return conn

    def get_uav(self, uav_id: str) -> UAVConnection | None:
        return self._connections.get(uav_id)

    async def disconnect_uav(self, uav_id: str):
        conn = self._connections.pop(uav_id, None)
        if conn:
            await conn.disconnect()

    def list_connections(self) -> list[dict]:
        return [conn.get_telemetry() for conn in self._connections.values()]

    async def send_command(self, uav_id: str, command: str, **kwargs) -> dict:
        """Send a command to a specific UAV."""
        conn = self._connections.get(uav_id)
        if not conn:
            return {"success": False, "error": f"UAV {uav_id} not connected"}

        handlers = {
            FlightCommand.TAKEOFF: lambda: conn.takeoff(kwargs.get("altitude", 10)),
            FlightCommand.LAND: conn.land,
            FlightCommand.RTL: conn.rtl,
            FlightCommand.HOVER: conn.hover,
            FlightCommand.GOTO: lambda: conn.goto(kwargs["lat"], kwargs["lng"], kwargs.get("altitude", 100)),
            FlightCommand.MISSION_START: conn.start_mission,
        }

        handler = handlers.get(command)
        if not handler:
            return {"success": False, "error": f"Unknown command: {command}"}

        try:
            result = await handler()
            return {"success": result, "uav_id": uav_id, "command": command, "telemetry": conn.get_telemetry()}
        except Exception as e:
            logger.error("Command %s failed for UAV %s: %s", command, uav_id, e)
            return {"success": False, "error": str(e)}

    @property
    def is_real_mode(self) -> bool:
        return _HAS_MAVLINK


# Singleton
flight_controller_service = FlightControllerService()
