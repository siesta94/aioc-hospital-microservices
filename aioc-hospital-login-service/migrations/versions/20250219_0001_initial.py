"""initial

Revision ID: 0001
Revises:
Create Date: 2025-02-19 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()

    # Create enum only if it does not already exist
    exists = conn.execute(
        sa.text("SELECT 1 FROM pg_type WHERE typname = 'userrole'")
    ).fetchone()
    if not exists:
        conn.execute(sa.text("CREATE TYPE userrole AS ENUM ('user', 'admin')"))

    # Create table only if it does not already exist
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS users (
            id               SERIAL PRIMARY KEY,
            username         VARCHAR NOT NULL,
            hashed_password  VARCHAR NOT NULL,
            role             userrole NOT NULL DEFAULT 'user',
            is_active        BOOLEAN DEFAULT TRUE,
            full_name        VARCHAR
        )
    """))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_username ON users (username)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_users_id ON users (id)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS users"))
    conn.execute(sa.text("DROP TYPE IF EXISTS userrole"))
