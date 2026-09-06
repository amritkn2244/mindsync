from collections.abc import Generator

from sqlalchemy import text as sql_text
from sqlalchemy.engine import make_url
from sqlmodel import SQLModel, Session, create_engine

from app.core.config import settings


def _build_database_url() -> str:
    url = make_url(settings.database_url)
    # The bundled DB driver is psycopg (v3). SQLAlchemy needs the explicit
    # "+psycopg" recipe, otherwise "postgresql://" defaults to psycopg2.
    if url.get_backend_name() == "postgresql":
        url = url.set(drivername="postgresql+psycopg")
    return url.render_as_string(hide_password=False)


engine = create_engine(
    _build_database_url(),
    echo=False,
    pool_pre_ping=True,
    pool_recycle=300,
)


_STARTUP_MIGRATIONS = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(120)",
]


def _run_startup_migrations() -> None:
    """Idempotent ALTERs for columns added after the first deploy.

    ``create_all`` will not modify existing tables, so new columns are
    introduced here. Only Postgres SQL is used (Neon is the target).
    """
    with engine.begin() as conn:
        for statement in _STARTUP_MIGRATIONS:
            conn.execute(sql_text(statement))


def create_db_and_tables() -> None:
    # Import models so they are registered on SQLModel.metadata before create_all.
    from app import models  # noqa: F401

    SQLModel.metadata.create_all(engine)
    _run_startup_migrations()


def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session