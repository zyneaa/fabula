import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.quiz import generate_quiz
from app.models.material import Chunk, Material


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
    chunk1.text = "Photosynthesis is the process by which plants convert light energy into chemical energy."
    chunk1.chunk_index = 0
    
    chunk2 = MagicMock(spec=Chunk)
    chunk2.text = "The main product of photosynthesis is glucose, which plants use for energy."
    chunk2.chunk_index = 1
    
    return [chunk1, chunk2]


@pytest.mark.asyncio
async def test_generate_quiz_success(mock_db, mock_material, mock_chunks):
    """Test successful quiz generation."""
    # Mock database queries
    mock_result_material = MagicMock()
    mock_result_material.scalar_one_or_none.return_value = mock_material
    
    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks
    
    mock_db.execute = AsyncMock(side_effect=[mock_result_material, mock_result_chunks])
    
    # Mock LLM response
    mock_llm_response = """
{
  "questions": [
    {
      "type": "mcq",
      "question": "What is photosynthesis?",
      "options": ["A) Process of converting light to chemical energy", "B) Process of breathing", "C) Process of digestion", "D) Process of reproduction"],
      "correct_answer": "A) Process of converting light to chemical energy",
      "explanation": "Photosynthesis converts light energy into chemical energy stored in glucose."
    },
    {
      "type": "short_answer",
      "question": "What is the main product of photosynthesis?",
      "correct_answer": "Glucose",
      "explanation": "Plants produce glucose as the main energy storage molecule."
    }
  ]
}
"""
    
    with patch("app.services.quiz.generate_with_student_config") as mock_llm:
        mock_llm.return_value = mock_llm_response
        
        # Mock quiz creation
        mock_quiz = MagicMock()
        mock_quiz.id = 1
        mock_quiz.material_id = 1
        mock_quiz.user_id = 1
        mock_quiz.questions = {"questions": []}
        
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        # Call the function
        result = await generate_quiz(1, 1, mock_db)
        
        # Assertions
        assert result is not None
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
        mock_llm.assert_called_once()


@pytest.mark.asyncio
async def test_generate_quiz_material_not_found(mock_db):
    """Test quiz generation when material doesn't exist."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    with pytest.raises(ValueError, match="Material 999 not found"):
        await generate_quiz(999, 1, mock_db)


@pytest.mark.asyncio
async def test_generate_quiz_invalid_json(mock_db, mock_material, mock_chunks):
    """Test quiz generation with invalid JSON response."""
    mock_result_material = MagicMock()
    mock_result_material.scalar_one_or_none.return_value = mock_material
    
    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks
    
    mock_db.execute = AsyncMock(side_effect=[mock_result_material, mock_result_chunks])
    
    with patch("app.services.quiz.generate_with_student_config") as mock_llm:
        mock_llm.return_value = "This is not valid JSON"
        
        with pytest.raises(ValueError, match="Failed to parse quiz response"):
            await generate_quiz(1, 1, mock_db)
