# Episode 5 — University Info System

## Goal

Teacher-curated knowledge base + student Q&A chat.

## Tasks

1. `api/uni_info.py` — teacher CRUD for uni info entries
2. `services/uni_info.py` — retrieval logic:
   - Simple keyword + category matching (no vector DB for now)
   - Fetch relevant entries → inject into LLM context
3. `services/chat.py` — student query flow:
   - Student sends message → search relevant UniInfo entries
   - Build context: "You are a university assistant. Here is relevant info: {entries}"
   - LLM generates response → store in conversation
4. `api/chat.py` — conversation + message endpoints

## Deliverable

Students can chat about uni info. Teachers populate knowledge base.

## Status

**Done.**
