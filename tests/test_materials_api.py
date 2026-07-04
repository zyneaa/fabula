from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import UploadFile
from fastapi.testclient import TestClient

from app.main import app
from app.models.material import Material, MaterialStatus
from app.models.user import User, UserRole


@pytest.fixture
def mock_db():
    db = AsyncMock()
    return db


@pytest.fixture
def mock_user():
    return User(id=1, email="test@test.com", name="Test", role=UserRole.student)


@pytest.fixture
def client(mock_db, mock_user):
    from app.api.materials import get_current_user, get_db

    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: mock_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_upload_material(client, mock_db, tmp_path):
    mock_db.execute = AsyncMock()
    mock_db.commit = AsyncMock()

    async def mock_refresh(obj):
        obj.id = 1
        obj.uploaded_at = datetime.now(timezone.utc)

    mock_db.refresh = mock_refresh

    file_content = b"test content"
    response = client.post(
        "/materials",
        files={"file": ("test.txt", file_content, "text/plain")},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "test.txt"
    assert data["file_type"] == "txt"
    assert data["status"] == "pending"
    assert "uploaded_at" in data


def test_upload_unsupported_type(client):
    response = client.post(
        "/materials",
        files={"file": ("test.xyz", b"content", "text/plain")},
    )
    assert response.status_code == 400
    assert "Unsupported" in response.json()["detail"]


def test_list_materials(client, mock_db, mock_user):
    material = Material(
        id=1,
        user_id=mock_user.id,
        title="test.pdf",
        file_path="/tmp/test.pdf",
        file_type="pdf",
        status=MaterialStatus.ready,
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [material]
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = client.get("/materials")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "test.pdf"


def test_get_material_not_found(client, mock_db):
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    response = client.get("/materials/999")
    assert response.status_code == 404


def test_delete_material(client, mock_db, mock_user, tmp_path):
    test_file = tmp_path / "test.txt"
    test_file.write_text("content")

    material = Material(
        id=1,
        user_id=mock_user.id,
        title="test.txt",
        file_path=str(test_file),
        file_type="txt",
        status=MaterialStatus.ready,
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = material
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.delete = AsyncMock()
    mock_db.commit = AsyncMock()

    response = client.delete("/materials/1")
    assert response.status_code == 204
    assert not test_file.exists()
