import json
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.exam_paper import ExamPaper
from app.models.material import Chunk, Material
from app.services.llm import generate_with_student_config

logger = structlog.get_logger()


async def analyze_exam_style(
    exam_material_id: int, teacher_id: int, db: AsyncSession
) -> dict:
    """Analyze a previous exam paper to extract its style profile."""
    
    # Fetch exam material
    result = await db.execute(
        select(Material).where(Material.id == exam_material_id)
    )
    material = result.scalar_one_or_none()
    if not material:
        raise ValueError(f"Material {exam_material_id} not found")
    
    # Fetch chunks
    result = await db.execute(
        select(Chunk)
        .where(Chunk.material_id == exam_material_id)
        .order_by(Chunk.chunk_index)
    )
    chunks = result.scalars().all()
    
    if not chunks:
        raise ValueError(f"No chunks found for material {exam_material_id}")
    
    content = "\n\n".join([chunk.text for chunk in chunks])
    
    # Analyze exam style
    messages = [
        {
            "role": "system",
            "content": """You are an expert exam analyst. Analyze the provided exam paper and extract its style profile. Return a JSON object with this structure:
{
  "question_types": ["type1", "type2"],
  "total_questions": 10,
  "difficulty_distribution": {"easy": 3, "medium": 5, "hard": 2},
  "sections": ["Section A", "Section B"],
  "marking_scheme": "Brief description of marking approach",
  "format_style": "Description of formatting",
  "time_allocation": "Time allocation details if mentioned",
  "instruction_style": "How instructions are written",
  "key_characteristics": ["characteristic1", "characteristic2"]
}""",
        },
        {
            "role": "user",
            "content": f"Analyze this exam paper and extract its style profile:\n\n{content}",
        },
    ]
    
    response = await generate_with_student_config(messages, teacher_id, db)
    
    # Parse JSON
    try:
        json_start = response.find("{")
        json_end = response.rfind("}") + 1
        if json_start >= 0 and json_end > json_start:
            json_str = response[json_start:json_end]
            style_profile = json.loads(json_str)
        else:
            style_profile = json.loads(response)
    except json.JSONDecodeError as e:
        logger.error("Failed to parse style profile JSON", error=str(e))
        raise ValueError(f"Failed to parse style profile: {str(e)}")
    
    return style_profile


async def generate_exam_papers(
    course_material_id: int,
    source_exam_id: int | None,
    teacher_id: int,
    course_id: str,
    num_papers: int,
    db: AsyncSession,
) -> list[ExamPaper]:
    """Generate multiple exam papers based on course material and optional style profile."""
    
    # Fetch course material
    result = await db.execute(
        select(Material).where(Material.id == course_material_id)
    )
    course_material = result.scalar_one_or_none()
    if not course_material:
        raise ValueError(f"Course material {course_material_id} not found")
    
    # Fetch course chunks
    result = await db.execute(
        select(Chunk)
        .where(Chunk.material_id == course_material_id)
        .order_by(Chunk.chunk_index)
    )
    course_chunks = result.scalars().all()
    
    if not course_chunks:
        raise ValueError(f"No chunks found for course material {course_material_id}")
    
    course_content = "\n\n".join([chunk.text for chunk in course_chunks])
    
    # Analyze source exam if provided
    style_profile = None
    if source_exam_id:
        style_profile = await analyze_exam_style(source_exam_id, teacher_id, db)
    
    # Generate papers
    papers = []
    for paper_num in range(1, num_papers + 1):
        logger.info(f"Generating exam paper {paper_num}/{num_papers}")
        
        # Build prompt
        style_instruction = ""
        if style_profile:
            style_instruction = f"""
Match the style of the previous exam paper:
- Question types: {', '.join(style_profile.get('question_types', []))}
- Difficulty distribution: {style_profile.get('difficulty_distribution', {})}
- Sections: {', '.join(style_profile.get('sections', []))}
- Key characteristics: {', '.join(style_profile.get('key_characteristics', []))}
"""
        
        messages = [
            {
                "role": "system",
                "content": f"""You are an expert educator creating exam papers. Generate a comprehensive exam paper based on the course material.
{style_instruction}
The exam should:
- Be well-structured with clear sections
- Include a mix of question types
- Have appropriate difficulty progression
- Include clear instructions
- Be different from previous papers while maintaining similar style
- Include an answer key at the end

Format the exam paper in markdown with clear headings and structure.""",
            },
            {
                "role": "user",
                "content": f"""Generate exam paper #{paper_num} for course {course_id} based on this material:

{course_content}

Make this paper unique and different from other papers you might generate.""",
            },
        ]
        
        paper_content = await generate_with_student_config(messages, teacher_id, db)
        
        # Save to database
        exam_paper = ExamPaper(
            course_id=course_id,
            teacher_id=teacher_id,
            source_exam_id=source_exam_id,
            paper_number=paper_num,
            content=paper_content,
            style_profile=style_profile,
        )
        db.add(exam_paper)
        await db.commit()
        await db.refresh(exam_paper)
        papers.append(exam_paper)
        
        logger.info(
            "Generated exam paper",
            course_id=course_id,
            paper_number=paper_num,
            exam_paper_id=exam_paper.id,
        )
    
    return papers


async def generate_questions_from_materials(
    material_ids: list[int],
    source_exam_id: int | None,
    teacher_id: int,
    db: AsyncSession,
) -> str:
    materials_content = []
    for mid in material_ids:
        result = await db.execute(select(Material).where(Material.id == mid))
        material = result.scalar_one_or_none()
        if not material:
            raise ValueError(f"Material {mid} not found")
        result = await db.execute(
            select(Chunk).where(Chunk.material_id == mid).order_by(Chunk.chunk_index)
        )
        chunks = result.scalars().all()
        if not chunks:
            raise ValueError(f"No chunks found for material {mid}")
        content = "\n\n".join([chunk.text for chunk in chunks])
        materials_content.append(f"--- {material.title} ---\n{content}")
    combined = "\n\n".join(materials_content)

    style_instruction = ""
    if source_exam_id:
        result = await db.execute(select(ExamPaper).where(ExamPaper.id == source_exam_id))
        source = result.scalar_one_or_none()
        if source:
            style_instruction = f"\nUse this example exam as style reference:\n\n{source.content[:2000]}\n"

    messages = [
        {
            "role": "system",
            "content": f"You are an expert educator creating exam questions. Based on the course materials, generate exactly 3 exam questions. Each question should test different topics, include marks allocation, a difficulty level (Easy/Medium/Hard), and a model answer.{style_instruction}Format each question in markdown with:\n## Question 1\n**Topic:** ...\n**Marks:** ...\n**Difficulty:** ...\n**Question:** ...\n**Model Answer:** ...",
        },
        {
            "role": "user",
            "content": f"Generate 3 exam questions based on these materials:\n\n{combined}",
        },
    ]
    return await generate_with_student_config(messages, teacher_id, db)
