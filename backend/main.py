"""VDI Taxi — FastAPI backend entry-point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base
from backend.auth import router as auth_router
from backend.slots import router as slots_router
from backend.profile import router as profile_router
from backend.bookings import router as bookings_router
from backend.queue import router as queue_router
from backend.templates import router as templates_router
from backend.admin import router as admin_router
from backend.sessions import router as sessions_router
from backend.health import router as health_router
from backend.websocket import router as ws_router

logger = logging.getLogger(__name__)

# Create tables on startup
Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start Telegram bot on app startup, stop on shutdown."""
    from backend.config import settings
    if settings.telegram_bot_token:
        try:
            from backend.telegram_bot import start_bot, stop_bot
            await start_bot()
            logger.info("Telegram bot started")
        except Exception as e:
            logger.warning("Telegram bot failed to start: %s", e)
    else:
        logger.info("Telegram bot skipped (no token)")

    yield

    # Shutdown
    try:
        from backend.telegram_bot import stop_bot
        await stop_bot()
    except Exception:
        pass


app = FastAPI(title="VDI Taxi", version="0.1.0", lifespan=lifespan)

# CORS — allow Vite dev server + production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(slots_router, prefix="/api")
app.include_router(profile_router, prefix="/api")
app.include_router(bookings_router, prefix="/api")
app.include_router(queue_router, prefix="/api")
app.include_router(templates_router, prefix="/api")
app.include_router(admin_router, prefix="/api")
app.include_router(sessions_router, prefix="/api")
app.include_router(health_router, prefix="/api")
app.include_router(ws_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
