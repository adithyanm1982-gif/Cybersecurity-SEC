import os
import secrets

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import require_admin
from ..models import Event, EventCover, EventImage, GoogleUser
from ..schemas import CoverIn, EventRename

router = APIRouter(tags=["events"])

MAX_FILES_PER_REQUEST = 10
MAX_IMAGES_PER_EVENT = 200
MAX_EVENTS = 60
IMMUTABLE = {"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"}


def sniff_image_type(data: bytes) -> str | None:
    """Decide the type from the file CONTENT, never from the name the client sent."""
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


async def read_validated_image(f: UploadFile) -> tuple[bytes, str]:
    """Read ONE upload, enforce the size limit and check it really is an image. Returns (bytes, content_type)."""
    limit = settings.max_upload_bytes
    data = await f.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"'{f.filename}' is larger than {settings.MAX_UPLOAD_MB} MB.")
    ctype = sniff_image_type(data)
    if not ctype:
        raise HTTPException(415, f"'{f.filename}' is not a JPG, PNG, GIF or WEBP image.")
    return data, ctype


def _event_or_404(db: Session, event_id: int) -> Event:
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found.")
    return ev


def _event_json(ev: Event, image_ids: list[int], custom_cover: tuple[int, str] | None) -> dict:
    cover = ev.cover_image_id if ev.cover_image_id in image_ids else (image_ids[0] if image_ids else None)
    return {
        "id": ev.id,
        "name": ev.name,
        "cover_image_id": cover,
        # True only when an admin really picked one of the photos as the cover (not just "the first photo")
        "cover_chosen": ev.cover_image_id in image_ids,
        # the dedicated cover picture (wins over cover_image_id when present)
        "custom_cover": {"id": custom_cover[0], "token": custom_cover[1]} if custom_cover else None,
        "images": [{"id": i} for i in image_ids],
    }


# ---------------- public ----------------
@router.get("/events")
def list_events(db: Session = Depends(get_db)):
    events = db.scalars(select(Event).order_by(Event.position, Event.id)).all()
    rows = db.execute(select(EventImage.id, EventImage.event_id).order_by(EventImage.id)).all()  # no image bytes
    by_event: dict[int, list[int]] = {}
    for image_id, event_id in rows:
        by_event.setdefault(event_id, []).append(image_id)
    covers = {
        event_id: (cover_id, token)
        for cover_id, event_id, token in db.execute(select(EventCover.id, EventCover.event_id, EventCover.token)).all()
    }
    return [_event_json(e, by_event.get(e.id, []), covers.get(e.id)) for e in events]


@router.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    row = db.execute(select(EventImage.content_type, EventImage.data).where(EventImage.id == image_id)).first()
    if not row:
        raise HTTPException(404, "Image not found.")
    return Response(content=row.data, media_type=row.content_type, headers=IMMUTABLE)


@router.get("/event-covers/{cover_id}")
def get_cover_image(cover_id: int, db: Session = Depends(get_db)):
    row = db.execute(select(EventCover.content_type, EventCover.data).where(EventCover.id == cover_id)).first()
    if not row:
        raise HTTPException(404, "Cover not found.")
    # the URL carries ?v=<token>, so a new upload always gets a new URL: safe to cache "forever"
    return Response(content=row.data, media_type=row.content_type, headers=IMMUTABLE)


# ---------------- admin only ----------------
@router.post("/events")
def create_event(body: EventRename, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    """NEW: add an album (folder) at the end of the list."""
    if (db.scalar(select(func.count(Event.id))) or 0) >= MAX_EVENTS:
        raise HTTPException(400, f"At most {MAX_EVENTS} albums are allowed.")
    last = db.scalar(select(func.max(Event.position)))
    ev = Event(name=body.name.strip(), position=0 if last is None else last + 1)
    db.add(ev)
    db.commit()
    return _event_json(ev, [], None)


@router.delete("/events/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    """NEW: delete an album together with ALL of its photos and its cover."""
    ev = _event_or_404(db, event_id)
    db.execute(delete(EventImage).where(EventImage.event_id == ev.id))
    db.execute(delete(EventCover).where(EventCover.event_id == ev.id))
    db.delete(ev)
    db.commit()
    return {"ok": True}


@router.patch("/events/{event_id}")
def rename_event(event_id: int, body: EventRename, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    ev = _event_or_404(db, event_id)
    ev.name = body.name.strip()
    db.commit()
    return {"id": ev.id, "name": ev.name}


@router.post("/events/{event_id}/images")
async def upload_images(
    event_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    admin: GoogleUser = Depends(require_admin),
):
    ev = _event_or_404(db, event_id)
    if not files or len(files) > MAX_FILES_PER_REQUEST:
        raise HTTPException(400, f"Send between 1 and {MAX_FILES_PER_REQUEST} images at a time.")
    existing = db.execute(select(EventImage.id).where(EventImage.event_id == ev.id)).all()
    if len(existing) + len(files) > MAX_IMAGES_PER_EVENT:
        raise HTTPException(400, f"An event can hold at most {MAX_IMAGES_PER_EVENT} images.")

    saved: list[EventImage] = []
    for f in files:
        data, ctype = await read_validated_image(f)
        saved.append(
            EventImage(
                event_id=ev.id,
                filename=os.path.basename(f.filename or "image")[:160],
                content_type=ctype,
                size=len(data),
                data=data,
                uploaded_by=admin.id,
            )
        )
    db.add_all(saved)
    db.commit()
    return {"uploaded": [{"id": i.id} for i in saved]}


@router.delete("/events/images/{image_id}")
def delete_image(image_id: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    img = db.get(EventImage, image_id)
    if not img:
        raise HTTPException(404, "Image not found.")
    ev = db.get(Event, img.event_id)
    if ev and ev.cover_image_id == image_id:
        ev.cover_image_id = None
    db.delete(img)
    db.commit()
    return {"ok": True}


@router.put("/events/{event_id}/cover")
def set_cover(event_id: int, body: CoverIn, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    """Pick one of the album's own photos as its cover (or send image_id = null to clear that choice)."""
    ev = _event_or_404(db, event_id)
    if body.image_id is not None:
        img = db.execute(select(EventImage.id).where(EventImage.id == body.image_id, EventImage.event_id == ev.id)).first()
        if not img:
            raise HTTPException(404, "That image is not in this event.")
    ev.cover_image_id = body.image_id
    db.commit()
    return {"ok": True}


@router.put("/events/{event_id}/cover-image")
async def upload_cover_image(
    event_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: GoogleUser = Depends(require_admin),
):
    ev = _event_or_404(db, event_id)
    data, ctype = await read_validated_image(file)
    # remove the old cover first (event_id is UNIQUE), then store the new one
    db.execute(delete(EventCover).where(EventCover.event_id == ev.id))
    cover = EventCover(event_id=ev.id, content_type=ctype, token=secrets.token_hex(8), data=data)
    db.add(cover)
    db.commit()
    return {"id": cover.id, "token": cover.token}


@router.delete("/events/{event_id}/cover-image")
def delete_cover_image(event_id: int, db: Session = Depends(get_db), _: GoogleUser = Depends(require_admin)):
    ev = _event_or_404(db, event_id)
    db.execute(delete(EventCover).where(EventCover.event_id == ev.id))
    db.commit()
    return {"ok": True}