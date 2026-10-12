import json
import os
import urllib.request
import psycopg

with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=2) as connection:
    assert connection.execute("SELECT 1").fetchone()[0] == 1
with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2) as response:
    assert json.load(response) == {"status": "ok"}
with urllib.request.urlopen("http://127.0.0.1:3000/backend/health", timeout=2) as response:
    assert json.load(response) == {"status": "ok"}
with urllib.request.urlopen("http://127.0.0.1:3000/backend/events", timeout=2) as response:
    assert isinstance(json.load(response), list)
