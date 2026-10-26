"""The ONE csv file that collects every submitted form.

It is stored as text inside the database (table `csv_files`, row "applications.csv").
Appending a row is a single atomic SQL UPDATE (`content = content || new_row`), so two
students submitting at the same moment can never overwrite each other.
"""
import csv
import io
import re
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from .models import CsvFile

CSV_NAME = "applications.csv"
COLUMNS = ["submitted_at", "name", "register_no", "department", "year", "email", "phone", "reason"]

# digits, spaces, brackets, hyphens and a leading + (a normal phone number)
_PHONE_LIKE = re.compile(r"^\+?[0-9][0-9 ()\-]*$")


def _line(values: list[str]) -> str:
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\r\n").writerow(values)
    return buf.getvalue()


def safe_cell(value) -> str:
    """Stops spreadsheet formula injection when the CSV is opened in Excel / Sheets."""
    s = "" if value is None else str(value).strip()
    if s[:1] in ("=", "+", "-", "@", "\t", "\r") and not _PHONE_LIKE.match(s):
        return "'" + s
    return s


def ensure_csv(db: Session) -> None:
    """Create the file (header row only) the first time."""
    if not db.get(CsvFile, CSV_NAME):
        db.add(CsvFile(name=CSV_NAME, content=_line(COLUMNS)))
        db.commit()


def append_row(db: Session, record: dict) -> None:
    record = {"submitted_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"), **record}
    row = _line([safe_cell(record.get(c, "")) for c in COLUMNS])
    stmt = (
        update(CsvFile)
        .where(CsvFile.name == CSV_NAME)
        .values(content=CsvFile.content + row, updated_at=datetime.now(timezone.utc))
    )
    if db.execute(stmt).rowcount == 0:  # file was missing: recreate it and try again
        db.rollback()
        ensure_csv(db)
        db.execute(stmt)
    db.commit()


def read_text(db: Session) -> str:
    ensure_csv(db)
    return db.scalar(select(CsvFile.content).where(CsvFile.name == CSV_NAME)) or _line(COLUMNS)


def read_rows(db: Session) -> list[dict]:
    """The CSV as a list of dicts, newest first (for the admin table)."""
    reader = csv.DictReader(io.StringIO(read_text(db)))
    rows = [{"id": i + 1, **{c: (r.get(c) or "") for c in COLUMNS}} for i, r in enumerate(reader)]
    rows.reverse()
    return rows
