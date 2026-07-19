"""Update uni_info categories: remove directory/metadata, add misc

Revision ID: cb7a0d13e4ed
Revises: c2a4013107c6
Create Date: 2026-07-19 15:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "cb7a0d13e4ed"
down_revision: Union[str, None] = "c2a4013107c6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE uniinfocategory_new AS ENUM('timetable', 'event', 'course', 'misc')")
    op.execute("""
        ALTER TABLE uni_info
        ALTER COLUMN category TYPE uniinfocategory_new
        USING (
            CASE
                WHEN category::text IN ('directory', 'metadata') THEN 'misc'::uniinfocategory_new
                ELSE category::text::uniinfocategory_new
            END
        )
    """)
    op.execute("DROP TYPE uniinfocategory")
    op.execute("ALTER TYPE uniinfocategory_new RENAME TO uniinfocategory")


def downgrade() -> None:
    op.execute("CREATE TYPE uniinfocategory_old AS ENUM('timetable', 'event', 'directory', 'course', 'metadata')")
    op.execute("""
        ALTER TABLE uni_info
        ALTER COLUMN category TYPE uniinfocategory_old
        USING (
            CASE
                WHEN category::text = 'misc' THEN 'metadata'::uniinfocategory_old
                ELSE category::text::uniinfocategory_old
            END
        )
    """)
    op.execute("DROP TYPE uniinfocategory")
    op.execute("ALTER TYPE uniinfocategory_old RENAME TO uniinfocategory")
