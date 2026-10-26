from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from ..csvstore import append_row
from ..database import get_db
from ..deps import current_user
from ..models import GoogleUser
from ..schemas import ApplicationIn
from ..security import rate_limit

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("")
def submit(body: ApplicationIn, request: Request, db: Session = Depends(get_db), user: GoogleUser = Depends(current_user)):
    """The JOIN form. One new line is added to the CSV file stored in the database.
    The e-mail comes from the verified Google account, so it cannot be faked."""
    rate_limit(request, "apply", limit=5, window=3600, extra=str(user.id))
    append_row(
        db,
        {
            "name": body.name,
            "register_no": body.register_no,
            "department": body.department,
            "year": body.year,
            "email": user.email,
            "phone": body.phone,
            "reason": body.reason,
        },
    )
    return {"ok": True}
