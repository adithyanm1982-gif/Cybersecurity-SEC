from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class GoogleUser(Base):
    """Everyone who has signed in with Google (sign-up happens on first sign-in)."""

    __tablename__ = "google_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    last_login: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class CsvFile(Base):
    """A whole CSV file kept as text in the database.
    There is ONE row here ("applications.csv"); every submitted form is appended to its content."""

    __tablename__ = "csv_files"

    name: Mapped[str] = mapped_column(String(80), primary_key=True)
    content: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)


class Event(Base):
    """One folder in the EVENTS page (9 of them)."""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), default="EEE")
    position: Mapped[int] = mapped_column(Integer, default=0, index=True)
    cover_image_id: Mapped[int | None] = mapped_column(Integer, nullable=True)


class EventImage(Base):
    """Uploaded photos. The bytes live in the database itself."""

    __tablename__ = "event_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("events.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(160), default="")
    content_type: Mapped[str] = mapped_column(String(40))
    size: Mapped[int] = mapped_column(Integer, default=0)
    data: Mapped[bytes] = mapped_column(LargeBinary)
    uploaded_by: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
