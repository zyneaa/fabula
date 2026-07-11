from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Conversation, Message, MessageRole
from app.services.uni_info import get_relevant_context
from app.services.llm import generate_with_student_config


async def create_conversation(
    user_id: int,
    db: AsyncSession,
) -> Conversation:
    """Create a new conversation for a user."""
    conversation = Conversation(user_id=user_id)
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def get_conversation(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
) -> Conversation | None:
    """Get a conversation by ID, ensuring it belongs to the user."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def get_user_conversations(
    user_id: int,
    db: AsyncSession,
) -> list[Conversation]:
    """Get all conversations for a user."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.created_at.desc())
    )
    return list(result.scalars().all())


async def add_message(
    conversation_id: int,
    role: MessageRole,
    content: str,
    db: AsyncSession,
) -> Message:
    """Add a message to a conversation."""
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


async def get_conversation_messages(
    conversation_id: int,
    db: AsyncSession,
) -> list[Message]:
    """Get all messages in a conversation."""
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    return list(result.scalars().all())


async def process_student_query(
    conversation_id: int,
    user_id: int,
    query: str,
    db: AsyncSession,
) -> Message:
    """
    Process a student's query:
    1. Add user message to conversation
    2. Search for relevant uni info
    3. Build context and send to LLM
    4. Add assistant response to conversation
    5. Return the assistant message
    """
    # Add user message
    user_message = await add_message(
        conversation_id=conversation_id,
        role=MessageRole.user,
        content=query,
        db=db,
    )
    
    # Get relevant context from uni info
    context = await get_relevant_context(query, db)
    
    # Build messages for LLM
    system_prompt = """You are a helpful university assistant. Use the following university information to answer the student's question. If the information doesn't contain the answer, say so honestly.

Relevant University Information:
{context}"""
    
    messages = [
        {"role": "system", "content": system_prompt.format(context=context)},
        {"role": "user", "content": query},
    ]
    
    # Generate response using LLM
    response = await generate_with_student_config(messages, user_id, db)
    
    # Add assistant message
    assistant_message = await add_message(
        conversation_id=conversation_id,
        role=MessageRole.assistant,
        content=response,
        db=db,
    )
    
    return assistant_message
