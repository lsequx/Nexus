"""Server-to-server authentication; this key is never sent to the browser."""
import hmac
import os
import secrets
from pathlib import Path
from urllib.parse import quote, urlsplit, urlunsplit
from fastapi import Request
from fastapi.responses import JSONResponse


def get_backend_key():
    value = os.getenv("NEXUS_BACKEND_KEY")
    if value is not None:
        if len(value) < 32:
            raise RuntimeError("NEXUS_BACKEND_KEY must contain at least 32 random characters")
        return value
    directory = Path(os.getenv("NEXUS_DATA_DIR", str(Path(__file__).resolve().parent.parent / "frontend" / ".nexus-data")))
    directory.mkdir(parents=True, exist_ok=True, mode=0o700)
    file = directory / "backend-key"
    try:
        descriptor = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    except FileExistsError:
        pass
    else:
        with os.fdopen(descriptor, "w") as stream:
            stream.write(secrets.token_urlsafe(48))
    value = file.read_text().strip()
    if len(value) < 32:
        raise RuntimeError("Invalid backend key file")
    return value


def database_url(database="nexus"):
    if database not in {"nexus", "nexus_test"}:
        raise ValueError("Unsupported application database")
    configured = os.getenv("DATABASE_URL")
    if configured:
        if database == "nexus":
            return configured
        parts = urlsplit(configured)
        return urlunsplit((parts.scheme, parts.netloc, f"/{database}", parts.query, parts.fragment))
    directory = Path(os.getenv("NEXUS_DATA_DIR", "/data/app"))
    password_file = directory / "database-password"
    if not password_file.exists():
        raise RuntimeError("Configure DATABASE_URL for local development")
    password = password_file.read_text().strip()
    if len(password) < 32:
        raise RuntimeError("Invalid private database password file")
    return f"postgresql://nexus_app:{quote(password, safe='')}@127.0.0.1:5432/{database}"


async def authenticate_backend(request: Request, call_next):
    if request.method == "GET" and request.url.path == "/health":
        return await call_next(request)
    supplied = request.headers.get("x-nexus-api-key", "")
    if not hmac.compare_digest(supplied.encode(), get_backend_key().encode()):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)
