import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.journal import JournalEntry
from app.models.user import User
from app.services.gemini_service import gemini_service

router = APIRouter()


class JournalCreate(BaseModel):
    content: str = Field(min_length=1, max_length=20000)


def journal_row_to_dict(j: JournalEntry) -> dict:
    return {
        "id": str(j.id),
        "content": j.content,
        "sentiment_score": j.sentiment_score,
        "cognitive_reframe": j.cognitive_reframe,
        "created_at": j.created_at.isoformat() if j.created_at else None,
        "date": j.created_at.strftime("%Y-%m-%d") if j.created_at else None,
    }


@router.post("", response_model=dict)
def create_journal(
    payload: JournalCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    analysis = gemini_service.analyze_journal_entry(payload.content)

    entry = JournalEntry(
        user_id=current_user.id,
        content=payload.content,
        sentiment_score=float(analysis.get("sentiment_score", 0.0)),
        cognitive_reframe=str(analysis.get("cognitive_reframe", "")),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)

    return {
        "message": "Entry saved",
        "entry": journal_row_to_dict(entry),
        "sentiment_score": entry.sentiment_score,
        "detected_mood": analysis.get("detected_mood", "neutral"),
        "cognitive_reframe": entry.cognitive_reframe,
    }


@router.get("/history", response_model=dict)
def journal_history(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    entries = session.exec(
        select(JournalEntry)
        .where(JournalEntry.user_id == current_user.id)
        .order_by(JournalEntry.created_at.desc())
        .limit(limit)
    ).all()
    return {"items": [journal_row_to_dict(j) for j in entries], "count": len(entries)}