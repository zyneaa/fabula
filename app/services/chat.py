from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chat import Conversation, Message, MessageRole
from app.models.material import Material, Chunk, MaterialStatus
from app.models.uni_info import UniInfo
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


async def rename_conversation(
    conversation_id: int,
    user_id: int,
    title: str,
    db: AsyncSession,
) -> Conversation | None:
    conversation = await get_conversation(conversation_id, user_id, db)
    if not conversation:
        return None
    conversation.title = title
    await db.commit()
    await db.refresh(conversation)
    return conversation


async def generate_conversation_title(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
) -> str | None:
    conversation = await get_conversation(conversation_id, user_id, db)
    if not conversation:
        return None
    messages = await get_conversation_messages(conversation_id, db)
    if not messages:
        return None
    text = "\n".join(f"{m.role.value}: {m.content[:200]}" for m in messages[:4])
    prompt = (
        "Generate a very short title (max 6 words, no quotes) for this conversation based on the messages:\n"
        f"{text}\n\nTitle:"
    )
    try:
        from app.services.llm import generate_with_student_config
        title = await generate_with_student_config(
            [{"role": "user", "content": prompt}], user_id, db
        )
        title = title.strip().strip('"').strip("'")[:255]
        conversation.title = title
        await db.commit()
        return title
    except Exception:
        return None


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


async def get_conversation_context(
    conversation_id: int,
    user_id: int,
    query: str,
    db: AsyncSession,
) -> str:
    """
    Build context from conversation materials and university info.
    """
    context_parts = []

    # Get materials for this conversation
    materials_result = await db.execute(
        select(Material).where(
            Material.conversation_id == conversation_id,
            Material.user_id == user_id,
            Material.status == MaterialStatus.ready,
        )
    )
    materials = materials_result.scalars().all()

    if materials:
        context_parts.append("=== CONVERSATION MATERIALS ===")
        for material in materials:
            # Get chunks for this material
            chunks_result = await db.execute(
                select(Chunk)
                .where(Chunk.material_id == material.id)
                .order_by(Chunk.chunk_index)
            )
            chunks = chunks_result.scalars().all()

            if chunks:
                context_parts.append(f"\n--- {material.title} ---")
                for chunk in chunks:
                    context_parts.append(chunk.text)

    # Search for relevant university info based on query
    keywords = [word.lower() for word in query.split() if len(word) > 2]
    if keywords:
        from sqlalchemy import or_

        conditions = []
        for keyword in keywords:
            conditions.append(UniInfo.title.ilike(f"%{keyword}%"))
            conditions.append(UniInfo.content.ilike(f"%{keyword}%"))

        if conditions:
            uni_info_result = await db.execute(
                select(UniInfo)
                .where(or_(*conditions))
                .order_by(UniInfo.created_at.desc())
                .limit(5)
            )
            uni_info_entries = uni_info_result.scalars().all()

            if uni_info_entries:
                context_parts.append("\n\n=== UNIVERSITY INFORMATION ===")
                for entry in uni_info_entries:
                    context_parts.append(f"\n[{entry.category.value.upper()}] {entry.title}")
                    context_parts.append(entry.content)

    if not context_parts:
        return "No relevant materials or university information found."

    return "\n".join(context_parts)


async def process_student_query(
    conversation_id: int,
    user_id: int,
    query: str,
    db: AsyncSession,
) -> Message:
    """
    Process a student's query:
    1. Add user message to conversation
    2. Build context from materials and uni info
    3. Send to LLM with context
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

    # Get context from materials and uni info
    context = await get_conversation_context(conversation_id, user_id, query, db)

    # Build messages for LLM
    system_prompt = """You are a university tutor giving detailed, insightful answers. Use the context below.

Guidelines:
- Go beyond listing topics. Explain why each concept matters, how they connect, and common pitfalls.
- Use concrete examples and analogies.
- If explaining a slide deck, don't just summarize section headers — elaborate on each concept, its real-world application, and its role in the broader subject.
- If the context is thin, supplement with your own knowledge of the subject.
- Keep your tone academic but clear. Assume the student has basic domain knowledge but needs depth.
- Structure long answers with brief sections or bullet points for readability.

Context:
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
