from .conftest import login


def test_directory_has_no_secrets_and_demo_hints(client):
    r = client.get("/api/v1/auth/directory", params={"branchId": "chilonzor"})
    assert r.status_code == 200
    people = r.json()
    ids = {p["id"] for p in people}
    assert ids == {"st-owner", "st-mgr-c", "st-c1", "st-c2"}
    for p in people:
        assert "pinHash" not in p and "pin_hash" not in p
    assert next(p for p in people if p["id"] == "st-c1")["demoPin"] == "1111"


def test_login_success_and_me(client):
    h = login(client, "st-c1", "1111", "chilonzor")
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["id"] == "st-c1" and me["role"] == "cashier" and me["pin"] == ""


def test_wrong_pin_and_lockout(client):
    for _ in range(4):
        r = client.post("/api/v1/auth/login", json={"staffId": "st-c1", "pin": "0000", "branchId": "chilonzor"})
        assert r.status_code == 401
        assert r.json()["detail"]["code"] == "wrong_pin"
    r = client.post("/api/v1/auth/login", json={"staffId": "st-c1", "pin": "0000", "branchId": "chilonzor"})
    assert r.status_code == 401
    # Locked now, even with the right PIN.
    r = client.post("/api/v1/auth/login", json={"staffId": "st-c1", "pin": "1111", "branchId": "chilonzor"})
    assert r.status_code == 429


def test_branch_rules(client):
    r = client.post("/api/v1/auth/login", json={"staffId": "st-c1", "pin": "1111", "branchId": "yunusobod"})
    assert r.status_code == 403
    # Cashiers cannot open the admin panel (login without branch).
    r = client.post("/api/v1/auth/login", json={"staffId": "st-c1", "pin": "1111"})
    assert r.status_code == 403
    # Owner may sign in at any branch.
    login(client, "st-owner", "0000", "yunusobod")


def test_protected_endpoints_require_token(client):
    assert client.get("/api/v1/catalog").status_code == 401
    assert client.get("/api/v1/orders").status_code == 401
    assert client.get("/api/v1/catalog", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_deactivation_revokes_session(client, owner, cashier_c):
    assert client.get("/api/v1/catalog", headers=cashier_c).status_code == 200
    r = client.put(
        "/api/v1/staff/st-c1",
        headers=owner,
        json={"name": "Aziz (demo)", "role": "cashier", "branchId": "chilonzor", "active": False, "phone": ""},
    )
    assert r.status_code == 200
    assert client.get("/api/v1/catalog", headers=cashier_c).status_code == 401
