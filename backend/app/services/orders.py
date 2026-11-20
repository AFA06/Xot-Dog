"""Order creation. The client's cart is only a request: prices, modifiers,
totals, change, cashier and ticket number are all decided here."""

from __future__ import annotations

import uuid
from datetime import UTC, date, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..config import get_settings
from ..deps import Principal
from ..errors import api_error


def next_ticket_number(db: Session, branch: models.Branch, business_date: date) -> str:
    """Atomically increments the per-branch daily counter (row lock via upsert)."""
    stmt = (
        insert(models.TicketCounter)
        .values(branch_id=branch.id, business_date=business_date, last_number=1)
        .on_conflict_do_update(
            index_elements=["branch_id", "business_date"],
            set_={"last_number": models.TicketCounter.last_number + 1},
        )
        .returning(models.TicketCounter.last_number)
    )
    n = db.execute(stmt).scalar_one()
    return f"{branch.ticket_prefix}-{n:04d}"


def _price_lines(db: Session, branch_id: str, lines: list[schemas.OrderLineIn]) -> list[models.OrderLine]:
    product_ids = {line.product_id for line in lines}
    products = {p.id: p for p in db.scalars(select(models.Product).where(models.Product.id.in_(product_ids)))}
    group_ids = {link.group_id for p in products.values() for link in p.group_links}
    groups = {g.id: g for g in db.scalars(select(models.ModifierGroup).where(models.ModifierGroup.id.in_(group_ids)))}

    priced: list[models.OrderLine] = []
    for pos, line in enumerate(lines):
        product = products.get(line.product_id)
        if product is None or not product.active or branch_id not in {b.branch_id for b in product.branch_links}:
            raise api_error(422, "product_unavailable", f"Product {line.product_id} is not available at this branch")

        allowed = [link.group_id for link in product.group_links]
        chosen: dict[str, list[str]] = {}
        for ref in line.modifiers:
            if ref.group_id not in allowed:
                raise api_error(422, "invalid_modifier", f"Modifier group {ref.group_id} not allowed for {product.id}")
            group = groups[ref.group_id]
            if ref.option_id not in {o.id for o in group.options}:
                raise api_error(422, "invalid_modifier", f"Unknown option {ref.option_id} in {group.id}")
            picked = chosen.setdefault(group.id, [])
            if ref.option_id in picked:
                raise api_error(422, "invalid_modifier", f"Duplicate option {ref.option_id}")
            picked.append(ref.option_id)

        modifiers: list[dict] = []
        for gid in allowed:
            group = groups[gid]
            picked = chosen.get(gid, [])
            if group.required and not picked:
                raise api_error(422, "invalid_modifier", f"Group {gid} is required for {product.id}")
            if group.selection == "single" and len(picked) > 1:
                raise api_error(422, "invalid_modifier", f"Group {gid} allows one option")
            if group.max is not None and len(picked) > group.max:
                raise api_error(422, "invalid_modifier", f"Group {gid} allows at most {group.max} options")
            by_id = {o.id: o for o in group.options}
            for oid in picked:
                o = by_id[oid]
                modifiers.append({"groupId": gid, "optionId": oid, "name": o.name, "priceDelta": o.price_delta})

        unit = product.price + sum(m["priceDelta"] for m in modifiers)
        if unit < 0:
            raise api_error(422, "invalid_modifier", f"Negative price for {product.id}")
        priced.append(
            models.OrderLine(
                position=pos,
                product_id=product.id,
                name=product.name,
                unit_price=unit,
                quantity=line.quantity,
                modifiers=modifiers,
                line_total=unit * line.quantity,
            )
        )
    return priced


def create_order(
    db: Session, user: Principal, data: schemas.OrderCreate, idempotency_key: str | None
) -> tuple[models.Order, bool]:
    """Returns (order, created). A repeated idempotency key returns the original order."""
    if idempotency_key:
        existing = db.scalar(select(models.Order).where(models.Order.idempotency_key == idempotency_key))
        if existing is not None:
            if existing.cashier_id != user.id or existing.branch_id != data.branch_id:
                raise api_error(409, "idempotency_conflict", "Idempotency key already used for another order")
            return existing, False

    branch = db.get(models.Branch, data.branch_id)
    if branch is None or not branch.active:
        raise api_error(422, "branch_unavailable", "Unknown or inactive branch")
    user.require_branch(branch.id)

    lines = _price_lines(db, branch.id, data.lines)
    subtotal = sum(line.line_total for line in lines)
    discount = 0  # no discount rules yet; kept for schema parity with the frontend
    total = subtotal - discount
    if data.expected_total is not None and data.expected_total != total:
        raise api_error(409, "price_changed", f"Prices changed: server total is {total}")

    tendered: int | None = None
    change: int | None = None
    if data.payment_method == "cash":
        tendered = data.tendered if data.tendered is not None else total
        if tendered < total:
            raise api_error(422, "insufficient_cash", "Insufficient cash tendered")
        change = tendered - total

    settings = get_settings()
    now = datetime.now(UTC)
    business_date = now.astimezone(settings.tz).date()
    order = models.Order(
        id=str(uuid.uuid4()),
        number=next_ticket_number(db, branch, business_date),
        branch_id=branch.id,
        cashier_id=user.id,
        created_at=now,
        business_date=business_date,
        type=data.type,
        subtotal=subtotal,
        discount=discount,
        total=total,
        payment_method=data.payment_method,
        payment_amount=total,
        tendered=tendered,
        change=change,
        # Payment is only recorded; no acquirer/terminal is contacted.
        payment_status="recorded_demo",
        # No OFD / fiscal module yet.
        fiscal_status="not_integrated",
        status="completed",
        print_count=0,
        is_demo=settings.demo_mode,
        idempotency_key=idempotency_key,
        lines=lines,
    )
    db.add(order)
    try:
        db.commit()
    except IntegrityError:
        # Concurrent retry with the same key won the race.
        db.rollback()
        if idempotency_key:
            existing = db.scalar(select(models.Order).where(models.Order.idempotency_key == idempotency_key))
            if existing is not None and existing.cashier_id == user.id:
                return existing, False
        raise
    db.refresh(order)
    return order, True
