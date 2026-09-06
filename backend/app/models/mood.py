import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


class MoodLog(SQLModel, table=True):
    __tablename__ = "mood_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    mood_score: int = Field(ge=1, le=10)
    energy_score: int = Field(ge=1, le=10)
    triggers: list[str] = Field(default_factory=list, sa_column=Column(JSON))
    notes: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )