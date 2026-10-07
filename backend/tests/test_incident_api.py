from fastapi.testclient import TestClient

from main import app

import uuid

from database import (
    connection,
    create_incident,
)


client = TestClient(app)


def test_patch_incident_returns_404_for_missing_incident(
    monkeypatch,
):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: None,
    )

    response = client.patch(
        "/incidents/missing-incident",
        json={
            "status": "Investigating",
        },
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Incident not found",
    }


def test_patch_incident_rejects_invalid_transition(
    monkeypatch,
):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: {
            "id": incident_id,
            "status": "Closed",
        },
    )

    response = client.patch(
        "/incidents/incident-001",
        json={
            "status": "Investigating",
        },
    )

    assert response.status_code == 400

    assert response.json() == {
        "detail": (
            "Invalid incident status transition"
        ),
    }


def test_patch_incident_updates_valid_transition(
    monkeypatch,
):
    incidents = iter(
        [
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
        ]
    )

    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: next(
            incidents
        ),
    )

    called = {}

    def fake_update_incident_status(
        incident_id,
        old_status,
        new_status,
    ):
        called["incident_id"] = (
            incident_id
        )

        called["old_status"] = (
            old_status
        )

        called["new_status"] = (
            new_status
        )

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
        json={
            "status": "Investigating",
        },
    )

    assert response.status_code == 200

    assert (
        response.json()["status"]
        == "Investigating"
    )

    assert (
        called["incident_id"]
        == "incident-001"
    )

    assert (
        called["old_status"]
        == "Open"
    )

    assert (
        called["new_status"]
        == "Investigating"
    )


def test_get_incident_history_returns_404_for_missing_incident(
    monkeypatch,
):
    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda incident_id: None,
    )

    response = client.get(
        "/incidents/missing-incident/history"
    )

    assert response.status_code == 404

    assert response.json() == {
        "detail": "Incident not found",
    }


