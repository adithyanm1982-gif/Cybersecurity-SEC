"""Run with:  cd backend && pytest -q
Uses a throw-away SQLite file and a fake Google check, so it never touches your real data or Google."""
import csv
import io
import os
import sys

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

PNG = b"\x89PNG\r\n\x1a\n" + b"0" * 64
ADMIN_EMAIL = "boss@example.com"
STUDENT_EMAIL = "stu@example.com"


def fake_verify(credential: str) -> dict:
    """Stands in for Google. Credential format:  kind|email|name"""
    parts = credential.split("|")
    if len(parts) != 3:
        raise HTTPException(401, "Google sign-in could not be verified. Please try again.")
    kind, email, name = parts
    return {"email": email, "name": name, "email_verified": kind != "unverified"}


@pytest.fixture(scope="module")
def client(tmp_path_factory):
    db = tmp_path_factory.mktemp("db") / "test.db"
    os.environ.update(
        DATABASE_URL=f"sqlite:///{db}",
        SECRET_KEY="x" * 40,
        ADMIN_EMAILS=ADMIN_EMAIL,
        GOOGLE_CLIENT_ID="test-client-id",
    )
    for name in [m for m in sys.modules if m == "app" or m.startswith("app.")]:
        del sys.modules[name]
    from app.main import app
    import app.routers.auth as auth_router

    auth_router._verify = fake_verify
    with TestClient(app) as c:
        yield c


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def sign_in(client, email, name="Someone", kind="ok"):
    r = client.post("/api/auth/google", json={"credential": f"{kind}|{email}|{name}"})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def admin_token(client):
    data = sign_in(client, ADMIN_EMAIL, "The Boss")
    assert data["user"]["role"] == "admin"
    return data["access_token"]


@pytest.fixture(scope="module")
def user_token(client):
    data = sign_in(client, STUDENT_EMAIL, "Student One")
    assert data["user"]["role"] == "user"
    return data["access_token"]


FORM = {"name": "Student One", "register_no": "2117001", "department": "CSE", "year": "2nd Year",
        "phone": "+91 98765 43210", "reason": "I love security"}


def test_health_and_nine_events(client):
    assert client.get("/api/health").json() == {"status": "ok"}
    events = client.get("/api/events").json()
    assert len(events) == 9 and all(e["name"] == "EEE" for e in events)


def test_password_logins_no_longer_exist(client):
    for path in ("/api/auth/login", "/api/auth/register", "/api/auth/admin/login"):
        assert client.post(path, json={"email": "a@b.co", "password": "password123"}).status_code in (404, 405)


def test_google_signup_then_signin_reuses_account(client, user_token):
    again = sign_in(client, STUDENT_EMAIL, "Student One")
    me = client.get("/api/auth/me", headers=auth(again["access_token"])).json()
    assert me["email"] == STUDENT_EMAIL and me["role"] == "user"
    users = client.get("/api/admin/users", headers=auth(sign_in(client, ADMIN_EMAIL)["access_token"])).json()
    assert [u["email"] for u in users].count(STUDENT_EMAIL) == 1


def test_bad_or_unverified_google_is_rejected(client):
    assert client.post("/api/auth/google", json={"credential": "garbage-credential"}).status_code == 401
    assert client.post("/api/auth/google", json={"credential": "unverified|x@y.com|X"}).status_code == 401


def test_form_needs_google_sign_in(client):
    assert client.post("/api/applications", json=FORM).status_code == 401
    assert client.post("/api/applications", json=FORM, headers=auth("not-a-token")).status_code == 401


def test_csv_starts_with_header_only(client, admin_token):
    text = client.get("/api/admin/applications.csv", headers=auth(admin_token)).text.lstrip("﻿")
    assert text.strip() == "submitted_at,name,register_no,department,year,email,phone,reason"


def test_form_rows_go_into_the_single_csv(client, admin_token, user_token):
    # a faked e-mail in the body must be ignored: the Google account's e-mail is used
    r = client.post("/api/applications", json={**FORM, "email": "fake@evil.com"}, headers=auth(user_token))
    assert r.status_code == 200, r.text
    tricky = {**FORM, "name": "=cmd|' /C calc'!A0", "register_no": "2117002",
              "reason": 'has, comma, "quotes"\nand a new line'}
    assert client.post("/api/applications", json=tricky, headers=auth(user_token)).status_code == 200

    res = client.get("/api/admin/applications.csv", headers=auth(admin_token))
    assert res.status_code == 200 and "attachment" in res.headers["content-disposition"]
    rows = list(csv.DictReader(io.StringIO(res.text.lstrip("﻿"))))
    assert len(rows) == 2
    assert rows[0]["email"] == STUDENT_EMAIL and rows[0]["phone"] == "+91 98765 43210"
    assert rows[1]["name"].startswith("'=")            # formula injection neutralised
    assert rows[1]["reason"] == 'has, comma, "quotes"\nand a new line'  # survives the round trip

    table = client.get("/api/admin/applications", headers=auth(admin_token)).json()
    assert [r["register_no"] for r in table] == ["2117002", "2117001"]  # newest first


def test_only_admin_can_see_the_csv_and_lists(client, user_token):
    for path in ("/api/admin/applications.csv", "/api/admin/applications", "/api/admin/users"):
        assert client.get(path).status_code == 401
        assert client.get(path, headers=auth(user_token)).status_code == 403


def test_form_validation(client, user_token):
    assert client.post("/api/applications", json={**FORM, "name": ""}, headers=auth(user_token)).status_code == 422


def test_only_admin_can_upload(client, admin_token, user_token):
    files = {"files": ("a.png", PNG, "image/png")}
    assert client.post("/api/events/1/images", files=files).status_code == 401
    assert client.post("/api/events/1/images", files=files, headers=auth(user_token)).status_code == 403

    r = client.post("/api/events/1/images", files=files, headers=auth(admin_token))
    assert r.status_code == 200, r.text
    image_id = r.json()["uploaded"][0]["id"]

    img = client.get(f"/api/images/{image_id}")
    assert img.status_code == 200 and img.headers["content-type"] == "image/png" and img.content == PNG
    assert client.get("/api/events").json()[0]["images"] == [{"id": image_id}]

    assert client.delete(f"/api/events/images/{image_id}", headers=auth(user_token)).status_code == 403
    assert client.delete(f"/api/events/images/{image_id}", headers=auth(admin_token)).status_code == 200


def test_fake_image_is_rejected(client, admin_token):
    html = {"files": ("evil.png", b"<html><script>alert(1)</script></html>", "image/png")}
    assert client.post("/api/events/1/images", files=html, headers=auth(admin_token)).status_code == 415
    svg = {"files": ("x.svg", b"<svg xmlns='http://www.w3.org/2000/svg'/>", "image/svg+xml")}
    assert client.post("/api/events/1/images", files=svg, headers=auth(admin_token)).status_code == 415


def test_rename_event_admin_only(client, admin_token, user_token):
    assert client.patch("/api/events/2", json={"name": "Hackathon"}, headers=auth(user_token)).status_code == 403
    assert client.patch("/api/events/2", json={"name": "Hackathon"}, headers=auth(admin_token)).status_code == 200
    assert client.get("/api/events").json()[1]["name"] == "Hackathon"
