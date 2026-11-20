from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Query
from sqlalchemy import or_, select

from .. import models, schemas
from ..config import get_settings
from ..deps import CurrentUser, DbSession
from ..errors import api_error
from ..mappers import staff_out
from ..security import create_access_token, verify_pin

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/directory", response_model=list[schemas.DirectoryEntry])
def directory(db: DbSession, branch_id: str | None = Query(None, alias="branchId")):
    """Public list of active staff for the PIN sign-in picker. Never includes PIN hashes."""
    q = select(models.Staff).where(models.Staff.active.is_(True)).order_by(models.Staff.role, models.Staff.name)
    if branch_id:
        q = q.where(or_(models.Staff.branch_id == branch_id, models.Staff.role == "owner"))
    hints = get_settings().demo_pin_hints
    return [
        schemas.DirectoryEntry(
            id=s.id, name=s.name, role=s.role, branch_id=s.branch_id, demo_pin=s.demo_pin_hint if hints else None
        )
        for s in db.scalars(q)
    ]


@router.post("/login", response_model=schemas.TokenOut)
def login(data: schemas.LoginIn, db: DbSession):
    s = get_settings()
    staff = db.get(models.Staff, data.staff_id, with_for_update=True)
    if staff is None or not staff.active:
        raise api_error(401, "wrong_pin", "Invalid staff or PIN")
    now = datetime.now(UTC)
    if staff.locked_until and staff.locked_until > now:
        raise api_error(429, "locked", "Too many wrong PINs. Try again later.")

    if not verify_pin(data.pin, staff.pin_hash):
        staff.failed_pin_attempts += 1
        if staff.failed_pin_attempts >= s.max_failed_pins:
            staff.failed_pin_attempts = 0
            staff.locked_until = now + timedelta(minutes=s.lockout_minutes)
        db.commit()
        raise api_error(401, "wrong_pin", "Invalid staff or PIN")

    if data.branch_id is not None:
        branch = db.get(models.Branch, data.branch_id)
        if branch is None or not branch.active:
            raise api_error(422, "branch_unavailable", "Unknown or inactive branch")
        if staff.role != "owner" and staff.branch_id != branch.id:
            raise api_error(403, "wrong_branch", "Staff member does not work at this branch")
    elif staff.role == "cashier":
        raise api_error(403, "admin_only", "The admin panel requires a manager or owner")

    staff.failed_pin_attempts = 0
    staff.locked_until = None
    db.commit()
    token, expires = create_access_token(staff.id, staff.role, staff.branch_id)
    return schemas.TokenOut(access_token=token, expires_at=expires, user=staff_out(staff), branch_id=data.branch_id)


@router.get("/me", response_model=schemas.StaffOut)
def me(user: CurrentUser):
    return staff_out(user.staff)
