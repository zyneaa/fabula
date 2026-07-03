# Episode 2 — Material Management

## Goal

Upload, parse, chunk study materials.

## Tasks

1. `services/file_parser.py` — extract text from PDF/DOCX/TXT/PPTX
2. `services/chunker.py` — split text into chunks (~500 tokens, 50 overlap)
3. `api/materials.py` — upload (save file, trigger parse+chunk in background), list, get, delete
4. File storage in `uploads/` dir (organized by user_id)
5. Material status tracking (pending → processing → ready/failed)

## Deliverable

Upload any supported file → text extracted → chunks stored.

## Status

**Pending.**
