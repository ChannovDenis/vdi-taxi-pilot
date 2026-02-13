"""Queue API: join queue, leave queue, get queue info."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession
from sqlalchemy import func

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import QueueEntry, Slot, Session, User

router = APIRouter(tags=["queue"])


# ── Schemas ──

class QueueResponse(BaseModel):
    slot_id: str
    position: int
    total_in_queue: int


class QueueInfo(BaseModel):
    slot_id: str
    queue_size: int


# ── Endpoints ──

@router.post("/slots/{slot_id}/queue", response_model=QueueResponse)
def join_queue(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Check slot exists
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")

    # Check if slot is actually occupied (no point queuing for free slot)
    active = db.query(Session).filter(Session.slot_id == slot_id, Session.ended_at == None).first()
    if not active:
        raise HTTPException(status_code=400, detail="Слот свободен — можно занять напрямую")

    # Check if already in queue
    existing = db.query(QueueEntry).filter(
        QueueEntry.slot_id == slot_id,
        QueueEntry.user_id == user.id,
    ).first()
    if existing:
        total = db.query(QueueEntry).filter(QueueEntry.slot_id == slot_id).count()
        return QueueResponse(slot_id=slot_id, position=existing.position, total_in_queue=total)

    # Get next position
    max_pos = db.query(func.max(QueueEntry.position)).filter(QueueEntry.slot_id == slot_id).scalar() or 0
    new_pos = max_pos + 1

    entry = QueueEntry(user_id=user.id, slot_id=slot_id, position=new_pos)
    db.add(entry)
    db.commit()

    total = db.query(QueueEntry).filter(QueueEntry.slot_id == slot_id).count()
    return QueueResponse(slot_id=slot_id, position=new_pos, total_in_queue=total)


@router.delete("/slots/{slot_id}/queue")
def leave_queue(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entry = db.query(QueueEntry).filter(
        QueueEntry.slot_id == slot_id,
        QueueEntry.user_id == user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Вы не в очереди")

    db.delete(entry)
    db.commit()
    return {"ok": True}


@router.get("/slots/{slot_id}/queue", response_model=QueueInfo)
def get_queue_info(
    slot_id: str,
    db: DbSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    queue_size = db.query(QueueEntry).filter(QueueEntry.slot_id == slot_id).count()
    return QueueInfo(slot_id=slot_id, queue_size=queue_size)
