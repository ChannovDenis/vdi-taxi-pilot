"""Health monitoring API — VM status, VPN, service checks.

SSH-based VM checks are [BLOCKED: needs SSH credentials].
For now, returns data from vm_status table + slot active checks.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session as DbSession

from backend.database import get_db
from backend.auth import require_admin
from backend.models import VmStatus, Slot, Session, User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["admin-health"])


# ── Schemas ──

class VmInfo(BaseModel):
    vm_id: str
    is_healthy: bool
    active_user: str | None
    active_slot: str | None
    uptime: str | None
    updated_at: str | None


class ServiceStatus(BaseModel):
    slot_id: str
    service_name: str
    status: str  # "ok" | "warn" | "error"
    detail: str | None = None


class VpnStatus(BaseModel):
    connected: bool
    ip: str | None
    interface: str


class HealthResponse(BaseModel):
    vms: list[VmInfo]
    services: list[ServiceStatus]
    vpn: VpnStatus


# ── Endpoints ──

@router.get("/health", response_model=HealthResponse)
def get_health(
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # 1. VM statuses from database
    vm_records = db.query(VmStatus).all()
    vms = []
    for vm in vm_records:
        vms.append(VmInfo(
            vm_id=vm.vm_id,
            is_healthy=vm.is_healthy,
            active_user=vm.active_user,
            active_slot=vm.active_slot,
            uptime=None,  # SSH check needed
            updated_at=vm.updated_at.isoformat() if vm.updated_at else None,
        ))

    # If no VMs in DB, return placeholder VMs
    if not vms:
        for i in range(1, 6):
            vms.append(VmInfo(
                vm_id=f"VM-{i}",
                is_healthy=True,
                active_user=None,
                active_slot=None,
                uptime=None,
                updated_at=None,
            ))

    # 2. Service statuses — check if slots have active sessions
    slots = db.query(Slot).filter(Slot.is_active == True).all()
    services = []
    for slot in slots:
        active_session = (
            db.query(Session)
            .filter(Session.slot_id == slot.id, Session.ended_at == None)
            .first()
        )
        # Simple status: if slot exists and is active → ok
        # Future: check cookies, auth status via curl
        status = "ok"
        detail = None
        if active_session:
            user = db.query(User).filter(User.id == active_session.user_id).first()
            detail = f"Занят: {user.name}" if user else "Занят"

        services.append(ServiceStatus(
            slot_id=slot.id,
            service_name=slot.service_name,
            status=status,
            detail=detail,
        ))

    # 3. VPN status — placeholder until WireGuard integration
    # In production: subprocess.run(["wg", "show"], capture_output=True)
    vpn = VpnStatus(
        connected=True,  # placeholder
        ip=None,  # needs `wg show` output
        interface="wg0",
    )

    return HealthResponse(vms=vms, services=services, vpn=vpn)


@router.post("/vm/{vm_id}/reboot")
def reboot_vm(
    vm_id: str,
    db: DbSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    """Reboot a VM via SSH. [BLOCKED: needs SSH credentials]"""
    vm = db.query(VmStatus).filter(VmStatus.vm_id == vm_id).first()
    if not vm:
        raise HTTPException(status_code=404, detail=f"VM '{vm_id}' не найдена")

    # TODO: SSH reboot when credentials are configured
    # import paramiko
    # ssh = paramiko.SSHClient()
    # ssh.connect(vm_host, username="root", key_filename=...)
    # ssh.exec_command("reboot")

    logger.info("Reboot requested for VM %s [BLOCKED: SSH not configured]", vm_id)

    return {
        "ok": False,
        "vm_id": vm_id,
        "message": "SSH не настроен. Перезагрузите VM вручную.",
    }
