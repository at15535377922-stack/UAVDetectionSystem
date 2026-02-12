from fastapi import APIRouter

router = APIRouter()


@router.post("/start")
async def start_tracking():
    return {"message": "Start tracking - TODO"}


@router.post("/stop")
async def stop_tracking():
    return {"message": "Stop tracking - TODO"}


@router.get("/tracks")
async def list_tracks():
    return {"tracks": [], "message": "Track list - TODO"}


@router.get("/tracks/{track_id}")
async def get_track(track_id: str):
    return {"track_id": track_id, "message": "Track detail - TODO"}


@router.get("/tracks/{track_id}/trajectory")
async def get_trajectory(track_id: str):
    return {"track_id": track_id, "trajectory": [], "message": "Trajectory - TODO"}
