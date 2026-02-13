"""Profile API: get/update profile, favorites."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import User, UserFavorite

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
    # Update telegram_id if provided
    if body.telegram_id is not None:
        user.telegram_id = body.telegram_id
        db.commit()

    # Update favorites if provided
    if body.favorites is not None:
        # Delete existing
        db.query(UserFavorite).filter(UserFavorite.user_id == user.id).delete()
        # Insert new
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
