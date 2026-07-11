import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.exam_paper import analyze_exam_style, generate_exam_papers
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
    chunk1.text = "Question 1: What is 2+2? (5 marks)"
    chunk1.chunk_index = 0
    
    chunk2 = MagicMock(spec=Chunk)
    chunk2.text = "Question 2: Explain photosynthesis. (10 marks)"
    chunk2.chunk_index = 1
    
    return [chunk1, chunk2]


@pytest.mark.asyncio
async def test_analyze_exam_style_success(mock_db, mock_material, mock_chunks):
    """Test successful exam style analysis."""
    mock_result_material = MagicMock()
    mock_result_material.scalar_one_or_none.return_value = mock_material
    
    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks
    
    mock_db.execute = AsyncMock(side_effect=[mock_result_material, mock_result_chunks])
    
    mock_llm_response = """
{
  "question_types": ["short_answer", "essay"],
  "total_questions": 10,
  "difficulty_distribution": {"easy": 3, "medium": 5, "hard": 2},
  "sections": ["Section A", "Section B"],
  "marking_scheme": "5 marks per short answer, 10 marks per essay",
  "format_style": "Clear numbered questions with marks indicated",
  "time_allocation": "2 hours",
  "instruction_style": "Answer all questions in Section A, choose 2 from Section B",
  "key_characteristics": ["progressive difficulty", "mixed question types"]
}
"""
    
    with patch("app.services.exam_paper.generate_with_student_config") as mock_llm:
        mock_llm.return_value = mock_llm_response
        
        result = await analyze_exam_style(1, 1, mock_db)
        
        assert result is not None
        assert "question_types" in result
        assert "difficulty_distribution" in result
        mock_llm.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_exam_style_material_not_found(mock_db):
    """Test exam style analysis when material doesn't exist."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    with pytest.raises(ValueError, match="Material 999 not found"):
        await analyze_exam_style(999, 1, mock_db)


@pytest.mark.asyncio
async def test_generate_exam_papers_success(mock_db, mock_material, mock_chunks):
    """Test successful exam papers generation."""
    # Mock course material queries
    mock_result_material = MagicMock()
    mock_result_material.scalar_one_or_none.return_value = mock_material
    
    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks
    
    mock_db.execute = AsyncMock(side_effect=[mock_result_material, mock_result_chunks])
    
    mock_llm_response = "# Exam Paper 1\n\n## Section A\n\n1. What is 2+2? (5 marks)\n\n## Answer Key\n\n1. 4"
    
    with patch("app.services.exam_paper.generate_with_student_config") as mock_llm:
        mock_llm.return_value = mock_llm_response
        
        # Mock exam paper creation
        mock_paper = MagicMock()
        mock_paper.id = 1
        mock_paper.course_id = "CS101"
        mock_paper.paper_number = 1
        mock_paper.content = mock_llm_response
        
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        # Call the function
        result = await generate_exam_papers(1, None, 1, "CS101", 1, mock_db)
        
        # Assertions
        assert len(result) == 1
        assert result[0].course_id == "CS101"
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_generate_exam_papers_with_source_exam(mock_db, mock_material, mock_chunks):
    """Test exam papers generation with source exam style analysis."""
    # Mock course material queries
    mock_result_material = MagicMock()
    mock_result_material.scalar_one_or_none.return_value = mock_material
    
    mock_result_chunks = MagicMock()
    mock_result_chunks.scalars.return_value.all.return_value = mock_chunks
    
    # First two calls for course material, next two for source exam analysis
    mock_db.execute = AsyncMock(side_effect=[
        mock_result_material, mock_result_chunks,  # course material
        mock_result_material, mock_result_chunks,  # source exam
    ])
    
    mock_style_response = '{"question_types": ["mcq"], "key_characteristics": ["progressive"]}'
    mock_paper_response = "# Exam Paper\n\n1. Question 1"
    
    with patch("app.services.exam_paper.generate_with_student_config") as mock_llm:
        # First call is for style analysis, second for paper generation
        mock_llm.side_effect = [mock_style_response, mock_paper_response]
        
        mock_paper = MagicMock()
        mock_paper.id = 1
        mock_paper.course_id = "CS101"
        mock_paper.paper_number = 1
        
        mock_db.add = MagicMock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()
        
        result = await generate_exam_papers(1, 2, 1, "CS101", 1, mock_db)
        
        assert len(result) == 1
        assert mock_llm.call_count == 2  # style analysis + paper generation
