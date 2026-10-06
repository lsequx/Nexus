def calculate_confidence_score(
    root_cause_reason,
    evidence_count,
):
    if root_cause_reason == "topology_supported":
        base_score = 80

    elif root_cause_reason == "priority_fallback":
        base_score = 55

    else:
        return 0

    evidence_bonus = min(
        evidence_count * 10,
        20,
    )

    return min(
        base_score + evidence_bonus,
        100,
    )


def get_confidence_label(score):
    if score >= 80:
        return "High"

    if score >= 50:
        return "Medium"

    if score > 0:
        return "Low"

    return "Unknown"
