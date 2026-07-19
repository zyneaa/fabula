import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chat import (
    create_conversation,
    get_conversation,
    get_user_conversations,
    add_message,
    get_conversation_messages,
    process_student_query,
)
from app.models.chat import Conversation, Message, MessageRole


@pytest.fixture
def mock_db():
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_conversation():
    conv = MagicMock(spec=Conversation)
    conv.id = 1
    conv.user_id = 1
    return conv


@pytest.fixture
def mock_messages():
    messages = []
    
    msg1 = MagicMock(spec=Message)
    msg1.id = 1
    msg1.conversation_id = 1
    msg1.role = MessageRole.user
    msg1.content = "What is CS101?"
    messages.append(msg1)
    
    msg2 = MagicMock(spec=Message)
    msg2.id = 2
    msg2.conversation_id = 1
    msg2.role = MessageRole.assistant
    msg2.content = "CS101 is Introduction to Computer Science."
    messages.append(msg2)
    
    return messages


@pytest.mark.asyncio
async def test_create_conversation(mock_db, mock_conversation):
    """Test creating a new conversation."""
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    result = await create_conversation(user_id=1, db=mock_db)
    
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()
    mock_db.refresh.assert_called_once()


@pytest.mark.asyncio
async def test_get_conversation(mock_db, mock_conversation):
    """Test getting a conversation by ID."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = mock_conversation
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    result = await get_conversation(conversation_id=1, user_id=1, db=mock_db)
    
    assert result == mock_conversation
    mock_db.execute.assert_called_once()


@pytest.mark.asyncio
async def test_get_conversation_not_found(mock_db):
    """Test getting a conversation that doesn't exist."""
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    result = await get_conversation(conversation_id=999, user_id=1, db=mock_db)
    
    assert result is None


@pytest.mark.asyncio
async def test_get_user_conversations(mock_db, mock_conversation):
    """Test getting all conversations for a user."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [mock_conversation]
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    result = await get_user_conversations(user_id=1, db=mock_db)
    
    assert len(result) == 1
    assert result[0] == mock_conversation


@pytest.mark.asyncio
async def test_add_message(mock_db):
    """Test adding a message to a conversation."""
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()
    
    result = await add_message(
        conversation_id=1,
        role=MessageRole.user,
        content="Test message",
        db=mock_db,
    )
    
    mock_db.add.assert_called_once()
    mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_get_conversation_messages(mock_db, mock_messages):
    """Test getting all messages in a conversation."""
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = mock_messages
    mock_db.execute = AsyncMock(return_value=mock_result)
    
    result = await get_conversation_messages(conversation_id=1, db=mock_db)
    
    assert len(result) == 2
    assert result[0].role == MessageRole.user
    assert result[1].role == MessageRole.assistant


@pytest.mark.asyncio
async def test_process_student_query(mock_db, mock_conversation):
    """Test processing a student query end-to-end."""
    # Mock get_conversation to return our conversation
    mock_conv_result = MagicMock()
    mock_conv_result.scalar_one_or_none.return_value = mock_conversation
    
    # Mock add_message to return a message
    mock_msg = MagicMock(spec=Message)
    mock_msg.id = 3
    mock_msg.role = MessageRole.assistant
    mock_msg.content = "AI response"
    
    with patch('app.services.chat.get_conversation_messages', new_callable=AsyncMock) as mock_get_msgs, \
         patch('app.services.chat.add_message', new_callable=AsyncMock) as mock_add_msg, \
         patch('app.services.chat.get_conversation_context', new_callable=AsyncMock) as mock_context, \
         patch('app.services.chat.generate_with_student_config', new_callable=AsyncMock) as mock_llm:
        
        mock_get_msgs.return_value = []
        mock_add_msg.return_value = mock_msg
        mock_context.return_value = "Some context"
        mock_llm.return_value = "AI response"
        
        result = await process_student_query(
            conversation_id=1,
            user_id=1,
            query="What is CS101?",
            db=mock_db,
        )
        
        assert result == mock_msg
        assert mock_add_msg.call_count == 2
        mock_get_msgs.assert_called_once_with(1, mock_db)
        mock_context.assert_called_once()
        mock_llm.assert_called_once()
