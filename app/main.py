from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.materials import router as materials_router

app = FastAPI(title="Fabula", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(materials_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
