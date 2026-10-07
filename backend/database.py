import os
from dotenv import load_dotenv
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import uuid

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

connection = psycopg.connect(DATABASE_URL)

def get_events():
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute("""
            SELECT
                events.id,
                events.device_id,
                devices.name AS device,
                events.type,
                events.severity,
                events.timestamp
            FROM events
            JOIN devices
                ON events.device_id = devices.id
            ORDER BY events.timestamp DESC
        """)
        events = cursor.fetchall()
        return events

def create_event(event):
    try:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(
                """
                INSERT INTO events (id, device_id, type, severity, timestamp)
                VALUES (%s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (
                    event["id"],
                    event["device_id"],
                    event["type"],
                    event["severity"],
                ),
            )

            cursor.execute(
                """
                SELECT
                    events.id,
                    devices.name AS device,
                    events.type,
                    events.severity,
                    events.timestamp
                FROM events
                JOIN devices
                    ON events.device_id = devices.id
                WHERE events.id = %s
                """,
                (event["id"],),
            )

            new_event = cursor.fetchone()

        connection.commit()

        return new_event

    except Exception:
        connection.rollback()
        raise



def get_incidents():
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                incidents.id,
                incidents.title,
                incidents.severity,
                incidents.status,
                incidents.created_at,
                incidents.root_cause_reason,
                incidents.root_cause_evidence,

                events.id AS root_cause_event_id,
                events.type AS root_cause_type,
                events.severity AS root_cause_severity,

                devices.id AS root_cause_device_id,
                devices.name AS root_cause_device

            FROM incidents

            LEFT JOIN events
                ON incidents.root_cause_event_id = events.id

            LEFT JOIN devices
                ON events.device_id = devices.id

            ORDER BY incidents.created_at DESC
            """
        )
        incidents = cursor.fetchall()
        return incidents


def create_incident(incident):
    query = """
        INSERT INTO incidents (
            id,
            title,
            severity,
            status,
            root_cause_event_id,
            root_cause_reason,
            root_cause_evidence
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """

    values = (
        incident["id"],
        incident["title"],
        incident["severity"],
        "Open",
        incident.get("root_cause_event_id"),
        incident.get("root_cause_reason"),
        Jsonb(incident.get("root_cause_evidence", []))
    )

    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, values)
        new_incident = cursor.fetchone()

    connection.commit()
    return new_incident

def create_incident_history(history):
    query = """
        INSERT INTO incident_history (
            id,
            incident_id,
            change_type,
            severity,
            root_cause_event_id,
            root_cause_reason,
            root_cause_evidence
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING *
    """
    values = (
        history["id"],
        history["incident_id"],
        history["change_type"],
        history["severity"],
        history.get("root_cause_event_id"),
        history.get("root_cause_reason"),
        Jsonb(history.get("root_cause_evidence", [])),
    )
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(query, values)
        history_record = cursor.fetchone()

    connection.commit()
    return history_record

def update_incident_assessment(incident_id, assessment):
    query = """
        UPDATE incidents
        SET
            severity = %s,
            root_cause_event_id = %s,
            root_cause_reason = %s,
            root_cause_evidence = %s
        WHERE id = %s
        RETURNING *
    """

    values = (
        assessment["severity"],
        assessment["root_cause_event_id"],
        assessment["root_cause_reason"],
        Jsonb(assessment.get("root_cause_evidence", [])),
        incident_id,
    )

    try:
        with connection.cursor(row_factory=dict_row) as cursor:
            cursor.execute(query, values)
            updated_incident = cursor.fetchone()

        connection.commit()
        return updated_incident

    except Exception:
        connection.rollback()
        raise

