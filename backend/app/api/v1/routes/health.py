from fastapi import APIRouter

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "renoog-ai-backend",
        "engine": "FastAPI + Async Python 3.12"
    }
