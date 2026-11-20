from fastapi import HTTPException


def api_error(status_code: int, code: str, message: str) -> HTTPException:
    """Domain error with a stable machine-readable code the frontend can translate."""
    return HTTPException(status_code, {"code": code, "message": message})
