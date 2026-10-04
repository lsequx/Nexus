from datetime import datetime, timedelta
from utils.topology import find_affected_devices

CORRELATION_WINDOW = timedelta(minutes=5)

ROOT_CAUSE_PRIORITY = [
    "interface_down",
    "device_unreachable",
    "packet_loss",
    "high_latency"
]

def correlate_events(events):
    groups = {}

    for event in events:
        device_id = event["device_id"]

        if device_id not in groups:
            groups[device_id] = []

        groups[device_id].append(event)

    correlated_groups = []

    for device_id, device_events in groups.items():
        device_events.sort(
            key=lambda event: event["timestamp"]
        )

        current_group = []

        for event in device_events:
            if not current_group:
                current_group.append(event)
                continue
            previous_event = current_group[-1]

            previous_time = previous_event["timestamp"]
            current_time = event["timestamp"]

            if current_time - previous_time <= CORRELATION_WINDOW:
                current_group.append(event)
            else:
                correlated_groups.append({
                    "device_id": device_id,
                    "events": current_group,
                })

                current_group = [event]

        if current_group:
            correlated_groups.append({
                "device_id": device_id,
                "events": current_group,
            })

    return correlated_groups


def analyze_root_cause(events, dependencies=None):
    if not events:
        return {
            "root_cause": None,
            "reason": "no_events",
            "evidence": []
        }

    if dependencies is None:
        dependencies = []

    sorted_events = sorted(
        events,
        key=lambda event: event["timestamp"]
    )

    for event in sorted_events:
        downstream_devices = find_affected_devices(
            event["device_id"],
            dependencies
        )

        for other_event in sorted_events:
            if other_event["device_id"] not in downstream_devices:
                continue

            time_difference = (
                other_event["timestamp"] - event["timestamp"]
            )

            if timedelta(0) <= time_difference <= CORRELATION_WINDOW:
                return {
                    "root_cause": event,
                    "reason": "topology_supported",
                    "evidence": [other_event]
                }

    for event_type in ROOT_CAUSE_PRIORITY:
        for event in sorted_events:
            if event["type"] == event_type:
                return {
                    "root_cause": event,
                    "reason": "priority_fallback",
                    "evidence": []
                }

    return {
        "root_cause": None,
        "reason": "no_matching_event",
        "evidence": []
    }

def find_root_cause(events, dependencies=None):
    if not events:
        return None

    if dependencies is None:
        dependencies = []

    sorted_events = sorted(
        events,
        key=lambda event: event["timestamp"]
    )

    for event in sorted_events:
        upstream_devices = find_affected_devices(
            event["device_id"],
            dependencies
        )

        for other_event in sorted_events:
            if other_event["device_id"] in upstream_devices:
                time_difference = (
                    other_event["timestamp"] - event["timestamp"]
                )

                if timedelta(0) <= time_difference <= CORRELATION_WINDOW:
                    return event

    for event_type in ROOT_CAUSE_PRIORITY:
        for event in sorted_events:
            if event["type"] == event_type:
                return event

    return None

def correlate_events_across_devices(events, dependencies):
    correlated_groups = []
    processed_events = set()

    sorted_events = sorted(
        events,
        key=lambda event: event["timestamp"]
    )

    for event in sorted_events:
        if event["id"] in processed_events:
            continue

        related_events = [event]
        processed_events.add(event["id"])

        i = 0

        while i < len(related_events):
            current_event = related_events[i]

            affected_devices = find_affected_devices(
                current_event["device_id"],
                dependencies
            )

            for other_event in sorted_events:
                if other_event["id"] in processed_events:
                    continue

                time_difference = (
                    other_event["timestamp"]
                    - current_event["timestamp"]
                )

                if time_difference < timedelta(0):
                    continue

                if time_difference > CORRELATION_WINDOW:
                    continue

                if other_event["device_id"] in affected_devices:
                    related_events.append(other_event)
                    processed_events.add(other_event["id"])

            i += 1

        if len(related_events) > 1:
            correlated_groups.append({
                "device_ids": list(dict.fromkeys(
                    item["device_id"] for item in related_events
                )),
                "events": related_events
            })

    return correlated_groups
