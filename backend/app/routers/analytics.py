from datetime import datetime
from typing import Annotated
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Query
from sqlalchemy import select

from .. import models, schemas
from ..config import get_settings
from ..deps import AdminUser, DbSession
from ..errors import api_error
from ..services import analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _range(frm: datetime, to: datetime) -> None:
    if frm.tzinfo is None or to.tzinfo is None:
        raise api_error(422, "invalid_range", "Dates must include a timezone (ISO 8601)")
    if to <= frm:
        raise api_error(422, "invalid_range", "'to' must be after 'from'")
    if (to - frm).days > 400:
        raise api_error(422, "invalid_range", "Range too long (max 400 days)")


@router.get("/dashboard", response_model=schemas.DashboardOut)
def dashboard(
    db: DbSession,
    user: AdminUser,
    frm: Annotated[datetime, Query(alias="from")],
    to: datetime,
    compare_from: Annotated[datetime | None, Query(alias="compareFrom")] = None,
    compare_to: Annotated[datetime | None, Query(alias="compareTo")] = None,
    branch_ids: Annotated[list[str] | None, Query(alias="branchId")] = None,
    tz: Annotated[str | None, Query(max_length=64)] = None,
):
    """Everything the admin dashboard needs in one round trip.
    `tz` = the viewer's IANA zone, so days/hours bucket exactly as the browser shows them."""
    _range(frm, to)
    if compare_from is None or compare_to is None:
        compare_from, compare_to = frm - (to - frm), frm
    if compare_from.tzinfo is None or compare_to.tzinfo is None or compare_to < compare_from:
        raise api_error(422, "invalid_range", "Invalid comparison range")
    try:
        zone = ZoneInfo(tz) if tz else get_settings().tz
    except (ZoneInfoNotFoundError, ValueError) as e:
        raise api_error(422, "invalid_tz", "Unknown timezone") from e

    scope = user.scope_branches(branch_ids)
    if scope is None:
        scope = list(db.scalars(select(models.Branch.id).order_by(models.Branch.sort, models.Branch.id)))
    return analytics.dashboard(db, scope, frm, to, compare_from, compare_to, zone)
