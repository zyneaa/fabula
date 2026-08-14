from app.models.chat import Conversation, Message, MessageRole
from app.models.department import Department
from app.models.exam_paper import ExamPaper
from app.models.llm_config import LLMConfig
from app.models.material import Chunk, Material, MaterialStatus
from app.models.note import Note
from app.models.quiz import Quiz
from app.models.system_config import SystemConfig
from app.models.uni_info import UniInfo, UniInfoCategory
from app.models.user import Base, User, UserRole

__all__ = [
    "Base",
    "Chunk",
    "Conversation",
    "Department",
    "ExamPaper",
    "LLMConfig",
    "Material",
    "MaterialStatus",
    "Message",
    "MessageRole",
    "Note",
    "Quiz",
    "SystemConfig",
    "UniInfo",
    "UniInfoCategory",
    "User",
    "UserRole",
]
