import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.mood import MoodLog
from app.models.user import User

router = APIRouter()


class MoodCreate(BaseModel):
    mood_score: int = Field(ge=1, le=10)
    energy_score: int = Field(ge=1, le=10)
    triggers: list[str] = Field(default_factory=list, max_length=20)
    notes: str | None = Field(default=None, max_length=2000)
    created_at: datetime | None = None


def mood_row_to_dict(m: MoodLog) -> dict:
    return {
        "id": str(m.id),
        "mood_score": m.mood_score,
        "energy_score": m.energy_score,
        "triggers": m.triggers or [],
        "notes": m.notes,
        "created_at": m.created_at.isoformat() if m.created_at else None,
        "date": m.created_at.strftime("%Y-%m-%d") if m.created_at else None,
    }


@router.post("", response_model=dict)
def create_mood(
    payload: MoodCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    mood = MoodLog(
        user_id=current_user.id,
        mood_score=payload.mood_score,
        energy_score=payload.energy_score,
        triggers=[t.strip() for t in payload.triggers if t and t.strip()],
        notes=payload.notes,
        created_at=payload.created_at or datetime.now(timezone.utc),
    )
    session.add(mood)
    session.commit()
    session.refresh(mood)
    return {"message": "Check-in saved", "entry": mood_row_to_dict(mood)}


@router.get("/history", response_model=dict)
def mood_history(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    moods = session.exec(
        select(MoodLog)
        .where(MoodLog.user_id == current_user.id)
        .order_by(MoodLog.created_at.desc())
        .limit(limit)
    ).all()
    return {"items": [mood_row_to_dict(m) for m in moods], "count": len(moods)}