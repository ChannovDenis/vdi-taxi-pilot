"""Slots API: list, occupy, release."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Slot, Session, User

router = APIRouter(prefix="/slots", tags=["slots"])


# ── Schemas ──

class SlotOut(BaseModel):
    id: str
    service_name: str
    tier: str | None
    category: str
    category_accent: str
    monthly_cost: float
    available: bool
    occupant_name: str | None = None
    session_minutes: int | None = None


class OccupyResponse(BaseModel):
    session_id: int
    slot_id: str
    started_at: str
    guacamole_url: str  # placeholder for now


# ── Endpoints ──

@router.get("", response_model=list[SlotOut])
def list_slots(db: DbSession = Depends(get_db), _user: User = Depends(get_current_user)):
    slots = db.query(Slot).filter(Slot.is_active == True).all()
    result = []
    for slot in slots:
        # Check for active session (no ended_at)
        active_session = (
            db.query(Session)
            .filter(Session.slot_id == slot.id, Session.ended_at == None)
            .first()
        )
        occupant_name = None
        session_minutes = None
        if active_session:
            occupant_name = active_session.user.name
            elapsed = datetime.now(timezone.utc) - active_session.started_at.replace(tzinfo=timezone.utc)
            session_minutes = int(elapsed.total_seconds() / 60)

        result.append(SlotOut(
            id=slot.id,
            service_name=slot.service_name,
            tier=slot.tier,
            category=slot.category,
            category_accent=slot.category_accent,
            monthly_cost=slot.monthly_cost,
            available=active_session is None,
            occupant_name=occupant_name,
            session_minutes=session_minutes,
        ))
    return result


@router.post("/{slot_id}/occupy", response_model=OccupyResponse)
def occupy_slot(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")

    active = (
        db.query(Session)
        .filter(Session.slot_id == slot_id, Session.ended_at == None)
        .first()
    )
    if active:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Слот уже занят пользователем {active.user.name}",
        )

    session = Session(user_id=user.id, slot_id=slot_id)
    db.add(session)
    db.commit()
    db.refresh(session)

    return OccupyResponse(
        session_id=session.id,
        slot_id=slot_id,
        started_at=session.started_at.isoformat(),
        guacamole_url=f"/guacamole/#/client/{slot_id}",  # placeholder
    )


@router.post("/{slot_id}/release")
def release_slot(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    active = (
        db.query(Session)
        .filter(
            Session.slot_id == slot_id,
            Session.ended_at == None,
            Session.user_id == user.id,
        )
        .first()
    )
    if not active:
        raise HTTPException(status_code=404, detail="Нет активной сессии для этого слота")

    active.ended_at = datetime.now(timezone.utc)
    active.end_reason = "manual"
    db.commit()

    return {"ok": True, "session_id": active.id}
