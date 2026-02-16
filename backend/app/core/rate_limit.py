"""
Simple in-memory rate limiting middleware for FastAPI.

In production, replace with Redis-based rate limiting for
distributed deployments.
"""

import time
import logging
from collections import defaultdict

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Token bucket rate limiter per client IP.

    Args:
        app: FastAPI application
        requests_per_minute: Max requests per minute per IP
        burst: Max burst size (bucket capacity)
    """

    def __init__(self, app, requests_per_minute: int = 120, burst: int = 20):
        super().__init__(app)
        self.rate = requests_per_minute / 60.0  # tokens per second
        self.burst = burst
        self._buckets: dict[str, dict] = defaultdict(
            lambda: {"tokens": burst, "last": time.monotonic()}
        )

    def _get_client_ip(self, request: Request) -> str:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def _consume(self, ip: str) -> bool:
        """Try to consume a token. Returns True if allowed."""
        now = time.monotonic()
        bucket = self._buckets[ip]
        elapsed = now - bucket["last"]
        bucket["last"] = now

        # Refill tokens
        bucket["tokens"] = min(
            self.burst,
            bucket["tokens"] + elapsed * self.rate,
        )

        if bucket["tokens"] >= 1.0:
            bucket["tokens"] -= 1.0
            return True
        return False

    # Paths exempt from rate limiting (high-frequency endpoints)
    _EXEMPT_PREFIXES = ("/api/ws", "/api/detections/image", "/api/detections/models", "/api/detections/stats", "/api/tracking/frame")

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip rate limiting for WebSocket, health check, and high-frequency detection endpoints
        path = request.url.path
        if path == "/api/health" or path.startswith(self._EXEMPT_PREFIXES):
            return await call_next(request)

        ip = self._get_client_ip(request)

        if not self._consume(ip):
            logger.warning("Rate limit exceeded for IP: %s on %s", ip, path)
            return JSONResponse(
                status_code=429,
                content={"detail": "请求过于频繁，请稍后再试"},
                headers={"Retry-After": "5"},
            )

        response = await call_next(request)
        return response
