from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.user import User
from app.services.analytics_service import get_metrics

router = APIRouter()


@router.get("", response_model=dict)
def analytics(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    return get_metrics(session, current_user.id)