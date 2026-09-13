"""add exam_paper_jobs

Revision ID: d7e8f9a0b1c2
Revises: b8f3d2e1c4a5
Create Date: 2026-09-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd7e8f9a0b1c2'
down_revision: Union[str, Sequence[str], None] = 'b8f3d2e1c4a5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'exam_paper_jobs',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('teacher_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),
        sa.Column('num_papers', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('results', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_exam_paper_jobs_teacher_id', 'exam_paper_jobs', ['teacher_id'])


def downgrade() -> None:
    op.drop_index('ix_exam_paper_jobs_teacher_id', table_name='exam_paper_jobs')
    op.drop_table('exam_paper_jobs')