"""Tests for bookings endpoints: create, list, cancel, conflict detection."""

import pytest
from backend.tests.conftest import get_auth_header


class TestCreateBooking:
    def test_create_booking(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["slot_id"] == "ppx-1"
        assert data["date"] == "2099-12-31"
        assert data["start_time"] == "10:00"
        assert data["duration_min"] == 60
        assert data["status"] == "active"

    def test_create_booking_past_date(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2020-01-01",
            "start_time": "10:00",
            "duration_min": 60,
        })
        assert resp.status_code == 400

    def test_create_booking_invalid_time(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "invalid",
            "duration_min": 60,
        })
        assert resp.status_code == 400


class TestBookingConflict:
    def test_time_conflict(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Create first booking 10:00-11:00
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        assert resp.status_code == 201

        # Overlapping booking 10:30-11:30
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:30",
            "duration_min": 60,
        })
        assert resp.status_code == 409

    def test_no_conflict_different_time(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # First booking 10:00-11:00
        client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })

        # Non-overlapping booking 12:00-13:00
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "12:00",
            "duration_min": 60,
        })
        assert resp.status_code == 201

    def test_no_conflict_different_date(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-30",
            "start_time": "10:00",
            "duration_min": 60,
        })

        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        assert resp.status_code == 201


class TestListBookings:
    def test_list_my_bookings(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Create a booking
        client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })

        resp = client.get("/api/bookings", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["slot_id"] == "ppx-1"

    def test_list_empty(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.get("/api/bookings", headers=headers)
        assert resp.status_code == 200
        assert resp.json() == []


class TestCancelBooking:
    def test_cancel_booking(self, client, regular_user, sample_slot):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Create booking
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        booking_id = resp.json()["id"]

        # Cancel
        resp = client.delete(f"/api/bookings/{booking_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # Verify it's gone from active list
        resp = client.get("/api/bookings", headers=headers)
        assert len(resp.json()) == 0

    def test_cancel_nonexistent(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)
        resp = client.delete("/api/bookings/99999", headers=headers)
        assert resp.status_code == 404

    def test_cancelled_booking_no_conflict(self, client, regular_user, sample_slot):
        """Cancelled bookings should not cause conflicts."""
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Create and cancel
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        booking_id = resp.json()["id"]
        client.delete(f"/api/bookings/{booking_id}", headers=headers)

        # Same time slot should be bookable again
        resp = client.post("/api/bookings", headers=headers, json={
            "slot_id": "ppx-1",
            "date": "2099-12-31",
            "start_time": "10:00",
            "duration_min": 60,
        })
        assert resp.status_code == 201
