"""Authentication and authorization dependencies.

Roles:
  owner   — every branch, every action.
  manager — admin panel for their own branch (orders, analytics, cashiers), catalog edits.
  cashier — POS for their own branch: catalog, create orders, today's orders, reprints.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .db import get_db
from .security import decode_access_token

bearer = HTTPBearer(auto_error=False)

DbSession = Annotated[Session, Depends(get_db)]


@dataclass(frozen=True)
class Principal:
    staff: models.Staff

    @property
    def id(self) -> str:
        return self.staff.id

    @property
    def role(self) -> str:
        return self.staff.role

    @property
    def is_owner(self) -> bool:
        return self.staff.role == "owner"

    def can_access_branch(self, branch_id: str) -> bool:
        return self.is_owner or self.staff.branch_id == branch_id

    def scope_branches(self, requested: list[str] | None) -> list[str] | None:
        """Branch ids this principal may read. None = unrestricted (owner, nothing requested)."""
        if self.is_owner:
            return requested
        own = [self.staff.branch_id] if self.staff.branch_id else []
        return [b for b in requested if b in own] if requested else own

    def require_branch(self, branch_id: str) -> None:
        if not self.can_access_branch(branch_id):
            raise HTTPException(status.HTTP_403_FORBIDDEN, "No access to this branch")


def _unauthorized(detail: str = "Not authenticated") -> HTTPException:
    return HTTPException(status.HTTP_401_UNAUTHORIZED, detail, headers={"WWW-Authenticate": "Bearer"})


def current_principal(
    db: DbSession, creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]
) -> Principal:
    if creds is None:
        raise _unauthorized()
    try:
        claims = decode_access_token(creds.credentials)
    except jwt.ExpiredSignatureError as e:
        raise _unauthorized("Session expired") from e
    except jwt.PyJWTError as e:
        raise _unauthorized("Invalid token") from e
    staff = db.get(models.Staff, claims.get("sub"))
    # Deactivation, role or branch changes revoke existing sessions immediately.
    if staff is None or not staff.active or staff.role != claims.get("role") or staff.branch_id != claims.get("branch"):
        raise _unauthorized("Session no longer valid")
    return Principal(staff)


CurrentUser = Annotated[Principal, Depends(current_principal)]


def require_roles(*roles: str) -> Callable[[Principal], Principal]:
    def dep(user: CurrentUser) -> Principal:
        if user.role not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Insufficient role")
        return user

    return dep


AdminUser = Annotated[Principal, Depends(require_roles("manager", "owner"))]
OwnerUser = Annotated[Principal, Depends(require_roles("owner"))]
