import re

from fastapi import APIRouter
from sqlalchemy import or_, select

from .. import models, schemas
from ..deps import AdminUser, DbSession
from ..errors import api_error
from ..mappers import staff_out
from ..security import hash_pin

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("", response_model=list[schemas.StaffOut])
def list_staff(db: DbSession, user: AdminUser):
    q = select(models.Staff).order_by(models.Staff.role, models.Staff.name)
    if not user.is_owner:
        q = q.where(or_(models.Staff.branch_id == user.staff.branch_id, models.Staff.role == "owner"))
    return [staff_out(s) for s in db.scalars(q)]


@router.put("/{staff_id}", response_model=schemas.StaffOut)
def save_staff(staff_id: str, data: schemas.StaffIn, db: DbSession, user: AdminUser):
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,40}", staff_id):
        raise api_error(422, "invalid_id", "Invalid staff id")
    member = db.get(models.Staff, staff_id)
    branch_id = None if data.role == "owner" else data.branch_id
    if data.role != "owner":
        branch = db.get(models.Branch, branch_id) if branch_id else None
        if branch is None:
            raise api_error(422, "invalid_branch", "Cashiers and managers need a valid branch")

    if not user.is_owner:
        # Managers manage cashiers of their own branch only.
        if data.role != "cashier" or branch_id != user.staff.branch_id:
            raise api_error(403, "forbidden", "Managers can only manage cashiers in their branch")
        if member is not None and (member.role != "cashier" or member.branch_id != user.staff.branch_id):
            raise api_error(403, "forbidden", "Managers can only manage cashiers in their branch")

    if member is not None and member.id == user.id and (data.role != member.role or not data.active):
        raise api_error(422, "self_lockout", "You cannot change your own role or deactivate yourself")

    if member is None:
        if not data.pin:
            raise api_error(422, "pin_required", "A 4-digit PIN is required for new staff")
        member = models.Staff(id=staff_id)
        db.add(member)
    member.name = data.name.strip()
    member.role = data.role
    member.branch_id = branch_id
    member.active = data.active
    member.phone = data.phone
    if data.pin:
        member.pin_hash = hash_pin(data.pin)
        member.demo_pin_hint = None
        member.failed_pin_attempts = 0
        member.locked_until = None
    db.commit()
    db.refresh(member)
    return staff_out(member)
