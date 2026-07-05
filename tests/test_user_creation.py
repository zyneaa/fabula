from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_admin():
    return User(id=1, email="admin@test.com", name="Admin", role=UserRole.admin)


@pytest.fixture
def mock_teacher():
    return User(id=2, email="teacher@test.com", name="Teacher", role=UserRole.teacher)


@pytest.fixture
def mock_student():
    return User(id=3, email="student@test.com", name="Student", role=UserRole.student)


@pytest.fixture
def admin_client(mock_db, mock_admin):
    from app.api.users import get_current_user, get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_admin
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def teacher_client(mock_db, mock_teacher):
    from app.api.users import get_current_user, get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_teacher
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def student_client(mock_db, mock_student):
    from app.api.users import get_current_user, get_db
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_student
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_admin_can_create_teacher(admin_client, mock_db, mock_admin):
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def mock_refresh(obj):
        obj.id = 10
        obj.created_at = datetime.now(timezone.utc)

    mock_db.refresh = mock_refresh

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = admin_client.post("/users", json={
        "email": "newteacher@test.com",
        "password": "Test1234",
        "name": "New Teacher",
        "role": "teacher",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "teacher"
    assert data["email"] == "newteacher@test.com"


def test_admin_can_create_student(admin_client, mock_db, mock_admin):
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def mock_refresh(obj):
        obj.id = 11
        obj.created_at = datetime.now(timezone.utc)

    mock_db.refresh = mock_refresh

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = admin_client.post("/users", json={
        "email": "newstudent@test.com",
        "password": "Test1234",
        "name": "New Student",
        "role": "student",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "student"


def test_teacher_can_create_student(teacher_client, mock_db, mock_teacher):
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def mock_refresh(obj):
        obj.id = 12
        obj.created_at = datetime.now(timezone.utc)

    mock_db.refresh = mock_refresh

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = teacher_client.post("/users", json={
        "email": "student2@test.com",
        "password": "Test1234",
        "name": "Student Two",
        "role": "student",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "student"


def test_teacher_cannot_create_teacher(teacher_client, mock_db, mock_teacher):
    response = teacher_client.post("/users", json={
        "email": "teacher2@test.com",
        "password": "Test1234",
        "name": "Teacher Two",
        "role": "teacher",
    })
    assert response.status_code == 403
    assert "Teachers can only create students" in response.json()["detail"]


def test_teacher_cannot_create_admin(teacher_client, mock_db, mock_teacher):
    response = teacher_client.post("/users", json={
        "email": "admin2@test.com",
        "password": "Test1234",
        "name": "Admin Two",
        "role": "admin",
    })
    assert response.status_code == 403
    assert "Teachers can only create students" in response.json()["detail"]


def test_student_cannot_create_any_user(student_client, mock_db, mock_student):
    response = student_client.post("/users", json={
        "email": "anyone@test.com",
        "password": "Test1234",
        "name": "Anyone",
        "role": "student",
    })
    assert response.status_code == 403
    assert "Students cannot create users" in response.json()["detail"]


def test_unauthenticated_user_cannot_create_user(mock_db):
    from app.api.users import get_db
    app.dependency_overrides[get_db] = lambda: mock_db

    client = TestClient(app)
    response = client.post("/users", json={
        "email": "anyone@test.com",
        "password": "Test1234",
        "name": "Anyone",
        "role": "student",
    })
    assert response.status_code == 401

    app.dependency_overrides.clear()


def test_cannot_create_user_with_existing_email(admin_client, mock_db, mock_admin):
    existing_user = User(
        id=99,
        email="existing@test.com",
        password_hash="hashed",
        name="Existing",
        role=UserRole.student,
        created_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = existing_user
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = admin_client.post("/users", json={
        "email": "existing@test.com",
        "password": "Test1234",
        "name": "Duplicate",
        "role": "student",
    })
    assert response.status_code == 400
    assert "Email already registered" in response.json()["detail"]
