from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.uni_info import UniInfo, UniInfoCategory


async def search_uni_info(
    query: str,
    category: UniInfoCategory | None = None,
    limit: int = 5,
    db: AsyncSession = None,
) -> list[UniInfo]:
    """
    Search uni info entries using keyword matching.
    
    Args:
        query: Search query string
        category: Optional category filter
        limit: Maximum number of results
        db: Database session
    
    Returns:
        List of matching UniInfo entries
    """
    if not query or not db:
        return []
    
    # Extract keywords from query (simple word splitting)
    keywords = [word.lower() for word in query.split() if len(word) > 2]
    
    if not keywords:
        return []
    
    # Build search query
    stmt = select(UniInfo)
    
    # Filter by category if provided
    if category:
        stmt = stmt.where(UniInfo.category == category)
    
    # Search in title and content
    conditions = []
    for keyword in keywords:
        conditions.append(UniInfo.title.ilike(f"%{keyword}%"))
        conditions.append(UniInfo.content.ilike(f"%{keyword}%"))
    
    if conditions:
        stmt = stmt.where(or_(*conditions))
    
    stmt = stmt.order_by(UniInfo.created_at.desc()).limit(limit)
    
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_relevant_context(
    query: str,
    db: AsyncSession,
    limit: int = 5,
) -> str:
    """
    Get relevant uni info entries as context for LLM.
    
    Args:
        query: User's question
        db: Database session
        limit: Maximum number of entries to retrieve
    
    Returns:
        Formatted context string for LLM
    """
    entries = await search_uni_info(query, limit=limit, db=db)
    
    if not entries:
        return "No relevant university information found."
    
    context_parts = []
    for entry in entries:
        context_parts.append(
            f"[{entry.category.value.upper()}] {entry.title}\n{entry.content}"
        )
    
    return "\n\n---\n\n".join(context_parts)
