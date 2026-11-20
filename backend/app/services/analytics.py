"""SQL reporting. Mirrors src/lib/reports.ts so the dashboard shows the same numbers
it computed client-side in Phase 1. Only `completed` orders count toward sales."""

from __future__ import annotations

from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import and_, case, func, select, true
from sqlalchemy.orm import Session

from .. import models, schemas

O = models.Order
L = models.OrderLine
COMPLETED = O.status == "completed"
OPEN_FROM, OPEN_TO = 9, 23


def _where(branch_ids: list[str], frm: datetime, to: datetime):
    return and_(O.branch_id.in_(branch_ids), O.created_at >= frm, O.created_at < to)


def summary(db: Session, branch_ids: list[str], frm: datetime, to: datetime) -> schemas.SalesSummary:
    return summaries_by_branch(db, branch_ids, frm, to, grouped=False)[None]


def summaries_by_branch(
    db: Session, branch_ids: list[str], frm: datetime, to: datetime, grouped: bool = True
) -> dict[str | None, schemas.SalesSummary]:
    def s(cond):
        return func.coalesce(func.sum(case((and_(COMPLETED, cond), O.total), else_=0)), 0)

    def c(cond):
        return func.count().filter(and_(COMPLETED, cond))

    key = O.branch_id if grouped else None
    cols = [
        s(true()),
        c(true()),
        s(O.payment_method == "cash"),
        s(O.payment_method == "card"),
        c(O.payment_method == "cash"),
        c(O.payment_method == "card"),
        func.count().filter(O.status != "completed"),
    ]
    q = select(*([key] if grouped else []), *cols).where(_where(branch_ids, frm, to))
    if grouped:
        q = q.group_by(O.branch_id)

    items_q = (
        select(*([O.branch_id] if grouped else []), func.coalesce(func.sum(L.quantity), 0))
        .join(O, O.id == L.order_id)
        .where(_where(branch_ids, frm, to), COMPLETED)
    )
    if grouped:
        items_q = items_q.group_by(O.branch_id)
    items = {(r[0] if grouped else None): int(r[-1]) for r in db.execute(items_q)}

    out: dict[str | None, schemas.SalesSummary] = {}
    for row in db.execute(q):
        k = row[0] if grouped else None
        vals = row[1:] if grouped else row
        revenue, orders, cash_rev, card_rev, cash_n, card_n, voided = (int(v) for v in vals)
        out[k] = schemas.SalesSummary(
            revenue=revenue,
            orders=orders,
            avg_ticket=round(revenue / orders) if orders else 0,
            items_sold=items.get(k, 0),
            cash_revenue=cash_rev,
            card_revenue=card_rev,
            cash_orders=cash_n,
            card_orders=card_n,
            voided=voided,
        )
    if not grouped:
        out.setdefault(None, schemas.SalesSummary())
    return out


def _local(col, tz: ZoneInfo):
    return func.timezone(tz.key, col)


def daily(db: Session, branch_ids: list[str], frm: datetime, to: datetime, tz: ZoneInfo) -> list[dict]:
    day = func.date(_local(O.created_at, tz)).label("day")
    q = (
        select(day, O.branch_id, func.sum(O.total))
        .where(_where(branch_ids, frm, to), COMPLETED)
        .group_by(day, O.branch_id)
    )
    rows: dict[str, dict] = {}
    d = frm.astimezone(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    end = to.astimezone(tz)
    while d < end:
        key = d.date().isoformat()
        rows[key] = {"date": key, "total": 0, **{b: 0 for b in branch_ids}}
        # Add a day in local wall-clock time (DST-safe), then normalize.
        d = (d.replace(tzinfo=None) + timedelta(days=1)).replace(tzinfo=tz)
    for day_val, branch_id, revenue in db.execute(q):
        row = rows.get(day_val.isoformat())
        if row is None:
            continue
        row[branch_id] = row.get(branch_id, 0) + int(revenue)
        row["total"] += int(revenue)
    return list(rows.values())


def hourly(db: Session, branch_ids: list[str], frm: datetime, to: datetime, tz: ZoneInfo) -> list[dict]:
    hour = func.extract("hour", _local(O.created_at, tz)).label("hour")
    q = (
        select(hour, O.branch_id, func.count(), func.sum(O.total))
        .where(_where(branch_ids, frm, to), COMPLETED)
        .group_by(hour, O.branch_id)
    )
    rows = {h: {"hour": h, "orders": 0, "revenue": 0, **{b: 0 for b in branch_ids}} for h in range(OPEN_FROM, OPEN_TO)}
    for h, branch_id, n, revenue in db.execute(q):
        row = rows.get(int(h))
        if row is None:
            continue
        row["orders"] += int(n)
        row["revenue"] += int(revenue)
        row[branch_id] = row.get(branch_id, 0) + int(n)
    return list(rows.values())


def product_stats(db: Session, branch_ids: list[str], frm: datetime, to: datetime) -> list[schemas.ProductStat]:
    q = (
        select(L.product_id, func.sum(L.quantity), func.sum(L.line_total))
        .join(O, O.id == L.order_id)
        .where(_where(branch_ids, frm, to), COMPLETED)
        .group_by(L.product_id)
    )
    return [schemas.ProductStat(product_id=p, quantity=int(q_), revenue=int(r)) for p, q_, r in db.execute(q)]


def bestsellers(stats: list[schemas.ProductStat], by: str, limit: int = 8) -> list[schemas.ProductStat]:
    return sorted(stats, key=lambda s: (-getattr(s, by), s.product_id))[:limit]


def category_revenue(db: Session, stats: list[schemas.ProductStat]) -> dict[str, int]:
    out = {c: 0 for c in db.scalars(select(models.Category.id).order_by(models.Category.sort))}
    cat = dict(db.execute(select(models.Product.id, models.Product.category_id)).all())
    for s in stats:
        c = cat.get(s.product_id)
        if c is not None:
            out[c] = out.get(c, 0) + s.revenue
    return out


def staff_stats(db: Session, branch_ids: list[str], frm: datetime, to: datetime) -> list[schemas.StaffStat]:
    q = (
        select(O.cashier_id, func.count(), func.sum(O.total))
        .where(_where(branch_ids, frm, to), COMPLETED)
        .group_by(O.cashier_id)
    )
    return [schemas.StaffStat(staff_id=s, orders=int(n), revenue=int(r)) for s, n, r in db.execute(q)]


def dashboard(
    db: Session,
    branch_ids: list[str],
    frm: datetime,
    to: datetime,
    prev_from: datetime,
    prev_to: datetime,
    tz: ZoneInfo,
) -> schemas.DashboardOut:
    stats = product_stats(db, branch_ids, frm, to)
    per_branch = summaries_by_branch(db, branch_ids, frm, to)
    return schemas.DashboardOut(
        summary=summary(db, branch_ids, frm, to),
        previous=summary(db, branch_ids, prev_from, prev_to),
        per_branch=[
            schemas.BranchSummary(branch_id=b, summary=per_branch.get(b, schemas.SalesSummary())) for b in branch_ids
        ],
        daily=daily(db, branch_ids, frm, to, tz),
        hourly=hourly(db, branch_ids, frm, to, tz),
        bestsellers_by_quantity=bestsellers(stats, "quantity"),
        bestsellers_by_revenue=bestsellers(stats, "revenue"),
        category_revenue=category_revenue(db, stats),
        staff=staff_stats(db, branch_ids, frm, to),
    )
