"""Profile API: get/update profile, favorites, session history."""

from datetime import timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User, UserFavorite, Session

router = APIRouter(prefix="/profile", tags=["profile"])


# ── Schemas ──

class ProfileOut(BaseModel):
    id: int
    name: str
    username: str
    telegram_id: str | None
    is_admin: bool
    is_first_login: bool
    favorites: list[str]


class ProfileUpdate(BaseModel):
    telegram_id: str | None = None
    favorites: list[str] | None = None


class SessionHistoryItem(BaseModel):
    id: int
    slot_id: str
    service_name: str
    started_at: str
    ended_at: str | None
    duration_min: int
    end_reason: str | None
    dump_path: str | None


# ── Endpoints ──

@router.get("", response_model=ProfileOut)
def get_profile(
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    fav_ids = [f.slot_id for f in db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all()]
    return ProfileOut(
        id=user.id,
        name=user.name,
        username=user.username,
        telegram_id=user.telegram_id,
        is_admin=user.is_admin,
        is_first_login=user.is_first_login,
        favorites=fav_ids,
    )


@router.put("", response_model=ProfileOut)
def update_profile(
    body: ProfileUpdate,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if body.telegram_id is not None:
        user.telegram_id = body.telegram_id
        db.commit()

    if body.favorites is not None:
        db.query(UserFavorite).filter(UserFavorite.user_id == user.id).delete()
        for slot_id in body.favorites:
            db.add(UserFavorite(user_id=user.id, slot_id=slot_id))
        db.commit()

    fav_ids = [f.slot_id for f in db.query(UserFavorite).filter(UserFavorite.user_id == user.id).all()]
    return ProfileOut(
        id=user.id,
        name=user.name,
        username=user.username,
        telegram_id=user.telegram_id,
        is_admin=user.is_admin,
        is_first_login=user.is_first_login,
        favorites=fav_ids,
    )


@router.get("/sessions", response_model=list[SessionHistoryItem])
def get_session_history(
    limit: int = Query(default=20, le=100),
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return user's session history (most recent first)."""
    sessions = (
        db.query(Session)
        .filter(Session.user_id == user.id, Session.ended_at.isnot(None))
        .order_by(Session.started_at.desc())
        .limit(limit)
        .all()
    )
    result = []
    for s in sessions:
        duration = 0
        if s.started_at and s.ended_at:
            started = s.started_at.replace(tzinfo=timezone.utc)
            ended = s.ended_at.replace(tzinfo=timezone.utc)
            duration = int((ended - started).total_seconds() / 60)

        result.append(SessionHistoryItem(
            id=s.id,
            slot_id=s.slot_id,
            service_name=s.slot.service_name if s.slot else s.slot_id,
            started_at=s.started_at.isoformat() if s.started_at else "",
            ended_at=s.ended_at.isoformat() if s.ended_at else None,
            duration_min=duration,
            end_reason=s.end_reason,
            dump_path=s.dump_path,
        ))
    return result
