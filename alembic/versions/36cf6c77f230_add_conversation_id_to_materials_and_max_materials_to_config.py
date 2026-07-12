"""add_conversation_id_to_materials_and_max_materials_to_config

Revision ID: 36cf6c77f230
Revises: b70db89adddb
Create Date: 2026-07-11 17:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '36cf6c77f230'
down_revision: Union[str, None] = 'b70db89adddb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add conversation_id to materials (nullable)
    op.add_column('materials', sa.Column('conversation_id', sa.Integer(), nullable=True))
    op.create_index(op.f('ix_materials_conversation_id'), 'materials', ['conversation_id'], unique=False)
    op.create_foreign_key(
        'fk_materials_conversation_id',
        'materials',
        'conversations',
        ['conversation_id'],
        ['id'],
        ondelete='CASCADE'
    )
    
    # Add max_materials to llm_configs with server default
    op.add_column('llm_configs', sa.Column('max_materials', sa.Integer(), server_default='5', nullable=False))


def downgrade() -> None:
    op.drop_column('llm_configs', 'max_materials')
    op.drop_constraint('fk_materials_conversation_id', 'materials', type_='foreignkey')
    op.drop_index(op.f('ix_materials_conversation_id'), table_name='materials')
    op.drop_column('materials', 'conversation_id')
