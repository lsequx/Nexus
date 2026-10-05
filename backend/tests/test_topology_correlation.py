from datetime import datetime, timedelta
from unittest.mock import patch

from utils.correlation import (
    correlate_events_across_devices,
    find_root_cause,
    analyze_root_cause,
)


def test_correlates_events_from_connected_devices():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
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
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-004",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        },
        {
            "upstream_device_id": "dev-002",
            "downstream_device_id": "dev-004",
        },
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
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
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
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=6),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
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
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=4),
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "high_latency",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=8),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        },
        {
            "upstream_device_id": "dev-002",
            "downstream_device_id": "dev-004",
        },
    ]

    result = correlate_events_across_devices(events, dependencies)

    assert len(result) == 1
    assert len(result[0]["events"]) == 3
    assert result[0]["device_ids"] == [
        "dev-001",
        "dev-002",
        "dev-004",
    ]


def test_does_not_correlate_downstream_event_that_occurs_first():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
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
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=1),
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004",
        },
        {
            "upstream_device_id": "dev-003",
            "downstream_device_id": "dev-004",
        },
    ]

    result = correlate_events_across_devices(events, dependencies)

    all_event_ids = [
        event["id"]
        for group in result
        for event in group["events"]
    ]

    assert all_event_ids.count("event-003") == 1


def test_root_cause_selection_prefers_upstream_event():
    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=2),
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time,
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        }
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"


def test_root_cause_selection_prefers_earliest_eligible_upstream_event():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004",
        },
        {
            "upstream_device_id": "dev-003",
            "downstream_device_id": "dev-004",
        },
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-003",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=1),
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time,
        },
        {
            "id": "event-003",
            "device_id": "dev-004",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=3),
        },
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"


def test_root_cause_falls_back_to_event_priority_without_downstream_evidence():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-004",
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-004",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=2),
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time,
        },
    ]

    root_cause = find_root_cause(events, dependencies)

    assert root_cause["id"] == "event-002"


def test_analyze_root_cause_reports_topology_evidence():
    base_time = datetime(2026, 1, 1, 10, 0, 0)

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "packet_loss",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=2),
        },
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
            "downstream_device_id": "dev-002",
        }
    ]

    events = [
        {
            "id": "event-001",
            "device_id": "dev-002",
            "type": "high_latency",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-003",
            "type": "interface_down",
            "timestamp": base_time + timedelta(minutes=1),
        },
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


def test_detected_incident_candidate_uses_topology_evidence():
    from main import get_detected_incident_candidates

    base_time = datetime(2026, 10, 2, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "packet_loss",
            "severity": "Warning",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        }
    ]

    candidates = get_detected_incident_candidates(
        events,
        dependencies,
    )

    assert len(candidates) == 1

    candidate = candidates[0]

    assert candidate["device_id"] == "dev-001"
    assert candidate["severity"] == "Critical"
    assert candidate["root_cause_event_id"] == "event-001"
    assert candidate["root_cause_reason"] == "topology_supported"
    assert candidate["root_cause_evidence"] == ["event-002"]
    assert "dev-002" in candidate["affected_devices"]


def test_single_critical_event_does_not_create_incident():
    from utils.incident_detection import detect_incident

    event = {
        "id": "event-001",
        "device_id": "dev-001",
        "type": "interface_down",
        "severity": "Critical",
        "timestamp": datetime(2026, 10, 5, 10, 0),
    }

    group = {
        "device_id": "dev-001",
        "events": [event],
    }

    result = detect_incident(group, [])

    assert result is None


def test_repeated_critical_events_on_same_device_create_incident():
    from utils.incident_detection import detect_incident

    base_time = datetime(2026, 10, 5, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time + timedelta(minutes=2),
        },
    ]

    group = {
        "device_id": "dev-001",
        "events": events,
    }

    result = detect_incident(group, [])

    assert result is not None
    assert result["device_id"] == "dev-001"
    assert result["severity"] == "Critical"
    assert result["root_cause_reason"] == "priority_fallback"


