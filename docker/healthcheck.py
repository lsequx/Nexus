import json
import urllib.request
import psycopg
import sys
sys.path.insert(0, "/app/backend")
from security import get_backend_key, database_url

with psycopg.connect(database_url(), connect_timeout=2) as connection:
    assert connection.execute("SELECT 1").fetchone()[0] == 1
with urllib.request.urlopen("http://127.0.0.1:8000/health", timeout=2) as response:
    assert json.load(response) == {"status": "ok"}
with urllib.request.urlopen("http://127.0.0.1:3000/backend/health", timeout=2) as response:
    assert json.load(response) == {"status": "ok"}
request = urllib.request.Request("http://127.0.0.1:8000/events", headers={"X-Nexus-Api-Key": get_backend_key()})
with urllib.request.urlopen(request, timeout=2) as response:
    assert isinstance(json.load(response), list)
