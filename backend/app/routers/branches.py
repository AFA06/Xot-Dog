from fastapi import APIRouter, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from .. import models, schemas
from ..deps import DbSession, OwnerUser
from ..errors import api_error
from ..mappers import branch_out

router = APIRouter(prefix="/branches", tags=["branches"])


@router.get("", response_model=list[schemas.BranchOut])
def list_branches(db: DbSession, include_inactive: bool = Query(False, alias="includeInactive")):
    """Public: the launcher shows branches before anyone signs in."""
    q = select(models.Branch).order_by(models.Branch.sort, models.Branch.id)
    if not include_inactive:
        q = q.where(models.Branch.active.is_(True))
    return [branch_out(b) for b in db.scalars(q)]


@router.post("", response_model=schemas.BranchOut, status_code=status.HTTP_201_CREATED)
def create_branch(data: schemas.BranchCreate, db: DbSession, _: OwnerUser):
    if db.get(models.Branch, data.id):
        raise api_error(409, "branch_exists", "Branch id already exists")
    sort = (db.scalar(select(models.Branch.sort).order_by(models.Branch.sort.desc()).limit(1)) or 0) + 1
    branch = models.Branch(
        id=data.id,
        code=data.code,
        name=data.name.model_dump(),
        address=data.address.model_dump(),
        phone=data.phone,
        ticket_prefix=data.ticket_prefix,
        active=data.active,
        sort=sort,
    )
    db.add(branch)
    _commit_unique(db)
    return branch_out(branch)


@router.put("/{branch_id}", response_model=schemas.BranchOut)
def update_branch(branch_id: str, data: schemas.BranchIn, db: DbSession, _: OwnerUser):
    branch = db.get(models.Branch, branch_id)
    if branch is None:
        raise api_error(404, "not_found", "Branch not found")
    branch.code = data.code
    branch.name = data.name.model_dump()
    branch.address = data.address.model_dump()
    branch.phone = data.phone
    branch.ticket_prefix = data.ticket_prefix
    branch.active = data.active
    _commit_unique(db)
    return branch_out(branch)


def _commit_unique(db: DbSession) -> None:
    try:
        db.commit()
    except IntegrityError as e:
        db.rollback()
        raise api_error(409, "branch_conflict", "Branch code or ticket prefix already in use") from e
