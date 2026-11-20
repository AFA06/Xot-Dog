"""Seed the database with the FICTIONAL Phase 1 demo data.

    python -m app.seed               # only seeds when the database is empty
    python -m app.seed --no-history  # catalog/branches/staff only

Non-destructive: if any branch exists, it does nothing.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models
from ..config import get_settings
from ..db import SessionLocal
from ..security import hash_pin

FIXTURE = Path(__file__).with_name("demo_fixture.json")
HISTORY_DAYS = 60
HOUR_WEIGHTS = {9: 2, 10: 3, 11: 5, 12: 10, 13: 11, 14: 7, 15: 4, 16: 4, 17: 6, 18: 9, 19: 11, 20: 10, 21: 7, 22: 4}
BRANCH_BASE = {"chilonzor": 92, "yunusobod": 74}
POPULARITY = {
    "hd-classic": 22, "hd-double": 9, "hd-cheese": 12, "hd-spicy": 8, "hd-french": 7, "hd-chicken": 6, "hd-kids": 3,
    "bg-classic": 7, "bg-cheese": 10, "bg-double": 5, "bg-chicken": 6, "bg-bbq": 4,
    "sd-fries": 16, "sd-wedges": 6, "sd-rings": 4, "sd-nuggets": 6, "sd-salad": 2,
    "dr-cola": 15, "dr-lemonade": 6, "dr-ayran": 7, "dr-juice": 4, "dr-water": 5, "dr-tea": 4, "dr-coffee": 3,
    "cb-hotdog": 12, "cb-burger": 8, "cb-double": 4, "cb-kids": 2,
}  # fmt: skip


def seed_reference(db: Session, fx: dict) -> None:
    for i, b in enumerate(fx["branches"]):
        db.add(
            models.Branch(
                id=b["id"], code=b["code"], name=b["name"], address=b["address"], phone=b["phone"],
                ticket_prefix=b["ticketPrefix"], active=True, sort=i,
            )
        )  # fmt: skip
    for c in fx["categories"]:
        db.add(models.Category(id=c["id"], name=c["name"], sort=c["sort"]))
    for i, g in enumerate(fx["modifierGroups"]):
        db.add(
            models.ModifierGroup(
                id=g["id"], name=g["name"], selection=g["selection"], required=g["required"], max=g.get("max"),
                default_option_id=g.get("defaultOptionId"), sort=i,
                options=[
                    models.ModifierOption(id=o["id"], name=o["name"], price_delta=o["priceDelta"], sort=j)
                    for j, o in enumerate(g["options"])
                ],
            )
        )  # fmt: skip
    db.flush()
    for i, p in enumerate(fx["products"]):
        db.add(
            models.Product(
                id=p["id"], sku=p["sku"], category_id=p["categoryId"], name=p["name"], description=p.get("description"),
                price=p["price"], active=p["active"], tone=p["tone"], sort=i,
                group_links=[models.ProductModifierGroup(group_id=g, sort=j) for j, g in enumerate(p["modifierGroupIds"])],
                branch_links=[models.ProductBranch(branch_id=b) for b in p["branchIds"]],
            )
        )  # fmt: skip
    for s in fx["staff"]:
        db.add(
            models.Staff(
                id=s["id"], name=s["name"], role=s["role"], branch_id=s["branchId"], pin_hash=hash_pin(s["pin"]),
                demo_pin_hint=s["pin"], active=s["active"], phone=s["phone"],
            )
        )  # fmt: skip
    db.flush()


def _quick_cash(total: int) -> list[int]:
    opts = {total}
    for n in (5000, 10000, 20000, 50000, 100000, 200000):
        r = math.ceil(total / n) * n
        if r > total:
            opts.add(r)
    return sorted(opts)[:5]


def _select_modifiers(rng: random.Random, product: dict, groups: dict) -> list[dict]:
    out = []
    for gid in product["modifierGroupIds"]:
        g = groups[gid]
        picks: list[dict] = []
        if g["selection"] == "single":
            if g["required"]:
                default = g.get("defaultOptionId")
                oid = default if default and rng.random() < 0.7 else rng.choice(g["options"])["id"]
                picks = [o for o in g["options"] if o["id"] == oid]
            elif rng.random() < 0.15:
                picks = [rng.choice(g["options"])]
        else:
            p = 0.35 if gid == "sauces" else 0.1
            picks = [o for o in g["options"] if rng.random() < p]
            if g.get("max"):
                picks = picks[: g["max"]]
        out += [{"groupId": gid, "optionId": o["id"], "name": o["name"], "priceDelta": o["priceDelta"]} for o in picks]
    return out


def seed_history(db: Session, fx: dict, now: datetime, seed: int = 20261120) -> int:
    """Fictional sales so the dashboard has something to show. Timestamps are in the business zone."""
    tz = get_settings().tz
    rng = random.Random(seed)
    groups = {g["id"]: g for g in fx["modifierGroups"]}
    products = fx["products"]
    weights = [POPULARITY.get(p["id"], 1) for p in products]
    hours, hour_w = list(HOUR_WEIGHTS), list(HOUR_WEIGHTS.values())
    today = now.astimezone(tz).date()
    counters: dict[tuple[str, date], int] = {}
    count = 0

    for d in range(HISTORY_DAYS - 1, -1, -1):
        day = today - timedelta(days=d)
        weekend = day.weekday() >= 5
        trend = 1 + (HISTORY_DAYS - d) * 0.003
        for branch in fx["branches"]:
            cashiers = [s["id"] for s in fx["staff"] if s["branchId"] == branch["id"] and s["role"] == "cashier"]
            target = round(BRANCH_BASE.get(branch["id"], 60) * (1.28 if weekend else 1) * trend * (0.85 + rng.random() * 0.3))
            stamps = []
            for _ in range(target):
                h = rng.choices(hours, hour_w)[0]
                t = datetime(day.year, day.month, day.day, h, rng.randint(0, 59), rng.randint(0, 59), tzinfo=tz)
                if t <= now:
                    stamps.append(t)
            stamps.sort()
            for idx, created in enumerate(stamps):
                cart: dict[str, dict] = {}
                for _ in range(rng.choices([1, 2, 3, 4], [30, 38, 22, 10])[0]):
                    p = rng.choices(products, weights)[0]
                    mods = _select_modifiers(rng, p, groups)
                    key = p["id"] + "#" + "|".join(sorted(f"{m['groupId']}:{m['optionId']}" for m in mods))
                    qty = rng.choices([1, 2, 3], [78, 18, 4])[0]
                    if key in cart:
                        cart[key]["quantity"] += qty
                    else:
                        cart[key] = {"p": p, "mods": mods, "quantity": qty}
                lines = []
                for pos, c in enumerate(cart.values()):
                    unit = c["p"]["price"] + sum(m["priceDelta"] for m in c["mods"])
                    lines.append(
                        models.OrderLine(
                            position=pos, product_id=c["p"]["id"], name=c["p"]["name"], unit_price=unit,
                            quantity=c["quantity"], modifiers=c["mods"], line_total=unit * c["quantity"],
                        )
                    )  # fmt: skip
                total = sum(line.line_total for line in lines)
                method = "card" if rng.random() < 0.56 else "cash"
                tendered = change = None
                if method == "cash":
                    opts = _quick_cash(total)
                    tendered = opts[rng.randint(0, min(2, len(opts) - 1))]
                    change = tendered - total
                n = idx + 1
                counters[(branch["id"], day)] = n
                db.add(
                    models.Order(
                        id=f"demo-{branch['code']}-{day.isoformat()}-{idx}",
                        number=f"{branch['ticketPrefix']}-{n:04d}",
                        branch_id=branch["id"], cashier_id=cashiers[(idx + d) % len(cashiers)],
                        created_at=created.astimezone(UTC), business_date=day,
                        type="takeaway" if rng.random() < 0.62 else "dine_in",
                        subtotal=total, discount=0, total=total, payment_method=method, payment_amount=total,
                        tendered=tendered, change=change, payment_status="recorded_demo",
                        fiscal_status="not_integrated", status="voided" if rng.random() < 0.012 else "completed",
                        print_count=1, is_demo=True, lines=lines,
                    )
                )  # fmt: skip
                count += 1
        db.flush()
    for (branch_id, day), n in counters.items():
        db.add(models.TicketCounter(branch_id=branch_id, business_date=day, last_number=n))
    return count


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--no-history", action="store_true", help="skip the fictional 60-day order history")
    args = ap.parse_args()
    fx = json.loads(FIXTURE.read_text(encoding="utf-8"))
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(models.Branch)):
            print("[seed] database already has data — nothing to do.")
            return
        seed_reference(db, fx)
        n = 0 if args.no_history else seed_history(db, fx, datetime.now(UTC))
        db.commit()
        print(f"[seed] seeded {len(fx['branches'])} branches, {len(fx['products'])} products, "
              f"{len(fx['staff'])} staff, {n} fictional orders.")  # fmt: skip


if __name__ == "__main__":
    main()
