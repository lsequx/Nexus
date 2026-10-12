"""Owner-only bootstrap: keep data, migrate application access to a limited role."""
import os
from pathlib import Path
import secrets
import pwd
import psycopg
from psycopg import sql

root = Path("/app")
directory = Path(os.environ["NEXUS_DATA_DIR"])
password_file = directory / "database-password"
if not password_file.exists():
    descriptor = os.open(password_file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "w") as stream:
        stream.write(secrets.token_urlsafe(48))
password = password_file.read_text().strip()
if len(password) < 32:
    raise SystemExit("Invalid private database password file")
owner = pwd.getpwnam("nexus")
os.chown(password_file, owner.pw_uid, owner.pw_gid)
os.chmod(password_file, 0o600)

# Peer authentication maps only OS root/postgres to the existing nexus admin.
with psycopg.connect("dbname=postgres user=nexus host=/tmp", autocommit=True) as admin:
    if not admin.execute("SELECT 1 FROM pg_roles WHERE rolname = 'nexus_app'").fetchone():
        admin.execute("CREATE ROLE nexus_app")
    admin.execute("SET password_encryption = 'scram-sha-256'")
    admin.execute(sql.SQL("ALTER ROLE nexus_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD {}").format(sql.Literal(password)))
    for database in ("nexus", "nexus_test"):
        if not admin.execute("SELECT 1 FROM pg_database WHERE datname = %s", (database,)).fetchone():
            admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
        admin.execute(sql.SQL("GRANT CONNECT ON DATABASE {} TO nexus_app").format(sql.Identifier(database)))
        with psycopg.connect(dbname=database, user="nexus", host="/tmp") as connection:
            connection.execute((root / "backend" / "schema.sql").read_text())
            connection.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
            connection.execute("GRANT USAGE ON SCHEMA public TO nexus_app")
            connection.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO nexus_app")
            connection.execute("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO nexus_app")
print("Database schema and restricted application role are ready.")
