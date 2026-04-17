from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .database import init_db
from .routers import sessions, interviews

app = FastAPI(title="AI Interview Preparer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sessions.router)
app.include_router(interviews.router)

recordings_dir = os.path.join(os.path.dirname(__file__), "recordings")
os.makedirs(recordings_dir, exist_ok=True)
app.mount("/recordings", StaticFiles(directory=recordings_dir), name="recordings")


@app.on_event("startup")
def startup():
    init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/models")
async def get_models():
    from .services.ollama_service import list_models
    return {"models": await list_models()}
