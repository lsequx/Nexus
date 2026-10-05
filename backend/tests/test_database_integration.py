import uuid

from database import (
    connection,
    create_incident,
    create_incident_history,
    update_incident_status
)


def test_create_incident_persists_to_test_database(cleanup_test_data):
    incident_id = f"test-incident-{uuid.uuid4()}"

    incident = {
        "id": incident_id,
        "title": "Integration Test Incident",
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": "priority_fallback",
        "root_cause_evidence": [],
    }

    created = create_incident(incident)

    assert created["id"] == incident_id
    assert created["title"] == "Integration Test Incident"
    assert created["severity"] == "Critical"
    assert created["status"] == "Open"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT id, title, severity, status
            FROM incidents
            WHERE id = %s
            """,
            (incident_id,),
        )

        row = cursor.fetchone()

    assert row is not None
    assert row[0] == incident_id
    assert row[1] == "Integration Test Incident"
    assert row[2] == "Critical"
    assert row[3] == "Open"

def test_database_connection_uses_nexus_test():
    with connection.cursor() as cursor:
        cursor.execute("SELECT current_database()")
        database_name = cursor.fetchone()[0]

    assert database_name == "nexus_test"


def test_create_incident_history_persists_to_test_database(cleanup_test_data):
    incident_id = f"test-incident-{uuid.uuid4()}"
    history_id = f"test-history-{uuid.uuid4()}"

    incident = {
        "id": incident_id,
        "title": "Integration Test Incident",
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": "priority_fallback",
        "root_cause_evidence": [],
    }

    create_incident(incident)

    history = {
        "id": history_id,
        "incident_id": incident_id,
        "change_type": "INCIDENT_CREATED",
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": "priority_fallback",
        "root_cause_evidence": [],
    }

    created_history = create_incident_history(history)

    assert created_history["id"] == history_id
    assert created_history["incident_id"] == incident_id
    assert created_history["change_type"] == "INCIDENT_CREATED"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                id,
                incident_id,
                change_type,
                severity,
                root_cause_reason
            FROM incident_history
            WHERE id = %s
            """,
            (history_id,),
        )

        row = cursor.fetchone()

    assert row is not None
    assert row[0] == history_id
    assert row[1] == incident_id
    assert row[2] == "INCIDENT_CREATED"
    assert row[3] == "Critical"
    assert row[4] == "priority_fallback"

def test_update_incident_status_persists_history(cleanup_test_data):
    incident_id = f"test-incident-{uuid.uuid4()}"

    incident = {
        "id": incident_id,
        "title": "Status Integration Test",
        "severity": "Critical",
        "root_cause_event_id": None,
        "root_cause_reason": "priority_fallback",
        "root_cause_evidence": [],
    }

    create_incident(incident)

    updated = update_incident_status(
        incident_id,
        "Open",
        "Investigating",
    )

    assert updated["status"] == "Investigating"

    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT old_status, new_status
            FROM incident_status_history
            WHERE incident_id = %s
            """,
            (incident_id,),
        )

        history_row = cursor.fetchone()

    assert history_row is not None
    assert history_row[0] == "Open"
    assert history_row[1] == "Investigating"
