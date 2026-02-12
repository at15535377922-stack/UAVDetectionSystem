from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, missions, devices, detections, tracking, planning

app = FastAPI(
    title="UAV Detection System API",
    description="无人机智能巡检系统后端 API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(missions.router, prefix="/api/missions", tags=["任务管理"])
app.include_router(devices.router, prefix="/api/devices", tags=["设备管理"])
app.include_router(detections.router, prefix="/api/detections", tags=["目标检测"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["目标跟踪"])
app.include_router(planning.router, prefix="/api/planning", tags=["路径规划"])


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "UAV Detection System"}
