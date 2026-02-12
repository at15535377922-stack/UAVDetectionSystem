from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_missions():
    return {"missions": [], "message": "Mission list - TODO"}


@router.post("/")
async def create_mission():
    return {"message": "Create mission - TODO"}


@router.get("/{mission_id}")
async def get_mission(mission_id: str):
    return {"mission_id": mission_id, "message": "Get mission detail - TODO"}


@router.delete("/{mission_id}")
async def delete_mission(mission_id: str):
    return {"mission_id": mission_id, "message": "Delete mission - TODO"}
