```mermaid
sequenceDiagram
    participant Student as 👤 Student
    participant UI as 🌐 Frontend (React)
    participant API as ⚡ FastAPI Backend
    participant LLM as 🤖 OpenRouter API
    participant DB as 🗄️ PostgreSQL
    participant FS as 💾 File Storage

    Note over Student,FS: === Material Upload Flow ===

    Student->>UI: Upload file to conversation
    UI->>API: POST /materials/conversation/{id}
    API->>DB: Get student's active LLM config → max_materials
    API->>DB: Count materials in conversation (limit check)
    API->>FS: Save file to disk
    API->>DB: Insert Material (status: pending)
    API->>API: BackgroundTasks → process_material()
    API-->>UI: 201 Created

    rect rgb(238, 240, 246)
    Note over API,FS: Background task
    API->>DB: Update status → processing
    API->>FS: Read file
    API->>API: Parse & chunk text
    API->>DB: Save Chunks
    API->>DB: Update status → ready (or failed)
    end

    Note over Student,FS: === Notes Generation Flow (synchronous) ===

    Student->>UI: Click "Generate Notes"
    UI->>API: POST /notes/generate/conversation/{id}
    API->>DB: Fetch ready materials & chunks
    API->>LLM: Generate study notes prompt (via student config)
    LLM-->>API: Return markdown notes
    API->>DB: Save Note record
    API-->>UI: 200 Notes generation complete

    UI->>API: GET /notes/conversation/{id}
    API-->>UI: Return generated notes
    UI-->>Student: Display notes

    Note over Student,FS: === Quiz Generation Flow (synchronous) ===

    Student->>UI: Click "Create Quiz"
    UI->>API: POST /quizzes/generate/conversation/{id}
    API->>DB: Fetch ready materials & chunks
    API->>LLM: Generate 10 questions (5 MCQ + 5 Short)
    LLM-->>API: Return JSON questions
    API->>DB: Save Quiz record
    API-->>UI: 200 Quiz generation complete

    UI->>API: GET /quizzes/conversation/{id}
    API-->>UI: Return quiz data
    UI-->>Student: Display quiz

    Note over Student,FS: === Exam Paper Generation Flow (async) ===

    Teacher->>UI: Select course material & source exam
    UI->>API: POST /exam-papers/generate
    API->>API: BackgroundTasks → generate_exam_papers()
    API-->>UI: 202 Accepted

    rect rgb(238, 240, 246)
    Note over API,DB: Background task
    API->>DB: Fetch course material & chunks
    API->>LLM: Analyze source exam → style profile
    API->>LLM: Generate N exam papers (per paper_number)
    API->>DB: Save ExamPaper records
    end

    Note over Student,FS: === Chat Query Flow ===

    Student->>UI: Type question in chat
    UI->>API: POST /chat/conversations/{id}/query
    API->>DB: Fetch ready materials & chunks
    API->>LLM: Classify query (uni-related?) via classifier
    API->>DB: Fetch matched UniInfo entries
    API->>LLM: Send query + context + history
    LLM-->>API: Return AI answer
    API->>DB: Save UserMessage + AssistantMessage
    API-->>UI: Return assistant response
    UI-->>Student: Display chat answer (streamed)

    Note over Student,FS: === Conversation Title Generation ===

    UI->>API: POST /chat/conversations/{id}/generate-title
    API->>DB: Fetch first messages
    API->>LLM: Generate short title
    LLM-->>API: Return title
    API->>DB: Update conversation title
    API-->>UI: Return title
