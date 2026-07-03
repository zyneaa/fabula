# Episode 0 — Fabula Backend Plan

## Overview

University-specific AI learning assistant. Two roles: **student**, **teacher**.
Teachers upload course materials + uni info. Students query uni info + generate study aids.

**Stack:** FastAPI, PostgreSQL, SQLAlchemy, Alembic, OpenRouter (pluggable LLM).
**Audio:** Deferred.

---

## Domain Model

| Entity | Key Fields | Notes |
|---|---|---|
| **User** | id, email, password_hash, role (student/teacher), name, department | JWT auth |
| **Material** | id, user_id, title, file_path, file_type (pdf/docx/txt/pptx), status (pending/processing/ready/failed), uploaded_at | Uploaded study docs |
| **Chunk** | id, material_id, text, chunk_index, token_count | Parsed text splits for LLM context |
| **Note** | id, material_id, user_id, content (markdown), created_at | LLM-generated notes |
| **Quiz** | id, material_id, user_id, questions (JSON array), created_at | MCQ/short-answer from material |
| **ExamPaper** | id, course_id, teacher_id, source_exam_id, paper_number, content, style_profile (JSON), created_at | Up to 5 per generation, mimics source style |
| **UniInfo** | id, teacher_id, category (timetable/event/directory/course), title, content, metadata (JSON), created_at | Teacher-curated uni knowledge base |
| **Conversation** | id, user_id, created_at | Chat thread |
| **Message** | id, conversation_id, role (user/assistant), content, created_at | Student Q&A about uni |
| **LLMConfig** | id, teacher_id, provider, model_name, is_active, max_tokens, restrictions (JSON) | Teacher controls which models available |

---

## Project Structure

```
fabula/
├── alembic/
├── alembic.ini
├── app/
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── dependencies.py
│   ├── models/
│   │   ├── user.py
│   │   ├── material.py
│   │   ├── note.py
│   │   ├── quiz.py
│   │   ├── exam_paper.py
│   │   ├── uni_info.py
│   │   ├── chat.py
│   │   └── llm_config.py
│   ├── schemas/
│   ├── api/
│   │   ├── auth.py
│   │   ├── materials.py
│   │   ├── notes.py
│   │   ├── quizzes.py
│   │   ├── exam_papers.py
│   │   ├── uni_info.py
│   │   ├── chat.py
│   │   └── llm_config.py
│   ├── services/
│   │   ├── auth.py
│   │   ├── file_parser.py
│   │   ├── chunker.py
│   │   ├── llm.py
│   │   ├── notes.py
│   │   ├── quiz.py
│   │   ├── exam_paper.py
│   │   ├── uni_info.py
│   │   └── chat.py
│   ├── core/
│   │   ├── security.py
│   │   ├── rate_limit.py
│   │   └── exceptions.py
│   └── tasks/
│       └── background.py
├── uploads/
├── tests/
├── requirements.txt
├── .env.example
├── docker-compose.yml
└── plans/
```

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | No | Register student/teacher |
| POST | `/auth/login` | No | Get JWT access token |
| GET | `/auth/me` | Yes | Current user profile |

### Materials
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/materials/upload` | Yes | Upload file (multipart) |
| GET | `/materials/` | Yes | List user's materials |
| GET | `/materials/{id}` | Yes | Get material details + status |
| DELETE | `/materials/{id}` | Yes | Delete material + chunks |

### Notes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/notes/generate` | Yes | Generate notes from material (background task) |
| GET | `/notes/` | Yes | List user's notes |
| GET | `/notes/{id}` | Yes | Get note content |

### Quizzes
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/quizzes/generate` | Yes | Generate quiz from material |
| GET | `/quizzes/` | Yes | List user's quizzes |
| GET | `/quizzes/{id}` | Yes | Get quiz questions |

### Exam Papers (Teacher Only)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/exam-papers/generate` | Teacher | Upload course material + prev exam → generate up to 5 new papers |
| GET | `/exam-papers/` | Teacher | List generated papers |
| GET | `/exam-papers/{id}` | Teacher | Get paper content |

### University Info
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/uni-info/` | Teacher | Add/update uni info entry |
| GET | `/uni-info/` | Yes | List uni info (filterable by category) |
| GET | `/uni-info/{id}` | Yes | Get specific entry |
| DELETE | `/uni-info/{id}` | Teacher | Remove entry |

### Chat (Student Uni Q&A)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/chat/conversations/` | Student | Start new conversation |
| POST | `/chat/conversations/{id}/messages` | Student | Send message, get AI response |
| GET | `/chat/conversations/` | Student | List user's conversations |
| GET | `/chat/conversations/{id}/messages` | Student | Get message history |

### LLM Config (Teacher Only)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/llm-config/` | Teacher | List configured models |
| POST | `/llm-config/` | Teacher | Add model config |
| PUT | `/llm-config/{id}` | Teacher | Update model config |
| DELETE | `/llm-config/{id}` | Teacher | Remove model config |

