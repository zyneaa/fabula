# Episode 4 — AI Features

## Goal

Notes, quizzes, exam paper generation.

## Tasks

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

## Deliverable

All 3 AI generation features working via background tasks.

## Status

**Pending.**
