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
        self.frame_count = 0
        self.start_time = time.time()
        self._tracker: Any = None
        self._next_track_id = 1
        self._track_history: dict[int, dict] = {}  # track_id -> {class_name, frames, trajectory}

    def init_tracker(self):
        """Initialize the actual tracker backend with graceful fallback."""
        try:
            if self.tracker_type == "deep_sort" and _HAS_DEEP_SORT:
                from deep_sort_realtime.deepsort_tracker import DeepSort
                self._tracker = DeepSort(max_age=30, n_init=3)
                self.is_mock = False
                logger.info("Initialized DeepSORT tracker for session %s", self.session_id)
                return
            elif self.tracker_type == "byte_track" and _HAS_BYTE_TRACK:
                from supervision import ByteTrack
                self._tracker = ByteTrack()
                self.is_mock = False
                logger.info("Initialized ByteTrack tracker for session %s", self.session_id)
                return
            elif self.tracker_type == "bot_sort" and _HAS_BYTE_TRACK:
                from supervision import ByteTrack
                self._tracker = ByteTrack(
                    track_activation_threshold=0.25,
                    lost_track_buffer=40,
                    minimum_matching_threshold=0.85,
                    frame_rate=30,
                )
                self.is_mock = False
                logger.info("Initialized BoT-SORT tracker for session %s", self.session_id)
                return
        except Exception as e:
            logger.warning(
                "Failed to initialize %s for session %s: %s — falling back to mock",
                self.tracker_type, self.session_id, e,
            )

        # Fallback to mock tracker
        self._tracker = None
        self.is_mock = True
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
        self.frame_count += 1
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            self.fps = round(self.frame_count / elapsed, 1)

        if self._tracker is None:
            results = self._mock_update(detections)
        elif self.tracker_type == "deep_sort" and _HAS_DEEP_SORT:
            results = self._deepsort_update(detections)
        elif self.tracker_type in ("byte_track", "bot_sort") and _HAS_BYTE_TRACK:
            results = self._bytetrack_update(detections)
        else:
            results = self._mock_update(detections)

        # Accumulate track history for DB persistence
        for obj in results:
            tid = obj["track_id"]
            if tid not in self._track_history:
                self._track_history[tid] = {
                    "class_name": obj["class_name"],
                    "frames": 0,
                    "trajectory": [],
                }
            h = self._track_history[tid]
            h["frames"] += 1
            h["class_name"] = obj["class_name"]
            cx = round((obj["x1"] + obj["x2"]) / 2, 1)
            cy = round((obj["y1"] + obj["y2"]) / 2, 1)
            h["trajectory"].append([cx, cy])
            # Keep trajectory reasonable
            if len(h["trajectory"]) > 200:
                h["trajectory"] = h["trajectory"][-200:]

        return results

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
        """
        Mock tracking with IoU-based ID persistence.

        Maintains consistent track IDs across frames by matching new detections
        to previous ones using Intersection-over-Union (IoU).
        """
        if not hasattr(self, '_prev_tracks'):
            self._prev_tracks: list[dict] = []
            self._mock_max_lost = 8  # frames before dropping a track
            self._mock_lost_count: dict[int, int] = {}

        def _iou(a: dict, b: dict) -> float:
            x1 = max(a["x1"], b["x1"])
            y1 = max(a["y1"], b["y1"])
            x2 = min(a["x2"], b["x2"])
            y2 = min(a["y2"], b["y2"])
            inter = max(0, x2 - x1) * max(0, y2 - y1)
            area_a = max(0, a["x2"] - a["x1"]) * max(0, a["y2"] - a["y1"])
            area_b = max(0, b["x2"] - b["x1"]) * max(0, b["y2"] - b["y1"])
            union = area_a + area_b - inter
            return inter / union if union > 0 else 0

        # Match detections to previous tracks using IoU
        used_prev = set()
        results = []
        for d in detections:
            best_iou = 0.0
            best_tid = -1
            best_idx = -1
            for idx, prev in enumerate(self._prev_tracks):
                if idx in used_prev:
                    continue
                score = _iou(d, prev)
                if score > best_iou:
                    best_iou = score
                    best_tid = prev["track_id"]
                    best_idx = idx

            if best_iou >= 0.25 and best_idx >= 0:
                # Matched — reuse track ID
                tid = best_tid
                used_prev.add(best_idx)
                self._mock_lost_count.pop(tid, None)
            else:
                # New track
                tid = self._next_track_id
                self._next_track_id += 1
                self.total_tracks += 1

            results.append({
                "track_id": tid,
                "x1": round(d["x1"], 1),
                "y1": round(d["y1"], 1),
                "x2": round(d["x2"], 1),
                "y2": round(d["y2"], 1),
                "confidence": d["confidence"],
                "class_name": d["class_name"],
                "class_id": d["class_id"],
            })

        self._prev_tracks = results
        self.active_tracks = len(results)
        return results

    def stop(self):
        self.status = "stopped"
        self._tracker = None

    def get_track_summaries(self) -> list[dict]:
        """Return accumulated track summaries for DB persistence."""
        summaries = []
        for tid, h in self._track_history.items():
            summaries.append({
                "track_id": tid,
                "class_name": h["class_name"],
                "total_frames": h["frames"],
                "trajectory": h["trajectory"],
            })
        return summaries

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "tracker_type": self.tracker_type,
            "source": self.source,
            "status": self.status,
            "active_tracks": self.active_tracks,
            "total_tracks": self.total_tracks,
            "fps": round(self.fps, 1),
            "is_mock": getattr(self, 'is_mock', True),
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
                "available": _HAS_BYTE_TRACK,
                "description": "Bag of Tricks for SORT (enhanced ByteTrack)",
            },
        ]

    @property
    def is_real_mode(self) -> bool:
        return _HAS_DEEP_SORT or _HAS_BYTE_TRACK


# Singleton instance
tracker_service = TrackerService()
