"""跟踪器统一管理接口"""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np


@dataclass
class Track:
    """单个跟踪目标"""
    track_id: int
    class_id: int
    class_name: str
    bbox: list[float]  # [x1, y1, x2, y2]
    confidence: float
    trajectory: list[list[float]] = field(default_factory=list)  # 历史中心点
    age: int = 0
    hits: int = 0
    time_since_update: int = 0


class TrackerManager:
    """跟踪器管理器，支持切换不同跟踪算法"""

    SUPPORTED_TRACKERS = ["deep_sort", "byte_track", "bot_sort"]

    def __init__(self, tracker_type: str = "deep_sort", max_age: int = 30):
        self.tracker_type = tracker_type
        self.max_age = max_age
        self.tracks: list[Track] = []
        self.frame_count = 0
        self._next_id = 1
        print(f"[TrackerManager] Initialized with tracker: {tracker_type}")

    def update(self, detections: list[dict]) -> list[Track]:
        """更新跟踪状态
        Args:
            detections: 检测结果列表，每个元素包含 bbox, confidence, class_id, class_name
        Returns:
            当前活跃的跟踪目标列表
        """
        self.frame_count += 1

        if self.tracker_type == "deep_sort":
            return self._update_deep_sort(detections)
        elif self.tracker_type == "byte_track":
            return self._update_byte_track(detections)
        elif self.tracker_type == "bot_sort":
            return self._update_bot_sort(detections)
        else:
            raise ValueError(f"Unsupported tracker: {self.tracker_type}")

    def _update_deep_sort(self, detections: list[dict]) -> list[Track]:
        """DeepSORT 跟踪更新（简化版，完整版见 trackers/deep_sort.py）"""
        # 增加所有现有轨迹的 time_since_update
        for track in self.tracks:
            track.time_since_update += 1

        # 简单的 IoU 匹配（完整版使用匈牙利算法 + ReID 特征）
        matched, unmatched_dets = self._iou_matching(detections)

        # 更新匹配到的轨迹
        for track_idx, det in matched:
            track = self.tracks[track_idx]
            track.bbox = det["bbox"]
            track.confidence = det["confidence"]
            track.time_since_update = 0
            track.hits += 1
            track.age += 1
            cx = (det["bbox"][0] + det["bbox"][2]) / 2
            cy = (det["bbox"][1] + det["bbox"][3]) / 2
            track.trajectory.append([cx, cy])

        # 为未匹配的检测创建新轨迹
        for det in unmatched_dets:
            cx = (det["bbox"][0] + det["bbox"][2]) / 2
            cy = (det["bbox"][1] + det["bbox"][3]) / 2
            new_track = Track(
                track_id=self._next_id,
                class_id=det.get("class_id", 0),
                class_name=det.get("class_name", "unknown"),
                bbox=det["bbox"],
                confidence=det["confidence"],
                trajectory=[[cx, cy]],
                hits=1,
            )
            self.tracks.append(new_track)
            self._next_id += 1

        # 删除过期轨迹
        self.tracks = [t for t in self.tracks if t.time_since_update <= self.max_age]

        return [t for t in self.tracks if t.time_since_update == 0]

    def _update_byte_track(self, detections: list[dict]) -> list[Track]:
        """ByteTrack 跟踪更新（占位，逻辑同 DeepSORT 简化版）"""
        return self._update_deep_sort(detections)

    def _update_bot_sort(self, detections: list[dict]) -> list[Track]:
        """BoT-SORT 跟踪更新（占位，逻辑同 DeepSORT 简化版）"""
        return self._update_deep_sort(detections)

    def _iou_matching(self, detections: list[dict]) -> tuple[list, list]:
        """简单 IoU 匹配"""
        if not self.tracks or not detections:
            return [], detections

        track_boxes = np.array([t.bbox for t in self.tracks])
        det_boxes = np.array([d["bbox"] for d in detections])

        iou_matrix = self._compute_iou_matrix(track_boxes, det_boxes)

        matched = []
        used_tracks = set()
        used_dets = set()

        # 贪心匹配
        while True:
            if iou_matrix.size == 0:
                break
            max_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
            if iou_matrix[max_idx] < 0.3:
                break
            t_idx, d_idx = max_idx
            if t_idx not in used_tracks and d_idx not in used_dets:
                matched.append((t_idx, detections[d_idx]))
                used_tracks.add(t_idx)
                used_dets.add(d_idx)
            iou_matrix[t_idx, d_idx] = 0

        unmatched_dets = [detections[i] for i in range(len(detections)) if i not in used_dets]
        return matched, unmatched_dets

    @staticmethod
    def _compute_iou_matrix(boxes_a: np.ndarray, boxes_b: np.ndarray) -> np.ndarray:
        """计算两组框的 IoU 矩阵"""
        x1 = np.maximum(boxes_a[:, 0:1], boxes_b[:, 0:1].T)
        y1 = np.maximum(boxes_a[:, 1:2], boxes_b[:, 1:2].T)
        x2 = np.minimum(boxes_a[:, 2:3], boxes_b[:, 2:3].T)
        y2 = np.minimum(boxes_a[:, 3:4], boxes_b[:, 3:4].T)

        inter = np.maximum(0, x2 - x1) * np.maximum(0, y2 - y1)
        area_a = (boxes_a[:, 2] - boxes_a[:, 0]) * (boxes_a[:, 3] - boxes_a[:, 1])
        area_b = (boxes_b[:, 2] - boxes_b[:, 0]) * (boxes_b[:, 3] - boxes_b[:, 1])
        union = area_a[:, None] + area_b[None, :] - inter

        return inter / (union + 1e-6)

    def reset(self):
        """重置跟踪器"""
        self.tracks.clear()
        self.frame_count = 0
        self._next_id = 1
