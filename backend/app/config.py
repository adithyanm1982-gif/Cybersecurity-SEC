"""All configuration comes from environment variables (see .env.example)."""
import logging
import os
import secrets

from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger("techsociety")


def _emails(value: str) -> list[str]:
    seen: list[str] = []
    for item in value.split(","):
        item = item.strip().lower()
        if item and item not in seen:
            seen.append(item)
    return seen


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "").strip()
    SECRET_KEY: str = os.getenv("SECRET_KEY", "").strip()
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "5") or 5)

    # only the first 8 admin e-mails are honoured
    ADMIN_EMAILS: list[str] = _emails(os.getenv("ADMIN_EMAILS", ""))[:8]

    FRONTEND_ORIGINS: list[str] = [
        o.strip().rstrip("/")
        for o in os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").split(",")
        if o.strip()
    ]

    @property
    def max_upload_bytes(self) -> int:
        return self.MAX_UPLOAD_MB * 1024 * 1024


settings = Settings()

if not settings.SECRET_KEY:
    settings.SECRET_KEY = secrets.token_urlsafe(48)
    log.warning("SECRET_KEY is empty: using a random key. Everyone is logged out on every restart. Set SECRET_KEY.")
if not settings.DATABASE_URL:
    log.warning("DATABASE_URL is empty: using a local SQLite file (data is lost on Render redeploys).")
if not settings.GOOGLE_CLIENT_ID:
    log.warning("GOOGLE_CLIENT_ID is empty: nobody can sign in. Set GOOGLE_CLIENT_ID.")
if not settings.ADMIN_EMAILS:
    log.warning("ADMIN_EMAILS is empty: nobody can download the CSV or upload event photos.")
