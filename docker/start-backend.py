"""Wait for supervised PostgreSQL before importing FastAPI's database module."""
import os
import time
import psycopg

for attempt in range(60):
    try:
        with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=2) as connection:
            connection.execute("SELECT 1")
        break
    except psycopg.OperationalError:
        time.sleep(1)
else:
    raise SystemExit("PostgreSQL did not become ready within 60 seconds")
os.execv("/opt/venv/bin/uvicorn", ["uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"])
