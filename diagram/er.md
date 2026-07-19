```mermaid
erDiagram
    departments ||--o{ users : "belongs_to"
    users ||--o{ conversations : "has"
    users ||--o{ materials : "uploads"
    users ||--o{ notes : "writes"
    users ||--o{ quizzes : "creates"
    users ||--o{ exam_papers : "authors"
    users ||--o{ uni_info : "manages"
    users ||--o{ llm_configs : "configures"
    users ||--o{ student_llm_configs : "assigned_as_student"
    users ||--o{ student_llm_configs : "assigned_as_teacher"
    conversations ||--o{ messages : "contains"
    conversations ||--o{ materials : "references"
    materials ||--o{ chunks : "split_into"
    materials ||--o{ notes : "annotated_by"
    materials ||--o{ quizzes : "generates"
    materials ||--o{ exam_papers : "source_for"
    llm_configs ||--o{ student_llm_configs : "assigned_to"
    system_configs ||--|| "" : "singleton"

    departments {
        int id PK
        varchar name UK
        datetime created_at
    }

    users {
        int id PK
        varchar email UK
        varchar password_hash
        varchar name
        enum role
        varchar department
        varchar major
        int year
        int department_id FK
        datetime created_at
    }

    conversations {
        int id PK
        int user_id FK
        varchar title
        datetime created_at
    }

    messages {
        int id PK
        int conversation_id FK
        enum role
        text content
        datetime created_at
    }

    materials {
        int id PK
        int user_id FK
        int conversation_id FK
        varchar title
        varchar file_path
        varchar file_type
        enum status
        datetime uploaded_at
    }

    chunks {
        int id PK
        int material_id FK
        text text
        int chunk_index
        int token_count
    }

    notes {
        int id PK
        int material_id FK
        int user_id FK
        text content
        datetime created_at
    }

    quizzes {
        int id PK
        int material_id FK
        int user_id FK
        json questions
        datetime created_at
    }

    exam_papers {
        int id PK
        varchar course_id
        int teacher_id FK
        int source_exam_id FK
        int paper_number
        text content
        json style_profile
        datetime created_at
    }

    uni_info {
        int id PK
        int teacher_id FK
        enum category "timetable|event|course|misc"
        varchar title
        text content
        datetime created_at
    }

    system_configs {
        int id PK
        text system_prompt
        varchar model_name
        float temperature
        int max_materials
        float top_p
        float frequency_penalty
        float presence_penalty
        int max_tokens
        datetime updated_at
    }

    llm_configs {
        int id PK
        int teacher_id FK
        varchar name
        varchar provider
        varchar model_name
        bool is_active
        int max_tokens
        int max_materials
        json restrictions
        text system_prompt
        float temperature
        float top_p
        float frequency_penalty
        float presence_penalty
        datetime created_at
    }

    student_llm_configs {
        int id PK
        int student_id FK
        int config_id FK
        int teacher_id FK
        datetime assigned_at
    }
```
