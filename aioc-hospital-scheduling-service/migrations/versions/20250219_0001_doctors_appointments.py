"""doctors and appointments

Revision ID: 0001
Revises:
Create Date: 2025-02-19

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
        DO $$ BEGIN
            CREATE TYPE appointment_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS doctors (
            id           SERIAL PRIMARY KEY,
            user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            display_name VARCHAR NOT NULL,
            specialty    VARCHAR,
            is_active    BOOLEAN NOT NULL DEFAULT TRUE,
            created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE(user_id)
        )
    """))
    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS appointments (
            id                SERIAL PRIMARY KEY,
            patient_id        INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
            doctor_id         INTEGER NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
            scheduled_at      TIMESTAMP NOT NULL,
            duration_minutes  INTEGER NOT NULL DEFAULT 30,
            status            appointment_status NOT NULL DEFAULT 'scheduled',
            notes             TEXT,
            created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at        TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by_id     INTEGER REFERENCES users(id)
        )
    """))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_doctors_id ON doctors (id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_id ON appointments (id)"))
    conn.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_scheduled_at ON appointments (scheduled_at)"))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS appointments"))
    conn.execute(sa.text("DROP TABLE IF EXISTS doctors"))
    conn.execute(sa.text("DROP TYPE IF EXISTS appointment_status"))
