"""add sub_specialty to doctors

Revision ID: 0002
Revises: 0001
Create Date: 2025-02-19 00:01:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'doctors' AND column_name = 'sub_specialty'
            ) THEN
                ALTER TABLE doctors ADD COLUMN sub_specialty VARCHAR;
            END IF;
        END $$
    """))


def downgrade() -> None:
    op.drop_column("doctors", "sub_specialty")
