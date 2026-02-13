"""Admin API: users, stats, services CRUD."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import require_admin
from backend.models import User, Slot, Session, QueueEntry

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Schemas ──

class UserRow(BaseModel):
    name: str
    telegram_id: str | None
    sessions_week: int
    hours_week: float


class SlotStats(BaseModel):
    slot_id: str
    pct: int
    recommendation: str | None


class SlotAdminOut(BaseModel):
    id: str
    service_name: str
    tier: str | None
    category: str
    category_accent: str
    monthly_cost: float
    url: str | None
    login: str | None
    password: str | None
    chrome_profile: str | None
    is_active: bool


class SlotCreate(BaseModel):
    id: str
    service_name: str
    tier: str | None = None
    category: str = "Общие"
    category_accent: str = "#3b82f6"
    monthly_cost: float = 0
    url: str | None = None
    login: str | None = None
    password: str | None = None
    chrome_profile: str | None = None
    is_active: bool = True


class SlotUpdate(BaseModel):
    service_name: str | None = None
    tier: str | None = None
    category: str | None = None
    category_accent: str | None = None
    monthly_cost: float | None = None
    url: str | None = None
    login: str | None = None
    password: str | None = None
    chrome_profile: str | None = None
    is_active: bool | None = None


# ── Users & Stats Endpoints (S1-7) ──

@router.get("/users", response_model=list[UserRow])
def list_users(
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all users with session stats for the past 7 days."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    users = db.query(User).all()
    result = []
    for u in users:
        # Count sessions in the last week
        sessions_week = (
            db.query(Session)
            .filter(Session.user_id == u.id, Session.started_at >= week_ago)
            .count()
        )
        # Sum hours in the last week
        week_sessions = (
            db.query(Session)
            .filter(Session.user_id == u.id, Session.started_at >= week_ago)
            .all()
        )
        total_seconds = 0
        now = datetime.utcnow()
        for s in week_sessions:
            end = s.ended_at or now
            total_seconds += (end - s.started_at).total_seconds()
        hours_week = round(total_seconds / 3600, 1)

        result.append(UserRow(
            name=u.name,
            telegram_id=u.telegram_id,
            sessions_week=sessions_week,
            hours_week=hours_week,
        ))
    return result


@router.get("/stats", response_model=list[SlotStats])
def get_stats(
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Slot utilization percentage (last 7 days, hours occupied / total hours)."""
    week_ago = datetime.utcnow() - timedelta(days=7)
    total_hours = 7 * 24  # 168 hours in a week
    slots = db.query(Slot).filter(Slot.is_active == True).all()
    result = []
    now = datetime.utcnow()
    for slot in slots:
        sessions = (
            db.query(Session)
            .filter(Session.slot_id == slot.id, Session.started_at >= week_ago)
            .all()
        )
        occupied_seconds = 0
        for s in sessions:
            start = max(s.started_at, week_ago)
            end = s.ended_at or now
            occupied_seconds += (end - start).total_seconds()
        pct = min(100, round((occupied_seconds / (total_hours * 3600)) * 100))
        recommendation = None
        if pct > 70:
            recommendation = f"{slot.service_name}: загрузка {pct}% — рассмотрите добавление слота"
        result.append(SlotStats(slot_id=slot.id, pct=pct, recommendation=recommendation))
    return result


# ── Services CRUD Endpoints (S1-8) ──

@router.get("/slots", response_model=list[SlotAdminOut])
def list_admin_slots(
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """List all slots with credentials (admin only)."""
    slots = db.query(Slot).all()
    return [
        SlotAdminOut(
            id=s.id,
            service_name=s.service_name,
            tier=s.tier,
            category=s.category,
            category_accent=s.category_accent,
            monthly_cost=s.monthly_cost,
            url=s.url,
            login=s.login_encrypted,
            password=s.password_encrypted,
            chrome_profile=s.chrome_profile,
            is_active=s.is_active,
        )
        for s in slots
    ]


@router.post("/slots", response_model=SlotAdminOut, status_code=201)
def create_admin_slot(
    body: SlotCreate,
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Create a new slot."""
    existing = db.query(Slot).filter(Slot.id == body.id).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Слот с ID '{body.id}' уже существует")

    slot = Slot(
        id=body.id,
        service_name=body.service_name,
        tier=body.tier,
        category=body.category,
        category_accent=body.category_accent,
        monthly_cost=body.monthly_cost,
        url=body.url,
        login_encrypted=body.login,
        password_encrypted=body.password,
        chrome_profile=body.chrome_profile,
        is_active=body.is_active,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    return SlotAdminOut(
        id=slot.id,
        service_name=slot.service_name,
        tier=slot.tier,
        category=slot.category,
        category_accent=slot.category_accent,
        monthly_cost=slot.monthly_cost,
        url=slot.url,
        login=slot.login_encrypted,
        password=slot.password_encrypted,
        chrome_profile=slot.chrome_profile,
        is_active=slot.is_active,
    )


@router.put("/slots/{slot_id}", response_model=SlotAdminOut)
def update_admin_slot(
    slot_id: str,
    body: SlotUpdate,
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Update a slot's fields."""
    slot = db.query(Slot).filter(Slot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Слот не найден")

    if body.service_name is not None:
        slot.service_name = body.service_name
    if body.tier is not None:
        slot.tier = body.tier
    if body.category is not None:
        slot.category = body.category
    if body.category_accent is not None:
        slot.category_accent = body.category_accent
    if body.monthly_cost is not None:
        slot.monthly_cost = body.monthly_cost
    if body.url is not None:
        slot.url = body.url
    if body.login is not None:
        slot.login_encrypted = body.login
    if body.password is not None:
        slot.password_encrypted = body.password
    if body.chrome_profile is not None:
        slot.chrome_profile = body.chrome_profile
    if body.is_active is not None:
        slot.is_active = body.is_active

    db.commit()
    db.refresh(slot)

    return SlotAdminOut(
        id=slot.id,
        service_name=slot.service_name,
        tier=slot.tier,
        category=slot.category,
        category_accent=slot.category_accent,
        monthly_cost=slot.monthly_cost,
        url=slot.url,
        login=slot.login_encrypted,
        password=slot.password_encrypted,
        chrome_profile=slot.chrome_profile,
        is_active=slot.is_active,
    )
