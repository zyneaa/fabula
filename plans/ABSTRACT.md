# Fabula — Project Abstract

- **AI-powered educational platform** for teachers to create study materials, quizzes, and exam papers, and for students to access intelligent Q&A via a university knowledge base.
- **Tech stack:** Python (FastAPI, SQLAlchemy, async) + React 19 (Vite) + PostgreSQL 16, fully containerized with Docker.
- **LLM integration** via OpenRouter API with configurable model selection per student (Gemma, GPT-4o, etc.).
- **Material management** — upload PDF/DOCX/PPTX/TXT with automatic text chunking and parsing.
- **AI-generated notes** — comprehensive study notes auto-generated from uploaded materials.
- **AI-generated quizzes** — multiple-choice and short-answer quizzes from course materials.
- **AI-generated exam papers** — analyze source exams and generate new variants from course content.
- **University info system** — curated, searchable knowledge base (timetables, events, courses) managed by teachers.
- **AI chat assistant** — conversational Q&A over university info with persistent history.
- **Role-based access** — Admin, Teacher, and Student roles with JWT + Argon2 auth.
