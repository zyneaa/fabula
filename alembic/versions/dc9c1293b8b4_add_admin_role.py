"""add_admin_role

Revision ID: dc9c1293b8b4
Revises: 4b022ab1520c
Create Date: 2026-07-05 19:34:41.705770

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'dc9c1293b8b4'
down_revision: Union[str, Sequence[str], None] = '4b022ab1520c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")


def downgrade() -> None:
    """Downgrade schema."""
    pass  # PostgreSQL doesn't support removing enum values
