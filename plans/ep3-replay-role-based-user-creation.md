# Role-Based User Creation

## Context

Currently, the `/auth/register` endpoint allows anyone to register with any role. This is a security issue. We need hierarchical user creation:

- **Admin** → can create teachers
- **Teacher** → can create students  
- **Student** → cannot create accounts

## Current State

- `UserRole` enum: `student`, `teacher`
- Public `/auth/register` endpoint accepts any role
- No admin role exists
- No role-based access control on registration

## Changes Required

### 1. Add Admin Role

**File:** `app/models/user.py`
- Add `admin = "admin"` to `UserRole` enum

### 2. Create Initial Admin

**File:** `scripts/seed_admin.py`
- Script to create first admin user (run once manually)
- Reads credentials from env vars or prompts
- Only works if no admin exists yet (safety check)

**Env vars:**
```
ADMIN_EMAIL=admin@fabula.com
ADMIN_PASSWORD=Admin123
ADMIN_NAME=System Admin
```

### 3. New User Creation Endpoint

**File:** `app/api/users.py`
- `POST /users` - Create user (role-restricted)
- Requires authentication
- Role validation:
  - Admin can create: `teacher`, `student`
  - Teacher can create: `student` only
  - Student cannot create users (403 Forbidden)

**Request schema:**
```python
class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=100)
    role: UserRole  # Must be allowed for requesting user's role
    department: str | None = None
```

**Logic:**
```python
if current_user.role == UserRole.student:
    raise ForbiddenException("Students cannot create users")
    
if current_user.role == UserRole.teacher and req.role != UserRole.student:
    raise ForbiddenException("Teachers can only create students")
    
# Admin can create any role
```

### 4. Deprecate Public Registration

**File:** `app/api/auth.py`
- Remove `POST /auth/register` endpoint
- Or mark as deprecated with warning

### 5. Update Dependencies

**File:** `app/dependencies.py`
- Add `can_create_user(current_user, target_role)` helper
- Returns bool based on role hierarchy

### 6. Tests

**File:** `tests/test_user_creation.py`
- Admin can create teacher ✓
- Admin can create student ✓
- Teacher can create student ✓
- Teacher cannot create teacher ✗
- Teacher cannot create admin ✗
- Student cannot create any user ✗
- Unauthenticated user cannot create user ✗

### 7. Hurl Requests

**Files:**
- `hurl/create-user.hurl` - Create user (authenticated)
- `hurl/seed-admin.hurl` - Optional: automate admin creation

### 8. Make Commands

**File:** `Makefile`
- `make seed-admin` - Run admin seed script
- `make hurl-create-user` - Create user via API

### 9. Database Migration

**File:** `alembic/versions/xxx_add_admin_role.py`
- Add `admin` to `userrole` enum in database

## Implementation Order

1. Add admin role to model
2. Create migration
3. Write seed script
4. Create `/users` endpoint with role checks
5. Remove/deprecate `/auth/register`
6. Add tests
7. Add Hurl requests + Make commands
8. Update documentation

## Security Considerations

- First admin must be created via seed script (not API)
- Seed script should fail if admin already exists
- All user creation requires valid JWT
- Role validation happens server-side, not just in request schema
- Log all user creation attempts for audit

## Edge Cases

- What if last admin is deleted? → Prevent admin self-deletion
- What if admin wants to demote themselves? → Require at least one other admin
- Can admin create another admin? → Yes, but log it
- Can teacher create admin? → No, explicit check
- What about role changes after creation? → Separate endpoint needed (out of scope)

## Success Criteria

- [x] Admin role exists in database
- [x] Seed script creates first admin successfully
- [x] Admin can create teachers
- [x] Admin can create students
- [x] Teachers can create students only
- [x] Students get 403 on user creation
- [x] Public registration endpoint removed
- [x] All tests pass
- [x] Hurl requests work
- [x] Documentation updated
