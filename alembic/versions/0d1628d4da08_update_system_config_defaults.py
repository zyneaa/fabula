"""update system config defaults

Revision ID: 0d1628d4da08
Revises: 959ce1f568aa
Create Date: 2026-07-19 00:27:16.699153

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0d1628d4da08'
down_revision: Union[str, Sequence[str], None] = '959ce1f568aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("UPDATE system_configs SET max_materials = 25, max_tokens = 100000 WHERE max_materials = 5 AND max_tokens = 4096")


def downgrade() -> None:
    op.execute("UPDATE system_configs SET max_materials = 5, max_tokens = 4096 WHERE max_materials = 25 AND max_tokens = 100000")
