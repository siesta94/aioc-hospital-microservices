"""
Default user seeder.

This module seeds two default users into the database on startup when
SEED_DEFAULT_USERS=true in the environment.

To remove the default users:
  1. Set SEED_DEFAULT_USERS=false in your .env file (prevents re-seeding on restart)
  2. Delete them from the database:
       DELETE FROM users WHERE username IN ('user', 'admin');

These credentials are intended for development/initial setup only.
Replace or remove them before going to production.
"""

import logging
from sqlalchemy.orm import Session

from app.models import User, UserRole
from app.auth import hash_password

logger = logging.getLogger(__name__)

DEFAULT_USERS = [
    {
        "username": "user",
        "password": "pass",
        "role": UserRole.user,
        "full_name": "Default User",
    },
    {
        "username": "admin",
        "password": "admin",
        "role": UserRole.admin,
        "full_name": "Default Admin",
    },
]


def seed_default_users(db: Session) -> None:
    for entry in DEFAULT_USERS:
        exists = db.query(User).filter(User.username == entry["username"]).first()
        if not exists:
            user = User(
                username=entry["username"],
                hashed_password=hash_password(entry["password"]),
                role=entry["role"],
                full_name=entry["full_name"],
                is_active=True,
            )
            db.add(user)
            logger.info("Seeded default user: %s (%s)", entry["username"], entry["role"])
    db.commit()
