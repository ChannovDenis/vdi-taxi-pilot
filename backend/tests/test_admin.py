"""Tests for admin endpoints: users, stats, slots CRUD."""

import pytest
from backend.tests.conftest import get_auth_header


class TestAdminAuth:
    def test_admin_required(self, client, regular_user):
        """Regular users cannot access admin endpoints."""
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.get("/api/admin/users", headers=headers)
        assert resp.status_code == 403

    def test_admin_no_auth(self, client):
        resp = client.get("/api/admin/users")
        assert resp.status_code == 401


class TestAdminUsers:
    def test_list_users(self, client, admin_user, regular_user):
        admin, admin_pass = admin_user
        headers = get_auth_header(client, "admin", admin_pass)
        resp = client.get("/api/admin/users", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 2
        names = [u["name"] for u in data]
        assert "Admin" in names
        assert "Test User" in names


class TestAdminStats:
    def test_get_stats(self, client, admin_user, sample_slot):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.get("/api/admin/stats", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["slot_id"] == "ppx-1"
        assert data[0]["pct"] == 0  # No sessions yet


class TestAdminSlotsCRUD:
    def test_list_admin_slots(self, client, admin_user, sample_slot):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.get("/api/admin/slots", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["id"] == "ppx-1"

    def test_create_slot(self, client, admin_user):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.post("/api/admin/slots", headers=headers, json={
            "id": "gpt-1",
            "service_name": "ChatGPT #1",
            "category": "AI Assistant",
            "tier": "Plus",
            "monthly_cost": 20,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["id"] == "gpt-1"
        assert data["service_name"] == "ChatGPT #1"

    def test_create_duplicate_slot(self, client, admin_user, sample_slot):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.post("/api/admin/slots", headers=headers, json={
            "id": "ppx-1",
            "service_name": "Duplicate",
            "category": "Test",
        })
        assert resp.status_code == 409

    def test_update_slot(self, client, admin_user, sample_slot):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.put("/api/admin/slots/ppx-1", headers=headers, json={
            "service_name": "Perplexity Pro Updated",
            "monthly_cost": 250,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["service_name"] == "Perplexity Pro Updated"
        assert data["monthly_cost"] == 250
        # Other fields unchanged
        assert data["category"] == "AI Research"

    def test_update_nonexistent_slot(self, client, admin_user):
        admin, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.put("/api/admin/slots/nonexistent", headers=headers, json={
            "service_name": "Test",
        })
        assert resp.status_code == 404
