from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from time import monotonic

import jwt
from fastapi import HTTPException, Request

from .config import settings

ALGO = "HS256"
TOKEN_HOURS = 12


# ---------- tokens ----------
def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_HOURS),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGO)


def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO])
    except jwt.PyJWTError:
        return None


# ---------- tiny in-memory rate limiter (per process) ----------
_hits: dict[str, deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    # Render puts the real client address LAST in X-Forwarded-For
    fwd = request.headers.get("x-forwarded-for", "")
    if fwd:
        return fwd.split(",")[-1].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(request: Request, bucket: str, limit: int = 10, window: int = 300, extra: str = "") -> None:
    key = f"{bucket}:{client_ip(request)}:{extra}"
    now = monotonic()
    q = _hits[key]
    while q and now - q[0] > window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")
    q.append(now)
