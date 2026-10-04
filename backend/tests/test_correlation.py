
from datetime import datetime, timedelta

from utils.correlation import correlate_events

from utils.correlation import correlate_events, find_root_cause


def create_event(device_id, minutes_after=0, event_type="high_latency"):
    return {
        "device_id": device_id,
        "type": event_type,
        "timestamp": datetime(2026, 10, 2, 10, 0, 0)
        + timedelta(minutes=minutes_after),
    }


def test_events_within_five_minutes_form_one_group():
    events = [
        create_event("dev-001", 0),
        create_event("dev-001", 3),
        create_event("dev-001", 5),
    ]

    result = correlate_events(events)

    assert len(result) == 1
    assert len(result[0]["events"]) == 3


def test_events_more_than_five_minutes_apart_form_separate_groups():
    events = [
        create_event("dev-001", 0),
        create_event("dev-001", 6),
    ]

    result = correlate_events(events)

    assert len(result) == 2


def test_events_from_different_devices_form_separate_groups():
    events = [
        create_event("dev-001", 0),
        create_event("dev-002", 1),
    ]

    result = correlate_events(events)

    assert len(result) == 2


def test_empty_event_list_returns_no_groups():
    result = correlate_events([])

    assert result == []

def test_root_cause_follows_priority_order():
    events = [
        create_event("dev-001", event_type="high_latency"),
        create_event("dev-001", event_type="interface_down"),
        create_event("dev-001", event_type="packet_loss"),
    ]

    result = find_root_cause(events)

    assert result["type"] == "interface_down"


def test_root_cause_returns_none_when_no_matching_event_exists():
    events = [
        create_event("dev-001", event_type="high_cpu"),
        create_event("dev-002", event_type="high_memory"),
    ]

    result = find_root_cause(events)

    assert result is None


def test_root_cause_returns_none_for_empty_events():
    result = find_root_cause([])

    assert result is None
