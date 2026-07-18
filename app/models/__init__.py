from app.models.user import Base, User, UserRole
from app.models.material import Material, Chunk, MaterialStatus
from app.models.note import Note
from app.models.quiz import Quiz
from app.models.exam_paper import ExamPaper
from app.models.uni_info import UniInfo, UniInfoCategory
from app.models.chat import Conversation, Message, MessageRole
from app.models.llm_config import LLMConfig
from app.models.department import Department
from app.models.system_config import SystemConfig

__all__ = [
    "Base",
    "User",
    "UserRole",
    "Material",
    "Chunk",
    "MaterialStatus",
    "Note",
    "Quiz",
    "ExamPaper",
    "UniInfo",
    "UniInfoCategory",
    "Conversation",
    "Message",
    "MessageRole",
    "LLMConfig",
    "Department",
    "SystemConfig",
]
