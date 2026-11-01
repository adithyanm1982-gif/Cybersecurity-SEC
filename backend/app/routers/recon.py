"""Very basic, harmless site recon.

What it does: ONE normal GET request (exactly like opening the site in a browser), plus a DNS lookup.
What it never does: port scanning, crawling, payloads, brute force, or any request to private/internal addresses.

Safety guards
  * login required (members + admins); guests get 401
  * only http/https on ports 80/443, no user:password@ in the URL
  * every address the name resolves to must be PUBLIC (blocks localhost, 10.x, 192.168.x, 169.254.x, etc.)
  * the connection is made to the address that was checked (no DNS-rebinding trick)
  * redirects are followed manually (max 4) and each hop is checked again
  * short timeouts, 64 KB body cap, 10 lookups per user per 5 minutes
"""
import html
import http.client
import ipaddress
import re
import socket
import ssl
import time
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from ..deps import current_user
from ..models import GoogleUser
from ..security import rate_limit

router = APIRouter(prefix="/recon", tags=["recon"])

TIMEOUT = 6            # seconds per connection / read
MAX_REDIRECTS = 4
MAX_BODY = 64 * 1024   # only used to read the <title>
UA = "TechSociety-Recon/1.0 (basic public info lookup)"
SECURITY_HEADERS = {
    "strict-transport-security": "HSTS",
    "content-security-policy": "CSP",
    "x-frame-options": "X-Frame-Options",
    "x-content-type-options": "X-Content-Type-Options",
    "referrer-policy": "Referrer-Policy",
    "permissions-policy": "Permissions-Policy",
}


class ReconIn(BaseModel):
    target: str = Field(min_length=3, max_length=300)


def _parse(raw: str) -> tuple[str, str, int, str]:
    raw = raw.strip()
    if any(c in raw for c in " \t\r\n\\"):
        raise ValueError("Enter a plain domain such as example.com")
    if "://" not in raw:
        raw = "https://" + raw
    u = urlparse(raw)
    if u.scheme not in ("http", "https"):
        raise ValueError("Only http and https sites are allowed.")
    if u.username or u.password:
        raise ValueError("Usernames and passwords in the address are not allowed.")
    host = (u.hostname or "").rstrip(".").lower()
    if not host:
        raise ValueError("Enter a plain domain such as example.com")
    try:
        port = u.port
    except ValueError:
        raise ValueError("Invalid port.")
    if port not in (None, 80, 443):
        raise ValueError("Only the standard ports 80 and 443 are allowed.")
    try:
        host = host.encode("idna").decode("ascii")
    except UnicodeError:
        raise ValueError("That domain name is not valid.")
    if len(host) > 253:
        raise ValueError("That domain name is too long.")
    port = port or (443 if u.scheme == "https" else 80)
    path = u.path or "/"
    if u.query:
        path += "?" + u.query
    return u.scheme, host, port, path


def _resolve(host: str, port: int) -> list[str]:
    try:
        infos = socket.getaddrinfo(host, port, type=socket.SOCK_STREAM)
    except (socket.gaierror, UnicodeError):
        raise ValueError("Could not resolve that domain name.")
    ips: list[str] = []
    for _fam, _t, _p, _c, sa in infos:
        ip = ipaddress.ip_address(sa[0].split("%")[0])
        if getattr(ip, "ipv4_mapped", None):
            ip = ip.ipv4_mapped
        if not ip.is_global:
            raise ValueError("Blocked: this name points to a private or internal network.")
        if str(ip) not in ips:
            ips.append(str(ip))
    if not ips:
        raise ValueError("Could not resolve that domain name.")
    ips.sort(key=lambda a: ":" in a)  # IPv4 first
    return ips


