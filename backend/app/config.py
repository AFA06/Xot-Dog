from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://xotdog:xotdog_dev_password@127.0.0.1:5433/xotdog"
    jwt_secret: str = "dev-only-insecure-secret-change-me"
    jwt_ttl_minutes: int = 12 * 60
    # Ticket numbers restart every business day in this zone.
    business_timezone: str = "Asia/Tashkent"
    # Orders are flagged isDemo while payment/fiscal integrations are simulated.
    demo_mode: bool = True
    # Expose seeded demo PINs on the sign-in screen. Never enable in production.
    demo_pin_hints: bool = False
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"
    # Login lockout after repeated wrong PINs.
    max_failed_pins: int = 5
    lockout_minutes: int = 5

    @field_validator("business_timezone")
    @classmethod
    def _valid_tz(cls, v: str) -> str:
        ZoneInfo(v)
        return v

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.business_timezone)

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