def update_incident_status(incident_id, old_status,new_status):
    try:
        with connection.cursor(row_factory=dict_row) as cursor:
                cursor.execute("""
                UPDATE incidents
                SET status = %s
                WHERE id = %s
                RETURNING *
                """,
                (new_status, incident_id),
                )
                updated_incident = cursor.fetchone()
                cursor.execute(
                    """
                    INSERT INTO incident_status_history(
                        id,
                        incident_id,
                        old_status,
                        new_status
                    )
                    VALUES (%s,%s,%s,%s)
                    """,
                    (
                        str(uuid.uuid4()),
                        incident_id,
                        old_status,
                        new_status,
                    ),
                )
                connection.commit()
                return updated_incident
    except Exception:
        connection.rollback()
        raise


def get_incident_by_id(incident_id):
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                incidents.id,
                incidents.title,
                incidents.severity,
                incidents.status,
                incidents.created_at,
                incidents.root_cause_reason,
                incidents.root_cause_evidence,

                events.id AS root_cause_event_id,
                events.type AS root_cause_type,
                events.severity AS root_cause_severity,

                devices.id AS root_cause_device_id,
                devices.name AS root_cause_device

            FROM incidents

            LEFT JOIN events
                ON incidents.root_cause_event_id = events.id

            LEFT JOIN devices
                ON events.device_id = devices.id

            WHERE incidents.id = %s
            """,
            (incident_id,),
        )

        return cursor.fetchone()


def get_incident_by_root_cause(root_cause_event_id):
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                id,
                title,
                severity,
                status,
                root_cause_event_id,
                created_at,
                root_cause_reason,
                root_cause_evidence
            FROM incidents
            WHERE root_cause_event_id = %s
            """,
            (root_cause_event_id,),
        )
        return cursor.fetchone()

def get_active_incident_by_device(device_id):
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                incidents.id,
                incidents.title,
                incidents.severity,
                incidents.status,
                incidents.root_cause_event_id,
                incidents.root_cause_reason,
                incidents.root_cause_evidence,
                incidents.created_at
            FROM incidents
            JOIN events
                ON incidents.root_cause_event_id = events.id
            WHERE events.device_id = %s
                AND incidents.status IN ('Open','Investigating')
            ORDER BY incidents.created_at DESC
            LIMIT 1
            """,
            (device_id,),
        )
        return cursor.fetchone()

def create_incident_status_history(incident_id,old_status,new_status):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            INSERT INTO incident_status_history (
                id,
                incident_id,
                old_status,
                new_status
            )
            VALUES (%s,%s,%s,%s)
            """,
            (
                str(uuid.uuid4()),
                incident_id,
                old_status,
                new_status,
            ),
        )
        connection.commit()

def get_incident_status_history(incident_id):
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                id,
                incident_id,
                old_status,
                new_status,
                changed_at
            FROM incident_status_history
            WHERE incident_id = %s
            ORDER BY changed_at ASC
            """,
            (incident_id,),
        )
        return cursor.fetchall()

def get_device_dependencies():
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT
                upstream.id AS upstream_device_id,
                upstream.name AS upstream_device,
                downstream.id AS downstream_device_id,
                downstream.name AS downstream_device
            FROM device_dependencies
            JOIN devices AS upstream
                ON device_dependencies.upstream_device_id = upstream.id
            JOIN devices AS downstream
                ON device_dependencies.downstream_device_id = downstream.id
            ORDER BY upstream.name, downstream.name
            """
        )
        dependencies = cursor.fetchall()
        return dependencies

def get_devices():
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT id, name
            FROM devices
            ORDER BY name
            """
        )
        return cursor.fetchall()

def get_incident_analysis_history(
    incident_id,
):
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT
                id,
                incident_id,
                change_type,
                severity,
                root_cause_event_id,
                root_cause_reason,
                root_cause_evidence,
                created_at
            FROM incident_history
            WHERE incident_id = %s
            ORDER BY created_at ASC
            """,
            (incident_id,),
        )

        rows = cursor.fetchall()

    return [
        {
            "id": row[0],
            "incident_id": row[1],
            "change_type": row[2],
            "severity": row[3],
            "root_cause_event_id": row[4],
            "root_cause_reason": row[5],
            "root_cause_evidence": (
                row[6] or []
            ),
            "created_at": row[7],
        }
        for row in rows
    ]







