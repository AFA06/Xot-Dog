"""Tests run against a real PostgreSQL database dedicated to tests (default: xotdog_test
from docker-compose). Tables there are truncated between tests."""

from __future__ import annotations

import json
import os

# Must happen before the app (and its engine) is imported.
TEST_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://xotdog:xotdog_dev_password@127.0.0.1:5433/xotdog_test"
)
os.environ["DATABASE_URL"] = TEST_URL
os.environ["DEMO_PIN_HINTS"] = "true"
os.environ["JWT_SECRET"] = "test-secret-not-for-production-use-0123456789"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from app.db import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed.demo import FIXTURE, seed_reference  # noqa: E402

if not (make_url(TEST_URL).database or "").endswith("_test"):
    raise RuntimeError(f"Refusing to run tests against non-test database: {make_url(TEST_URL).database}")

TABLES = (
    "order_lines, orders, ticket_counters, product_branches, product_modifier_groups, products, "
    "modifier_options, modifier_groups, categories, staff, branches"
)


@pytest.fixture(scope="session", autouse=True)
def migrated():
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))
    cfg.set_main_option("script_location", os.path.join(os.path.dirname(__file__), "..", "alembic"))
    cfg.attributes["url"] = TEST_URL
    command.upgrade(cfg, "head")
    yield


@pytest.fixture(scope="session")
def fixture_data() -> dict:
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


@pytest.fixture(autouse=True)
def seeded(fixture_data):
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {TABLES} RESTART IDENTITY CASCADE"))
    with SessionLocal() as db:
        seed_reference(db, fixture_data)
        db.commit()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def login(client: TestClient, staff_id: str, pin: str, branch_id: str | None = None) -> dict:
    r = client.post("/api/v1/auth/login", json={"staffId": staff_id, "pin": pin, "branchId": branch_id})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['accessToken']}"}


@pytest.fixture
def cashier_c(client):  # Aziz, Chilonzor
    return login(client, "st-c1", "1111", "chilonzor")


@pytest.fixture
def cashier_y(client):  # Malika, Yunusobod
    return login(client, "st-y1", "3333", "yunusobod")


@pytest.fixture
def manager_c(client):
    return login(client, "st-mgr-c", "9999")


@pytest.fixture
def owner(client):
    return login(client, "st-owner", "0000")


def order_body(branch="chilonzor", lines=None, method="cash", tendered=None, **extra) -> dict:
    lines = lines or [{"productId": "dr-ayran", "quantity": 1, "modifiers": []}]
    body = {"branchId": branch, "type": "takeaway", "paymentMethod": method, "lines": lines, **extra}
    if tendered is not None:
        body["tendered"] = tendered
    return body
