SEVERITY_WEIGHTS = {
    "Critical": 12,
    "Major": 8,
    "Minor": 4,
}

MAX_SEVERITY_BONUS = 24
MAX_DIVERSITY_BONUS = 10


def calculate_confidence_breakdown(
    root_cause_reason,
    evidence_events,
    observed_affected_devices,
):
    if root_cause_reason == "topology_supported":
        base_score = 65

    elif root_cause_reason == "priority_fallback":
        base_score = 45

    else:
        return {
            "base_score": 0,
            "severity_bonus": 0,
            "diversity_bonus": 0,
            "topology_bonus": 0,
            "final_score": 0,
        }

    # -----------------------------------------------------
    # Evidence severity bonus
    # -----------------------------------------------------

    severity_bonus = sum(
        SEVERITY_WEIGHTS.get(
            event.get("severity"),
            0,
        )
        for event in evidence_events
    )

    severity_bonus = min(
        severity_bonus,
        MAX_SEVERITY_BONUS,
    )

    # -----------------------------------------------------
    # Evidence diversity bonus
    # -----------------------------------------------------

    distinct_devices = {
        event.get("device_id")
        for event in evidence_events
        if event.get("device_id") is not None
    }

    diversity_bonus = min(
        len(distinct_devices) * 5,
        MAX_DIVERSITY_BONUS,
    )

    # -----------------------------------------------------
    # Topology strength bonus
    # -----------------------------------------------------

    topology_bonus = 0

    if (
        root_cause_reason == "topology_supported"
        and observed_affected_devices
    ):
        depths = [
            device["depth"]
            for device in observed_affected_devices
        ]

        if any(depth == 1 for depth in depths):
            topology_bonus = 10

        elif any(depth > 1 for depth in depths):
            topology_bonus = 5

    # -----------------------------------------------------
    # Final score
    # -----------------------------------------------------

    final_score = min(
        (
            base_score
            + severity_bonus
            + diversity_bonus
            + topology_bonus
        ),
        100,
    )

    return {
        "base_score": base_score,
        "severity_bonus": severity_bonus,
        "diversity_bonus": diversity_bonus,
        "topology_bonus": topology_bonus,
        "final_score": final_score,
    }


def calculate_confidence_score(
    root_cause_reason,
    evidence_events,
    observed_affected_devices,
):
    breakdown = calculate_confidence_breakdown(
        root_cause_reason,
        evidence_events,
        observed_affected_devices,
    )

    return breakdown["final_score"]


def get_confidence_label(score):
    if score >= 80:
        return "High"

    if score >= 50:
        return "Medium"

    if score > 0:
        return "Low"

    return "Unknown"
