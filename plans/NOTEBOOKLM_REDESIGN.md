# NotebookLM-Style Architecture Redesign

## Overview

The application has been redesigned to work like Google NotebookLM, where everything happens within chat conversations. Materials, notes, quizzes, and university information are all integrated into the chat interface.

## Key Changes

### 1. Materials are Now Conversation-Scoped
- **Before**: Materials were standalone entities that users managed separately
- **After**: Materials belong to specific conversations
- Each conversation can have multiple materials (limited by teacher's LLM config)
- Materials are uploaded and managed within the chat interface

### 2. Chat is the Central Interface
- **Before**: Separate pages for Materials, Uni Info, Chat, Notes, Quizzes
- **After**: Everything happens in the Chat page
- Upload materials directly in chat
- Ask questions that use materials + university info as context
- Generate notes and quizzes from conversation materials
- View and manage materials within each conversation

### 3. University Info is Part of Knowledge Base
- **Before**: Separate Uni Info page for browsing
- **After**: Uni Info is automatically searched and included in chat context
- When students ask questions, the system searches both:
  - Materials uploaded to the conversation
  - University information database
- Results are combined and sent to the LLM for contextual answers

### 4. Teachers Control Material Limits
- **New Feature**: `max_materials` field in LLM Config
- Teachers can set how many materials students can upload per conversation (1-50, default: 5)
- Different configs can have different limits (e.g., basic plan = 3 materials, premium = 10)
- Limits are enforced when uploading materials

## Database Changes

### New/Modified Tables

**materials**
- Added `conversation_id` (nullable foreign key to conversations)
- Materials can now be associated with a conversation
- Existing materials without conversation_id still work (backwards compatible)

**llm_configs**
- Added `max_materials` (integer, default: 5)
- Controls how many materials can be uploaded per conversation

## Backend API Changes

### Materials API
- `POST /materials/conversation/{conversation_id}` - Upload material to conversation
  - Checks max_materials limit from student's LLM config
  - Returns 403 if limit exceeded
- `GET /materials/conversation/{conversation_id}` - List materials for conversation
- `DELETE /materials/{material_id}` - Delete material (unchanged)

### Chat API
- `POST /chat/conversations/{conversation_id}/query` - Send query
  - Now builds context from:
    1. All materials in the conversation
    2. Relevant university info (keyword search)
  - Sends combined context to LLM

### Notes API
- `POST /notes/generate/conversation/{conversation_id}` - Generate notes
  - Uses all materials in the conversation
- `GET /notes/conversation/{conversation_id}` - Get notes for conversation

### Quizzes API
- `POST /quizzes/generate/conversation/{conversation_id}` - Generate quiz
  - Uses all materials in the conversation
- `GET /quizzes/conversation/{conversation_id}` - Get quizzes for conversation

### LLM Config API
- Added `max_materials` field to create/update endpoints
- Default value: 5
- Range: 1-50

## Frontend Changes

### Removed Pages
- ❌ Materials page (now integrated into Chat)
- ❌ Uni Info page (now part of chat knowledge base)

### Updated Pages

**Chat Page** (Complete Redesign)
- Left sidebar: Conversation list
- Main area: Chat messages
- Right sidebar (toggleable): Materials panel
  - Upload materials
  - View uploaded materials
  - Delete materials
- Toolbar: Generate Notes, Generate Quiz buttons
- Materials count indicator

**LLM Configs Page**
- Added "Max Materials per Chat" field
- Shows max_materials in table view
- Range: 1-50 with validation

**Home Page**
- Updated quick links to reflect new architecture
- Chat is now the primary interface

**Navbar**
- Removed Materials and Uni Info links
- Chat is the main feature

## User Workflows

### Student Workflow
1. Go to Chat page
2. Create or select a conversation
3. Upload materials (PDF, DOCX, PPTX, TXT)
   - System checks if they've hit their material limit
4. Ask questions about the materials
   - AI uses materials + university info as context
5. Generate notes from all materials in conversation
6. Generate quiz from all materials in conversation
7. View generated notes/quizzes

### Teacher Workflow
1. Create LLM Config with desired settings:
   - Model name
   - Max tokens
   - **Max materials per chat** (NEW)
   - Restrictions
2. Assign config to students
3. Add university information (via API or admin interface)
   - This becomes part of the knowledge base
4. Students can now chat with their assigned materials + uni info

## Context Building Process

When a student asks a question:

1. **Material Context**
   - Fetch all ready materials for the conversation
   - Get all chunks from each material
   - Combine into structured context

2. **University Info Context**
   - Extract keywords from the query (>2 chars)
   - Search UniInfo table for matching titles/content
   - Get top 5 relevant entries

3. **Combined Context**
   ```
   === CONVERSATION MATERIALS ===
   --- Material Title 1 ---
   [chunk text]
   [chunk text]
   
   --- Material Title 2 ---
   [chunk text]
   
   === UNIVERSITY INFORMATION ===
   [CATEGORY] Title
   Content
   
   [CATEGORY] Title
   Content
   ```

4. **LLM Prompt**
   ```
   You are a helpful educational assistant. Use the following context to answer the student's question. If the context doesn't contain the answer, say so honestly. Be concise and helpful.

   Context:
   [combined context]
   ```

## Benefits

1. **Simplified UX**: Everything in one place (Chat)
2. **Contextual Learning**: Materials + Uni Info work together
3. **Flexible Limits**: Teachers control resource usage per student
4. **NotebookLM-like**: Familiar interface for AI-assisted learning
5. **Better Organization**: Materials are grouped by topic/conversation

## Migration Notes

- Existing materials without `conversation_id` will still work
- They won't appear in any conversation until reassigned
- Consider running a migration script to assign orphaned materials to a default conversation
- Existing LLM configs will get `max_materials=5` by default

## Future Enhancements

1. **Material Reassignment**: Move materials between conversations
2. **Shared Conversations**: Teachers can create shared conversations
3. **Material Suggestions**: AI suggests relevant uni info based on uploaded materials
4. **Conversation Templates**: Pre-configured conversations for common subjects
5. **Material Limits by Type**: Different limits for PDF vs DOCX vs PPTX
6. **Storage Quotas**: Total storage limits per student/teacher