def test_topology_supported_events_create_single_incident_candidate():
    from main import get_detected_incident_candidates

    base_time = datetime(2026, 10, 5, 10, 0)

    events = [
        {
            "id": "event-001",
            "device_id": "dev-001",
            "type": "interface_down",
            "severity": "Critical",
            "timestamp": base_time,
        },
        {
            "id": "event-002",
            "device_id": "dev-002",
            "type": "device_unreachable",
            "severity": "Major",
            "timestamp": base_time + timedelta(minutes=1),
        },
    ]

    dependencies = [
        {
            "upstream_device_id": "dev-001",
            "downstream_device_id": "dev-002",
        }
    ]

    candidates = get_detected_incident_candidates(
        events,
        dependencies,
    )

    assert len(candidates) == 1

    candidate = candidates[0]

    assert candidate["device_id"] == "dev-001"
    assert candidate["root_cause_event_id"] == "event-001"
    assert candidate["root_cause_reason"] == "topology_supported"
    assert candidate["root_cause_evidence"] == ["event-002"]


def test_analyze_events_creates_incident_and_history():
    from main import analyze_events_and_create_incidents

    candidate = {
        "title": "Network Incident - dev-001",
        "severity": "Critical",
        "device_id": "dev-001",
        "root_cause_event_id": "event-001",
        "affected_devices": {"dev-002": 1},
        "root_cause_reason": "topology_supported",
        "root_cause_evidence": ["event-002"],
    }

    created_incident = {
        "id": "incident-001",
        "title": candidate["title"],
        "severity": candidate["severity"],
        "root_cause_event_id": candidate["root_cause_event_id"],
        "root_cause_reason": candidate["root_cause_reason"],
        "root_cause_evidence": candidate["root_cause_evidence"],
    }

    with (
        patch(
            "main.get_events",
            return_value=[{"id": "event-001"}],
        ),
        patch(
            "main.get_device_dependencies",
            return_value=[],
        ),
        patch(
            "main.get_detected_incident_candidates",
            return_value=[candidate],
        ),
        patch(
            "main.get_active_incident_by_device",
            return_value=None,
        ),
        patch(
            "main.create_incident",
            return_value=created_incident,
        ) as mock_create,
        patch(
            "main.create_incident_history",
        ) as mock_history,
    ):
        result = analyze_events_and_create_incidents()

    assert len(result) == 1
    assert result[0]["id"] == "incident-001"
    assert result[0]["affected_devices"] == {"dev-002": 1}

    mock_create.assert_called_once()
    mock_history.assert_called_once()

    history_record = mock_history.call_args.args[0]

    assert history_record["incident_id"] == "incident-001"
    assert history_record["change_type"] == "INCIDENT_CREATED"
    assert history_record["root_cause_event_id"] == "event-001"


def test_analyze_events_upgrades_existing_incident_assessment():
    from main import analyze_events_and_create_incidents

    candidate = {
        "title": "Network Incident - dev-001",
        "severity": "Critical",
        "device_id": "dev-001",
        "root_cause_event_id": "event-001",
        "affected_devices": {"dev-002": 1},
        "root_cause_reason": "topology_supported",
        "root_cause_evidence": ["event-002"],
    }

    existing_incident = {
        "id": "incident-001",
        "device_id": "dev-001",
        "severity": "Critical",
        "root_cause_reason": "priority_fallback",
    }

    updated_incident = {
        **existing_incident,
        "root_cause_reason": "topology_supported",
        "root_cause_event_id": "event-001",
        "root_cause_evidence": ["event-002"],
    }

    with (
        patch(
            "main.get_events",
            return_value=[],
        ),
        patch(
            "main.get_device_dependencies",
            return_value=[],
        ),
        patch(
            "main.get_detected_incident_candidates",
            return_value=[candidate],
        ),
        patch(
            "main.get_active_incident_by_device",
            return_value=existing_incident,
        ),
        patch(
            "main.update_incident_assessment",
            return_value=updated_incident,
        ) as mock_update,
        patch(
            "main.create_incident_history",
        ) as mock_history,
        patch(
            "main.create_incident",
        ) as mock_create,
    ):
        result = analyze_events_and_create_incidents()

    mock_update.assert_called_once_with(
        "incident-001",
        candidate,
    )

    mock_create.assert_not_called()
    mock_history.assert_called_once()

    history_record = mock_history.call_args.args[0]

    assert history_record["change_type"] == "ROOT_CAUSE_UPDATED"
    assert history_record["incident_id"] == "incident-001"

    assert len(result) == 1
    assert result[0]["root_cause_reason"] == "topology_supported"
    assert result[0]["affected_devices"] == {"dev-002": 1}
