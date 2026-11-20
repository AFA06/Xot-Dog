from datetime import UTC, datetime

from sqlalchemy import update

from app import models
from app.db import SessionLocal

from .conftest import order_body

RANGE = {"from": "2026-03-01T19:00:00.000Z", "to": "2026-03-03T19:00:00.000Z", "tz": "Asia/Tashkent"}


def _place(client, headers, branch, lines, method, when: datetime, tendered=None):
    o = client.post("/api/v1/orders", headers=headers, json=order_body(branch, lines, method, tendered)).json()
    with SessionLocal() as db:
        db.execute(update(models.Order).where(models.Order.id == o["id"]).values(created_at=when))
        db.commit()
    return o


def _setup(client, cashier_c, cashier_y, manager_c):
    hd = {"productId": "hd-classic", "quantity": 2, "modifiers": [{"groupId": "spice", "optionId": "mild"}]}
    ayran = {"productId": "dr-ayran", "quantity": 1, "modifiers": []}
    # 2026-03-02 12:30 and 19:10 Tashkent (UTC+5)
    _place(client, cashier_c, "chilonzor", [hd, ayran], "cash", datetime(2026, 3, 2, 7, 30, tzinfo=UTC), 50000)
    _place(client, cashier_c, "chilonzor", [ayran], "card", datetime(2026, 3, 2, 14, 10, tzinfo=UTC))
    # 2026-03-03 13:05 Tashkent, Yunusobod
    _place(client, cashier_y, "yunusobod", [hd], "card", datetime(2026, 3, 3, 8, 5, tzinfo=UTC))
    # voided order — excluded from revenue, counted as voided
    v = _place(client, cashier_c, "chilonzor", [ayran], "card", datetime(2026, 3, 2, 9, 0, tzinfo=UTC))
    client.post(f"/api/v1/orders/{v['id']}/void", headers=manager_c)
    # outside range
    _place(client, cashier_c, "chilonzor", [ayran], "card", datetime(2026, 2, 20, 9, 0, tzinfo=UTC))


def test_dashboard_numbers(client, cashier_c, cashier_y, manager_c, owner):
    _setup(client, cashier_c, cashier_y, manager_c)
    r = client.get("/api/v1/analytics/dashboard", headers=owner, params=RANGE)
    assert r.status_code == 200, r.text
    d = r.json()
    s = d["summary"]
    assert s["revenue"] == 44000 + 8000 + 36000
    assert s["orders"] == 3 and s["voided"] == 1
    assert s["itemsSold"] == 3 + 1 + 2
    assert s["cashRevenue"] == 44000 and s["cashOrders"] == 1
    assert s["cardRevenue"] == 44000 and s["cardOrders"] == 2
    assert s["avgTicket"] == round(88000 / 3)

    assert [row["date"] for row in d["daily"]] == ["2026-03-02", "2026-03-03"]
    assert d["daily"][0] == {"date": "2026-03-02", "total": 52000, "chilonzor": 52000, "yunusobod": 0}
    assert d["daily"][1]["yunusobod"] == 36000

    hours = {h["hour"]: h for h in d["hourly"]}
    assert hours[12]["orders"] == 1 and hours[19]["orders"] == 1 and hours[13]["yunusobod"] == 1
    assert len(d["hourly"]) == 14

    assert d["bestsellersByQuantity"][0] == {"productId": "hd-classic", "quantity": 4, "revenue": 72000}
    assert d["categoryRevenue"]["hotdogs"] == 72000 and d["categoryRevenue"]["drinks"] == 16000
    assert d["categoryRevenue"]["burgers"] == 0
    per = {b["branchId"]: b["summary"] for b in d["perBranch"]}
    assert per["chilonzor"]["revenue"] == 52000 and per["yunusobod"]["revenue"] == 36000
    assert {x["staffId"]: x["orders"] for x in d["staff"]} == {"st-c1": 2, "st-y1": 1}
    # Default comparison = the equal-length period just before (Feb 27 – Mar 1): empty.
    assert d["previous"]["orders"] == 0


def test_manager_scoped_and_cashier_forbidden(client, cashier_c, cashier_y, manager_c):
    _setup(client, cashier_c, cashier_y, manager_c)
    r = client.get("/api/v1/analytics/dashboard", headers=manager_c,
                   params={**RANGE, "branchId": ["chilonzor", "yunusobod"]})  # fmt: skip
    d = r.json()
    assert d["summary"]["revenue"] == 52000
    assert [b["branchId"] for b in d["perBranch"]] == ["chilonzor"]
    assert client.get("/api/v1/analytics/dashboard", headers=cashier_c, params=RANGE).status_code == 403


def test_bad_params(client, owner):
    p = {**RANGE, "tz": "Mars/Olympus"}
    assert client.get("/api/v1/analytics/dashboard", headers=owner, params=p).status_code == 422
    p = {**RANGE, "to": RANGE["from"]}
    assert client.get("/api/v1/analytics/dashboard", headers=owner, params=p).status_code == 422
