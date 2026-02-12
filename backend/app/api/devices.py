from fastapi import APIRouter

router = APIRouter()


@router.get("/")
async def list_devices():
    return {"devices": [], "message": "Device list - TODO"}


@router.post("/")
async def register_device():
    return {"message": "Register device - TODO"}


@router.get("/{device_id}")
async def get_device(device_id: str):
    return {"device_id": device_id, "message": "Get device detail - TODO"}
