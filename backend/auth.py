from datetime import datetime, timedelta, timezone

import bcrypt
import pyotp
from jose import jwt, JWTError
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.database import get_db
from backend.models import User

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


# ── Schemas ──

class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str = ""


class LoginResponse(BaseModel):
    token: str
    user: dict


class UserOut(BaseModel):
    id: int
    name: str
    username: str
    telegram_id: str | None
    is_admin: bool
    is_first_login: bool


# ── Helpers ──

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(security),
    db: DbSession = Depends(get_db),
) -> User:
    try:
        payload = jwt.decode(creds.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
    return user


# ── Endpoints ──

@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, db: DbSession = Depends(get_db)):
    user = db.query(User).filter(User.username == body.username).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный логин или пароль")

    # TOTP check (skip if user has no secret set)
    if user.totp_secret:
        totp = pyotp.TOTP(user.totp_secret)
        if not totp.verify(body.totp_code, valid_window=1):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный код 2FA")

    token = create_token(user.id)
    return LoginResponse(
        token=token,
        user={
            "id": user.id,
            "name": user.name,
            "username": user.username,
            "telegram_id": user.telegram_id,
            "is_admin": user.is_admin,
            "is_first_login": user.is_first_login,
        },
    )


@router.post("/logout")
def logout():
    # Stateless JWT — client just deletes the token
    return {"ok": True}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut(
        id=user.id,
        name=user.name,
        username=user.username,
        telegram_id=user.telegram_id,
        is_admin=user.is_admin,
        is_first_login=user.is_first_login,
    )
