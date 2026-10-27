"""Profile photos for the 8 people on the ABOUT page. Anyone can see them, only an admin can change them."""
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import GoogleUser, TeamPhoto
from .events import IMMUTABLE, read_validated_image

router = APIRouter(tags=["team"])

TEAM_SLOTS = 8  # 0 = faculty coordinator ... 7 = last joint secretary (left to right on the page)


def _check_slot(slot: int) -> None:
    if not 0 <= slot < TEAM_SLOTS:
        raise HTTPException(404, f"There are only {TEAM_SLOTS} team positions (0 to {TEAM_SLOTS - 1}).")


@router.get("/team")
def list_team(db: Session = Depends(get_db)):
    rows = db.execute(select(TeamPhoto.slot, TeamPhoto.id, TeamPhoto.token).order_by(TeamPhoto.slot)).all()  # no bytes
    return [{"slot": s, "photo_id": i, "token": t} for s, i, t in rows]


@router.get("/team/photo/{photo_id}")
def get_team_photo(photo_id: int, db: Session = Depends(get_db)):
    row = db.execute(select(TeamPhoto.content_type, TeamPhoto.data).where(TeamPhoto.id == photo_id)).first()
    if not row:
        raise HTTPException(404, "Photo not found.")
    return Response(content=row.data, media_type=row.content_type, headers=IMMUTABLE)


@router.put("/team/{slot}/photo")
async def upload_team_photo(
    slot: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: GoogleUser = Depends(require_admin),
):
    _check_slot(slot)
    data, ctype = await read_validated_image(file)
    db.execute(delete(TeamPhoto).where(TeamPhoto.slot == slot))  # replace the old one
    photo = TeamPhoto(slot=slot, content_type=ctype, token=secrets.token_hex(8), data=data)
    db.add(photo)
    db.commit()
    return {"slot": slot, "photo_id": photo.id, "token": photo.token}


@router.delete("/team/{slot}/photo")
def delete_team_photo(slot: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    _check_slot(slot)
    db.execute(delete(TeamPhoto).where(TeamPhoto.slot == slot))
    db.commit()
    return {"ok": True}