"""
Object Tracking Service Layer.

Supports DeepSORT, ByteTrack, and BoT-SORT when dependencies are available,
with automatic fallback to mock tracking for development.
"""

import logging
import random
import time
from typing import Any

logger = logging.getLogger(__name__)

# Try to import tracking libraries
_HAS_DEEP_SORT = False
_HAS_BYTE_TRACK = False

try:
    import deep_sort_realtime
    _HAS_DEEP_SORT = True
    logger.info("DeepSORT available")
except ImportError:
    pass

try:
    import supervision
    _HAS_BYTE_TRACK = True
    logger.info("Supervision (ByteTrack) available")
except ImportError:
    pass


class TrackerSession:
    """Represents an active tracking session."""

    def __init__(self, session_id: str, tracker_type: str, source: str):
        self.session_id = session_id
        self.tracker_type = tracker_type
        self.source = source
        self.status = "running"
        self.active_tracks = 0
        self.total_tracks = 0
        self.fps = 0.0
        self.start_time = time.time()
        self._tracker: Any = None
        self._next_track_id = 1

    def init_tracker(self):
        """Initialize the actual tracker backend."""
        if self.tracker_type == "deep_sort" and _HAS_DEEP_SORT:
            from deep_sort_realtime.deepsort_tracker import DeepSort
            self._tracker = DeepSort(max_age=30, n_init=3)
            logger.info("Initialized DeepSORT tracker for session %s", self.session_id)
        elif self.tracker_type == "byte_track" and _HAS_BYTE_TRACK:
            from supervision import ByteTrack
            self._tracker = ByteTrack()
            logger.info("Initialized ByteTrack tracker for session %s", self.session_id)
        else:
            self._tracker = None
            logger.info(
                "Using mock tracker for session %s (type=%s)",
                self.session_id, self.tracker_type,
            )

    def update(self, detections: list[dict]) -> list[dict]:
        """
        Update tracker with new detections and return tracked objects.

        Each detection: {x1, y1, x2, y2, confidence, class_name, class_id}
        Returns: list of {track_id, x1, y1, x2, y2, confidence, class_name, class_id}
        """
        if self._tracker is None:
            return self._mock_update(detections)

        if self.tracker_type == "deep_sort" and _HAS_DEEP_SORT:
            return self._deepsort_update(detections)
        elif self.tracker_type == "byte_track" and _HAS_BYTE_TRACK:
            return self._bytetrack_update(detections)

        return self._mock_update(detections)

    def _deepsort_update(self, detections: list[dict]) -> list[dict]:
        """Update using DeepSORT."""
        bbs = []
        for d in detections:
            w = d["x2"] - d["x1"]
            h = d["y2"] - d["y1"]
            bbs.append(([d["x1"], d["y1"], w, h], d["confidence"], d["class_name"]))

        tracks = self._tracker.update_tracks(bbs, frame=None)
        results = []
        for track in tracks:
            if not track.is_confirmed():
                continue
            ltrb = track.to_ltrb()
            results.append({
                "track_id": track.track_id,
                "x1": round(ltrb[0], 1),
                "y1": round(ltrb[1], 1),
                "x2": round(ltrb[2], 1),
                "y2": round(ltrb[3], 1),
                "confidence": round(track.det_conf or 0.0, 4),
                "class_name": track.det_class or "unknown",
                "class_id": 0,
            })

        self.active_tracks = len(results)
        self.total_tracks = max(self.total_tracks, self.active_tracks)
        return results

    def _bytetrack_update(self, detections: list[dict]) -> list[dict]:
        """Update using ByteTrack via supervision."""
        import numpy as np
        from supervision import Detections as SvDetections

        if not detections:
            self.active_tracks = 0
            return []

        xyxy = np.array([[d["x1"], d["y1"], d["x2"], d["y2"]] for d in detections])
        confs = np.array([d["confidence"] for d in detections])
        class_ids = np.array([d["class_id"] for d in detections])

        sv_dets = SvDetections(xyxy=xyxy, confidence=confs, class_id=class_ids)
        tracked = self._tracker.update_with_detections(sv_dets)

        results = []
        if tracked.tracker_id is not None:
            for i, tid in enumerate(tracked.tracker_id):
                box = tracked.xyxy[i]
                results.append({
                    "track_id": int(tid),
                    "x1": round(float(box[0]), 1),
                    "y1": round(float(box[1]), 1),
                    "x2": round(float(box[2]), 1),
                    "y2": round(float(box[3]), 1),
                    "confidence": round(float(tracked.confidence[i]), 4),
                    "class_name": detections[i]["class_name"] if i < len(detections) else "unknown",
                    "class_id": int(tracked.class_id[i]),
                })

        self.active_tracks = len(results)
        self.total_tracks = max(self.total_tracks, self.active_tracks)
        return results

    def _mock_update(self, detections: list[dict]) -> list[dict]:
        """Generate mock tracking results."""
        results = []
        for d in detections:
            results.append({
                "track_id": self._next_track_id,
                "x1": d["x1"] + random.uniform(-2, 2),
                "y1": d["y1"] + random.uniform(-2, 2),
                "x2": d["x2"] + random.uniform(-2, 2),
                "y2": d["y2"] + random.uniform(-2, 2),
                "confidence": d["confidence"],
                "class_name": d["class_name"],
                "class_id": d["class_id"],
            })
            self._next_track_id += 1

        self.active_tracks = len(results)
        self.total_tracks += len(results)
        return results

    def stop(self):
        self.status = "stopped"
        self._tracker = None

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "tracker_type": self.tracker_type,
            "source": self.source,
            "status": self.status,
            "active_tracks": self.active_tracks,
            "total_tracks": self.total_tracks,
            "fps": round(self.fps, 1),
            "uptime_s": round(time.time() - self.start_time, 1),
        }


class TrackerService:
    """Manages tracking sessions."""

    def __init__(self):
        self._sessions: dict[str, TrackerSession] = {}

    def create_session(self, session_id: str, tracker_type: str, source: str) -> TrackerSession:
        session = TrackerSession(session_id, tracker_type, source)
        session.init_tracker()
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> TrackerSession | None:
        return self._sessions.get(session_id)

    def stop_session(self, session_id: str) -> TrackerSession | None:
        session = self._sessions.get(session_id)
        if session:
            session.stop()
        return session

    def list_sessions(self) -> list[dict]:
        return [s.to_dict() for s in self._sessions.values()]

    @property
    def supported_trackers(self) -> list[dict]:
        return [
            {
                "id": "deep_sort",
                "name": "DeepSORT",
                "available": _HAS_DEEP_SORT,
                "description": "Deep appearance feature + Kalman filter",
            },
            {
                "id": "byte_track",
                "name": "ByteTrack",
                "available": _HAS_BYTE_TRACK,
                "description": "High-performance multi-object tracking",
            },
            {
                "id": "bot_sort",
                "name": "BoT-SORT",
                "available": False,
                "description": "Bag of Tricks for SORT (planned)",
            },
        ]

    @property
    def is_real_mode(self) -> bool:
        return _HAS_DEEP_SORT or _HAS_BYTE_TRACK


# Singleton instance
tracker_service = TrackerService()
