"""Xot-Dog POS API (Phase 2).

Payment, printing and fiscalization remain simulated: orders record the chosen
payment method with status `recorded_demo` and fiscal status `not_integrated`.
"""

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy import text

from .config import get_settings
from .deps import DbSession
from .routers import analytics, auth, branches, catalog, orders, staff

settings = get_settings()

app = FastAPI(title="Xot-Dog POS API", version="2.0.0")
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Authorization", "Content-Type", "Idempotency-Key"],
)

api = APIRouter(prefix="/api/v1")
for r in (auth.router, branches.router, catalog.router, staff.router, orders.router, analytics.router):
    api.include_router(r)


@api.get("/health", tags=["health"])
def health(db: DbSession):
    db.execute(text("select 1"))
    return {"status": "ok", "demoMode": settings.demo_mode, "payment": "simulated", "fiscal": "not_integrated"}


app.include_router(api)
