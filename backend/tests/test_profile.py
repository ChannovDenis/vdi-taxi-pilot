"""Tests for profile endpoints: get, update, favorites, session history."""

import pytest
from datetime import datetime, timedelta, timezone
from backend.tests.conftest import get_auth_header
from backend.models import Session


class TestGetProfile:
    def test_get_profile(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.get("/api/profile", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "testuser"
        assert data["name"] == "Test User"
        assert data["favorites"] == []


class TestUpdateProfile:
    def test_update_telegram(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.put("/api/profile", headers=headers, json={
            "telegram_id": "@testuser_tg",
        })
        assert resp.status_code == 200
        assert resp.json()["telegram_id"] == "@testuser_tg"

    def test_update_favorites(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.put("/api/profile", headers=headers, json={
            "favorites": ["ppx-1"],
        })
        assert resp.status_code == 200
        assert resp.json()["favorites"] == ["ppx-1"]

    def test_favorites_persist(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Set favorites
        client.put("/api/profile", headers=headers, json={
            "favorites": ["ppx-1"],
        })

        # Get profile — favorites should be there
        resp = client.get("/api/profile", headers=headers)
        assert "ppx-1" in resp.json()["favorites"]

    def test_clear_favorites(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Set then clear
        client.put("/api/profile", headers=headers, json={"favorites": ["ppx-1"]})
        client.put("/api/profile", headers=headers, json={"favorites": []})

        resp = client.get("/api/profile", headers=headers)
        assert resp.json()["favorites"] == []


class TestSessionHistory:
    def test_empty_history(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.get("/api/profile/sessions", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_completed_sessions_in_history(self, client, regular_user, sample_slot, db):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Create a completed session directly in DB
        now = datetime.now(timezone.utc)
        session = Session(
            user_id=user.id,
            slot_id="ppx-1",
            started_at=now - timedelta(hours=1),
            ended_at=now,
            end_reason="manual",
        )
        db.add(session)
        db.commit()

        resp = client.get("/api/profile/sessions", headers=headers)
        data = resp.json()
        assert len(data) == 1
        assert data[0]["slot_id"] == "ppx-1"
        assert data[0]["duration_min"] == 60
        assert data[0]["end_reason"] == "manual"

    def test_active_sessions_not_in_history(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Occupy slot (creates active session with no ended_at)
        client.post("/api/slots/ppx-1/occupy", headers=headers)

        # Active sessions should NOT appear in history
        resp = client.get("/api/profile/sessions", headers=headers)
        assert resp.json() == []
