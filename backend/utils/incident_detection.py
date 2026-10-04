
from database import get_device_dependencies
from utils.correlation import analyze_root_cause
from utils.topology import find_affected_devices


def detect_incident(group):
    dependencies = get_device_dependencies()

    analysis = analyze_root_cause(
        group["events"],
        dependencies
    )

    root_cause = analysis["root_cause"]

    if root_cause is None:
        return None

    if root_cause["severity"] != "Critical":
        return None

    affected_devices = find_affected_devices(
        root_cause["device_id"],
        dependencies
    )

    return {
        "title": f"Network Incident - {root_cause['device_id']}",
        "severity": root_cause["severity"],
        "root_cause_event_id": root_cause["id"],
        "device_id": root_cause["device_id"],
        "affected_devices": affected_devices,
        "root_cause_reason": analysis["reason"],
        "root_cause_evidence": [
            event["id"] for event in analysis["evidence"]
        ]
    }
