# Run the whole project in one Docker container

The image contains PostgreSQL 17, the FastAPI backend, and a production Next.js frontend. Supervisor starts and monitors all three processes. Docker Compose launches **one container**, with named volumes for database data and application files. You do not need Node.js, Python, or PostgreSQL installed on your computer.

## First-time setup

1. Install Docker Desktop on Windows or macOS, or Docker Engine plus the Compose plugin on Linux. Start Docker. On Windows, use Docker Desktop's Linux-container/WSL 2 backend.
2. Clone the project, or pull the latest `main` in your existing checkout:

   ```sh
   git clone https://github.com/lsequx/Nexus.git
   cd Nexus
   ```

   For an existing checkout, run `git pull --ff-only origin main` instead of cloning. Preserve your local changes first.

3. From the repository root, run:

   ```sh
   docker compose up --build -d --wait
   ```

4. Open **http://localhost:3000**. Create an account and sign in. The first account is the local administrator. Open **Topology** to see the reference network, then run a scenario or edit **Admin → Network Inventory**.

The first build downloads dependencies and Google Fonts, so it needs internet access. Allow a few minutes and enough Docker memory for a Next.js build (4 GB is a reasonable starting point). Subsequent starts reuse the image and volumes.

No `.env` file, manually created database, schema setup, or signing key is required. The entrypoint creates `nexus` and `nexus_test`, applies the additive schema, and generates a random session-signing key that persists with application data.

## Existing database and port conflicts

This setup uses a **new database inside the combined container**. It does not connect to, delete, or migrate your existing standalone database container. It does not publish port 5432, so your existing database can remain running. If you need existing data in this app, back up that database with `pg_dump` and explicitly restore it into the bundled database; do not reuse an arbitrary old PostgreSQL data volume across major versions.

If another app is using port 3000, create a `.env` file in the repository root containing:

```dotenv
NEXUS_PORT=3100
```

Then run the same Compose command and open **http://localhost:3100**. The browser talks to the backend through the frontend's `/backend` proxy, so no backend URL changes or port-8000 mapping are needed.

## Everyday commands

```sh
# Start/rebuild after pulling updates
docker compose up --build -d --wait

# Status and combined service logs
docker compose ps
docker compose logs -f nexus

# Stop the app, keeping both volumes
docker compose down

# Start an already-built image
docker compose up -d --wait

# Restart without losing accounts, incidents, or inventory
docker compose restart nexus

# Inspect the three supervised processes
docker compose exec nexus supervisorctl -c /app/docker/supervisord.conf status

# Open the internal database shell
docker compose exec nexus psql -h 127.0.0.1 -U nexus -d nexus

# Run backend tests against the isolated test database
docker compose exec -w /app/backend -e DATABASE_URL=postgresql://nexus@127.0.0.1:5432/nexus_test nexus /opt/venv/bin/python -m pytest -q
```

Database records live in the `nexus-db` named volume. Accounts, notes, inventory, and the signing key live in `nexus-app`. These survive container recreation and `docker compose down`. **`docker compose down -v` deletes both volumes and all stored data**; use it only when deliberately resetting the demo.

For database backup:

```sh
docker compose exec -T nexus pg_dump -h 127.0.0.1 -U nexus -d nexus > nexus-backup.sql
```

Back up the `nexus-app` volume separately to preserve file-based accounts, notes, inventory, and the signing key. A database dump alone does not contain those files.

## Local access and deployment

The default published port binds to `127.0.0.1`, so the app is reachable only from your computer. PostgreSQL and FastAPI bind to loopback **inside** the container. All browser API requests use the same frontend origin.

Compose sets `NEXUS_COOKIE_SECURE=false` so login/logout works over local HTTP with the production frontend. For an HTTPS deployment, remove that override or set it to `true`, place the app behind your HTTPS proxy, and deliberately configure external access. Do not expose this local demo configuration unchanged to the public internet: the backend is an internal API and database authentication is trusted only within the container. Database and application processes run as unprivileged users; Supervisor runs as root to launch them.

A single-container image is convenient for this local demo. A production deployment should normally separate the database and application services so they can be secured, backed up, and scaled independently.

## Corporate proxy builds (optional)

Ordinary home Docker installations do not need this. If your organization inspects HTTPS, use your organization's trusted **public CA certificate**, keep certificate verification enabled, and forward the configured proxy build arguments. The Dockerfile accepts an optional BuildKit CA secret:

```sh
docker build --secret id=build_ca,src=/path/to/company-ca.crt --build-arg HTTP_PROXY --build-arg HTTPS_PROXY --build-arg http_proxy --build-arg https_proxy -t nexus:local .
docker compose up -d --wait
```

The CA file is a public trust anchor, not a private key. The build does not disable TLS checks or package checksums. If the proxy hostname is not resolvable inside Docker, configure Docker's DNS or a build-time host mapping for that hostname.
