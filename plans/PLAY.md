# Fabula — Technical Playbook

## Overview

University-specific AI learning assistant backend. Two roles: **student**, **teacher**.
Teachers upload course materials + university info. Students query uni info + generate study aids.

**Audio:** Deferred to future episode.

---

## Stack

| Layer | Technology | Version |
|---|---|---|
| Language | Python | 3.14+ |
| Web Framework | FastAPI | >=0.110 |
| ASGI Server | Uvicorn | latest |
| ORM | SQLAlchemy (async) | 2.x |
| DB Migrations | Alembic | latest |
| Database | PostgreSQL | 16 |
| DB Driver | asyncpg | latest |
| Auth | JWT (python-jose) + bcrypt (passlib) | — |
| Rate Limiting | slowapi | latest |
| LLM Provider | OpenRouter (pluggable) | — |
| HTTP Client | httpx | latest |
| File Parsing | PyMuPDF, python-docx, python-pptx | — |
| Logging | structlog | latest |
| Settings | pydantic-settings | latest |
| Testing | pytest + pytest-asyncio | — |
| Containerization | Docker Compose | — |

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
pydantic[email]
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
