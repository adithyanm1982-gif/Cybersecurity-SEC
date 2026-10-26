from pydantic import BaseModel, Field


class GoogleIn(BaseModel):
    credential: str = Field(min_length=10, max_length=4096)


class ApplicationIn(BaseModel):
    """The e-mail is NOT sent by the browser: it is taken from the signed-in Google account."""

    name: str = Field(min_length=2, max_length=120)
    register_no: str = Field(min_length=3, max_length=40)
    department: str = Field(min_length=2, max_length=80)
    year: str = Field(min_length=1, max_length=20)
    phone: str = Field(default="", max_length=20)
    reason: str = Field(default="", max_length=2000)


class EventRename(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class CoverIn(BaseModel):
    image_id: int | None = None
