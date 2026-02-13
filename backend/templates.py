"""Templates API: CRUD + launch."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import get_current_user
from backend.models import Template, Session, Slot, User

router = APIRouter(prefix="/templates", tags=["templates"])


# ── Schemas ──

class TemplateCreate(BaseModel):
    name: str
    icon: str = "🔍"
    slot_ids: list[str]
    url: str | None = None


class TemplateOut(BaseModel):
    id: int
    name: str
    icon: str
    slot_ids: list[str]
    url: str | None
    created_by: int | None
    usage_count: int


class LaunchResult(BaseModel):
    template_id: int
    sessions: list[dict]


# ── Endpoints ──

@router.get("", response_model=list[TemplateOut])
def list_templates(
    db: DbSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    templates = db.query(Template).all()
    return [
        TemplateOut(
            id=t.id,
            name=t.name,
            icon=t.icon,
            slot_ids=t.slot_ids or [],
            url=t.url,
            created_by=t.created_by,
            usage_count=t.usage_count,
        )
        for t in templates
    ]


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(
    body: TemplateCreate,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not body.slot_ids:
        raise HTTPException(status_code=400, detail="Выберите хотя бы один слот")

    tpl = Template(
        name=body.name,
        icon=body.icon,
        slot_ids=body.slot_ids,
        url=body.url,
        created_by=user.id,
    )
    db.add(tpl)
    db.commit()
    db.refresh(tpl)

    return TemplateOut(
        id=tpl.id,
        name=tpl.name,
        icon=tpl.icon,
        slot_ids=tpl.slot_ids or [],
        url=tpl.url,
        created_by=tpl.created_by,
        usage_count=tpl.usage_count,
    )


@router.put("/{template_id}", response_model=TemplateOut)
def update_template(
    template_id: int,
    body: TemplateCreate,
    db: DbSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    tpl = db.query(Template).filter(Template.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    tpl.name = body.name
    tpl.icon = body.icon
    tpl.slot_ids = body.slot_ids
    tpl.url = body.url
    db.commit()
    db.refresh(tpl)

    return TemplateOut(
        id=tpl.id,
        name=tpl.name,
        icon=tpl.icon,
        slot_ids=tpl.slot_ids or [],
        url=tpl.url,
        created_by=tpl.created_by,
        usage_count=tpl.usage_count,
    )


@router.delete("/{template_id}")
def delete_template(
    template_id: int,
    db: DbSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    tpl = db.query(Template).filter(Template.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    db.delete(tpl)
    db.commit()
    return {"ok": True}


@router.post("/{template_id}/launch", response_model=LaunchResult)
def launch_template(
    template_id: int,
    db: DbSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    tpl = db.query(Template).filter(Template.id == template_id).first()
    if not tpl:
        raise HTTPException(status_code=404, detail="Шаблон не найден")

    sessions_created = []
    for slot_id in (tpl.slot_ids or []):
        slot = db.query(Slot).filter(Slot.id == slot_id).first()
        if not slot:
            continue
        # Check if already occupied
        active = db.query(Session).filter(Session.slot_id == slot_id, Session.ended_at == None).first()
        if active:
            sessions_created.append({"slot_id": slot_id, "status": "occupied", "occupant": active.user.name})
            continue

        session = Session(user_id=user.id, slot_id=slot_id)
        db.add(session)
        db.flush()
        sessions_created.append({
            "slot_id": slot_id,
            "status": "ok",
            "session_id": session.id,
        })

    tpl.usage_count += 1
    db.commit()

    return LaunchResult(template_id=template_id, sessions=sessions_created)
