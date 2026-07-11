# Fabula

An AI-powered educational platform that helps teachers create study materials, quizzes, and exam papers, while providing students with intelligent assistance through a university knowledge base and chat system.

## Features

### For Students
- **Study Materials**: Upload and access study materials (PDF, DOCX, PPTX, TXT)
- **AI-Generated Notes**: Automatically generate comprehensive study notes from materials
- **AI-Generated Quizzes**: Create practice quizzes with MCQs and short answers
- **University Info**: Browse curated university information (timetables, events, courses)
- **AI Chat Assistant**: Ask questions about university information and get AI-powered answers

### For Teachers
- **Material Management**: Upload and organize study materials
- **AI Content Generation**: Generate notes, quizzes, and exam papers from materials
- **Exam Paper Generation**: Analyze previous exams and generate multiple new papers
- **LLM Configuration**: Create and assign different AI models to students
- **University Knowledge Base**: Curate university information for students
- **User Management**: Create and manage student accounts

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.14)
- **Database**: PostgreSQL 16
- **ORM**: SQLAlchemy (async)
- **Migrations**: Alembic
- **Authentication**: JWT tokens with Argon2 password hashing
- **LLM Integration**: OpenRouter API
- **Rate Limiting**: SlowAPI

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Routing**: React Router
- **HTTP Client**: Axios
- **Styling**: Inline styles (no external CSS framework)

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Reverse Proxy**: Nginx (for frontend)

## Quick Start with Docker

### Prerequisites
- Docker Desktop installed and running
- OpenRouter API key (for LLM features)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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
   - API Documentation: http://localhost:8000/docs

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
   Edit `.env` with your configuration.

3. **Start the database**
   ```bash
   docker-compose up -d db
   ```

4. **Run migrations**
   ```bash
   alembic upgrade head
   ```

5. **Start the backend**
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

3. **Access the frontend**
   - URL: http://localhost:5173

## Project Structure

```
fabula/
├── app/                    # Backend application
│   ├── api/               # API endpoints
│   ├── core/              # Core utilities (security, exceptions, rate limiting)
│   ├── models/            # SQLAlchemy models
│   ├── services/          # Business logic services
│   └── main.py            # FastAPI application entry point
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── pages/         # Page components
│   │   └── services/      # API service layer
│   └── Dockerfile
├── alembic/               # Database migrations
├── scripts/               # Utility scripts
├── tests/                 # Test suite
├── plans/                 # Development plans and documentation
├── docker-compose.yml     # Docker Compose configuration
├── Dockerfile             # Backend Dockerfile
└── requirements.txt       # Python dependencies
```

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Testing

### Backend Tests
```bash
# Run all tests
make test

# Or directly with pytest
pytest
```

### Frontend Tests
```bash
cd client
npm test
```

## CLI Tools

The project includes a Makefile with common commands:

```bash
make help              # Show all available commands
make run               # Start backend server
make test              # Run tests
make db-upgrade        # Apply database migrations
make seed-admin        # Create admin user
make hurl-login        # Login via Hurl
make hurl-list         # List materials
# ... and many more
```

## Documentation

- [DOCKER_SETUP.md](DOCKER_SETUP.md) - Detailed Docker setup guide
- [EPISODE_4_SUMMARY.md](EPISODE_4_SUMMARY.md) - AI features implementation
- [EPISODE_5_SUMMARY.md](EPISODE_5_SUMMARY.md) - University info and chat system
- [client/README.md](client/README.md) - Frontend documentation
- [hurl/README.md](hurl/README.md) - API testing with Hurl

## Development Roadmap

See the `plans/` directory for development episodes and future plans:
- Episode 1: Authentication & User Management
- Episode 2: Material Management
- Episode 3: LLM Integration
- Episode 4: AI Features (Notes, Quizzes, Exam Papers)
- Episode 5: University Info System & Chat

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- Check the [Docker Setup Guide](DOCKER_SETUP.md) for deployment issues
- Review API documentation at http://localhost:8000/docs
- Check logs: `docker-compose logs`
