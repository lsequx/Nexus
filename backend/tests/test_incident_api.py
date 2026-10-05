from fastapi.testclient import TestClient

from main import app

import uuid

from database import (
    connection,
    create_incident,
)


client = TestClient(app)


def test_patch_incident_returns_404_for_missing_incident(monkeypatch):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: None,
    )

    response = client.patch(
        "/incidents/missing-incident",
        json={"status": "Investigating"},
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Incident not found"
    }

def test_patch_incident_rejects_invalid_transition(monkeypatch):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: {
            "id": incident_id,
            "status": "Closed",
        },
    )

    response = client.patch(
        "/incidents/incident-001",
        json={"status": "Investigating"},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": "Invalid incident status transition"
    }

def test_patch_incident_updates_valid_transition(monkeypatch):
    incidents = iter([
        {
            "id": "incident-001",
            "status": "Open",
            "root_cause_device_id": None,
        },
        {
            "id": "incident-001",
            "status": "Investigating",
            "root_cause_device_id": None,
        },
    ])

    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: next(incidents),
    )

    called = {}

    def fake_update_incident_status(incident_id, old_status, new_status):
        called["incident_id"] = incident_id
        called["old_status"] = old_status
        called["new_status"] = new_status

    monkeypatch.setattr(
        "main.update_incident_status",
        fake_update_incident_status,
    )

    monkeypatch.setattr(
        "main.get_device_dependencies",
        lambda: [],
    )

    monkeypatch.setattr(
        "main.get_devices",
        lambda: [],
    )

    response = client.patch(
        "/incidents/incident-001",
        json={"status": "Investigating"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Investigating"

    assert called["incident_id"] == "incident-001"
    assert called["old_status"] == "Open"
    assert called["new_status"] == "Investigating"

def test_get_incident_history_returns_404_for_missing_incident(monkeypatch):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: None,
    )

    response = client.get(
        "/incidents/missing-incident/history"
    )

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Incident not found"
    }


def test_get_incident_history_returns_history(monkeypatch):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: {
            "id": incident_id,
            "status": "Investigating",
        },
    )

    monkeypatch.setattr(
        "main.get_incident_status_history",
        lambda incident_id: [
            {
                "id": "history-001",
                "incident_id": incident_id,
                "old_status": "Open",
                "new_status": "Investigating",
            }
        ],
    )

    response = client.get(
        "/incidents/incident-001/history"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["incident_id"] == "incident-001"
    assert data[0]["old_status"] == "Open"
    assert data[0]["new_status"] == "Investigating"


def test_patch_incident_updates_real_database(cleanup_test_data):
    incident_id = f"test-incident-{uuid.uuid4()}"

    incident = {
        "id": incident_id,
        "title": "API Integration Incident",
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": "priority_fallback",
        "root_cause_evidence": [],
    }

    create_incident(incident)

    response = client.patch(
        f"/incidents/{incident_id}",
        json={"status": "Investigating"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "Investigating"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT status
            FROM incidents
            WHERE id = %s
            """,
            (incident_id,),
        )

        incident_row = cursor.fetchone()

        cursor.execute(
            """
            SELECT old_status, new_status
            FROM incident_status_history
            WHERE incident_id = %s
            """,
            (incident_id,),
        )

        history_row = cursor.fetchone()

    assert incident_row is not None
    assert incident_row[0] == "Investigating"

    assert history_row is not None
    assert history_row[0] == "Open"
    assert history_row[1] == "Investigating"
