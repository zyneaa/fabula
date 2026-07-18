from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.auth import router as auth_router
from app.api.materials import router as materials_router
from app.api.llm_config import router as llm_config_router
from app.api.users import router as users_router
from app.api.notes import router as notes_router
from app.api.quizzes import router as quizzes_router
from app.api.exam_papers import router as exam_papers_router
from app.api.uni_info import router as uni_info_router
from app.api.chat import router as chat_router
from app.api.departments import router as departments_router
from app.api.system_configs import router as system_configs_router
from app.core.rate_limit import setup_rate_limiting

app = FastAPI(title="Fabula", version="0.1.0")

setup_rate_limiting(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(materials_router)
app.include_router(llm_config_router)
app.include_router(users_router)
app.include_router(notes_router)
app.include_router(quizzes_router)
app.include_router(exam_papers_router)
app.include_router(uni_info_router)
app.include_router(chat_router)
app.include_router(departments_router)
app.include_router(system_configs_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
