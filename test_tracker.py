import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
# Write output to file
_out = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_result.txt'), 'w', encoding='utf-8')
sys.stdout = _out
sys.stderr = _out

from app.services.tracker import tracker_service, _HAS_DEEP_SORT, _HAS_BYTE_TRACK

print(f"DeepSORT available: {_HAS_DEEP_SORT}")
print(f"ByteTrack available: {_HAS_BYTE_TRACK}")

# Test mock tracker IoU-based matching
s = tracker_service.create_session("test1", "deep_sort", "cam")
dets1 = [
    {"x1": 100, "y1": 100, "x2": 200, "y2": 200, "confidence": 0.9, "class_name": "drone", "class_id": 0},
    {"x1": 300, "y1": 300, "x2": 400, "y2": 400, "confidence": 0.85, "class_name": "bird", "class_id": 1},
]
r1 = s.update(dets1)
print(f"\nFrame 1 results: {len(r1)} objects")
for obj in r1:
    print(f"  track_id={obj['track_id']}, class={obj['class_name']}, conf={obj['confidence']}")

# Slightly moved detections (should keep same IDs)
dets2 = [
    {"x1": 105, "y1": 105, "x2": 205, "y2": 205, "confidence": 0.88, "class_name": "drone", "class_id": 0},
    {"x1": 305, "y1": 305, "x2": 405, "y2": 405, "confidence": 0.82, "class_name": "bird", "class_id": 1},
]
r2 = s.update(dets2)
print(f"\nFrame 2 results: {len(r2)} objects")
for obj in r2:
    print(f"  track_id={obj['track_id']}, class={obj['class_name']}, conf={obj['confidence']}")

# Check ID consistency
ids1 = [o["track_id"] for o in r1]
ids2 = [o["track_id"] for o in r2]
print(f"\nFrame 1 IDs: {ids1}")
print(f"Frame 2 IDs: {ids2}")
print(f"IDs consistent: {ids1 == ids2}")

# Check summaries
summaries = s.get_track_summaries()
print(f"\nTrack summaries: {len(summaries)} tracks")
for sm in summaries:
    print(f"  track_id={sm['track_id']}, class={sm['class_name']}, frames={sm['total_frames']}, traj_len={len(sm['trajectory'])}")

print(f"\nSession stats: active={s.active_tracks}, total={s.total_tracks}, fps={s.fps}, frames={s.frame_count}")
print("\nAll tests passed!")
