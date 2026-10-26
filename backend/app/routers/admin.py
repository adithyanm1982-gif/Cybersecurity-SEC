from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..csvstore import CSV_NAME, read_rows, read_text
from ..database import get_db
from ..deps import is_admin_email, require_admin
from ..models import GoogleUser

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.get("/applications.csv")
def download_csv(db: Session = Depends(get_db)):
    """The single CSV file, exactly as stored in the database."""
    # the BOM makes Excel read non-English names correctly
    return Response(
        content="﻿" + read_text(db),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{CSV_NAME}"'},
    )


@router.get("/applications")
def applications(db: Session = Depends(get_db)):
    """The same data as rows, for the table in the Admin Console."""
    return read_rows(db)


@router.get("/users")
def users(db: Session = Depends(get_db)):
    rows = db.scalars(select(GoogleUser).order_by(GoogleUser.id.desc()).limit(1000)).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": "admin" if is_admin_email(u.email) else "user",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login": u.last_login.isoformat() if u.last_login else None,
        }
        for u in rows
    ]
