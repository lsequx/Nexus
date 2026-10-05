import os

import pytest
from dotenv import load_dotenv


load_dotenv(".env.test", override=True)

if not os.getenv("DATABASE_URL", "").endswith("/nexus_test"):
    raise RuntimeError(
        "Tests must run against the nexus_test database."
    )


from database import connection


@pytest.fixture
def cleanup_test_data():
    yield

    with connection.cursor() as cursor:
        cursor.execute(
            """
            DELETE FROM incident_status_history
            WHERE incident_id LIKE 'test-%'
            """
        )

        cursor.execute(
            """
            DELETE FROM incident_history
            WHERE incident_id LIKE 'test-%'
            """
        )

        cursor.execute(
            """
            DELETE FROM incidents
            WHERE id LIKE 'test-%'
            """
        )

        cursor.execute(
            """
            DELETE FROM events
            WHERE id LIKE 'test-%'
            """
        )

        cursor.execute(
            """
            DELETE FROM device_dependencies
            WHERE upstream_device_id LIKE 'test-%'
               OR downstream_device_id LIKE 'test-%'
            """
        )

        cursor.execute(
            """
            DELETE FROM devices
            WHERE id LIKE 'test-%'
            """
        )

    connection.commit()
