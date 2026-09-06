from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.services.analytics_service import build_stats_summary
from app.services.gemini_service import gemini_service

router = APIRouter()


@router.get("", response_model=dict)
def insights(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    summary = build_stats_summary(session, current_user.id)
    result = gemini_service.generate_insights(summary)

    return {
        "summary": str(result.get("summary", "")),
        "recommendations": list(result.get("recommendations", [])),
        "trigger_patterns": list(result.get("trigger_patterns", [])),
        "stats_summary": summary,
    }