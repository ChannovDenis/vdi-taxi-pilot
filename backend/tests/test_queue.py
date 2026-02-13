"""Tests for queue endpoints: join, leave, info."""

import pytest
from backend.tests.conftest import get_auth_header


class TestJoinQueue:
    def test_join_queue_occupied_slot(self, client, admin_user, regular_user, sample_slot):
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        # Admin occupies slot
        admin_headers = get_auth_header(client, "admin", admin_pass)
        client.post("/api/slots/ppx-1/occupy", headers=admin_headers)

        # Regular user joins queue
        user_headers = get_auth_header(client, "testuser", user_pass)
        resp = client.post("/api/slots/ppx-1/queue", headers=user_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["slot_id"] == "ppx-1"
        assert data["position"] == 1
        assert data["total_in_queue"] == 1

    def test_join_queue_free_slot(self, client, regular_user, sample_slot):
        """Cannot join queue for a free slot."""
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/slots/ppx-1/queue", headers=headers)
        assert resp.status_code == 400

    def test_join_queue_nonexistent_slot(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/slots/nonexistent/queue", headers=headers)
        assert resp.status_code == 404

    def test_join_queue_idempotent(self, client, admin_user, regular_user, sample_slot):
        """Joining queue twice returns same position."""
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        admin_headers = get_auth_header(client, "admin", admin_pass)
        client.post("/api/slots/ppx-1/occupy", headers=admin_headers)

        user_headers = get_auth_header(client, "testuser", user_pass)
        resp1 = client.post("/api/slots/ppx-1/queue", headers=user_headers)
        resp2 = client.post("/api/slots/ppx-1/queue", headers=user_headers)
        assert resp1.json()["position"] == resp2.json()["position"]


class TestLeaveQueue:
    def test_leave_queue(self, client, admin_user, regular_user, sample_slot):
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        admin_headers = get_auth_header(client, "admin", admin_pass)
        client.post("/api/slots/ppx-1/occupy", headers=admin_headers)

        user_headers = get_auth_header(client, "testuser", user_pass)
        client.post("/api/slots/ppx-1/queue", headers=user_headers)

        resp = client.delete("/api/slots/ppx-1/queue", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

    def test_leave_queue_not_in_queue(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.delete("/api/slots/ppx-1/queue", headers=headers)
        assert resp.status_code == 404


class TestQueueInfo:
    def test_queue_info(self, client, admin_user, regular_user, sample_slot):
        admin, admin_pass = admin_user
        user, user_pass = regular_user

        # Check empty queue
        user_headers = get_auth_header(client, "testuser", user_pass)
        resp = client.get("/api/slots/ppx-1/queue", headers=user_headers)
        assert resp.status_code == 200
        assert resp.json()["queue_size"] == 0

        # Occupy + join queue
        admin_headers = get_auth_header(client, "admin", admin_pass)
        client.post("/api/slots/ppx-1/occupy", headers=admin_headers)
        client.post("/api/slots/ppx-1/queue", headers=user_headers)

        resp = client.get("/api/slots/ppx-1/queue", headers=user_headers)
        assert resp.json()["queue_size"] == 1
