from datetime import UTC, datetime

from app import models
from app.config import get_settings
from app.db import SessionLocal
from app.seed.demo import seed_history

from .conftest import login, order_body

NEW_BRANCH = {
    "id": "sergeli",
    "code": "SRG",
    "name": {"uz": "Sergeli filiali", "ru": "Филиал Сергели"},
    "address": {"uz": "Fiktiv manzil", "ru": "Вымышленный адрес"},
    "phone": "+998 00 000-00-03",
    "ticketPrefix": "S",
}


def test_branch_management(client, owner, manager_c):
    assert client.post("/api/v1/branches", headers=manager_c, json=NEW_BRANCH).status_code == 403
    r = client.post("/api/v1/branches", headers=owner, json=NEW_BRANCH)
    assert r.status_code == 201 and r.json()["ticketPrefix"] == "S"
    assert client.post("/api/v1/branches", headers=owner, json=NEW_BRANCH).status_code == 409
    dup = {**NEW_BRANCH, "id": "other", "code": "OTH"}  # same ticket prefix
    assert client.post("/api/v1/branches", headers=owner, json=dup).status_code == 409
    assert len(client.get("/api/v1/branches").json()) == 3

    body = {k: v for k, v in NEW_BRANCH.items() if k != "id"} | {"active": False}
    assert client.put("/api/v1/branches/sergeli", headers=owner, json=body).status_code == 200
    assert len(client.get("/api/v1/branches").json()) == 2
    assert len(client.get("/api/v1/branches", params={"includeInactive": "true"}).json()) == 3


def test_new_branch_end_to_end(client, owner):
    client.post("/api/v1/branches", headers=owner, json=NEW_BRANCH)
    staff = {"name": "Sardor (demo)", "role": "cashier", "branchId": "sergeli", "pin": "5555", "active": True, "phone": ""}
    assert client.put("/api/v1/staff/st-s1", headers=owner, json=staff).status_code == 200
    ayran = next(p for p in client.get("/api/v1/catalog", headers=owner).json()["products"] if p["id"] == "dr-ayran")
    client.put("/api/v1/products/dr-ayran", headers=owner, json={**ayran, "branchIds": [*ayran["branchIds"], "sergeli"]})
    h = login(client, "st-s1", "5555", "sergeli")
    r = client.post("/api/v1/orders", headers=h, json=order_body("sergeli", method="card"))
    assert r.status_code == 201 and r.json()["number"] == "S-0001"
    # A product not enabled for the new branch can't be sold there.
    r = client.post("/api/v1/orders", headers=h,
                    json=order_body("sergeli", [{"productId": "dr-water", "quantity": 1, "modifiers": []}], "card"))  # fmt: skip
    assert r.status_code == 422


def test_manager_staff_rules(client, manager_c):
    ok = {"name": "Yangi kassir", "role": "cashier", "branchId": "chilonzor", "pin": "1234", "active": True, "phone": ""}
    assert client.put("/api/v1/staff/st-new", headers=manager_c, json=ok).status_code == 200
    assert client.put("/api/v1/staff/st-x", headers=manager_c, json={**ok, "role": "manager"}).status_code == 403
    assert client.put("/api/v1/staff/st-x", headers=manager_c, json={**ok, "branchId": "yunusobod"}).status_code == 403
    assert client.put("/api/v1/staff/st-y1", headers=manager_c,
                      json={**ok, "name": "Malika", "branchId": "chilonzor"}).status_code == 403  # fmt: skip
    ids = {s["id"] for s in client.get("/api/v1/staff", headers=manager_c).json()}
    assert "st-y1" not in ids and "st-new" in ids and "st-owner" in ids


def test_pin_change_and_keep(client, owner):
    base = {"name": "Aziz (demo)", "role": "cashier", "branchId": "chilonzor", "active": True, "phone": ""}
    assert client.put("/api/v1/staff/st-c1", headers=owner, json={**base, "pin": ""}).status_code == 200
    login(client, "st-c1", "1111", "chilonzor")  # empty PIN keeps the old one
    assert client.put("/api/v1/staff/st-c1", headers=owner, json={**base, "pin": "7777"}).status_code == 200
    login(client, "st-c1", "7777", "chilonzor")
    d = {p["id"]: p for p in client.get("/api/v1/auth/directory").json()}
    assert d["st-c1"]["demoPin"] is None  # hint cleared once the PIN is changed
    assert client.put("/api/v1/staff/st-z", headers=owner, json={**base, "pin": ""}).status_code == 422  # new needs PIN


def test_owner_cannot_lock_self_out(client, owner):
    body = {"name": "Demo Egasi", "role": "owner", "branchId": None, "pin": "", "active": False, "phone": ""}
    assert client.put("/api/v1/staff/st-owner", headers=owner, json=body).status_code == 422


def test_product_price_change_applies_to_new_orders(client, owner, cashier_c, manager_c):
    catalog = client.get("/api/v1/catalog", headers=owner).json()
    assert len(catalog["products"]) == 28 and len(catalog["modifierGroups"]) == 9
    ayran = next(p for p in catalog["products"] if p["id"] == "dr-ayran")
    assert client.put("/api/v1/products/dr-ayran", headers=owner, json={**ayran, "price": 9000}).status_code == 200
    assert client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card")).json()["total"] == 9000
    # Managers can't remove availability at other branches.
    r = client.put("/api/v1/products/dr-ayran", headers=manager_c, json={**ayran, "branchIds": []})
    assert sorted(r.json()["branchIds"]) == ["yunusobod"]
    assert client.put("/api/v1/products/dr-ayran", headers=cashier_c, json=ayran).status_code == 403


def test_seeded_history_continues_ticket_numbers(client, fixture_data, cashier_c):
    with SessionLocal() as db:
        n = seed_history(db, fixture_data, datetime.now(UTC))
        db.commit()
        today = datetime.now(UTC).astimezone(get_settings().tz).date()
        counter = db.get(models.TicketCounter, ("chilonzor", today))
        last_today = counter.last_number if counter else 0
    assert n > 5000
    o = client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card")).json()
    assert o["number"] == f"C-{last_today + 1:04d}"
