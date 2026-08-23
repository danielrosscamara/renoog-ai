from fastapi import APIRouter
from app.api.v1.routes import health, characters, personas, chats

api_router = APIRouter()

# Register all v1 sub-routers
api_router.include_router(health.router)
api_router.include_router(characters.router)
api_router.include_router(personas.router)
api_router.include_router(chats.router)
