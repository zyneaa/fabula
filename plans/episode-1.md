# Episode 1 — Foundation

## Goal

Project skeleton, DB, auth working.

## Tasks

1. Init project structure, `requirements.txt` with deps:
   - `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg2-binary`
   - `python-jose[cryptography]`, `passlib[argon]`, `python-multipart`
   - `pydantic-settings`, `slowapi` (rate limiting)
   - `httpx` (for OpenRouter calls)
   - `pymupdf` (PDF), `python-docx` (DOCX), `python-pptx` (PPTX)
2. `config.py` — Pydantic Settings reading `.env` (DB URL, JWT secret, OpenRouter key)
3. `database.py` — SQLAlchemy async engine + session factory
4. All models in `app/models/`
5. Alembic init + initial migration from models
6. `core/security.py` — JWT creation/verification, password hashing
7. `api/auth.py` — register, login, me endpoints
8. `dependencies.py` — `get_db`, `get_current_user`, `require_role`
9. `core/exceptions.py` — custom HTTP exceptions + handlers
10. `docker-compose.yml` — Postgres service

## Deliverable

Can register, login, get JWT, access protected routes.

## Status

**Done.**