def test_get_incident_history_returns_history(
    monkeypatch,
):
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
                "incident_id": (
                    incident_id
                ),
                "old_status": "Open",
                "new_status": (
                    "Investigating"
                ),
            }
        ],
    )

    response = client.get(
        "/incidents/incident-001/history"
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1

    assert (
        data[0]["incident_id"]
        == "incident-001"
    )

    assert (
        data[0]["old_status"]
        == "Open"
    )

    assert (
        data[0]["new_status"]
        == "Investigating"
    )


def test_patch_incident_updates_real_database(
    cleanup_test_data,
):
    incident_id = (
        f"test-incident-{uuid.uuid4()}"
    )

    incident = {
        "id": incident_id,
        "title": (
            "API Integration Incident"
        ),
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": (
            "priority_fallback"
        ),
        "root_cause_evidence": [],
    }

    create_incident(
        incident
    )

    response = client.patch(
        f"/incidents/{incident_id}",
        json={
            "status": "Investigating",
        },
    )

    assert response.status_code == 200

    assert (
        response.json()["status"]
        == "Investigating"
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT status
            FROM incidents
            WHERE id = %s
            """,
            (
                incident_id,
            ),
        )

        incident_row = (
            cursor.fetchone()
        )

        cursor.execute(
            """
            SELECT
                old_status,
                new_status
            FROM incident_status_history
            WHERE incident_id = %s
            """,
            (
                incident_id,
            ),
        )

        history_row = (
            cursor.fetchone()
        )

    assert (
        incident_row
        is not None
    )

    assert (
        incident_row[0]
        == "Investigating"
    )

    assert (
        history_row
        is not None
    )

    assert (
        history_row[0]
        == "Open"
    )

    assert (
        history_row[1]
        == "Investigating"
    )


def test_incident_analysis_history_returns_assessments_in_order():
    from database import (
        create_incident,
        create_incident_history,
        get_incident_analysis_history,
    )

    incident_id = (
        "test-analysis-history-incident"
    )

    create_incident(
        {
            "id": incident_id,
            "title": "Test Incident",
            "severity": "Critical",
            "root_cause_event_id": None,
            "root_cause_reason": None,
            "root_cause_evidence": [],
        }
    )

    create_incident_history(
        {
            "id": "test-history-1",
            "incident_id": (
                incident_id
            ),
            "change_type": (
                "INCIDENT_CREATED"
            ),
            "severity": "Critical",
            "root_cause_event_id": None,
            "root_cause_reason": (
                "priority_fallback"
            ),
            "root_cause_evidence": [],
        }
    )

    create_incident_history(
        {
            "id": "test-history-2",
            "incident_id": (
                incident_id
            ),
            "change_type": (
                "ROOT_CAUSE_UPDATED"
            ),
            "severity": "Critical",
            "root_cause_event_id": None,
            "root_cause_reason": (
                "topology_supported"
            ),
            "root_cause_evidence": [],
        }
    )

    history = (
        get_incident_analysis_history(
            incident_id
        )
    )

    assert len(history) == 2

    assert (
        history[0]["change_type"]
        == "INCIDENT_CREATED"
    )

    assert (
        history[0][
            "root_cause_reason"
        ]
        == "priority_fallback"
    )

    assert (
        history[1]["change_type"]
        == "ROOT_CAUSE_UPDATED"
    )

    assert (
        history[1][
            "root_cause_reason"
        ]
        == "topology_supported"
    )


def test_analysis_history_endpoint_returns_scored_assessments(
    monkeypatch,
):
    incident_id = (
        "test-analysis-endpoint-incident"
    )

    root_event_id = (
        "test-analysis-root-event"
    )

    repeated_event_id = (
        "test-analysis-repeat-event"
    )

    # -----------------------------------------------------
    # Existing incident
    # -----------------------------------------------------

    monkeypatch.setattr(
        "main.get_incident_by_id",
        lambda requested_incident_id: {
            "id": requested_incident_id,
            "status": "Open",
        },
    )

    # -----------------------------------------------------
    # Historical assessment
    # -----------------------------------------------------

    monkeypatch.setattr(
        "main.get_incident_analysis_history",
        lambda requested_incident_id: [
            {
                "id": (
                    "test-analysis-history"
                ),
                "incident_id": (
                    requested_incident_id
                ),
                "change_type": (
                    "INCIDENT_CREATED"
                ),
                "severity": "Critical",
                "root_cause_event_id": (
                    root_event_id
                ),
                "root_cause_reason": (
                    "priority_fallback"
                ),
                "root_cause_evidence": [
                    repeated_event_id
                ],
                "created_at": (
                    "2026-10-06T10:00:00"
                ),
            }
        ],
    )

    # -----------------------------------------------------
    # Test topology
    #
    # No downstream dependency is needed for the initial
    # repeated-device assessment.
    # -----------------------------------------------------

    monkeypatch.setattr(
        "main.get_device_dependencies",
        lambda: [],
    )

    # -----------------------------------------------------
    # Device inventory
    # -----------------------------------------------------

    monkeypatch.setattr(
        "main.get_devices",
        lambda: [
            {
                "id": "dev-001",
                "name": "router-01",
            }
        ],
    )

    # -----------------------------------------------------
    # Historical events
    #
    # The first event is the selected root cause.
    # The second event is supporting repeated evidence.
    # -----------------------------------------------------

    monkeypatch.setattr(
        "main.get_events",
        lambda: [
            {
                "id": root_event_id,
                "device_id": "dev-001",
                "device": "router-01",
                "type": "interface_down",
                "severity": "Critical",
                "timestamp": (
                    "2026-10-06T09:59:00"
                ),
            },
            {
                "id": repeated_event_id,
                "device_id": "dev-001",
                "device": "router-01",
                "type": "interface_down",
                "severity": "Critical",
                "timestamp": (
                    "2026-10-06T10:00:00"
                ),
            },
        ],
    )

    response = client.get(
        (
            f"/incidents/"
            f"{incident_id}/"
            f"analysis-history"
        )
    )

    assert (
        response.status_code
        == 200
    )

    history = response.json()

    assert len(history) == 1

    assessment = history[0]

    assert (
        assessment[
            "change_type"
        ]
        == "INCIDENT_CREATED"
    )

    assert (
        assessment[
            "detection_reason"
        ]
        == "Repeated Device Evidence"
    )

    assert (
        assessment[
            "confidence"
        ]
        == "Medium"
    )

    assert (
        assessment[
            "confidence_score"
        ]
        == 62
    )

    assert (
        assessment[
            "confidence_breakdown"
        ]
        == {
            "base_score": 45,
            "severity_bonus": 12,
            "diversity_bonus": 5,
            "topology_bonus": 0,
        }
    )

    assert (
        assessment[
            "root_cause_device_id"
        ]
        == "dev-001"
    )

    assert (
        assessment[
            "root_cause_device"
        ]
        == "router-01"
    )

    assert (
        assessment[
            "root_cause_type"
        ]
        == "interface_down"
    )

    assert (
        assessment[
            "root_cause_severity"
        ]
        == "Critical"
    )

    assert (
        assessment[
            "evidence_count"
        ]
        == 1
    )

    assert len(
        assessment[
            "evidence_events"
        ]
    ) == 1

    assert (
        assessment[
            "evidence_events"
        ][0]["id"]
        == repeated_event_id
    )

    assert (
        assessment[
            "observed_affected_devices"
        ]
        == []
    )
