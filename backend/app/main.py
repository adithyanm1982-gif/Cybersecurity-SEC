import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .csvstore import ensure_csv
from .database import Base, SessionLocal, engine
from .models import CsvFile, Event
from .routers import admin, applications, auth, events, team
from .routers.team import seed_team

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("techsociety")

EVENT_COUNT = 9


def seed() -> None:
    with SessionLocal() as db:
        # the starting event folders: created ONCE. A marker row stops them coming back after an admin deletes them.
        if not db.get(CsvFile, "_events_seeded"):
            if not db.scalars(select(Event.id)).first():
                for i in range(EVENT_COUNT):
                    db.add(Event(name="EEE", position=i))
            db.add(CsvFile(name="_events_seeded", content="1"))
            db.commit()
        # the starting team profiles (also carries over photos uploaded by the older version)
        seed_team(db)
        # the single CSV file (header row only, until the first form arrives)
        ensure_csv(db)


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    seed()
    yield


app = FastAPI(title="Tech Society Cybersecurity API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}