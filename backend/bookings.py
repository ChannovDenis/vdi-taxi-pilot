"""Bookings API: create, list, cancel bookings."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Booking, User

router = APIRouter(prefix="/bookings", tags=["bookings"])


# ── Schemas ──

class BookingCreate(BaseModel):
    slot_id: str
    date: str  # "2026-02-14"
    start_time: str  # "10:00"
    duration_min: int = 60


class BookingOut(BaseModel):
    id: int
    slot_id: str
    date: str
    start_time: str
    duration_min: int
    status: str
    created_at: str


# ── Helpers ──

def _time_to_minutes(t: str) -> int:
    """Convert 'HH:MM' to minutes since midnight."""
    h, m = t.split(":")
    return int(h) * 60 + int(m)


def _check_conflict(db: DbSession, slot_id: str, date: str, start_time: str, duration_min: int, exclude_id: int | None = None):
    """Check if a booking conflicts with existing active bookings."""
    new_start = _time_to_minutes(start_time)
    new_end = new_start + duration_min

    existing = db.query(Booking).filter(
        Booking.slot_id == slot_id,
        Booking.date == date,
        Booking.status == "active",
    ).all()

    for b in existing:
        if exclude_id and b.id == exclude_id:
            continue
        b_start = _time_to_minutes(b.start_time)
        b_end = b_start + b.duration_min
        if new_start < b_end and new_end > b_start:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Конфликт с бронью {b.start_time}–{b_start + b.duration_min // 60}:{b.duration_min % 60:02d}",
            )


# ── Endpoints ──

@router.get("", response_model=list[BookingOut])
def list_bookings(
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == user.id, Booking.status == "active")
        .order_by(Booking.date, Booking.start_time)
        .all()
    )
    return [
        BookingOut(
            id=b.id,
            slot_id=b.slot_id,
            date=b.date,
            start_time=b.start_time,
            duration_min=b.duration_min,
            status=b.status,
            created_at=b.created_at.isoformat(),
        )
        for b in bookings
    ]


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    body: BookingCreate,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Validate date is not in the past
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if body.date < today:
        raise HTTPException(status_code=400, detail="Дата не может быть в прошлом")

    # Validate time format
    try:
        _time_to_minutes(body.start_time)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Неверный формат времени")

    # Check conflicts
    _check_conflict(db, body.slot_id, body.date, body.start_time, body.duration_min)

    booking = Booking(
        user_id=user.id,
        slot_id=body.slot_id,
        date=body.date,
        start_time=body.start_time,
        duration_min=body.duration_min,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return BookingOut(
        id=booking.id,
        slot_id=booking.slot_id,
        date=booking.date,
        start_time=booking.start_time,
        duration_min=booking.duration_min,
        status=booking.status,
        created_at=booking.created_at.isoformat(),
    )


@router.delete("/{booking_id}")
def cancel_booking(
    booking_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id, Booking.user_id == user.id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Бронь не найдена")

    booking.status = "cancelled"
    db.commit()

    return {"ok": True, "id": booking_id}
