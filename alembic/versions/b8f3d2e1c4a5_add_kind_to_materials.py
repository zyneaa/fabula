"""add kind to materials

Revision ID: b8f3d2e1c4a5
Revises: cb7a0d13e4ed
Create Date: 2026-09-14 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8f3d2e1c4a5'
down_revision: Union[str, Sequence[str], None] = 'cb7a0d13e4ed'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('materials', sa.Column('kind', sa.String(length=20), nullable=False, server_default='material'))


def downgrade() -> None:
    op.drop_column('materials', 'kind')