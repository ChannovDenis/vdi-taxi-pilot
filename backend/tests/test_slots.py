"""Tests for slots endpoints: list, occupy, release."""

import pytest
from backend.tests.conftest import get_auth_header


class TestListSlots:
    def test_list_slots(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.get("/api/slots", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "ppx-1"
        assert data[0]["available"] is True
        assert data[0]["queue_size"] == 0

    def test_list_slots_unauthorized(self, client):
        resp = client.get("/api/slots")
        assert resp.status_code == 401


class TestOccupySlot:
    def test_occupy_available_slot(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/slots/ppx-1/occupy", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["slot_id"] == "ppx-1"
        assert data["session_id"] > 0
        assert "guacamole_url" in data

    def test_occupy_already_occupied(self, client, admin_user, regular_user, sample_slot):
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        # Admin occupies the slot
        admin_headers = get_auth_header(client, "admin", admin_pass)
        resp = client.post("/api/slots/ppx-1/occupy", headers=admin_headers)
        assert resp.status_code == 200

        # Regular user tries to occupy the same slot
        user_headers = get_auth_header(client, "testuser", user_pass)
        resp = client.post("/api/slots/ppx-1/occupy", headers=user_headers)
        assert resp.status_code == 409

    def test_occupy_nonexistent_slot(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/slots/nonexistent/occupy", headers=headers)
        assert resp.status_code == 404

    def test_slot_shows_occupied_after_occupy(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        client.post("/api/slots/ppx-1/occupy", headers=headers)

        resp = client.get("/api/slots", headers=headers)
        slot = resp.json()[0]
        assert slot["available"] is False
        assert slot["occupant_name"] == "Test User"


class TestReleaseSlot:
    def test_release_occupied_slot(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Occupy first
        client.post("/api/slots/ppx-1/occupy", headers=headers)

        # Release
        resp = client.post("/api/slots/ppx-1/release", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["ok"] is True
        assert data["session_id"] > 0

    def test_release_not_occupied(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/slots/ppx-1/release", headers=headers)
        assert resp.status_code == 404

    def test_release_other_users_session(self, client, admin_user, regular_user, sample_slot):
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        # Admin occupies
        admin_headers = get_auth_header(client, "admin", admin_pass)
        client.post("/api/slots/ppx-1/occupy", headers=admin_headers)

        # Regular user tries to release
        user_headers = get_auth_header(client, "testuser", user_pass)
        resp = client.post("/api/slots/ppx-1/release", headers=user_headers)
        assert resp.status_code == 404

    def test_slot_available_after_release(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        client.post("/api/slots/ppx-1/occupy", headers=headers)
        client.post("/api/slots/ppx-1/release", headers=headers)

        resp = client.get("/api/slots", headers=headers)
        slot = resp.json()[0]
        assert slot["available"] is True
