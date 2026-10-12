from fastapi.testclient import TestClient
from main import app
from security import get_backend_key


def test_backend_requires_authentication_for_data_and_mutations():
    with TestClient(app) as client:
        for method, path in [("GET", "/events"), ("GET", "/incidents"), ("GET", "/topology/dependencies"), ("POST", "/events"), ("PATCH", "/incidents/anything"), ("GET", "/openapi.json")]:
            assert client.request(method, path).status_code == 401
        assert client.get("/events", headers={"X-Nexus-Api-Key": "wrong"}).status_code == 401
        assert client.get("/health").json() == {"status": "ok"}


def test_valid_internal_key_and_bounded_event_fields():
    with TestClient(app, headers={"X-Nexus-Api-Key": get_backend_key()}) as client:
        assert client.get("/events").status_code == 200
        assert client.post("/events", json={"device_id": "x" * 129, "type": "interface_down", "severity": "Critical"}).status_code == 422
        assert client.post("/events", json={"device_id": "dev-001", "type": "arbitrary", "severity": "Critical"}).status_code == 422
        assert client.post("/incidents", json={"title": "x" * 257, "severity": "Critical"}).status_code == 422


def test_key_generation_persists_and_uses_private_permissions(monkeypatch, tmp_path):
    monkeypatch.delenv("NEXUS_BACKEND_KEY")
    monkeypatch.setenv("NEXUS_DATA_DIR", str(tmp_path))
    key = get_backend_key()
    assert len(key) >= 32
    assert get_backend_key() == key
    assert (tmp_path / "backend-key").stat().st_mode & 0o777 == 0o600


def test_owner_password_reset_revokes_sessions_and_preserves_account(monkeypatch, tmp_path):
    import importlib.util
    import json
    import hashlib
    from pathlib import Path
    module_path = Path(__file__).resolve().parents[2] / "docker" / "manage-user.py"
    spec = importlib.util.spec_from_file_location("manage_user", module_path)
    manager = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(manager)
    monkeypatch.setenv("NEXUS_DATA_DIR", str(tmp_path))
    manager.update_user("create-admin", "admin@example.invalid", name="Test Admin", password="original-test-password")
    before = json.loads((tmp_path / "users.json").read_text())[0]
    manager.update_user("reset-password", "admin@example.invalid", password="replacement-test-password")
    after = json.loads((tmp_path / "users.json").read_text())[0]
    assert after["id"] == before["id"]
    assert after["sessionVersion"] == before["sessionVersion"] + 1
    assert after["passwordHash"] != before["passwordHash"]
    computed = hashlib.scrypt(b"replacement-test-password", salt=after["passwordSalt"].encode(), n=16384, r=8, p=1, dklen=64).hex()
    assert after["passwordHash"] == computed
