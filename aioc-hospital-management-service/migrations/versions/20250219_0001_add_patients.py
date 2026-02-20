"""add patients table

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

    # gender enum — safe to create even if patients table already exists
    conn.execute(sa.text("""
        DO $$ BEGIN
            CREATE TYPE gender AS ENUM ('male', 'female', 'other');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """))

    conn.execute(sa.text("""
        CREATE TABLE IF NOT EXISTS patients (
            id                    SERIAL PRIMARY KEY,
            medical_record_number VARCHAR NOT NULL,
            first_name            VARCHAR NOT NULL,
            last_name             VARCHAR NOT NULL,
            date_of_birth         VARCHAR NOT NULL,
            gender                gender  NOT NULL,
            email                 VARCHAR,
            phone                 VARCHAR,
            address               VARCHAR,
            notes                 TEXT,
            is_active             BOOLEAN NOT NULL DEFAULT TRUE,
            created_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at            TIMESTAMP NOT NULL DEFAULT NOW(),
            created_by_id         INTEGER REFERENCES users(id)
        )
    """))
    conn.execute(sa.text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_patients_medical_record_number ON patients (medical_record_number)"
    ))
    conn.execute(sa.text(
        "CREATE INDEX IF NOT EXISTS ix_patients_id ON patients (id)"
    ))


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(sa.text("DROP TABLE IF EXISTS patients"))
    conn.execute(sa.text("DROP TYPE IF EXISTS gender"))
