# LLM Config Assignment System

## Overview

Teachers can now create multiple LLM configurations and assign them to individual students. This allows differentiated access based on student level, year, or needs.

## Features

- **Multiple Configs**: Teachers can create multiple LLM configurations with different models, token limits, and restrictions
- **Per-Student Assignment**: Each student can be assigned a specific config
- **Flexible Management**: Teachers can assign, view, and remove config assignments
- **Automatic Selection**: When students use LLM features, their assigned config is automatically used

## API Endpoints

### Config Management (Teacher Only)

- `POST /llm-configs` - Create a new config
- `GET /llm-configs` - List all teacher's configs
- `GET /llm-configs/{config_id}` - Get specific config
- `PUT /llm-configs/{config_id}` - Update config
- `DELETE /llm-configs/{config_id}` - Delete config

### Assignment Management (Teacher Only)

- `POST /llm-configs/assign` - Assign config to student
- `GET /llm-configs/student/{student_id}` - List student's assigned configs
- `DELETE /llm-configs/assign/{assignment_id}` - Remove assignment

### LLM Service Integration

- `generate_with_student_config()` - Automatically uses student's assigned config
- Falls back to `DEFAULT_LLM_MODEL` if no config assigned

## Usage Examples

### 1. Create Configs for Different Levels

```bash
# First year students - simpler model
make hurl-create-llm-config
# In the request, set:
# name: "First Year - GPT-3.5"
# model_name: "openai/gpt-3.5-turbo"
# max_tokens: 2000

# Second year students - better model
make hurl-create-llm-config
# In the request, set:
# name: "Second Year - GPT-4"
# model_name: "openai/gpt-4o"
# max_tokens: 4000
```

### 2. Assign Config to Student

```bash
# Assign config to student
make hurl-assign-llm-config student_id=5 config_id=1
```

### 3. View Student's Configs

```bash
# See what configs a student has
make hurl-list-student-llm-configs student_id=5
```

### 4. Remove Assignment

```bash
# Remove a config assignment
make hurl-remove-llm-config-assignment assignment_id=1
```

## Database Schema

### LLMConfig Table
- `id` - Primary key
- `teacher_id` - Owner (teacher who created it)
- `name` - Config name (e.g., "First Year - GPT-3.5")
- `provider` - LLM provider (e.g., "openrouter")
- `model_name` - Model to use (e.g., "openai/gpt-4o")
- `is_active` - Whether config is active
- `max_tokens` - Token limit
- `restrictions` - JSON field for custom restrictions
- `created_at` - Timestamp

### StudentLLMConfig Table (Assignment)
- `id` - Primary key
- `student_id` - Student user ID
- `config_id` - LLM config ID
- `teacher_id` - Teacher who made the assignment
- `assigned_at` - Timestamp

## Implementation Details

### Config Selection Logic

When a student uses LLM features:
1. System looks up student's assigned configs
2. Uses the most recently assigned active config
3. Applies config's `model_name` and `max_tokens`
4. Falls back to `DEFAULT_LLM_MODEL` if no config assigned

### Security

- Only teachers can create configs
- Teachers can only assign configs they own
- Teachers can only view/remove assignments they created
- Students cannot create or modify configs

## Migration

Run the migration to add the new tables:

```bash
make db-upgrade
```

This adds:
- `name` column to `llm_configs` table
- New `student_llm_configs` table for assignments

## Testing

All functionality is covered by tests:

```bash
make test
```

Tests include:
- Config CRUD operations
- Assignment creation
- Listing student configs
- Removing assignments
- Permission checks
