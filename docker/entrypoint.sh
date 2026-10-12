#!/bin/bash
set -euo pipefail

mkdir -p "$PGDATA" "$NEXUS_DATA_DIR"
chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
chown nexus:nexus "$NEXUS_DATA_DIR"

# Persist a random signing key across restarts without asking users to create one.
if [ -z "${NEXUS_SESSION_SECRET:-}" ]; then
  secret_file="$NEXUS_DATA_DIR/session-secret"
  if [ ! -s "$secret_file" ]; then
    /opt/venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(48))' > "$secret_file"
  fi
  chown nexus:nexus "$secret_file"
  chmod 600 "$secret_file"
  NEXUS_SESSION_SECRET="$(cat "$secret_file")"
  export NEXUS_SESSION_SECRET
fi

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  # PostgreSQL is accessible only within this container, never a published port.
  gosu postgres initdb -D "$PGDATA" --username=nexus --auth-local=trust --auth-host=trust
fi
if [ "$(cat "$PGDATA/PG_VERSION")" != "17" ]; then
  echo "This image requires a PostgreSQL 17 data volume. Migrate older data before starting." >&2
  exit 1
fi

# Bootstrap before supervision; apply the additive schema on every start.
gosu postgres pg_ctl -D "$PGDATA" -o '-h 127.0.0.1 -k /tmp' -w start
trap 'gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop || true' EXIT
for database in nexus nexus_test; do
  if ! gosu postgres psql -h 127.0.0.1 -U nexus -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$database'" | grep -q 1; then
    gosu postgres createdb -h 127.0.0.1 -U nexus "$database"
  fi
  psql -h 127.0.0.1 -U nexus -d "$database" -v ON_ERROR_STOP=1 -f /app/backend/schema.sql
done
gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
trap - EXIT

exec /usr/bin/supervisord -c /app/docker/supervisord.conf
