from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app import models

from .conftest import TEST_URL, order_body


def test_server_recomputes_prices_and_records_demo_payment(client, cashier_c):
    lines = [
        {"productId": "hd-classic", "quantity": 2, "modifiers": [
            {"groupId": "spice", "optionId": "hot"}, {"groupId": "extras", "optionId": "extra-cheese"}]},
        {"productId": "dr-ayran", "quantity": 1, "modifiers": []},
    ]  # fmt: skip
    # Client tries to claim a different cashier; server uses the token's identity.
    r = client.post("/api/v1/orders", headers=cashier_c, json=order_body(lines=lines, tendered=60000, cashierId="st-c2"))
    assert r.status_code == 201, r.text
    o = r.json()
    assert o["cashierId"] == "st-c1"
    assert o["lines"][0]["unitPrice"] == 22000 and o["lines"][0]["lineTotal"] == 44000
    # Modifiers come back in product-group order (extras before spice) with names snapshotted.
    assert [m["optionId"] for m in o["lines"][0]["modifiers"]] == ["extra-cheese", "hot"]
    assert o["total"] == 52000 and o["subtotal"] == 52000 and o["discount"] == 0
    assert o["payment"] == {"method": "cash", "amount": 52000, "tendered": 60000, "change": 8000, "status": "recorded_demo"}
    assert o["fiscal"]["status"] == "not_integrated"
    assert o["isDemo"] is True and o["printCount"] == 0
    assert o["number"] == "C-0001"
    assert o["createdAt"].endswith("Z") and len(o["createdAt"]) == 24  # JS toISOString format


def test_ticket_numbers_per_branch(client, cashier_c, cashier_y):
    nums = [client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card")).json()["number"] for _ in range(3)]
    assert nums == ["C-0001", "C-0002", "C-0003"]
    assert client.post("/api/v1/orders", headers=cashier_y, json=order_body("yunusobod", method="card")).json()["number"] == "Y-0001"


def test_idempotency_key_prevents_duplicates(client, cashier_c):
    h = {**cashier_c, "Idempotency-Key": "pos-test-key-1"}
    r1 = client.post("/api/v1/orders", headers=h, json=order_body(method="card"))
    r2 = client.post("/api/v1/orders", headers=h, json=order_body(method="card"))
    assert r1.status_code == 201 and r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
    assert len(client.get("/api/v1/orders", headers=cashier_c).json()) == 1


def test_modifier_validation(client, cashier_c):
    def post(mods, product="hd-classic"):
        return client.post("/api/v1/orders", headers=cashier_c,
                           json=order_body(lines=[{"productId": product, "quantity": 1, "modifiers": mods}], method="card"))  # fmt: skip

    spice = {"groupId": "spice", "optionId": "mild"}
    assert post([spice]).status_code == 201
    assert post([]).status_code == 422  # required spice missing
    assert post([spice, {"groupId": "spice", "optionId": "hot"}]).status_code == 422  # single-select
    assert post([spice, {"groupId": "drink-size", "optionId": "1"}]).status_code == 422  # group not on product
    assert post([spice, {"groupId": "extras", "optionId": "caviar"}]).status_code == 422  # unknown option
    sauces = [{"groupId": "sauces", "optionId": o} for o in ("ketchup", "mustard", "mayo", "bbq")]
    assert post([spice, *sauces]).status_code == 422  # max 3


def test_payment_and_price_guards(client, cashier_c):
    r = client.post("/api/v1/orders", headers=cashier_c, json=order_body(tendered=1000))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "insufficient_cash"
    r = client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card", expectedTotal=1))
    assert r.status_code == 409 and r.json()["detail"]["code"] == "price_changed"
    r = client.post("/api/v1/orders", headers=cashier_c, json={**order_body(), "lines": []})
    assert r.status_code == 422
    r = client.post("/api/v1/orders", headers=cashier_c,
                    json=order_body(lines=[{"productId": "dr-ayran", "quantity": 100, "modifiers": []}]))  # fmt: skip
    assert r.status_code == 422


def test_inactive_product_rejected(client, cashier_c, owner):
    catalog = client.get("/api/v1/catalog", headers=owner).json()
    ayran = next(p for p in catalog["products"] if p["id"] == "dr-ayran")
    assert client.put("/api/v1/products/dr-ayran", headers=owner, json={**ayran, "active": False}).status_code == 200
    r = client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card"))
    assert r.status_code == 422 and r.json()["detail"]["code"] == "product_unavailable"


def test_branch_scoping(client, cashier_c, cashier_y, manager_c):
    assert client.post("/api/v1/orders", headers=cashier_c, json=order_body("yunusobod", method="card")).status_code == 403
    y = client.post("/api/v1/orders", headers=cashier_y, json=order_body("yunusobod", method="card")).json()
    client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card"))
    # Asking for another branch silently returns only what you may see.
    seen = client.get("/api/v1/orders", headers=cashier_c, params={"branchId": ["yunusobod", "chilonzor"]}).json()
    assert {o["branchId"] for o in seen} == {"chilonzor"}
    assert client.get(f"/api/v1/orders/{y['id']}", headers=cashier_c).status_code == 404
    assert client.post(f"/api/v1/orders/{y['id']}/void", headers=manager_c).status_code == 404


def test_reprint_and_void(client, cashier_c, manager_c):
    o = client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card")).json()
    assert client.post(f"/api/v1/orders/{o['id']}/reprints", headers=cashier_c).json()["printCount"] == 1
    assert client.post(f"/api/v1/orders/{o['id']}/reprints", headers=cashier_c).json()["printCount"] == 2
    assert client.post(f"/api/v1/orders/{o['id']}/void", headers=cashier_c).status_code == 403
    v = client.post(f"/api/v1/orders/{o['id']}/void", headers=manager_c)
    assert v.status_code == 200 and v.json()["status"] == "voided"
    assert client.post(f"/api/v1/orders/{o['id']}/void", headers=manager_c).status_code == 409


def test_orders_persist_across_connections(client, cashier_c):
    """A brand-new engine (as after an API restart) sees the committed order and its lines."""
    o = client.post("/api/v1/orders", headers=cashier_c, json=order_body(tendered=10000)).json()
    fresh = create_engine(TEST_URL)
    with Session(fresh) as db:
        row = db.get(models.Order, o["id"])
        assert row is not None and row.total == 8000 and row.change == 2000
        assert db.scalar(select(func.count()).select_from(models.OrderLine).where(models.OrderLine.order_id == o["id"])) == 1
    fresh.dispose()


def test_list_filters_by_range(client, cashier_c):
    o = client.post("/api/v1/orders", headers=cashier_c, json=order_body(method="card")).json()
    inside = client.get("/api/v1/orders", headers=cashier_c,
                        params={"from": "2000-01-01T00:00:00.000Z", "to": "2999-01-01T00:00:00.000Z"}).json()  # fmt: skip
    assert [x["id"] for x in inside] == [o["id"]]
    before = client.get("/api/v1/orders", headers=cashier_c, params={"to": "2000-01-01T00:00:00.000Z"}).json()
    assert before == []
