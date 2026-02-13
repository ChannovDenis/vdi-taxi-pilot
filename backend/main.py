"""VDI Taxi — FastAPI backend entry-point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import engine, Base
from backend.auth import router as auth_router
from backend.slots import router as slots_router
from backend.profile import router as profile_router

# Create tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(title="VDI Taxi", version="0.1.0")

# CORS — allow Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api")
app.include_router(slots_router, prefix="/api")
app.include_router(profile_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
