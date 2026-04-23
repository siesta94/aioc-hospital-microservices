"""initial reports schema

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
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS reports (
            id                 SERIAL PRIMARY KEY,
            patient_id         INTEGER NOT NULL,
            diagnosis_code     VARCHAR,
            content            TEXT NOT NULL,
            therapy            TEXT,
            lab_exams          TEXT,
            referral_specialty VARCHAR,
            created_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at         TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by_id      INTEGER
        )
    """))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_reports_patient_id ON reports (patient_id)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_reports_updated_at ON reports (updated_at DESC)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS reports"))
