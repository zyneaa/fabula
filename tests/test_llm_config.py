from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.llm_config import LLMConfig
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    return AsyncMock()


@pytest.fixture
def mock_teacher():
    return User(id=1, email="teacher@test.com", name="Teacher", role=UserRole.teacher)


@pytest.fixture
def mock_student():
    return User(id=2, email="student@test.com", name="Student", role=UserRole.student)


@pytest.fixture
def client(mock_db, mock_teacher):
    from app.api.llm_config import get_current_user, get_db

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_teacher
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_config(client, mock_db, mock_teacher):
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def mock_refresh(obj):
        obj.id = 1
        obj.created_at = datetime.now(timezone.utc)

    mock_db.refresh = mock_refresh

    response = client.post(
        "/llm-configs",
        json={
            "model_name": "openai/gpt-4o",
            "provider": "openrouter",
            "is_active": True,
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["model_name"] == "openai/gpt-4o"
    assert data["teacher_id"] == mock_teacher.id


def test_list_configs(client, mock_db, mock_teacher):
    config = LLMConfig(
        id=1,
        teacher_id=mock_teacher.id,
        provider="openrouter",
        model_name="openai/gpt-4o",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [config]
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = client.get("/llm-configs")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["model_name"] == "openai/gpt-4o"


def test_get_config_not_found(client, mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = client.get("/llm-configs/999")
    assert response.status_code == 404


def test_update_config(client, mock_db, mock_teacher):
    config = LLMConfig(
        id=1,
        teacher_id=mock_teacher.id,
        provider="openrouter",
        model_name="openai/gpt-4o",
        is_active=True,
        max_tokens=1000,
        created_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = config
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    response = client.put("/llm-configs/1", json={"max_tokens": 2000})
    assert response.status_code == 200
    data = response.json()
    assert data["max_tokens"] == 2000


def test_delete_config(client, mock_db, mock_teacher):
    config = LLMConfig(
        id=1,
        teacher_id=mock_teacher.id,
        provider="openrouter",
        model_name="openai/gpt-4o",
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = config
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()

    response = client.delete("/llm-configs/1")
    assert response.status_code == 204
