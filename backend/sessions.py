"""Sessions API: session summary and history."""

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Session, User

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionSummary(BaseModel):
    id: int
    slot_id: str
    service_name: str
    started_at: str
    ended_at: str | None
    duration_min: int
    end_reason: str | None
    dump_path: str | None
    dump_sent: bool
    tabs_count: int
    files_count: int
    telegram_status: str  # "sent" | "pending" | "error" | "no_telegram"


@router.get("/{session_id}/summary", response_model=SessionSummary)
def get_session_summary(
    session_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Сессия не найдена")
    if session.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Нет доступа к этой сессии")

    # Calculate duration
    duration_min = 0
    if session.started_at and session.ended_at:
        started = session.started_at.replace(tzinfo=timezone.utc)
        ended = session.ended_at.replace(tzinfo=timezone.utc)
        duration_min = int((ended - started).total_seconds() / 60)

    # Dump info (tabs/files counts will be populated by dump script in S2-4)
    tabs_count = 0
    files_count = 0
    if session.dump_path:
        # Parse dump metadata if available
        try:
            import json
            import os
            meta_path = session.dump_path.replace(".tar.gz", "_meta.json")
            if os.path.exists(meta_path):
                with open(meta_path) as f:
                    meta = json.load(f)
                    tabs_count = meta.get("tabs_count", 0)
                    files_count = meta.get("files_count", 0)
        except Exception:
            pass

    # Telegram status
    telegram_status = "no_telegram"
    if user.telegram_id:
        telegram_status = "sent" if session.dump_sent else "pending"

    return SessionSummary(
        id=session.id,
        slot_id=session.slot_id,
        service_name=session.slot.service_name if session.slot else session.slot_id,
        started_at=session.started_at.isoformat() if session.started_at else "",
        ended_at=session.ended_at.isoformat() if session.ended_at else None,
        duration_min=duration_min,
        end_reason=session.end_reason,
        dump_path=session.dump_path,
        dump_sent=session.dump_sent,
        tabs_count=tabs_count,
        files_count=files_count,
        telegram_status=telegram_status,
    )
