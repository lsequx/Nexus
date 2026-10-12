#!/bin/bash
set -euo pipefail

mkdir -p "$PGDATA" "$NEXUS_DATA_DIR"
chown postgres:postgres "$PGDATA"
chmod 700 "$PGDATA"
chown nexus:nexus "$NEXUS_DATA_DIR"
chmod 700 "$NEXUS_DATA_DIR"

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

if [ -z "${NEXUS_BACKEND_KEY:-}" ]; then
  key_file="$NEXUS_DATA_DIR/backend-key"
  if [ ! -s "$key_file" ]; then
    /opt/venv/bin/python -c 'import secrets; print(secrets.token_urlsafe(48))' > "$key_file"
  fi
  chown nexus:nexus "$key_file"
  chmod 600 "$key_file"
  NEXUS_BACKEND_KEY="$(cat "$key_file")"
  export NEXUS_BACKEND_KEY
fi

if [ ! -f "$PGDATA/PG_VERSION" ]; then
  # PostgreSQL is accessible only within this container, never a published port.
  gosu postgres initdb -D "$PGDATA" --username=nexus --auth-local=trust --auth-host=trust
fi
if [ "$(cat "$PGDATA/PG_VERSION")" != "17" ]; then
  echo "This image requires a PostgreSQL 17 data volume. Migrate older data before starting." >&2
  exit 1
fi

# Replace legacy trust rules without deleting or reinitializing existing data.
cat > "$PGDATA/pg_hba.conf" <<'HBA'
local all nexus peer map=nexus_admin
host nexus,nexus_test nexus_app 127.0.0.1/32 scram-sha-256
host all all 127.0.0.1/32 reject
host all all ::1/128 reject
HBA
cat > "$PGDATA/pg_ident.conf" <<'IDENT'
nexus_admin root nexus
nexus_admin postgres nexus
IDENT
chown postgres:postgres "$PGDATA/pg_hba.conf" "$PGDATA/pg_ident.conf"
chmod 600 "$PGDATA/pg_hba.conf" "$PGDATA/pg_ident.conf"

# Bootstrap before supervision; apply the additive schema on every start.
gosu postgres pg_ctl -D "$PGDATA" -o '-h 127.0.0.1 -k /tmp' -w start
trap 'gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop || true' EXIT
/opt/venv/bin/python /app/docker/bootstrap-database.py
gosu postgres pg_ctl -D "$PGDATA" -m fast -w stop
trap - EXIT

exec /usr/bin/supervisord -c /app/docker/supervisord.conf
