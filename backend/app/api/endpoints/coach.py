import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from app.api.deps import get_current_user
from app.core.database import get_session
from app.models.coach import ChatMessage
from app.models.user import User
from app.services.gemini_service import gemini_service

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


def chat_row_to_dict(msg: ChatMessage) -> dict:
    return {
        "id": str(msg.id),
        "role": msg.role,
        "content": msg.content,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@router.post("/chat", response_model=dict)
def coach_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    user_message = ChatMessage(
        user_id=current_user.id, role="user", content=payload.message
    )
    session.add(user_message)
    session.commit()
    session.refresh(user_message)

    history = session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(100)
    ).all()

    turns = [{"role": m.role, "content": m.content} for m in history]
    reply_text = gemini_service.coach_chat(turns)

    assistant_message = ChatMessage(
        user_id=current_user.id, role="assistant", content=reply_text
    )
    session.add(assistant_message)
    session.commit()
    session.refresh(assistant_message)

    return {
        "reply": reply_text,
        "messages": {
            "user": chat_row_to_dict(user_message),
            "assistant": chat_row_to_dict(assistant_message),
        },
    }


@router.get("/history", response_model=dict)
def coach_history(
    limit: int = Query(default=100, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    messages = session.exec(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .limit(limit)
    ).all()
    return {"items": [chat_row_to_dict(m) for m in messages], "count": len(messages)}