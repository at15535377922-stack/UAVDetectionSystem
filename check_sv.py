import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend'))
out = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sv_check.txt'), 'w')

try:
    import supervision
    out.write(f"supervision version: {supervision.__version__}\n")
    # Check for ByteTrack
    out.write(f"Has ByteTrack: {hasattr(supervision, 'ByteTrack')}\n")
    # Check for any BoT-SORT related
    bot_attrs = [a for a in dir(supervision) if 'bot' in a.lower() or 'sort' in a.lower()]
    out.write(f"BoT/SORT related attrs: {bot_attrs}\n")
    # All tracker-like classes
    tracker_attrs = [a for a in dir(supervision) if 'track' in a.lower() or 'Track' in a]
    out.write(f"Tracker related attrs: {tracker_attrs}\n")
except Exception as e:
    out.write(f"Error: {e}\n")

out.close()
