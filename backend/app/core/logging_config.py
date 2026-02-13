"""
Structured logging configuration for the UAV Detection System backend.
"""

import logging
import sys
from datetime import datetime, timezone


class StructuredFormatter(logging.Formatter):
    """JSON-like structured log formatter."""

    LEVEL_COLORS = {
        "DEBUG": "\033[36m",     # Cyan
        "INFO": "\033[32m",      # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "CRITICAL": "\033[35m",  # Magenta
    }
    RESET = "\033[0m"

    def __init__(self, use_color: bool = True):
        super().__init__()
        self.use_color = use_color

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
        level = record.levelname
        name = record.name
        msg = record.getMessage()

        if self.use_color and level in self.LEVEL_COLORS:
            level_str = f"{self.LEVEL_COLORS[level]}{level:8s}{self.RESET}"
        else:
            level_str = f"{level:8s}"

        line = f"{ts} | {level_str} | {name} | {msg}"

        if record.exc_info and not record.exc_text:
            record.exc_text = self.formatException(record.exc_info)
        if record.exc_text:
            line += f"\n{record.exc_text}"

        return line


def setup_logging(level: str = "INFO", use_color: bool = True):
    """Configure application-wide logging."""
    root = logging.getLogger()
    root.setLevel(getattr(logging, level.upper(), logging.INFO))

    # Remove existing handlers
    for handler in root.handlers[:]:
        root.removeHandler(handler)

    # Console handler
    console = logging.StreamHandler(sys.stdout)
    console.setFormatter(StructuredFormatter(use_color=use_color))
    root.addHandler(console)

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    logging.getLogger("app").info("Logging initialized (level=%s)", level)
