from database import get_device_dependencies
from utils.correlation import analyze_root_cause
from utils.topology import find_affected_devices


def detect_incident(group, dependencies=None):
    if dependencies is None:
        dependencies = get_device_dependencies()

    events = group["events"]

    analysis = analyze_root_cause(
        events,
        dependencies,
    )

    root_cause = analysis["root_cause"]

    if root_cause is None:
        return None

    if root_cause["severity"] != "Critical":
        return None

    # A single isolated Critical event is not enough
    # evidence when detection only has a priority fallback.
    if (
        len(events) == 1
        and analysis["reason"] == "priority_fallback"
    ):
        return None

    affected_devices = find_affected_devices(
        root_cause["device_id"],
        dependencies,
    )

    # Topology-supported analysis already tells us which
    # downstream events supported the root-cause decision.
    if analysis["reason"] == "topology_supported":
        evidence_events = analysis["evidence"]

    # For repeated same-device failures, preserve every
    # correlated event other than the root-cause event
    # as supporting evidence.
    elif analysis["reason"] == "priority_fallback":
        evidence_events = [
            event
            for event in events
            if event["id"] != root_cause["id"]
        ]

    else:
        evidence_events = []

    return {
        "title": (
            f"Network Incident - "
            f"{root_cause['device_id']}"
        ),
        "severity": root_cause["severity"],
        "root_cause_event_id": root_cause["id"],
        "device_id": root_cause["device_id"],
        "affected_devices": affected_devices,
        "root_cause_reason": analysis["reason"],
        "root_cause_evidence": [
            event["id"]
            for event in evidence_events
        ],
    }
