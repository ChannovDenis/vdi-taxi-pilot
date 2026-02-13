"""Tests for auth endpoints: login, logout, me, onboarding."""

import pytest
from backend.tests.conftest import get_auth_header


class TestLogin:
    def test_login_success(self, client, admin_user):
        user, password = admin_user
        resp = client.post("/api/auth/login", json={
            "username": "admin",
            "password": password,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "token" in data
        assert data["user"]["username"] == "admin"
        assert data["user"]["is_admin"] is True

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post("/api/auth/login", json={
            "username": "admin",
            "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_unknown_user(self, client):
        resp = client.post("/api/auth/login", json={
            "username": "nobody",
            "password": "whatever",
        })
        assert resp.status_code == 401

    def test_login_regular_user(self, client, regular_user):
        user, password = regular_user
        resp = client.post("/api/auth/login", json={
            "username": "testuser",
            "password": password,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["is_admin"] is False
        assert data["user"]["name"] == "Test User"


class TestLogout:
    def test_logout(self, client):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["ok"] is True


class TestMe:
    def test_me_authenticated(self, client, admin_user):
        user, password = admin_user
        headers = get_auth_header(client, "admin", password)
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["username"] == "admin"
        assert data["is_admin"] is True

    def test_me_no_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_me_invalid_token(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
        assert resp.status_code == 401


class TestOnboarding:
    def test_onboarding_complete(self, client, regular_user):
        user, password = regular_user
        headers = get_auth_header(client, "testuser", password)

        # Verify first login is True
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.json()["is_first_login"] is True

        # Complete onboarding
        resp = client.put("/api/auth/onboarding-complete", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        # Verify first login is now False
        resp = client.get("/api/auth/me", headers=headers)
        assert resp.json()["is_first_login"] is False
