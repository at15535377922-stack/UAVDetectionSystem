import pathlib
out = pathlib.Path(__file__).parent / "botsort_check.txt"

lines = []
try:
    import supervision
    lines.append(f"supervision version: {supervision.__version__}")
    lines.append(f"Has ByteTrack: {hasattr(supervision, 'ByteTrack')}")
    bot_attrs = [a for a in dir(supervision) if 'bot' in a.lower() or 'sort' in a.lower()]
    lines.append(f"BoT/SORT attrs: {bot_attrs}")
except Exception as e:
    lines.append(f"supervision error: {e}")

try:
    from ultralytics.trackers.bot_sort import BOTrack, BOTSORT
    lines.append("ultralytics BOTSORT: available")
except Exception as e:
    lines.append(f"ultralytics BOTSORT: {e}")

try:
    from ultralytics.trackers.byte_tracker import BYTETracker
    lines.append("ultralytics BYTETracker: available")
except Exception as e:
    lines.append(f"ultralytics BYTETracker: {e}")

out.write_text("\n".join(lines), encoding="utf-8")
