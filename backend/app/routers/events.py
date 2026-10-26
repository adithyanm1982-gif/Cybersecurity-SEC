import os

from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import require_admin
from ..models import Event, EventImage, GoogleUser
from ..schemas import CoverIn, EventRename

router = APIRouter(tags=["events"])

MAX_FILES_PER_REQUEST = 10
MAX_IMAGES_PER_EVENT = 200


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


def _event_or_404(db: Session, event_id: int) -> Event:
    ev = db.get(Event, event_id)
    if not ev:
        raise HTTPException(404, "Event not found.")
    return ev


def _event_json(ev: Event, image_ids: list[int]) -> dict:
    cover = ev.cover_image_id if ev.cover_image_id in image_ids else (image_ids[0] if image_ids else None)
    return {"id": ev.id, "name": ev.name, "cover_image_id": cover, "images": [{"id": i} for i in image_ids]}


# ---------------- public ----------------
@router.get("/events")
def list_events(db: Session = Depends(get_db)):
    events = db.scalars(select(Event).order_by(Event.position, Event.id)).all()
    rows = db.execute(select(EventImage.id, EventImage.event_id).order_by(EventImage.id)).all()  # no image bytes
    by_event: dict[int, list[int]] = {}
    for image_id, event_id in rows:
        by_event.setdefault(event_id, []).append(image_id)
    return [_event_json(e, by_event.get(e.id, [])) for e in events]


@router.get("/images/{image_id}")
def get_image(image_id: int, db: Session = Depends(get_db)):
    row = db.execute(select(EventImage.content_type, EventImage.data).where(EventImage.id == image_id)).first()
    if not row:
        raise HTTPException(404, "Image not found.")
    return Response(
        content=row.data,
        media_type=row.content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff"},
    )


# ---------------- admin only ----------------
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

    limit = settings.max_upload_bytes
    saved: list[EventImage] = []
    for f in files:
        data = await f.read(limit + 1)
        if len(data) > limit:
            raise HTTPException(413, f"'{f.filename}' is larger than {settings.MAX_UPLOAD_MB} MB.")
        ctype = sniff_image_type(data)
        if not ctype:
            raise HTTPException(415, f"'{f.filename}' is not a JPG, PNG, GIF or WEBP image.")
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
    ev = _event_or_404(db, event_id)
    if body.image_id is not None:
        img = db.execute(select(EventImage.id).where(EventImage.id == body.image_id, EventImage.event_id == ev.id)).first()
        if not img:
            raise HTTPException(404, "That image is not in this event.")
    ev.cover_image_id = body.image_id
    db.commit()
    return {"ok": True}
