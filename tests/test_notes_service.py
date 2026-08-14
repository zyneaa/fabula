from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Chunk, Material
from app.services.notes import generate_notes


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_material():
    material = MagicMock(spec=Material)
    material.id = 1
    material.title = "Test Material"
    return material


@pytest.fixture
def mock_chunks():
    chunk1 = MagicMock(spec=Chunk)
    chunk1.text = "This is the first chunk of content."
    chunk1.chunk_index = 0

    chunk2 = MagicMock(spec=Chunk)
    chunk2.text = "This is the second chunk of content."
    chunk2.chunk_index = 1

    return [chunk1, chunk2]


@pytest.mark.asyncio
async def test_generate_notes_success(mock_db, mock_material, mock_chunks):
    """Test successful notes generation."""
    # Mock database queries - first for materials, then for chunks
    mock_result_materials = MagicMock()
    mock_result_materials.scalars.return_value.all.return_value = [mock_material]

    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks

    mock_db.execute = AsyncMock(side_effect=[mock_result_materials, mock_result_chunks])

    # Mock LLM call
    with patch("app.services.notes.generate_with_student_config") as mock_llm:
        mock_llm.return_value = "# Study Notes\n\nThis is generated content."

        # Mock note creation
        mock_note = MagicMock()
        mock_note.id = 1
        mock_note.material_id = 1
        mock_note.user_id = 1
        mock_note.content = "# Study Notes\n\nThis is generated content."

        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Call the function
        result = await generate_notes(1, 1, mock_db)

        # Assertions
        assert result is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_llm.assert_called_once()


@pytest.mark.asyncio
async def test_generate_notes_material_not_found(mock_db):
    """Test notes generation when material doesn't exist."""
    # The service first checks for materials, returns "No ready materials found"
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)

    with pytest.raises(ValueError, match="No ready materials found for conversation"):
        await generate_notes(999, 1, mock_db)


@pytest.mark.asyncio
async def test_generate_notes_no_chunks(mock_db, mock_material):
    """Test notes generation when no chunks exist."""
    # The service first checks for materials (returns list), then chunks
    mock_result_materials = MagicMock()
    mock_result_materials.scalars.return_value.all.return_value = [mock_material]

    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = []

    mock_db.execute = AsyncMock(side_effect=[mock_result_materials, mock_result_chunks])

    with pytest.raises(ValueError, match="No chunks found for materials in conversation"):
        await generate_notes(1, 1, mock_db)
