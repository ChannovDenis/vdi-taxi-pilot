"""Shared test fixtures for backend tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app
from backend.auth import hash_password
from backend.models import User, Slot


# In-memory SQLite for tests
TEST_DATABASE_URL = "sqlite:///./test_vdi.db"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    """FastAPI test client."""
    return TestClient(app)


@pytest.fixture
def db():
    """Database session for test setup."""
    session = TestSession()
    yield session
    session.close()


@pytest.fixture
def admin_user(db):
    """Create an admin user and return (user, password)."""
    password = "admin123"
    user = User(
        name="Admin",
        username="admin",
        password_hash=hash_password(password),
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


@pytest.fixture
def regular_user(db):
    """Create a regular user and return (user, password)."""
    password = "user123"
    user = User(
        name="Test User",
        username="testuser",
        password_hash=hash_password(password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user, password


@pytest.fixture
def sample_slot(db):
    """Create a sample slot."""
    slot = Slot(
        id="ppx-1",
        service_name="Perplexity #1",
        category="AI Research",
        tier="Max",
        monthly_cost=200,
        is_active=True,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def get_auth_header(client, username: str, password: str) -> dict:
    """Login and return Authorization header."""
    resp = client.post("/api/auth/login", json={
        "username": username,
        "password": password,
    })
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
