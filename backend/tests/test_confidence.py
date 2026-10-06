from utils.confidence import (
    calculate_confidence_score,
    get_confidence_label,
)


def test_topology_supported_with_one_evidence_scores_90():
    score = calculate_confidence_score(
        "topology_supported",
        1,
    )

    assert score == 90


def test_topology_supported_score_is_capped_at_100():
    score = calculate_confidence_score(
        "topology_supported",
        5,
    )

    assert score == 100


def test_repeated_device_evidence_with_one_supporting_event_scores_65():
    score = calculate_confidence_score(
        "priority_fallback",
        1,
    )

    assert score == 65


def test_repeated_device_evidence_bonus_is_capped():
    score = calculate_confidence_score(
        "priority_fallback",
        10,
    )

    assert score == 75


def test_unknown_reason_scores_zero():
    score = calculate_confidence_score(
        None,
        0,
    )

    assert score == 0


def test_high_confidence_label():
    assert get_confidence_label(90) == "High"


def test_medium_confidence_label():
    assert get_confidence_label(65) == "Medium"


def test_low_confidence_label():
    assert get_confidence_label(30) == "Low"


def test_zero_score_is_unknown():
    assert get_confidence_label(0) == "Unknown"
