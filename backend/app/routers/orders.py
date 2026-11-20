from datetime import UTC, datetime
from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query, Response, status
from sqlalchemy import select, update

from .. import models, schemas
from ..deps import AdminUser, CurrentUser, DbSession
from ..errors import api_error
from ..mappers import order_out
from ..services.orders import create_order

router = APIRouter(prefix="/orders", tags=["orders"])

MAX_LIST = 20_000


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(
    db: DbSession,
    user: CurrentUser,
    branch_ids: Annotated[list[str] | None, Query(alias="branchId")] = None,
    frm: Annotated[datetime | None, Query(alias="from")] = None,
    to: datetime | None = None,
    order_status: Annotated[Literal["completed", "voided"] | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=MAX_LIST)] = MAX_LIST,
):
    scope = user.scope_branches(branch_ids)
    q = select(models.Order).order_by(models.Order.created_at.desc()).limit(limit)
    if scope is not None:
        q = q.where(models.Order.branch_id.in_(scope))
    if frm is not None:
        q = q.where(models.Order.created_at >= frm)
    if to is not None:
        q = q.where(models.Order.created_at < to)
    if order_status is not None:
        q = q.where(models.Order.status == order_status)
    return [order_out(o) for o in db.scalars(q)]


@router.post("", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def post_order(
    data: schemas.OrderCreate,
    db: DbSession,
    user: CurrentUser,
    response: Response,
    idempotency_key: Annotated[str | None, Header(max_length=100)] = None,
):
    order, created = create_order(db, user, data, idempotency_key)
    if not created:
        response.status_code = status.HTTP_200_OK
    return order_out(order)


def _get_scoped(db: DbSession, user: CurrentUser, order_id: str) -> models.Order:
    order = db.get(models.Order, order_id)
    if order is None or not user.can_access_branch(order.branch_id):
        raise api_error(404, "not_found", "Order not found")
    return order


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: str, db: DbSession, user: CurrentUser):
    return order_out(_get_scoped(db, user, order_id))


@router.post("/{order_id}/reprints", response_model=schemas.OrderOut)
def register_reprint(order_id: str, db: DbSession, user: CurrentUser):
    _get_scoped(db, user, order_id)
    db.execute(
        update(models.Order).where(models.Order.id == order_id).values(print_count=models.Order.print_count + 1)
    )
    db.commit()
    db.expire_all()
    return order_out(db.get(models.Order, order_id))


@router.post("/{order_id}/void", response_model=schemas.OrderOut)
def void_order(order_id: str, db: DbSession, user: AdminUser):
    order = _get_scoped(db, user, order_id)
    if order.status == "voided":
        raise api_error(409, "already_voided", "Order is already voided")
    order.status = "voided"
    order.voided_at = datetime.now(UTC)
    order.voided_by = user.id
    db.commit()
    return order_out(order)
