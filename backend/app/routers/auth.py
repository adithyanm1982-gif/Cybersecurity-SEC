from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from google.auth.transport import requests as g_requests
from google.oauth2 import id_token as g_id_token
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import current_user, user_out
from ..models import GoogleUser
from ..schemas import GoogleIn
from ..security import create_token, rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


def _verify(credential: str) -> dict:
    try:
        return g_id_token.verify_oauth2_token(
            credential, g_requests.Request(), settings.GOOGLE_CLIENT_ID, clock_skew_in_seconds=10
        )
    except ValueError:
        raise HTTPException(401, "Google sign-in could not be verified. Please try again.")


@router.post("/google")
def google_auth(body: GoogleIn, request: Request, db: Session = Depends(get_db)):
    """Sign in AND sign up in one step: the account is created the first time."""
    rate_limit(request, "google", limit=30, window=300)
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google sign-in is not configured on the server (GOOGLE_CLIENT_ID).")

    info = _verify(body.credential)
    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(401, "Your Google e-mail address is not verified.")
    name = (info.get("name") or email.split("@")[0])[:120]

    user = db.scalar(select(GoogleUser).where(GoogleUser.email == email))
    if user:
        user.name = name
        user.last_login = datetime.now(timezone.utc)
    else:
        user = GoogleUser(email=email, name=name)
        db.add(user)
    try:
        db.commit()
    except IntegrityError:  # two first-time requests at once: the other one won, reuse it
        db.rollback()
        user = db.scalar(select(GoogleUser).where(GoogleUser.email == email))
        if not user:
            raise HTTPException(500, "Could not create the account. Please try again.")
    return {"access_token": create_token(user.id), "token_type": "bearer", "user": user_out(user)}


@router.get("/me")
def me(user: GoogleUser = Depends(current_user)):
    return user_out(user)
