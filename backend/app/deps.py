from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import GoogleUser
from .security import decode_token

_bearer = HTTPBearer(auto_error=False)


def is_admin_email(email: str) -> bool:
    return email.lower() in settings.ADMIN_EMAILS


def optional_user(
    creds: HTTPAuthorizationCredentials | None = Depends(_bearer),
    db: Session = Depends(get_db),
) -> GoogleUser | None:
    if not creds:
        return None
    data = decode_token(creds.credentials)
    if not data:
        return None
    try:
        user_id = int(data.get("sub", ""))
    except ValueError:
        return None
    return db.get(GoogleUser, user_id)


def current_user(user: GoogleUser | None = Depends(optional_user)) -> GoogleUser:
    if not user:
        raise HTTPException(status_code=401, detail="Please sign in with Google.")
    return user


def require_admin(user: GoogleUser = Depends(current_user)) -> GoogleUser:
    # Admin = a Google e-mail listed in ADMIN_EMAILS. It is checked on EVERY request,
    # so removing someone from the list takes effect immediately.
    if not is_admin_email(user.email):
        raise HTTPException(status_code=403, detail="Admin access only.")
    return user


def user_out(u: GoogleUser) -> dict:
    return {
        "id": u.id,
        "email": u.email,
        "name": u.name,
        "role": "admin" if is_admin_email(u.email) else "user",
    }
