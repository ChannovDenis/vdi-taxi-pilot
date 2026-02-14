"""Slots API: list, occupy, release, credentials."""

import base64
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.config import settings
from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Slot, Session, User, QueueEntry
from backend.websocket import broadcast_sync

logger = logging.getLogger(__name__)

# Cache: slot_id → Guacamole connection identifier (e.g. "ppx-1" → "2")
_guac_conn_cache: dict[str, str] = {}


def _get_guacamole_token() -> str | None:
    """Get a fresh Guacamole auth token (sync)."""
    try:
        url = f"{settings.guacamole_url}/api/tokens"
        resp = httpx.post(
            url,
            data={
                "username": settings.guacamole_admin_user,
                "password": settings.guacamole_admin_pass,
            },
            timeout=5,
        )
        resp.raise_for_status()
        return resp.json()["authToken"]
    except Exception as exc:
        logger.warning("Failed to get Guacamole token: %s", exc)
        return None


def _get_guac_connection_id(slot_id: str) -> str | None:
    """Resolve slot_id → Guacamole connection identifier via API.

    Connections are named by slot_id (e.g. "ppx-1").  Results are cached.
    Falls back to connection "1" (VDI-Station-1) if not found.
    """
    if slot_id in _guac_conn_cache:
        return _guac_conn_cache[slot_id]

    token = _get_guacamole_token()
    if not token:
        return "1"  # fallback

    try:
        url = f"{settings.guacamole_url}/api/session/data/postgresql/connections?token={token}"
        resp = httpx.get(url, timeout=5)
        resp.raise_for_status()
        connections = resp.json()
        # connections is {identifier: {name, identifier, ...}}
        for conn_id, conn in connections.items():
            name = conn.get("name", "")
            _guac_conn_cache[name] = conn_id
        if slot_id in _guac_conn_cache:
            return _guac_conn_cache[slot_id]
    except Exception as exc:
        logger.warning("Failed to list Guacamole connections: %s", exc)

    return "1"  # fallback to VDI-Station-1


def _build_guac_client_url(slot_id: str, token: str) -> str:
    """Build Guacamole client URL for a specific slot."""
    conn_id = _get_guac_connection_id(slot_id)
    raw = f"{conn_id}\0c\0postgresql"
    encoded = base64.b64encode(raw.encode()).decode()
    return f"/guacamole/#/client/{encoded}?token={token}"


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
    queue_size: int = 0


class OccupyResponse(BaseModel):
    session_id: int
    slot_id: str
    started_at: str
    guacamole_url: str


class SlotCredentials(BaseModel):
    """Service credentials for a slot (returned only to session occupant)."""
    slot_id: str
    service_name: str
    url: str | None = None
    login: str | None = None
    password: str | None = None


# ── Endpoints ──

@router.get("/guacamole-token")
def get_guacamole_token(
    slot_id: str = "ppx-1",
    _user: User = Depends(get_current_user),
):
    """Return a fresh Guacamole auth token + client URL for a specific slot."""
    token = _get_guacamole_token()
    if not token:
        raise HTTPException(
            status_code=502,
            detail="Не удалось получить токен Guacamole",
        )
    return {
        "token": token,
        "client_url": _build_guac_client_url(slot_id, token),
    }


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
        q_size = db.query(QueueEntry).filter(QueueEntry.slot_id == slot.id).count()
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
            queue_size=q_size,
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

    # Build Guacamole client URL for this specific slot's connection
    token = _get_guacamole_token()
    guac_url = _build_guac_client_url(slot_id, token) if token else "/guacamole/"

    # Broadcast to WebSocket clients
    broadcast_sync("slot_occupied", {
        "slot_id": slot_id,
        "occupant_name": user.name,
    })
    return OccupyResponse(
        session_id=session.id,
        slot_id=slot_id,
        started_at=session.started_at.isoformat(),
        guacamole_url=guac_url,
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
    # Notify first in queue (remove from queue — Telegram notification in S2-5)
    first_in_queue = (
        db.query(QueueEntry)
        .filter(QueueEntry.slot_id == slot_id)
        .order_by(QueueEntry.position)
        .first()
    )
    next_user_name = None
    if first_in_queue:
        next_user_name = first_in_queue.user.name
        db.delete(first_in_queue)
    db.commit()
    # Broadcast to WebSocket clients
    broadcast_sync("slot_released", {
        "slot_id": slot_id,
        "next_in_queue": next_user_name,
    })
    return {"ok": True, "session_id": active.id, "next_in_queue": next_user_name}


@router.get("/{slot_id}/credentials", response_model=SlotCredentials)
def get_slot_credentials(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return service credentials for a slot.
    Only the current occupant of the slot can access credentials.
    """
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")
    # Verify the user has an active session on this slot
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
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Только текущий пользователь слота может видеть учётные данные",
        )
    return SlotCredentials(
        slot_id=slot.id,
        service_name=slot.service_name,
        url=slot.url,
        login=slot.login_encrypted,
        password=slot.password_encrypted,
    )


@router.post("/{slot_id}/force-release")
def force_release_slot(
    slot_id: str,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Admin-only: force-release any occupied slot regardless of who owns it."""
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Только администратор может принудительно освободить слот")

    active = (
        db.query(Session)
        .filter(Session.slot_id == slot_id, Session.ended_at == None)
        .first()
    )
    if not active:
        raise HTTPException(status_code=404, detail="Нет активной сессии для этого слота")

    active.ended_at = datetime.now(timezone.utc)
    active.end_reason = "admin_force"

    # Clean queue
    first_in_queue = (
        db.query(QueueEntry)
        .filter(QueueEntry.slot_id == slot_id)
        .order_by(QueueEntry.position)
        .first()
    )
    next_user_name = None
    if first_in_queue:
        next_user_name = first_in_queue.user.name
        db.delete(first_in_queue)

    db.commit()

    broadcast_sync("slot_released", {
        "slot_id": slot_id,
        "next_in_queue": next_user_name,
    })

    return {"ok": True, "session_id": active.id, "next_in_queue": next_user_name}
