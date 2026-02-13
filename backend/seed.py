"""Seed script: creates admin user + 10 slots + 3 templates from BLUEPRINT."""

from backend.database import engine, SessionLocal, Base
from backend.models import User, Slot, VmStatus, Template
from backend.auth import hash_password

SLOTS = [
    {"id": "ppx-1", "service_name": "Perplexity Max #1", "tier": "Max", "category": "РЕСЕРЧ", "category_accent": "#3b82f6", "monthly_cost": 200},
    {"id": "ppx-2", "service_name": "Perplexity Max #2", "tier": "Max", "category": "РЕСЕРЧ", "category_accent": "#3b82f6", "monthly_cost": 200},
    {"id": "ppx-3", "service_name": "Perplexity Max #3", "tier": "Max", "category": "РЕСЕРЧ", "category_accent": "#3b82f6", "monthly_cost": 200},
    {"id": "gem-dt", "service_name": "Gemini Ultra — Deep Think", "tier": "Ultra", "category": "GOOGLE AI", "category_accent": "#4285f4", "monthly_cost": 250},
    {"id": "nbp", "service_name": "Nano Banana Pro", "tier": "Pro", "category": "GOOGLE AI", "category_accent": "#4285f4", "monthly_cost": 200},
    {"id": "gem-veo", "service_name": "Veo + Flow (видео)", "tier": "Ultra", "category": "ВИДЕО", "category_accent": "#a855f7", "monthly_cost": 250},
    {"id": "nb-drive", "service_name": "NotebookLM + Drive", "tier": "Ultra", "category": "GOOGLE AI", "category_accent": "#4285f4", "monthly_cost": 250},
    {"id": "gpt-1", "service_name": "ChatGPT Pro — o3-pro", "tier": "Pro", "category": "REASONING", "category_accent": "#8b5cf6", "monthly_cost": 200},
    {"id": "hf-1", "service_name": "Higgsfield Ultimate", "tier": "Ultimate", "category": "ВИДЕО", "category_accent": "#a855f7", "monthly_cost": 50},
    {"id": "lov-1", "service_name": "Lovable Team", "tier": "Team", "category": "КОД", "category_accent": "#f97316", "monthly_cost": 50},
]

TEMPLATES = [
    {"name": "Ресерч конкурентов", "icon": "\U0001f50d", "slot_ids": ["ppx-1", "nb-drive"]},
    {"name": "Создание видео", "icon": "\U0001f3ac", "slot_ids": ["gem-veo", "hf-1"]},
    {"name": "Подготовка презентации", "icon": "\U0001f4ca", "slot_ids": ["gem-dt", "nbp"]},
]

VMS = [
    {"vm_id": "VM-1", "is_healthy": True},
    {"vm_id": "VM-2", "is_healthy": True},
    {"vm_id": "VM-3", "is_healthy": True},
    {"vm_id": "VM-4", "is_healthy": False},
    {"vm_id": "VM-5", "is_healthy": True},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Admin user (password: admin123, no TOTP for dev)
    if not db.query(User).filter(User.username == "admin").first():
        db.add(User(
            name="Админ",
            username="admin",
            password_hash=hash_password("admin123"),
            is_admin=True,
            is_first_login=False,
        ))

    # Regular user (password: user123)
    if not db.query(User).filter(User.username == "anna").first():
        db.add(User(
            name="Анна",
            username="anna",
            password_hash=hash_password("user123"),
            is_admin=False,
            is_first_login=True,
            telegram_id="@anna",
        ))

    # Slots
    for s in SLOTS:
        if not db.query(Slot).filter(Slot.id == s["id"]).first():
            db.add(Slot(**s))

    # Templates
    for t in TEMPLATES:
        if not db.query(Template).filter(Template.name == t["name"]).first():
            db.add(Template(**t))

    # VMs
    for vm in VMS:
        if not db.query(VmStatus).filter(VmStatus.vm_id == vm["vm_id"]).first():
            db.add(VmStatus(**vm))

    db.commit()
    db.close()
    print("Seed complete: 2 users, 10 slots, 3 templates, 5 VMs")


if __name__ == "__main__":
    seed()
