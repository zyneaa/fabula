import json
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.material import Chunk, Material, MaterialStatus
from app.models.quiz import Quiz
from app.services.llm import generate_with_student_config

logger = structlog.get_logger()


async def generate_quiz(
    conversation_id: int,
    user_id: int,
    db: AsyncSession,
) -> Quiz:
    """Generate quiz questions from conversation materials using LLM."""
    
    # Fetch ready materials for this conversation
    result = await db.execute(
        select(Material).where(
            Material.conversation_id == conversation_id,
            Material.user_id == user_id,
            Material.status == MaterialStatus.ready,
        )
    )
    materials = result.scalars().all()
    
    if not materials:
        raise ValueError(f"No ready materials found for conversation {conversation_id}")
    
    # Fetch all chunks from all materials
    all_chunks = []
    for material in materials:
        result = await db.execute(
            select(Chunk)
            .where(Chunk.material_id == material.id)
            .order_by(Chunk.chunk_index)
        )
        chunks = result.scalars().all()
        all_chunks.extend(chunks)
    
    if not all_chunks:
        raise ValueError(f"No chunks found for materials in conversation {conversation_id}")
    
    # Combine chunks into content
    content = "\n\n".join([chunk.text for chunk in all_chunks])
    
    # Generate quiz using LLM
    messages = [
        {
            "role": "system",
            "content": """You are an expert educator creating quiz questions. Generate exactly 10 quiz questions based on the provided material. Include a mix of:
- 5 multiple choice questions (MCQ) with 4 options each
- 5 short answer questions

Return your response as a valid JSON object with this exact structure:
{
  "questions": [
    {
      "type": "mcq",
      "question": "Question text here?",
      "options": ["A) Option A", "B) Option B", "C) Option C", "D) Option D"],
      "correct_answer": "A) Option A",
      "explanation": "Brief explanation of why this is correct"
    },
    {
      "type": "short_answer",
      "question": "Question text here?",
      "correct_answer": "Expected answer",
      "explanation": "Brief explanation"
    }
  ]
}

Ensure the JSON is valid and properly formatted.""",
        },
        {
            "role": "user",
            "content": f"Generate 10 quiz questions from the following material:\n\n{content}",
        },
    ]
    
    response = await generate_with_student_config(messages, user_id, db)
    
    # Parse JSON response
    try:
        # Try to extract JSON from response (in case LLM adds extra text)
        json_start = response.find("{")
        json_end = response.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_str = response[json_start:json_end]
            quiz_data = json.loads(json_str)
        else:
            quiz_data = json.loads(response)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse quiz JSON", error=str(e), response=response)
        raise ValueError(f"Failed to parse quiz response: {str(e)}")
    
    # Save to database (quiz is tied to conversation, not individual material)
    quiz = Quiz(
        material_id=materials[0].id,
        user_id=user_id,
        questions=quiz_data,
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)
    
    logger.info(
        "Generated quiz",
        conversation_id=conversation_id,
        user_id=user_id,
        quiz_id=quiz.id,
        question_count=len(quiz_data.get("questions", [])),
        material_count=len(materials),
    )
    
    return quiz
