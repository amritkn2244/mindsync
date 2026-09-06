import uuid
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


class JournalEntry(SQLModel, table=True):
    __tablename__ = "journal_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True)
    content: str = Field(nullable=False)
    sentiment_score: Optional[float] = Field(default=None)
    cognitive_reframe: Optional[str] = Field(default=None)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), nullable=False
    )