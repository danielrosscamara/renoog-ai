from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import init_db
from app.db.seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Auto-create tables & seed initial data
    await init_db()
    await seed_database()
    yield
    # Shutdown

app = FastAPI(
    title="Renoog AI Backend Engine",
    version="1.0.0",
    description="High-performance async roleplay engine with SSE streaming and TavernAI V2 support.",
    lifespan=lifespan
)

# CORS: Allow requests from React frontend on http://localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Renoog AI Backend Engine is running!",
        "docs": "http://localhost:8000/docs",
        "health": "http://localhost:8000/api/v1/health"
    }
