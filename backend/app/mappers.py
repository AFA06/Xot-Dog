"""ORM → API schema mapping."""

from __future__ import annotations

from . import models, schemas


def branch_out(b: models.Branch) -> schemas.BranchOut:
    return schemas.BranchOut(
        id=b.id, code=b.code, name=b.name, address=b.address, phone=b.phone, ticket_prefix=b.ticket_prefix, active=b.active
    )


def product_out(p: models.Product) -> schemas.ProductOut:
    return schemas.ProductOut(
        id=p.id,
        sku=p.sku,
        category_id=p.category_id,
        name=p.name,
        description=p.description,
        price=p.price,
        modifier_group_ids=[link.group_id for link in p.group_links],
        active=p.active,
        branch_ids=sorted(link.branch_id for link in p.branch_links),
        tone=p.tone,
    )


def modifier_group_out(g: models.ModifierGroup) -> schemas.ModifierGroupOut:
    return schemas.ModifierGroupOut(
        id=g.id,
        name=g.name,
        selection=g.selection,
        required=g.required,
        max=g.max,
        default_option_id=g.default_option_id,
        options=[schemas.ModifierOptionOut(id=o.id, name=o.name, price_delta=o.price_delta) for o in g.options],
    )


def staff_out(s: models.Staff) -> schemas.StaffOut:
    return schemas.StaffOut(id=s.id, name=s.name, role=s.role, branch_id=s.branch_id, active=s.active, phone=s.phone)


def order_out(o: models.Order) -> schemas.OrderOut:
    return schemas.OrderOut(
        id=o.id,
        number=o.number,
        branch_id=o.branch_id,
        cashier_id=o.cashier_id,
        created_at=o.created_at,
        type=o.type,
        lines=[
            schemas.OrderLineOut(
                id=f"l{line.position}",
                product_id=line.product_id,
                name=line.name,
                unit_price=line.unit_price,
                quantity=line.quantity,
                modifiers=line.modifiers,
                line_total=line.line_total,
            )
            for line in o.lines
        ],
        subtotal=o.subtotal,
        discount=o.discount,
        total=o.total,
        payment=schemas.PaymentOut(
            method=o.payment_method, amount=o.payment_amount, tendered=o.tendered, change=o.change, status=o.payment_status
        ),
        fiscal=schemas.FiscalOut(status=o.fiscal_status, receipt_id=o.fiscal_receipt_id, qr_url=o.fiscal_qr_url),
        status=o.status,
        print_count=o.print_count,
        is_demo=o.is_demo,
    )