---

## Implementation Phases

### Phase 1: Foundation
**Goal:** Project skeleton, DB, auth working.

1. Init project structure, `requirements.txt` with deps:
   - `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `psycopg2-binary`
   - `python-jose[cryptography]`, `passlib[bcrypt]`, `python-multipart`
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

**Deliverable:** Can register, login, get JWT, access protected routes.

### Phase 2: Material Management
**Goal:** Upload, parse, chunk study materials.

1. `services/file_parser.py` — extract text from PDF/DOCX/TXT/PPTX
2. `services/chunker.py` — split text into chunks (~500 tokens, 50 overlap)
3. `api/materials.py` — upload (save file, trigger parse+chunk in background), list, get, delete
4. File storage in `uploads/` dir (organized by user_id)
5. Material status tracking (pending → processing → ready/failed)

**Deliverable:** Upload any supported file → text extracted → chunks stored.

### Phase 3: LLM Integration
**Goal:** OpenRouter client, pluggable interface, teacher config.

1. `services/llm.py` — LLM provider interface:
   ```python
   class LLMProvider(Protocol):
       async def complete(self, messages, model, **kwargs) -> str: ...
       async def stream(self, messages, model, **kwargs) -> AsyncIterator[str]: ...
   ```
2. `OpenRouterProvider` impl — httpx calls to OpenRouter API
3. `api/llm_config.py` — teacher CRUD for model configs
4. Model selection logic: check LLMConfig → pick active model → fallback to default
5. `core/rate_limit.py` — slowapi setup:
   - Auth endpoints: 5/min
   - LLM generation: 10/min (student), 30/min (teacher)
   - General: 60/min

**Deliverable:** Teacher configures models. LLM calls work via OpenRouter.

### Phase 4: AI Features
**Goal:** Notes, quizzes, exam paper generation.

1. **Notes generation** (`services/notes.py`):
   - Fetch material chunks → build prompt ("Generate comprehensive study notes from:")
   - Stream LLM response → store as markdown
   - Background task, status polling via GET endpoint

2. **Quiz generation** (`services/quiz.py`):
   - Fetch material chunks → prompt ("Generate 10 quiz questions: mix of MCQ and short answer")
   - Parse LLM JSON response → store structured questions
   - Include answer key

3. **Exam paper generation** (`services/exam_paper.py`):
   - Teacher uploads: course materials + previous exam paper
   - Step 1: Analyze prev exam → extract style profile (question types, difficulty, format, marking scheme)
   - Step 2: Generate up to 5 new papers using style profile + course material content
   - Each paper stored separately with paper_number
   - Background task (can take 30-60s for 5 papers)

**Deliverable:** All 3 AI generation features working via background tasks.

### Phase 5: University Info System
**Goal:** Teacher-curated knowledge base + student Q&A chat.

1. `api/uni_info.py` — teacher CRUD for uni info entries
2. `services/uni_info.py` — retrieval logic:
   - Simple keyword + category matching (no vector DB for now)
   - Fetch relevant entries → inject into LLM context
3. `services/chat.py` — student query flow:
   - Student sends message → search relevant UniInfo entries
   - Build context: "You are a university assistant. Here is relevant info: {entries}"
   - LLM generates response → store in conversation
4. `api/chat.py` — conversation + message endpoints

**Deliverable:** Students can chat about uni info. Teachers populate knowledge base.

### Phase 6: Polish
**Goal:** Presentable, not prod-ready.

1. CORS middleware config
2. Request validation error handling (Pydantic v2)
3. Logging setup (structlog or stdlib)
4. Basic test suite:
   - Auth flow tests
   - Material upload + parse tests
   - Mock LLM for generation tests
   - Uni info CRUD tests
5. `.env.example` with all config vars documented
6. README with setup instructions

**Deliverable:** Clean, documented, testable backend.

---

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Auth | JWT (stateless) | Simple, no session store needed |
| File storage | Local filesystem | Simple for now, S3 swap later |
| LLM calls | Background tasks | Long-running, don't block request |
| Chunking | ~500 tokens, 50 overlap | Good balance of context vs cost |
| Uni info retrieval | Keyword + category match | No vector DB complexity for MVP |
| Rate limiting | slowapi (in-memory) | Simple, per-user limits |
| Exam style mimic | 2-step (analyze → generate) | Separate style extraction from content generation |

---

## Dependencies (requirements.txt)

```
fastapi>=0.110
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
alembic
pydantic-settings
python-jose[cryptography]
passlib[bcrypt]
python-multipart
slowapi
httpx
pymupdf
python-docx
python-pptx
structlog
pytest
pytest-asyncio
```

---

## Environment Variables (.env.example)

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/fabula
JWT_SECRET=change-me
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60
OPENROUTER_API_KEY=sk-or-...
DEFAULT_LLM_MODEL=openai/gpt-4o
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE_MB=50
CORS_ORIGINS=["http://localhost:3000"]
```
