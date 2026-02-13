"""Session dump — collect artifacts from VM via SSH, store locally.

The actual SSH transfer requires VM credentials (BLOCKED until SSH keys configured).
This module provides the logic for:
- Triggering dump collection on a VM via SSH
- Downloading the archive via SCP
- Storing the dump path in the sessions table
- Cleanup of expired dumps (>14 days)
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy.orm import Session as DbSession

from backend.models import Session

logger = logging.getLogger(__name__)

# Where dumps are stored on the backend server
DUMP_STORAGE = Path(os.getenv("VDI_DUMP_STORAGE", "./dumps"))
DUMP_RETENTION_DAYS = 14


def ensure_storage() -> Path:
    """Create dump storage directory if it doesn't exist."""
    DUMP_STORAGE.mkdir(parents=True, exist_ok=True)
    return DUMP_STORAGE


async def collect_dump_from_vm(
    session_id: int,
    vm_host: str,
    chrome_profile: str = "Default",
    ssh_user: str = "vdi",
    ssh_key_path: str | None = None,
) -> dict:
    """SSH into VM, run collect_dump.sh, download archive.

    Returns metadata dict with tabs_count, files_count, archive_path.

    [BLOCKED: needs SSH key/credentials to connect to VM]
    """
    storage = ensure_storage()
    archive_name = f"session_{session_id}_dump.tar.gz"
    meta_name = f"session_{session_id}_dump_meta.json"
    local_archive = storage / archive_name
    local_meta = storage / meta_name

    try:
        import paramiko

        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        connect_kwargs: dict = {"username": ssh_user}
        if ssh_key_path:
            connect_kwargs["key_filename"] = ssh_key_path
        ssh.connect(vm_host, **connect_kwargs)

        # Run collection script
        _, stdout, stderr = ssh.exec_command(
            f"/opt/vdi/collect_dump.sh {session_id} {chrome_profile}"
        )
        exit_status = stdout.channel.recv_exit_status()
        if exit_status != 0:
            err = stderr.read().decode()
            logger.error("Dump collection failed on %s: %s", vm_host, err)
            return {"error": err, "tabs_count": 0, "files_count": 0}

        # Download files via SFTP
        sftp = ssh.open_sftp()
        sftp.get(f"/tmp/{archive_name}", str(local_archive))
        sftp.get(f"/tmp/{meta_name}", str(local_meta))
        sftp.close()
        ssh.close()

        # Parse metadata
        with open(local_meta) as f:
            meta = json.load(f)

        logger.info(
            "Dump collected for session %d: tabs=%d, files=%d",
            session_id,
            meta.get("tabs_count", 0),
            meta.get("files_count", 0),
        )
        return {
            "archive_path": str(local_archive),
            "meta_path": str(local_meta),
            **meta,
        }

    except ImportError:
        logger.warning("paramiko not installed — SSH dump collection unavailable")
        return {"error": "paramiko not installed", "tabs_count": 0, "files_count": 0}
    except Exception as e:
        logger.error("Dump collection error for session %d: %s", session_id, e)
        return {"error": str(e), "tabs_count": 0, "files_count": 0}


def save_dump_path(db: DbSession, session_id: int, dump_path: str) -> None:
    """Store the dump archive path in the session record."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if session:
        session.dump_path = dump_path
        db.commit()


def cleanup_expired_dumps() -> int:
    """Delete dump archives older than DUMP_RETENTION_DAYS. Returns count deleted."""
    storage = ensure_storage()
    cutoff = datetime.now(timezone.utc) - timedelta(days=DUMP_RETENTION_DAYS)
    deleted = 0

    for path in storage.iterdir():
        if path.is_file() and path.stat().st_mtime < cutoff.timestamp():
            path.unlink()
            deleted += 1
            logger.info("Deleted expired dump: %s", path.name)

    return deleted


def cleanup_expired_dumps_db(db: DbSession) -> int:
    """Clear dump_path for sessions with expired dumps."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=DUMP_RETENTION_DAYS)
    sessions = (
        db.query(Session)
        .filter(Session.dump_path.isnot(None), Session.ended_at < cutoff)
        .all()
    )
    count = 0
    for session in sessions:
        if session.dump_path and not os.path.exists(session.dump_path):
            session.dump_path = None
            count += 1
    if count:
        db.commit()
    return count
