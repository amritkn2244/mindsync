from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.user import User
from app.schemas.auth import LoginRequest, SignupResponse, TokenResponse
from app.schemas.user import UserCreate, UserResponse
from app.services.auth_service import create_access_token, hash_password, verify_password

router = APIRouter()


@router.post("/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, session: Session = Depends(get_session)):
    email = payload.email.lower().strip()

    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="That email is already registered. Try logging in instead.",
        )

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip() if payload.full_name else None,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    return SignupResponse(message="Account created", user=UserResponse.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, session: Session = Depends(get_session)):
    email = payload.email.lower().strip()
    user = session.exec(select(User).where(User.email == email)).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
        )

    token = create_access_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )