from utils.topology import find_affected_devices


def test_finds_downstream_devices():
    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        },
        {
            "upstream_device_id": "dev-002",
            "downstream_device_id": "dev-004"
        }
    ]

    result = find_affected_devices("dev-001", dependencies)

    assert result == {
        "dev-002": 1,
        "dev-004": 2
    }


def test_finds_multiple_downstream_branches():
    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        },
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-003"
        }
    ]

    result = find_affected_devices("dev-001", dependencies)

    assert result == {
        "dev-002": 1,
        "dev-003": 1
    }


def test_returns_empty_when_no_downstream_devices():
    dependencies = [
        {
            "upstream_device_id": "dev-002",
            "downstream_device_id": "dev-003"
        }
    ]

    result = find_affected_devices("dev-001", dependencies)

    assert result == {}


def test_handles_empty_dependencies():
    result = find_affected_devices("dev-001", [])

    assert result == {}
