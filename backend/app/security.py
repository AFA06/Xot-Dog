"""PIN hashing and JWT access tokens.

4-digit PINs have only 10 000 combinations, so hashing alone does not protect them:
the login endpoint also locks a staff member out after repeated failures
(see settings.max_failed_pins / lockout_minutes).
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
from datetime import UTC, datetime, timedelta

import jwt

from .config import get_settings

_ITERATIONS = 120_000


def hash_pin(pin: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, _ITERATIONS)
    return f"pbkdf2_sha256${_ITERATIONS}${base64.b64encode(salt).decode()}${base64.b64encode(digest).decode()}"


def verify_pin(pin: str, stored: str) -> bool:
    try:
        algo, iters, salt_b64, digest_b64 = stored.split("$")
    except ValueError:
        return False
    if algo != "pbkdf2_sha256":
        return False
    digest = hashlib.pbkdf2_hmac("sha256", pin.encode(), base64.b64decode(salt_b64), int(iters))
    return hmac.compare_digest(digest, base64.b64decode(digest_b64))


def create_access_token(staff_id: str, role: str, branch_id: str | None) -> tuple[str, datetime]:
    s = get_settings()
    expires = datetime.now(UTC) + timedelta(minutes=s.jwt_ttl_minutes)
    payload = {"sub": staff_id, "role": role, "branch": branch_id, "exp": expires}
    return jwt.encode(payload, s.jwt_secret, algorithm="HS256"), expires


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret, algorithms=["HS256"])