def _connect(ip: str, port: int, host: str, https: bool, verify: bool):
    sock = socket.socket(socket.AF_INET6 if ":" in ip else socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(TIMEOUT)
    try:
        sock.connect((ip, port))
        if https:
            ctx = ssl.create_default_context()
            if not verify:
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
            sock = ctx.wrap_socket(sock, server_hostname=host)
        return sock
    except Exception:
        sock.close()
        raise


def _cert_info(sock, verified: bool, err: str | None) -> dict:
    info: dict = {"valid": verified, "version": sock.version()}
    if not verified:
        info["error"] = err or "certificate could not be verified"
        return info
    cert = sock.getpeercert() or {}
    issuer = {k: v for rdn in cert.get("issuer", ()) for k, v in rdn}
    info["issuer"] = issuer.get("organizationName") or issuer.get("commonName") or "unknown"
    na = cert.get("notAfter")
    if na:
        try:
            ts = ssl.cert_time_to_seconds(na)
            info["expires"] = datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%d")
            info["days_left"] = int((ts - time.time()) // 86400)
        except ValueError:
            pass
    return info


def _clip(v: str | None, n: int = 200) -> str:
    return (v or "").strip()[:n]


def _get_once(scheme: str, host: str, port: int, path: str, ips: list[str]) -> dict:
    https = scheme == "https"
    sock = None
    verified, tls_err = True, None
    last: Exception | None = None
    for ip in ips[:3]:
        try:
            try:
                sock = _connect(ip, port, host, https, True)
            except ssl.SSLError as e:
                if not https:
                    raise
                verified = False
                tls_err = _clip(getattr(e, "verify_message", None) or "certificate could not be verified", 120)
                sock = _connect(ip, port, host, True, False)
            break
        except (OSError, ssl.SSLError) as e:
            last = e
            sock = None
    if sock is None:
        raise ValueError("Could not connect to the site (it may be down, or it refused the connection).") from last

    tls = _cert_info(sock, verified, tls_err) if https else None
    conn = http.client.HTTPConnection(host, port, timeout=TIMEOUT)
    conn.sock = sock  # use the already-checked, already-connected socket
    try:
        conn.request("GET", path, headers={
            "Host": host, "User-Agent": UA, "Accept": "text/html,*/*;q=0.5",
            "Accept-Encoding": "identity", "Connection": "close",
        })
        resp = conn.getresponse()
        headers = {k.lower(): v for k, v in resp.getheaders()}
        body = b""
        if "html" in headers.get("content-type", "").lower():
            body = resp.read(MAX_BODY)
        status, reason = resp.status, resp.reason
    except (OSError, http.client.HTTPException) as e:
        raise ValueError("The site did not answer properly.") from e
    finally:
        conn.close()

    title = ""
    m = re.search(r"<title[^>]*>(.*?)</title>", body.decode("utf-8", "replace"), re.I | re.S)
    if m:
        title = _clip(re.sub(r"\s+", " ", html.unescape(m.group(1))), 160)
    return {"status": status, "reason": reason, "headers": headers, "title": title, "tls": tls}


@router.post("")
def recon(body: ReconIn, request: Request, user: GoogleUser = Depends(current_user)):
    rate_limit(request, "recon", limit=10, window=300, extra=str(user.id))
    started = time.monotonic()

    try:
        scheme, host, port, path = _parse(body.target)
        first_host = host
        all_ips = _resolve(host, port)
        result_ips = all_ips
        hops: list[str] = []
        tls = None

        for _ in range(MAX_REDIRECTS + 1):
            ips = _resolve(host, port)
            if not hops:
                result_ips = ips
            r = _get_once(scheme, host, port, path, ips)
            if r["tls"] is not None:
                tls = r["tls"]
            loc = r["headers"].get("location")
            if r["status"] in (301, 302, 303, 307, 308) and loc:
                hops.append(f"{r['status']} -> {_clip(loc, 150)}")
                if len(hops) > MAX_REDIRECTS:
                    break
                nxt = urljoin(f"{scheme}://{host}{path}", loc)
                try:
                    scheme, host, port, path = _parse(nxt)
                except ValueError:
                    hops.append("redirect stopped (target not allowed)")
                    break
                continue
            break
    except ValueError as e:
        raise HTTPException(400, str(e))

    h = r["headers"]
    present = [label for key, label in SECURITY_HEADERS.items() if key in h]
    missing = [label for key, label in SECURITY_HEADERS.items() if key not in h]
    return {
        "target": first_host,
        "ips": result_ips,
        "final_url": f"{scheme}://{host}{'' if port in (80, 443) else f':{port}'}{path}"[:300],
        "status": r["status"],
        "reason": r["reason"],
        "server": _clip(h.get("server")),
        "powered_by": _clip(h.get("x-powered-by")),
        "content_type": _clip(h.get("content-type"), 80),
        "title": r["title"],
        "redirects": hops,
        "security_headers": {"present": present, "missing": missing},
        "tls": tls,
        "elapsed_ms": int((time.monotonic() - started) * 1000),
    }