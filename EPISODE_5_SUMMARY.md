# Episode 5 - University Info System & Chat

## Overview
Episode 5 implements a university information knowledge base and AI-powered chat system. Teachers can curate university information (timetables, events, directories, courses), and students can chat with an AI assistant that uses this information to answer questions.

## Backend Implementation

### 1. University Info API (`app/api/uni_info.py`)
**Endpoints:**
- `POST /uni-info/` - Create new uni info entry (teachers/admins only)
- `GET /uni-info/` - List all uni info entries (all users)
- `GET /uni-info/{uni_info_id}` - Get specific entry (all users)
- `PUT /uni-info/{uni_info_id}` - Update entry (teachers/admins, owner only)
- `DELETE /uni-info/{uni_info_id}` - Delete entry (teachers/admins, owner only)

**Categories:**
- `timetable` - Class schedules, exam timetables
- `event` - University events, workshops, seminars
- `directory` - Contact information, office locations
- `course` - Course descriptions, syllabi, requirements

**Features:**
- Role-based access control (teachers/admins can CRUD, students can read)
- Optional metadata JSON field for additional structured data
- Ownership tracking (teachers can only edit/delete their own entries)

### 2. University Info Service (`app/services/uni_info.py`)
**Functions:**
- `search_uni_info(query, category, limit, db)` - Keyword-based search
- `get_relevant_context(query, db, limit)` - Format search results for LLM context

**Search Logic:**
- Simple keyword matching (words > 2 characters)
- Searches in both title and content fields
- Case-insensitive matching using SQL ILIKE
- Optional category filtering
- Returns most recent entries first

### 3. Chat Service (`app/services/chat.py`)
**Functions:**
- `create_conversation(user_id, db)` - Create new conversation
- `get_conversation(conversation_id, user_id, db)` - Get conversation with ownership check
- `get_user_conversations(user_id, db)` - List user's conversations
- `add_message(conversation_id, role, content, db)` - Add message to conversation
- `get_conversation_messages(conversation_id, db)` - Get all messages in conversation
- `process_student_query(conversation_id, user_id, query, db)` - Process query end-to-end

**Query Processing Flow:**
1. Add user message to conversation
2. Search for relevant uni info entries using query keywords
3. Build context string with relevant information
4. Send to LLM with system prompt containing context
5. Add assistant response to conversation
6. Return the assistant message

### 4. Chat API (`app/api/chat.py`)
**Endpoints:**
- `POST /chat/conversations` - Start new conversation
- `GET /chat/conversations` - List user's conversations
- `GET /chat/conversations/{conversation_id}` - Get conversation with messages
- `POST /chat/conversations/{conversation_id}/query` - Send query and get AI response

**Features:**
- Conversation ownership (users can only access their own conversations)
- Persistent message history
- Real-time AI responses using student's assigned LLM config

## Frontend Implementation

### 1. University Info Page (`client/src/pages/UniInfo.jsx`)
**Features:**
- Card-based layout for displaying uni info entries
- Category badges with color coding
- Create/Edit/Delete functionality for teachers/admins
- Form with category dropdown, title, and content fields
- Responsive grid layout
- Date display for each entry

**Access Control:**
- All users can view entries
- Only teachers/admins see Add/Edit/Delete buttons
- Edit/Delete only available for entry owners (or admins)

### 2. Chat Page (`client/src/pages/Chat.jsx`)
**Features:**
- Sidebar with conversation list
- Main chat area with message bubbles
- Real-time message display
- Auto-scroll to latest message
- Create new conversation button
- Message timestamps
- User/Assistant message differentiation (right/left alignment, different colors)

**UI Components:**
- Conversation list (sidebar)
- Message display area (main)
- Input form with send button
- Loading states for sending messages
- Empty state messages

### 3. Navigation Updates
- Added "Uni Info" link to navbar (visible to all users)
- Added "Chat" link to navbar (visible to all users)
- Updated Home page with quick links to new features

## Testing

### Unit Tests
**`tests/test_uni_info_service.py`** (6 tests):
- Search with keywords
- Search with category filter
- Empty query handling
- Short keywords filtering
- Context formatting
- No results handling

**`tests/test_chat_service.py`** (7 tests):
- Create conversation
- Get conversation
- Conversation not found
- List user conversations
- Add message
- Get conversation messages
- Process student query (end-to-end)

**Total: 56 tests passing** (including all previous episodes)

## Hurl Commands

### Uni Info Commands
```bash
make hurl-uni-info-create category=course title="CS101" content="Intro to CS"
make hurl-uni-info-list
make hurl-uni-info-get uni_info_id=1
make hurl-uni-info-update uni_info_id=1 category=course title="Updated" content="New content"
make hurl-uni-info-delete uni_info_id=1
```

### Chat Commands
```bash
make hurl-chat-conversation-create
make hurl-chat-conversation-list
make hurl-chat-conversation-get conversation_id=1
make hurl-chat-query conversation_id=1 query="What is CS101?"
```

## Database Models

All models already existed:
- `UniInfo` - University information entries
- `Conversation` - Chat conversations
- `Message` - Chat messages

## Key Features

1. **Knowledge Base**: Teachers can curate university information in a structured way
2. **AI-Powered Q&A**: Students can ask questions and get answers based on the knowledge base
3. **Context-Aware**: AI responses are grounded in actual university information
4. **Persistent Conversations**: Chat history is saved and can be revisited
5. **Role-Based Access**: Different permissions for students, teachers, and admins
6. **User-Friendly Interface**: Modern chat UI with conversation management

## Usage Flow

### For Teachers:
1. Navigate to "Uni Info" page
2. Click "Add Entry" button
3. Select category (timetable, event, directory, course)
4. Enter title and content
5. Submit to create entry
6. Can edit/delete own entries

### For Students:
1. Navigate to "Uni Info" to browse information
2. Navigate to "Chat" to ask questions
3. Click "+ New" to start a conversation
4. Type question in input field
5. Send and wait for AI response
6. Continue conversation or start new one

## Integration with LLM Config

The chat system uses `generate_with_student_config()` which:
- Looks up the student's assigned LLM config
- Uses the configured model and token limits
- Falls back to default model if no config assigned
- Ensures each student gets the appropriate AI experience

## Future Enhancements
- Vector embeddings for semantic search (currently using keyword matching)
- File attachments in chat
- Conversation sharing between students
- Analytics on common questions
- Auto-suggested questions based on uni info
