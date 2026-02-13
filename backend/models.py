from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Boolean, Float, DateTime, ForeignKey, Text, JSON,
)
from sqlalchemy.orm import relationship

from backend.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    username = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    totp_secret = Column(String, nullable=True)
    telegram_id = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False)
    is_first_login = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    sessions = relationship("Session", back_populates="user")
    bookings = relationship("Booking", back_populates="user")
    favorites = relationship("UserFavorite", back_populates="user")


class Slot(Base):
    __tablename__ = "slots"

    id = Column(String, primary_key=True)  # e.g. "ppx-1"
    service_name = Column(String, nullable=False)
    tier = Column(String, nullable=True)
    category = Column(String, nullable=False)
    category_accent = Column(String, default="#3b82f6")
    monthly_cost = Column(Float, default=0)
    url = Column(String, nullable=True)
    login_encrypted = Column(String, nullable=True)
    password_encrypted = Column(String, nullable=True)
    chrome_profile = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    sessions = relationship("Session", back_populates="slot")
    bookings = relationship("Booking", back_populates="slot")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(String, ForeignKey("slots.id"), nullable=False)
    vm_id = Column(String, nullable=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    end_reason = Column(String, nullable=True)  # manual / timeout / disconnect
    dump_path = Column(String, nullable=True)
    dump_sent = Column(Boolean, default=False)

    user = relationship("User", back_populates="sessions")
    slot = relationship("Slot", back_populates="sessions")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(String, ForeignKey("slots.id"), nullable=False)
    date = Column(String, nullable=False)  # "2026-02-14"
    start_time = Column(String, nullable=False)  # "10:00"
    duration_min = Column(Integer, default=60)
    status = Column(String, default="active")  # active / cancelled / expired
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="bookings")
    slot = relationship("Slot", back_populates="bookings")


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    icon = Column(String, default="🔍")
    slot_ids = Column(JSON, default=list)  # ["ppx-1", "nb-drive"]
    url = Column(String, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    usage_count = Column(Integer, default=0)


class VmStatus(Base):
    __tablename__ = "vm_status"

    vm_id = Column(String, primary_key=True)
    is_healthy = Column(Boolean, default=True)
    active_user = Column(String, nullable=True)
    active_slot = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow)


class UserFavorite(Base):
    __tablename__ = "user_favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(String, ForeignKey("slots.id"), nullable=False)

    user = relationship("User", back_populates="favorites")


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    slot_id = Column(String, ForeignKey("slots.id"), nullable=False)
    position = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    slot = relationship("Slot")
