# Fabula

An AI-powered educational platform that helps teachers create study materials, quizzes, and exam papers, and gives students an intelligent assistant backed by a university knowledge base and chat system.

## Features

### For Students
- **Study Materials** — Upload and access study materials (PDF, DOCX, PPTX, TXT). Files are parsed and split into searchable chunks automatically.
- **AI-Generated Notes** — Generate comprehensive study notes from any uploaded material.
- **AI-Generated Quizzes** — Create practice quizzes with multiple-choice and short-answer questions.
- **University Info** — Browse curated university information (timetables, events, courses, and more) maintained by teachers.
- **AI Chat Assistant** — Ask questions about university info and materials with streaming, character-by-character responses and persistent conversation history.

### For Teachers & Admins
- **Material Management** — Upload and organize study materials with automatic text extraction and chunking.
- **AI Content Generation** — Generate notes, quizzes, and exam papers from materials.
- **Exam Paper Generation** — Analyze a source exam and generate multiple new variant papers from course content.
- **LLM Configuration** — Create and manage multiple LLM configs (model, temperature, token limits, system prompts) and assign them to individual students.
- **University Knowledge Base** — Curate categorized university information for students.
- **User Management** — Create and manage student, teacher, and admin accounts.
- **Departments & System Settings** — Manage departments and global LLM defaults.

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.14)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Authentication**: JWT with Argon2 password hashing
- **LLM Integration**: OpenRouter API
- **Rate Limiting**: SlowAPI
- **Logging**: structlog

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Styling**: Tailwind CSS + Material Design 3 design tokens
- **Rendering**: react-markdown with GFM support
- **Icons**: lucide-react

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (frontend → backend API proxy)

## Quick Start with Docker

### Prerequisites
- Docker Desktop installed and running
- An [OpenRouter](https://openrouter.ai) API key (required for all AI features)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/zyneaa/fabula.git
   cd fabula
   ```

2. **Configure environment variables**
   ```bash
   cp .env.docker .env
   ```
   Edit `.env` and add your OpenRouter API key:
   ```
   OPENROUTER_API_KEY=your-actual-api-key-here
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Create an admin user**
   ```bash
   docker-compose exec backend python scripts/seed_admin.py
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Interactive API docs (Swagger UI): http://localhost:8000/docs
   - ReDoc: http://localhost:8000/redoc

For detailed Docker instructions, see [DOCKER_SETUP.md](DOCKER_SETUP.md).

## Development Setup (Without Docker)

### Backend

1. **Install dependencies**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration, including `OPENROUTER_API_KEY`.

3. **Start the database**
   ```bash
   docker-compose up -d db
   ```

4. **Run migrations**
   ```bash
   alembic upgrade head
   ```

5. **Create an admin user**
   ```bash
   make seed-admin
   ```

6. **Start the backend**
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend

1. **Install dependencies**
   ```bash
   cd client
   npm install
   ```

2. **Start the dev server**
   ```bash
   npm run dev
   ```

3. **Access the frontend** at http://localhost:5173

> Note: when running the dev server, set `VITE_API_URL` to your backend URL (defaults to `/api` for the Docker setup).

## Common Commands

The project ships a `Makefile` with common workflows:

```bash
make help              # Show all available commands
make run               # Start the backend dev server
make test              # Run backend tests
make lint              # Lint backend code (ruff)
make format            # Format backend code (ruff)
make db-upgrade        # Apply database migrations
make db-migrate msg="description"  # Autogenerate a new migration
make seed-admin        # Create the first admin user
```

### API testing with Hurl

`hurl/` contains a CLI-first HTTP test suite. Install Hurl, log in, then hit any endpoint:

```bash
make hurl-login EMAIL=admin@test.com PASSWORD=Admin123
make hurl-upload file_path=./test.pdf
make hurl-generate-notes material_id=1
```

See [hurl/README.md](hurl/README.md) for full usage.

## Testing

### Backend Tests
```bash
# Run all tests
make test

# Or directly with pytest
pytest
```

The suite covers services (chat, chunker, notes, quiz, exam papers, uni info, LLM) and API endpoints (materials, users, LLM configs).

### Frontend Linting
```bash
cd client
npm run lint
```

## Project Structure

```
fabula/
├── app/                    # Backend application
│   ├── api/               # API routers (auth, materials, notes, quizzes, chat, ...)
│   ├── core/              # Security, exceptions, rate limiting
│   ├── models/            # SQLAlchemy models
│   ├── schemas/           # Pydantic schemas
│   ├── services/          # Business logic (LLM, chunker, parsers, generation)
│   ├── tasks/             # Background tasks
│   ├── config.py          # Environment-based settings
│   ├── database.py        # Async SQLAlchemy engine/session
│   └── main.py            # FastAPI application entry point
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   ├── services/      # API service layer
│   │   └── utils/         # Utility helpers
│   └── Dockerfile, nginx.conf
├── alembic/               # Database migrations
├── scripts/               # Utility scripts (seed_admin.py, ...)
├── tests/                 # Backend test suite
├── hurl/                  # Hurl API tests
├── diagram/               # Mermaid diagrams (ER, flowchart, sequence, use case)
├── plans/                 # Development plans and episode summaries
├── docs/                  # Additional documentation
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Backend Dockerfile
└── requirements.txt       # Python dependencies
```

## API Overview

Once running, explore the full API at http://localhost:8000/docs. Main resource groups:

| Router | Base path | Description |
| --- | --- | --- |
| Auth | `/auth` | Login, profile, JWT auth |
| Users | `/users` | User management (role-based) |
| Materials | `/materials` | Upload/list/get/delete study materials |
| Notes | `/notes` | AI note generation |
| Quizzes | `/quizzes` | AI quiz generation |
| Exam Papers | `/exam-papers` | AI exam paper generation |
| LLM Configs | `/llm-configs` | Manage configs and student assignments |
| Uni Info | `/uni-info` | University knowledge base |
| Chat | `/chat` | Conversations and AI chat |
| Departments | `/departments` | Department management |
| System Configs | `/system-configs` | Global LLM defaults |

## Documentation

- [DOCKER_SETUP.md](DOCKER_SETUP.md) — Detailed Docker setup guide
- [DOCKER_SUMMARY.md](DOCKER_SUMMARY.md) — Docker architecture summary
- [client/README.md](client/README.md) — Frontend documentation
- [hurl/README.md](hurl/README.md) — API testing with Hurl
- [docs/llm-config-assignment.md](docs/llm-config-assignment.md) — LLM config assignment design
- [plans/ABSTRACT.md](plans/ABSTRACT.md) — Project abstract
- [diagram/er.md](diagram/er.md) — Entity-relationship diagram
- Episode summaries — see `plans/SUMMARY/`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run lint and tests: `make lint && make test`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Open a GitHub issue at https://github.com/zyneea/fabula/issues
- Check the [Docker Setup Guide](DOCKER_SETUP.md) for deployment issues
- Review the interactive API docs at http://localhost:8000/docs
- Check logs: `docker-compose logs`
