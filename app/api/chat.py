from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.services.chat import (
    create_conversation,
    get_conversation,
    get_user_conversations,
    get_conversation_messages,
    process_student_query,
    rename_conversation,
    generate_conversation_title,
)

router = APIRouter(prefix="/chat", tags=["chat"])


class QueryRequest(BaseModel):
    query: str


class RenameRequest(BaseModel):
    title: str


class ConversationResponse(BaseModel):
    id: int
    title: str | None
    created_at: str
    message_count: int


class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: str


@router.post("/conversations")
async def start_conversation(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new conversation."""
    conversation = await create_conversation(current_user.id, db)
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
    }


@router.get("/conversations")
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all conversations for the current user."""
    conversations = await get_user_conversations(current_user.id, db)

    result = []
    for conv in conversations:
        messages = await get_conversation_messages(conv.id, db)
        result.append({
            "id": conv.id,
            "title": conv.title,
            "created_at": conv.created_at.isoformat(),
            "message_count": len(messages),
        })

    return result


@router.get("/conversations/{conversation_id}")
async def get_conversation_detail(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation details and messages."""
    conversation = await get_conversation(conversation_id, current_user.id, db)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    messages = await get_conversation_messages(conversation_id, db)

    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
        "messages": [
            {
                "id": msg.id,
                "role": msg.role.value,
                "content": msg.content,
                "created_at": msg.created_at.isoformat(),
            }
            for msg in messages
        ],
    }


@router.post("/conversations/{conversation_id}/query")
async def send_query(
    conversation_id: int,
    request: QueryRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Send a query to the conversation and get AI response."""
    # Verify conversation belongs to user
    conversation = await get_conversation(conversation_id, current_user.id, db)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Process the query
    assistant_message = await process_student_query(
        conversation_id=conversation_id,
        user_id=current_user.id,
        query=request.query,
        db=db,
    )

    return {
        "id": assistant_message.id,
        "role": assistant_message.role.value,
        "content": assistant_message.content,
        "created_at": assistant_message.created_at.isoformat(),
    }


@router.patch("/conversations/{conversation_id}")
async def rename_conversation_endpoint(
    conversation_id: int,
    request: RenameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conversation = await rename_conversation(conversation_id, current_user.id, request.title, db)
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {
        "id": conversation.id,
        "title": conversation.title,
        "created_at": conversation.created_at.isoformat(),
    }


@router.post("/conversations/{conversation_id}/generate-title")
async def generate_title(
    conversation_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    title = await generate_conversation_title(conversation_id, current_user.id, db)
    if title is None:
        raise HTTPException(status_code=404, detail="Conversation not found or no messages")
    return {"title": title}
