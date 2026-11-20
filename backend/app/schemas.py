"""API schemas. JSON is camelCase and mirrors src/domain/types.ts on the frontend."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, PlainSerializer
from pydantic.alias_generators import to_camel


def iso_js(dt: datetime) -> str:
    """Serialize like JS Date#toISOString(): UTC, milliseconds, trailing Z.
    The frontend compares ISO strings lexicographically, so the format must match exactly."""
    return dt.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.astimezone(UTC).microsecond // 1000:03d}Z"


JsDateTime = Annotated[datetime, PlainSerializer(iso_js, return_type=str)]


class ApiModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class LocalizedText(BaseModel):
    uz: str = Field(min_length=1, max_length=200)
    ru: str = Field(min_length=1, max_length=200)


class OptionalLocalizedText(BaseModel):
    uz: str = Field(default="", max_length=500)
    ru: str = Field(default="", max_length=500)


Role = Literal["cashier", "manager", "owner"]
Tone = Literal["red", "mustard", "brown", "green", "blue", "purple"]


# ---------- branches ----------
class BranchOut(ApiModel):
    id: str
    code: str
    name: LocalizedText
    address: LocalizedText
    phone: str
    ticket_prefix: str
    active: bool


class BranchIn(ApiModel):
    code: str = Field(min_length=2, max_length=10, pattern=r"^[A-Z0-9]+$")
    name: LocalizedText
    address: LocalizedText
    phone: str = Field(default="", max_length=40)
    ticket_prefix: str = Field(min_length=1, max_length=4, pattern=r"^[A-Z]+$")
    active: bool = True


class BranchCreate(BranchIn):
    id: str = Field(min_length=2, max_length=40, pattern=r"^[a-z0-9-]+$")


# ---------- catalog ----------
class CategoryOut(ApiModel):
    id: str
    name: LocalizedText
    sort: int


class ModifierOptionOut(ApiModel):
    id: str
    name: LocalizedText
    price_delta: int


class ModifierGroupOut(ApiModel):
    id: str
    name: LocalizedText
    selection: Literal["single", "multi"]
    required: bool
    max: int | None = None
    options: list[ModifierOptionOut]
    default_option_id: str | None = None


class ProductBase(ApiModel):
    sku: str = Field(min_length=1, max_length=40)
    category_id: str
    name: LocalizedText
    description: OptionalLocalizedText | None = None
    price: int = Field(ge=0, le=100_000_000)
    modifier_group_ids: list[str] = []
    active: bool = True
    branch_ids: list[str] = []
    tone: Tone = "red"


class ProductIn(ProductBase):
    id: str | None = None


class ProductOut(ProductBase):
    id: str


class CatalogOut(ApiModel):
    categories: list[CategoryOut]
    products: list[ProductOut]
    modifier_groups: list[ModifierGroupOut]


# ---------- staff / auth ----------
class StaffOut(ApiModel):
    id: str
    name: str
    role: Role
    branch_id: str | None
    active: bool
    phone: str
    # PINs are never returned. Kept for frontend type compatibility.
    pin: str = ""


class StaffIn(ApiModel):
    name: str = Field(min_length=2, max_length=120)
    role: Role
    branch_id: str | None = None
    # Empty string = keep the current PIN.
    pin: str = Field(default="", pattern=r"^(\d{4})?$")
    active: bool = True
    phone: str = Field(default="", max_length=40)


class DirectoryEntry(ApiModel):
    id: str
    name: str
    role: Role
    branch_id: str | None
    demo_pin: str | None = None


class LoginIn(ApiModel):
    staff_id: str
    pin: str = Field(pattern=r"^\d{4}$")
    branch_id: str | None = None


class TokenOut(ApiModel):
    access_token: str
    token_type: str = "bearer"
    expires_at: JsDateTime
    user: StaffOut
    branch_id: str | None


# ---------- orders ----------
class ModifierRef(ApiModel):
    group_id: str
    option_id: str


class OrderLineIn(ApiModel):
    product_id: str
    quantity: int = Field(ge=1, le=99)
    modifiers: list[ModifierRef] = []


class OrderCreate(ApiModel):
    branch_id: str
    type: Literal["dine_in", "takeaway"]
    payment_method: Literal["cash", "card"]
    tendered: int | None = Field(default=None, ge=0, le=1_000_000_000)
    lines: list[OrderLineIn] = Field(min_length=1, max_length=100)
    # Client-side total, used only to detect stale catalogs. Server always recomputes.
    expected_total: int | None = None


class SelectedModifierOut(ApiModel):
    group_id: str
    option_id: str
    name: LocalizedText
    price_delta: int


class OrderLineOut(ApiModel):
    id: str
    product_id: str
    name: LocalizedText
    unit_price: int
    quantity: int
    modifiers: list[SelectedModifierOut]
    line_total: int


class PaymentOut(ApiModel):
    method: Literal["cash", "card"]
    amount: int
    tendered: int | None = None
    change: int | None = None
    status: str


class FiscalOut(ApiModel):
    status: str
    receipt_id: str | None = None
    qr_url: str | None = None


class OrderOut(ApiModel):
    id: str
    number: str
    branch_id: str
    cashier_id: str
    created_at: JsDateTime
    type: str
    lines: list[OrderLineOut]
    subtotal: int
    discount: int
    total: int
    payment: PaymentOut
    fiscal: FiscalOut
    status: str
    print_count: int
    is_demo: bool


# ---------- analytics ----------
class SalesSummary(ApiModel):
    revenue: int = 0
    orders: int = 0
    avg_ticket: int = 0
    items_sold: int = 0
    cash_revenue: int = 0
    card_revenue: int = 0
    cash_orders: int = 0
    card_orders: int = 0
    voided: int = 0


class ProductStat(ApiModel):
    product_id: str
    quantity: int
    revenue: int


class BranchSummary(ApiModel):
    branch_id: str
    summary: SalesSummary


class StaffStat(ApiModel):
    staff_id: str
    orders: int
    revenue: int


class DashboardOut(ApiModel):
    summary: SalesSummary
    previous: SalesSummary
    per_branch: list[BranchSummary]
    # {date: "yyyy-mm-dd", total, <branchId>: revenue}
    daily: list[dict[str, int | str]]
    # {hour, orders, revenue, <branchId>: orders}
    hourly: list[dict[str, int]]
    bestsellers_by_quantity: list[ProductStat]
    bestsellers_by_revenue: list[ProductStat]
    category_revenue: dict[str, int]
    staff: list[StaffStat]
