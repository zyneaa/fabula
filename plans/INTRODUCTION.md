# Fabula — Presentation Introduction

> Good morning/afternoon everyone. Today I'm excited to introduce **Fabula** — an AI-powered educational platform we built to transform how teachers create learning materials and how students access knowledge.

**The Problem**

Teachers spend hours manually creating notes, quizzes, and exam papers. Students often struggle to find quick, reliable answers about courses, schedules, and university life. Traditional tools don't bridge this gap.

**What Fabula Does**

Fabula is a full-stack web application that lets teachers upload course materials (PDFs, slides, documents) and instantly generate comprehensive study notes, practice quizzes, and full exam papers using AI. Students get a smart chat assistant that answers questions based on both course materials and a university-curated knowledge base — timetables, events, course info, all in one place.

**Key Highlights**

- AI-generated notes, quizzes, and exam papers from any uploaded material
- Configurable LLM models (Gemma, GPT-4o, etc.) assignable per student
- University info system managed by teachers, searchable by students
- Role-based access: Admin, Teacher, and Student
- Fully containerized with Docker for easy deployment

**Tech Stack**

Python FastAPI backend with async SQLAlchemy, React 19 frontend with Vite, PostgreSQL 16, and OpenRouter for multi-model LLM access.

**Why It Matters**

Fabula reduces teachers' manual workload, accelerates content creation, and gives students a centralized, intelligent gateway to both course knowledge and university information — making education more efficient and accessible.
