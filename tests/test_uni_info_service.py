import pytest
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.uni_info import search_uni_info, get_relevant_context
from app.models.uni_info import UniInfo, UniInfoCategory


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_uni_info_entries():
    entries = []
    
    entry1 = MagicMock(spec=UniInfo)
    entry1.id = 1
    entry1.category = UniInfoCategory.course
    entry1.title = "Introduction to Computer Science"
    entry1.content = "This course covers basic programming concepts, data structures, and algorithms."
    entries.append(entry1)
    
    entry2 = MagicMock(spec=UniInfo)
    entry2.id = 2
    entry2.category = UniInfoCategory.timetable
    entry2.title = "CS101 Schedule"
    entry2.content = "Monday 9-11am, Wednesday 2-4pm. Room: Hall A."
    entries.append(entry2)
    
    entry3 = MagicMock(spec=UniInfo)
    entry3.id = 3
    entry3.category = UniInfoCategory.event
    entry3.title = "Tech Talk: AI in Education"
    entry3.content = "Join us for an exciting talk about artificial intelligence in education. Friday 3pm."
    entries.append(entry3)
    
    return entries


@pytest.mark.asyncio
async def test_search_uni_info_with_keywords(mock_db, mock_uni_info_entries):
    """Test searching uni info with keywords."""
    # Mock the database execute to return our test entries
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_uni_info_entries[:2]
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    results = await search_uni_info("computer science course", db=mock_db)
    
    assert len(results) == 2
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_search_uni_info_with_category_filter(mock_db, mock_uni_info_entries):
    """Test searching with category filter."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_uni_info_entries[1]]
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    results = await search_uni_info(
        "schedule",
        category=UniInfoCategory.timetable,
        db=mock_db
    )
    
    assert len(results) == 1
    assert results[0].category == UniInfoCategory.timetable


@pytest.mark.asyncio
async def test_search_uni_info_empty_query(mock_db):
    """Test searching with empty query returns empty list."""
    results = await search_uni_info("", db=mock_db)
    assert results == []


@pytest.mark.asyncio
async def test_search_uni_info_short_keywords(mock_db):
    """Test that very short keywords (<=2 chars) are ignored."""
    # When all keywords are <=2 chars, function returns early without calling db
    results = await search_uni_info("a an", db=mock_db)
    assert results == []
    # db.execute should not be called since we return early
    mock_db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_get_relevant_context(mock_db, mock_uni_info_entries):
    """Test getting formatted context for LLM."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_uni_info_entries[:2]
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    context = await get_relevant_context("computer science", db=mock_db)
    
    assert "COURSE" in context
    assert "Introduction to Computer Science" in context
    assert "TIMETABLE" in context
    assert "CS101 Schedule" in context


@pytest.mark.asyncio
async def test_get_relevant_context_no_results(mock_db):
    """Test getting context when no results found."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = []
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    context = await get_relevant_context("nonexistent topic", db=mock_db)
    
    assert context == "No relevant university information found."
