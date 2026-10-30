"""Team profiles on the ABOUT page.
Anyone can read them. Only an admin can add, edit, reorder or delete a profile, or change its photo."""
import secrets
from typing import Literal

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import CsvFile, GoogleUser, TeamMember, TeamPhoto
from .events import IMMUTABLE, read_validated_image

router = APIRouter(tags=["team"])

MAX_MEMBERS = 40
DEFAULT_ROLES = [
    "Faculty Coordinator",
    "Student Coordinator",
    "Student Coordinator",
    "Student Coordinator",
    "Secretary",
    "Joint Secretary",
    "Joint Secretary",
    "Joint Secretary",
]


class MemberIn(BaseModel):
    name: str = Field(default="", max_length=120)
    role: str = Field(default="", max_length=120)
    department: str = Field(default="", max_length=120)
    linkedin: str = Field(default="", max_length=300)

    @field_validator("*", mode="before")
    @classmethod
    def _strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("linkedin")
    @classmethod
    def _linkedin_is_a_web_link(cls, v: str) -> str:
        # only real web links: this blocks things like "javascript:..." being placed behind the LinkedIn icon
        if v and not v.lower().startswith(("https://", "http://")):
            raise ValueError("The LinkedIn link must start with https://")
        return v


class MoveIn(BaseModel):
    direction: Literal["up", "down"]


def _json(row) -> dict:
    return {
        "id": row.id,
        "name": row.name,
        "role": row.role,
        "department": row.department,
        "linkedin": row.linkedin,
        "photo_token": row.photo_token,  # null = no photo
    }


_LIST_COLUMNS = (
    TeamMember.id, TeamMember.name, TeamMember.role, TeamMember.department, TeamMember.linkedin, TeamMember.photo_token,
)


def _member_or_404(db: Session, member_id: int) -> TeamMember:
    m = db.get(TeamMember, member_id)
    if not m:
        raise HTTPException(404, "Profile not found.")
    return m


def seed_team(db: Session) -> None:
    """Runs once. Creates the 8 starting profiles and carries over any photos uploaded with the older
    slot-based version. A marker row stops it from re-creating profiles an admin has deleted on purpose."""
    if db.get(CsvFile, "_team_seeded"):
        return
    if db.scalars(select(TeamMember.id).limit(1)).first() is None:
        old = {
            slot: (ctype, token, data)
            for slot, ctype, token, data in db.execute(
                select(TeamPhoto.slot, TeamPhoto.content_type, TeamPhoto.token, TeamPhoto.data)
            ).all()
        }
        for i, role in enumerate(DEFAULT_ROLES):
            m = TeamMember(position=i, name="", role=role, department="", linkedin="")
            if i in old:
                m.photo_type, m.photo_token, m.photo_data = old[i]
            db.add(m)
    db.add(CsvFile(name="_team_seeded", content="1"))
    db.commit()


# ---------------- public ----------------
@router.get("/team/members")
def list_members(db: Session = Depends(get_db)):
    rows = db.execute(select(*_LIST_COLUMNS).order_by(TeamMember.position, TeamMember.id)).all()  # no photo bytes
    return [_json(r) for r in rows]


@router.get("/team/members/{member_id}/photo")
def get_member_photo(member_id: int, db: Session = Depends(get_db)):
    row = db.execute(select(TeamMember.photo_type, TeamMember.photo_data).where(TeamMember.id == member_id)).first()
    if not row or not row.photo_data:
        raise HTTPException(404, "Photo not found.")
    # the URL carries ?v=<token>, so a new upload always gets a new URL: safe to cache "forever"
    return Response(content=row.photo_data, media_type=row.photo_type, headers=IMMUTABLE)


# ---------------- admin only ----------------
@router.post("/team/members")
def add_member(body: MemberIn, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    if (db.scalar(select(func.count(TeamMember.id))) or 0) >= MAX_MEMBERS:
        raise HTTPException(400, f"At most {MAX_MEMBERS} profiles are allowed.")
    last = db.scalar(select(func.max(TeamMember.position)))
    m = TeamMember(position=0 if last is None else last + 1, **body.model_dump())
    db.add(m)
    db.commit()
    return _json(m)


@router.put("/team/members/{member_id}")
def edit_member(member_id: int, body: MemberIn, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    m = _member_or_404(db, member_id)
    m.name, m.role, m.department, m.linkedin = body.name, body.role, body.department, body.linkedin
    db.commit()
    return _json(m)


@router.delete("/team/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    m = _member_or_404(db, member_id)
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.post("/team/members/{member_id}/move")
def move_member(member_id: int, body: MoveIn, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    _member_or_404(db, member_id)
    ids = list(db.scalars(select(TeamMember.id).order_by(TeamMember.position, TeamMember.id)))
    i = ids.index(member_id)
    j = i - 1 if body.direction == "up" else i + 1
    if 0 <= j < len(ids):
        ids[i], ids[j] = ids[j], ids[i]
    for pos, mid in enumerate(ids):  # re-number 0..n-1 so positions are always clean
        db.execute(update(TeamMember).where(TeamMember.id == mid).values(position=pos))
    db.commit()
    return {"ok": True}


@router.put("/team/members/{member_id}/photo")
async def upload_member_photo(
    member_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: GoogleUser = Depends(require_admin),
):
    m = _member_or_404(db, member_id)
    data, ctype = await read_validated_image(file)
    m.photo_type, m.photo_data, m.photo_token = ctype, data, secrets.token_hex(8)
    db.commit()
    return {"photo_token": m.photo_token}


@router.delete("/team/members/{member_id}/photo")
def delete_member_photo(member_id: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    m = _member_or_404(db, member_id)
    m.photo_type = m.photo_data = m.photo_token = None
    db.commit()
    return {"ok": True}