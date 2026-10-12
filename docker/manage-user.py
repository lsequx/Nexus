"""Owner-only account administration. Run in an interactive local terminal."""
import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import sys
from datetime import datetime, timezone
import uuid


def users_file():
    root = Path(__file__).resolve().parent.parent
    return Path(os.getenv("NEXUS_DATA_DIR", str(root / "frontend" / ".nexus-data"))) / "users.json"


def update_user(command, email, *, name=None, password=None):
    file = users_file()
    file.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    users = json.loads(file.read_text()) if file.exists() else []
    if not isinstance(users, list):
        raise ValueError("Invalid user store; refusing to overwrite it")
    email = email.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        raise ValueError("A valid email is required")
    user = next((user for user in users if user["email"] == email), None)
    if command == "create-admin":
        if user:
            raise ValueError("Account already exists; use promote-admin")
        if not name or not 2 <= len(name.strip()) <= 80:
            raise ValueError("Name must contain 2–80 characters")
        user = {"id": str(uuid.uuid4()), "email": email, "name": name.strip(), "role": "admin", "createdAt": datetime.now(timezone.utc).isoformat(), "sessionVersion": 0}
        users.append(user)
    elif not user:
        raise ValueError("Account not found")
    else:
        user["sessionVersion"] = user.get("sessionVersion", 0) + 1
    if command == "promote-admin":
        user["role"] = "admin"
    else:
        if not password or not 12 <= len(password) <= 128:
            raise ValueError("Password must contain 12–128 characters")
        salt = secrets.token_hex(16)
        user["passwordSalt"] = salt
        user["passwordHash"] = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64).hex()
    user.pop("resetCodeHash", None)
    user.pop("resetCodeExpiresAt", None)
    temporary = file.with_suffix(".tmp")
    with os.fdopen(os.open(temporary, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as stream:
        json.dump(users, stream, indent=2)
        stream.write("\n")
    if os.geteuid() == 0:
        owner = file.stat() if file.exists() else file.parent.stat()
        os.chown(temporary, owner.st_uid, owner.st_gid)
    os.replace(temporary, file)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["create-admin", "promote-admin", "reset-password"])
    parser.add_argument("email", nargs="?")
    args = parser.parse_args()
    if not sys.stdin.isatty():
        parser.error("Run this command interactively; never put a password in command arguments")
    email = args.email or input("Email: ")
    name = input("Name: ") if args.command == "create-admin" else None
    password = None
    if args.command != "promote-admin":
        password = getpass.getpass("New password (12–128 characters): ")
        if password != getpass.getpass("Confirm password: "):
            raise SystemExit("Passwords do not match")
    try:
        update_user(args.command, email, name=name, password=password)
    except ValueError as error:
        raise SystemExit(str(error)) from error
    print("Account updated. Sign in again; previous sessions have been revoked.")


if __name__ == "__main__":
    main()
