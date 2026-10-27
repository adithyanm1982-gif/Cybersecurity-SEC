import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from .config import settings
from .csvstore import ensure_csv
from .database import Base, SessionLocal, engine
from .models import Event
from .routers import admin, applications, auth, events, team

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("techsociety")

EVENT_COUNT = 9


def seed() -> None:
    with SessionLocal() as db:
        # the nine event folders
        if not db.scalars(select(Event.id)).first():
            for i in range(EVENT_COUNT):
                db.add(Event(name="EEE", position=i))
            db.commit()
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