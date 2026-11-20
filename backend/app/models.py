"""SQLAlchemy models. Money is integer UZS (so'm); localized text is JSONB {"uz", "ru"}."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .db import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Branch(TimestampMixin, Base):
    __tablename__ = "branches"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    code: Mapped[str] = mapped_column(String(10), unique=True)
    name: Mapped[dict] = mapped_column(JSONB)
    address: Mapped[dict] = mapped_column(JSONB)
    phone: Mapped[str] = mapped_column(String(40), default="")
    ticket_prefix: Mapped[str] = mapped_column(String(4), unique=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[dict] = mapped_column(JSONB)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class ModifierGroup(Base):
    __tablename__ = "modifier_groups"
    __table_args__ = (CheckConstraint("selection in ('single','multi')", name="ck_modgroup_selection"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[dict] = mapped_column(JSONB)
    selection: Mapped[str] = mapped_column(String(10))
    required: Mapped[bool] = mapped_column(Boolean, default=False)
    max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    default_option_id: Mapped[str | None] = mapped_column(String(40), nullable=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)

    options: Mapped[list[ModifierOption]] = relationship(
        order_by="ModifierOption.sort", cascade="all, delete-orphan", lazy="selectin"
    )


class ModifierOption(Base):
    __tablename__ = "modifier_options"

    group_id: Mapped[str] = mapped_column(ForeignKey("modifier_groups.id", ondelete="CASCADE"), primary_key=True)
    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[dict] = mapped_column(JSONB)
    price_delta: Mapped[int] = mapped_column(Integer, default=0)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class ProductModifierGroup(Base):
    __tablename__ = "product_modifier_groups"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    group_id: Mapped[str] = mapped_column(ForeignKey("modifier_groups.id"), primary_key=True)
    sort: Mapped[int] = mapped_column(Integer, default=0)


class ProductBranch(Base):
    __tablename__ = "product_branches"

    product_id: Mapped[str] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), primary_key=True)
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id"), primary_key=True)


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (CheckConstraint("price >= 0", name="ck_product_price_nonneg"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    sku: Mapped[str] = mapped_column(String(40), unique=True)
    category_id: Mapped[str] = mapped_column(ForeignKey("categories.id"))
    name: Mapped[dict] = mapped_column(JSONB)
    description: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    price: Mapped[int] = mapped_column(Integer)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    tone: Mapped[str] = mapped_column(String(12), default="red")
    sort: Mapped[int] = mapped_column(Integer, default=0)

    group_links: Mapped[list[ProductModifierGroup]] = relationship(
        order_by="ProductModifierGroup.sort", cascade="all, delete-orphan", lazy="selectin"
    )
    branch_links: Mapped[list[ProductBranch]] = relationship(cascade="all, delete-orphan", lazy="selectin")


class Staff(TimestampMixin, Base):
    __tablename__ = "staff"
    __table_args__ = (
        CheckConstraint("role in ('cashier','manager','owner')", name="ck_staff_role"),
        CheckConstraint("(role = 'owner') = (branch_id is null)", name="ck_staff_owner_no_branch"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(10))
    branch_id: Mapped[str | None] = mapped_column(ForeignKey("branches.id"), nullable=True)
    pin_hash: Mapped[str] = mapped_column(String(200))
    # Plain demo PIN, only kept for seeded demo staff and cleared once the PIN is changed.
    demo_pin_hint: Mapped[str | None] = mapped_column(String(4), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    phone: Mapped[str] = mapped_column(String(40), default="")
    failed_pin_attempts: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("type in ('dine_in','takeaway')", name="ck_order_type"),
        CheckConstraint("payment_method in ('cash','card')", name="ck_order_payment_method"),
        CheckConstraint("status in ('completed','voided')", name="ck_order_status"),
        CheckConstraint(
            "fiscal_status in ('not_integrated','pending','fiscalized','failed')", name="ck_order_fiscal_status"
        ),
        CheckConstraint("total = subtotal - discount", name="ck_order_total"),
        Index("ix_orders_branch_created", "branch_id", "created_at"),
        Index("ix_orders_created", "created_at"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    number: Mapped[str] = mapped_column(String(20))
    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id"))
    cashier_id: Mapped[str] = mapped_column(ForeignKey("staff.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    business_date: Mapped[date] = mapped_column(Date)
    type: Mapped[str] = mapped_column(String(10))
    subtotal: Mapped[int] = mapped_column(BigInteger)
    discount: Mapped[int] = mapped_column(BigInteger, default=0)
    total: Mapped[int] = mapped_column(BigInteger)
    payment_method: Mapped[str] = mapped_column(String(10))
    payment_amount: Mapped[int] = mapped_column(BigInteger)
    tendered: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    change: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    payment_status: Mapped[str] = mapped_column(String(20), default="recorded_demo")
    fiscal_status: Mapped[str] = mapped_column(String(20), default="not_integrated")
    fiscal_receipt_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    fiscal_qr_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(10), default="completed")
    print_count: Mapped[int] = mapped_column(Integer, default=0)
    is_demo: Mapped[bool] = mapped_column(Boolean, default=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    voided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    voided_by: Mapped[str | None] = mapped_column(ForeignKey("staff.id"), nullable=True)

    lines: Mapped[list[OrderLine]] = relationship(
        order_by="OrderLine.position", cascade="all, delete-orphan", lazy="selectin"
    )


class OrderLine(Base):
    __tablename__ = "order_lines"
    __table_args__ = (CheckConstraint("quantity between 1 and 99", name="ck_line_qty"),)

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), index=True)
    name: Mapped[dict] = mapped_column(JSONB)
    unit_price: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer)
    modifiers: Mapped[list] = mapped_column(JSONB, default=list)
    line_total: Mapped[int] = mapped_column(BigInteger)


class TicketCounter(Base):
    """Per-branch, per-business-day ticket sequence (C-0001, C-0002, …)."""

    __tablename__ = "ticket_counters"

    branch_id: Mapped[str] = mapped_column(ForeignKey("branches.id"), primary_key=True)
    business_date: Mapped[date] = mapped_column(Date, primary_key=True)
    last_number: Mapped[int] = mapped_column(Integer, default=0)
