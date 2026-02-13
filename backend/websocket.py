"""WebSocket endpoint for real-time slot status updates.

Broadcasts slot changes (occupy/release/queue) to all connected clients.
"""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter()

# Connected WebSocket clients
_clients: set[WebSocket] = set()


@router.websocket("/ws/slots")
async def slots_websocket(websocket: WebSocket):
    """WebSocket connection for real-time slot updates."""
    await websocket.accept()
    _clients.add(websocket)
    logger.info("WS client connected. Total: %d", len(_clients))

    try:
        while True:
            # Keep connection alive, listen for client messages (heartbeat)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        _clients.discard(websocket)
        logger.info("WS client disconnected. Total: %d", len(_clients))


async def broadcast(event: str, payload: dict[str, Any]) -> None:
    """Broadcast an event to all connected WebSocket clients.

    Args:
        event: Event type ("slot_occupied", "slot_released", "queue_changed")
        payload: Event data to send
    """
    if not _clients:
        return

    message = json.dumps({"event": event, **payload})
    dead: list[WebSocket] = []

    for ws in _clients:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)

    for ws in dead:
        _clients.discard(ws)


def broadcast_sync(event: str, payload: dict[str, Any]) -> None:
    """Synchronous wrapper for broadcast — for use in sync FastAPI endpoints."""
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.ensure_future(broadcast(event, payload))
        else:
            loop.run_until_complete(broadcast(event, payload))
    except RuntimeError:
        # No event loop — create one
        loop = asyncio.new_event_loop()
        loop.run_until_complete(broadcast(event, payload))
        loop.close()
