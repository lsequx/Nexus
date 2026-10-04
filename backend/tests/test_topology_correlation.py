from datetime import datetime, timedelta

from utils.correlation import (
    correlate_events_across_devices,
    find_root_cause,
    analyze_root_cause
)


def test_correlates_events_from_connected_devices():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    result = correlate_events_across_devices(events, dependencies)

    assert len(result) == 1
    assert len(result[0]["events"]) == 2
    assert result[0]["device_ids"] == ["dev-001", "dev-002"]

def test_correlates_events_from_indirectly_connected_devices():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-004",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

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

    result = correlate_events_across_devices(events, dependencies)

    assert len(result) == 1
    assert len(result[0]["events"]) == 2
    assert result[0]["device_ids"] == ["dev-001", "dev-004"]


def test_does_not_correlate_unconnected_devices():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    result = correlate_events_across_devices(events, dependencies)

    assert result == []

def test_does_not_correlate_events_outside_time_window():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=6)
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    result = correlate_events_across_devices(events, dependencies)

    assert result == []

def test_correlates_chained_events_within_time_window():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=4)
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "high_latency",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=8)
        }
    ]

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

    result = correlate_events_across_devices(events, dependencies)

    assert len(result) == 1
    assert len(result[0]["events"]) == 3
    assert result[0]["device_ids"] == [
        "dev-001", "dev-002", "dev-004"
    ]

def test_does_not_correlate_downstream_event_that_occurs_first():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    result = correlate_events_across_devices(events, dependencies)

    assert result == []


def test_downstream_event_is_not_assigned_to_two_groups():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=1)
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004"
        },
        {
            "upstream_device_id": "dev-003",
            "downstream_device_id": "dev-004"
        }
    ]

    result = correlate_events_across_devices(events, dependencies)

    all_event_ids = [
        event["id"]
        for group in result
        for event in group["events"]
    ]

    assert all_event_ids.count("event-003") == 1


def test_root_cause_selection_prefers_upstream_event():
    from utils.correlation import find_root_cause

    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=2)
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time
        }
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"



def test_root_cause_selection_prefers_earliest_eligible_upstream_event():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004"
        },
        {
            "upstream_device_id": "dev-003",
            "downstream_device_id": "dev-004"
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-003",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=1)
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=3)
        }
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"

def test_root_cause_falls_back_to_event_priority_without_downstream_evidence():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004"
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-004",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=2)
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time
        }
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"


def test_analyze_root_cause_reports_topology_evidence():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=2)
        }
    ]

    result = analyze_root_cause(events, dependencies)

    assert result["root_cause"]["id"] == "event-001"
    assert result["reason"] == "topology_supported"
    assert result["evidence"][0]["id"] == "event-002"


def test_analyze_root_cause_reports_priority_fallback():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002"
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "high_latency",
            "timestamp": base_time
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=1)
        }
    ]

    result = analyze_root_cause(events, dependencies)

    assert result["root_cause"]["id"] == "event-002"
    assert result["reason"] == "priority_fallback"
    assert result["evidence"] == []

def test_analyze_root_cause_handles_empty_events():
    result = analyze_root_cause([], [])

    assert result["root_cause"] is None
    assert result["reason"] == "no_events"
    assert result["evidence"] == []

