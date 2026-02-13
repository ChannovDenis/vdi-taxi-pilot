"""Guacamole REST API client — create/delete VNC/RDP connections."""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.config import settings

logger = logging.getLogger(__name__)

# Guacamole REST API base (set via env VDI_GUACAMOLE_URL)
_BASE: str = ""
_TOKEN: str | None = None


def _base_url() -> str:
    global _BASE
    if not _BASE:
        _BASE = getattr(settings, "guacamole_url", "http://guacamole:8080/guacamole")
    return _BASE


async def _get_token() -> str:
    """Authenticate against Guacamole and cache the admin token."""
    global _TOKEN
    if _TOKEN:
        return _TOKEN

    url = f"{_base_url()}/api/tokens"
    user = getattr(settings, "guacamole_admin_user", "guacadmin")
    passwd = getattr(settings, "guacamole_admin_pass", "guacadmin")

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, data={"username": user, "password": passwd})
        resp.raise_for_status()
        _TOKEN = resp.json()["authToken"]
    return _TOKEN


async def _api(method: str, path: str, **kwargs: Any) -> Any:
    """Call Guacamole REST API with cached token."""
    token = await _get_token()
    url = f"{_base_url()}/api{path}?token={token}"

    async with httpx.AsyncClient() as client:
        resp = await client.request(method, url, **kwargs)
        if resp.status_code == 403:
            # Token expired — re-auth once
            global _TOKEN
            _TOKEN = None
            token = await _get_token()
            url = f"{_base_url()}/api{path}?token={token}"
            resp = await client.request(method, url, **kwargs)
        resp.raise_for_status()
        if resp.status_code == 204 or not resp.content:
            return None
        return resp.json()


# ── Public API ─────────────────────────────────────────────


async def create_connection(
    slot_id: str,
    vm_host: str,
    *,
    protocol: str = "vnc",
    port: int = 5901,
    password: str = "",
) -> dict:
    """Create a Guacamole connection for a VDI slot.

    Returns ``{"identifier": "42", "name": "ppx-1", ...}``.
    """
    payload = {
        "parentIdentifier": "ROOT",
        "name": slot_id,
        "protocol": protocol,
        "parameters": {
            "hostname": vm_host,
            "port": str(port),
            "password": password,
            # clipboard & resize
            "enable-wallpaper": "true",
            "resize-method": "reconnect",
            "clipboard-encoding": "UTF-8",
        },
        "attributes": {
            "max-connections": "1",
            "max-connections-per-user": "1",
        },
    }
    result = await _api(
        "POST",
        "/session/data/postgresql/connections",
        json=payload,
    )
    logger.info("Guacamole connection created: %s → %s", slot_id, result)
    return result


async def delete_connection(connection_id: str) -> None:
    """Remove a Guacamole connection by its numeric identifier."""
    await _api("DELETE", f"/session/data/postgresql/connections/{connection_id}")
    logger.info("Guacamole connection deleted: %s", connection_id)


async def get_client_url(connection_id: str) -> str:
    """Return the URL for embedding the Guacamole client in an iframe.

    Format: ``/guacamole/#/client/{encoded_id}``
    where ``encoded_id`` is ``{connection_id}\0c\0postgresql`` base64-encoded.
    """
    import base64

    raw = f"{connection_id}\0c\0postgresql"
    encoded = base64.b64encode(raw.encode()).decode()
    token = await _get_token()
    return f"{_base_url()}/#/client/{encoded}?token={token}"


async def list_connections() -> list[dict]:
    """List all existing Guacamole connections."""
    result = await _api("GET", "/session/data/postgresql/connections")
    if isinstance(result, dict):
        return list(result.values())
    return result or []
