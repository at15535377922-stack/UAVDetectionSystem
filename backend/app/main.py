import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text as select_text

from app.api import auth, missions, devices, detections, tracking, planning, settings, flight, datasets, training, alerts
from app.api.websocket import router as ws_router
from app.core.database import engine, Base
from app.core.logging_config import setup_logging
from app.core.rate_limit import RateLimitMiddleware
from app.services.detector import detector_service
from app.services.tracker import tracker_service
from app.services.onnx_detector import onnx_detector_service

setup_logging(level="INFO")
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (dev only — use Alembic in production)
    logger.info("Starting UAV Detection System...")
    logger.info("Detection mode: %s", "REAL" if detector_service.is_real_mode else "MOCK")
    logger.info("ONNX Runtime: %s (providers: %s)", "YES" if onnx_detector_service.is_available else "NO", onnx_detector_service.providers)
    logger.info("Tracking mode: %s", "REAL" if tracker_service.is_real_mode else "MOCK")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables ready")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await engine.dispose()


app = FastAPI(
    title="UAV Detection System API",
    description="无人机智能巡检系统后端 API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RateLimitMiddleware, requests_per_minute=120, burst=20)

# REST API routers
app.include_router(auth.router, prefix="/api/auth", tags=["认证"])
app.include_router(missions.router, prefix="/api/missions", tags=["任务管理"])
app.include_router(devices.router, prefix="/api/devices", tags=["设备管理"])
app.include_router(detections.router, prefix="/api/detections", tags=["目标检测"])
app.include_router(tracking.router, prefix="/api/tracking", tags=["目标跟踪"])
app.include_router(planning.router, prefix="/api/planning", tags=["路径规划"])
app.include_router(settings.router, prefix="/api/settings", tags=["系统设置"])
app.include_router(flight.router, prefix="/api/flight", tags=["飞控通信"])
app.include_router(datasets.router, prefix="/api/datasets", tags=["数据集管理"])
app.include_router(training.router, prefix="/api/training/jobs", tags=["模型训练"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["告警系统"])

# WebSocket router
app.include_router(ws_router, prefix="/api/ws", tags=["WebSocket"])


@app.get("/api/health")
async def health_check():
    """Enhanced health check with component status."""
    import time
    from app.core.database import engine as db_engine

    components: dict[str, dict] = {}

    # Database check
    try:
        start = time.perf_counter()
        async with db_engine.connect() as conn:
            await conn.execute(select_text("SELECT 1"))
        db_ms = (time.perf_counter() - start) * 1000
        components["database"] = {"status": "ok", "latency_ms": round(db_ms, 1)}
    except Exception as e:
        components["database"] = {"status": "error", "detail": str(e)}

    # Detection service
    components["detection"] = {
        "mode": "real" if detector_service.is_real_mode else "mock",
        "onnx_available": onnx_detector_service.is_available,
        "onnx_providers": onnx_detector_service.providers,
    }

    # Tracking service
    components["tracking"] = {
        "mode": "real" if tracker_service.is_real_mode else "mock",
    }

    overall = "ok" if components["database"].get("status") == "ok" else "degraded"

    return {
        "status": overall,
        "service": "UAV Detection System",
        "version": "0.1.0",
        "components": components,
    }
