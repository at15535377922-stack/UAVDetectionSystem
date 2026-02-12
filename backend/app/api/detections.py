from fastapi import APIRouter, UploadFile, File

router = APIRouter()


@router.post("/image")
async def detect_image(file: UploadFile = File(...)):
    return {
        "message": "Image detection - TODO",
        "filename": file.filename,
        "detections": [],
    }


@router.post("/stream/start")
async def start_stream_detection():
    return {"message": "Start stream detection - TODO"}


@router.post("/stream/stop")
async def stop_stream_detection():
    return {"message": "Stop stream detection - TODO"}


@router.get("/results")
async def list_detection_results():
    return {"results": [], "message": "Detection results - TODO"}


@router.get("/results/{result_id}")
async def get_detection_result(result_id: str):
    return {"result_id": result_id, "message": "Detection result detail - TODO"}
