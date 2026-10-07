from utils.confidence import (
    calculate_confidence_breakdown,
    calculate_confidence_score,
    get_confidence_label,
)


def test_topology_supported_major_direct_evidence_scores_88():
    score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Major",
            }
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            }
        ],
    )

    assert score == 88


def test_repeated_critical_event_scores_62():
    score = calculate_confidence_score(
        "priority_fallback",
        [
            {
                "device_id": "dev-003",
                "severity": "Critical",
            }
        ],
        [],
    )

    assert score == 62


def test_critical_evidence_has_more_weight_than_major():
    critical_score = calculate_confidence_score(
        "priority_fallback",
        [
            {
                "device_id": "dev-003",
                "severity": "Critical",
            }
        ],
        [],
    )

    major_score = calculate_confidence_score(
        "priority_fallback",
        [
            {
                "device_id": "dev-003",
                "severity": "Major",
            }
        ],
        [],
    )

    assert critical_score > major_score


def test_multiple_distinct_devices_increase_confidence():
    one_device_score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Major",
            }
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            }
        ],
    )

    two_device_score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Major",
            },
            {
                "device_id": "dev-003",
                "severity": "Major",
            },
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            },
            {
                "device_id": "dev-003",
                "depth": 1,
            },
        ],
    )

    assert two_device_score > one_device_score


def test_direct_topology_evidence_scores_more_than_indirect():
    direct_score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Major",
            }
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            }
        ],
    )

    indirect_score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-004",
                "severity": "Major",
            }
        ],
        [
            {
                "device_id": "dev-004",
                "depth": 2,
            }
        ],
    )

    assert direct_score > indirect_score


def test_severity_bonus_is_capped():
    score = calculate_confidence_score(
        "priority_fallback",
        [
            {
                "device_id": "dev-001",
                "severity": "Critical",
            },
            {
                "device_id": "dev-001",
                "severity": "Critical",
            },
            {
                "device_id": "dev-001",
                "severity": "Critical",
            },
            {
                "device_id": "dev-001",
                "severity": "Critical",
            },
        ],
        [],
    )

    assert score == 74


def test_diversity_bonus_is_capped():
    score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Minor",
            },
            {
                "device_id": "dev-003",
                "severity": "Minor",
            },
            {
                "device_id": "dev-004",
                "severity": "Minor",
            },
        ],
        [],
    )

    assert score == 87


def test_final_score_is_capped_at_100():
    score = calculate_confidence_score(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Critical",
            },
            {
                "device_id": "dev-003",
                "severity": "Critical",
            },
            {
                "device_id": "dev-004",
                "severity": "Critical",
            },
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            },
            {
                "device_id": "dev-003",
                "depth": 1,
            },
            {
                "device_id": "dev-004",
                "depth": 2,
            },
        ],
    )

    assert score == 100


def test_unknown_reason_scores_zero():
    score = calculate_confidence_score(
        None,
        [],
        [],
    )

    assert score == 0


def test_high_confidence_label():
    assert get_confidence_label(88) == "High"


def test_medium_confidence_label():
    assert get_confidence_label(62) == "Medium"


def test_low_confidence_label():
    assert get_confidence_label(40) == "Low"


def test_zero_score_is_unknown():
    assert get_confidence_label(0) == "Unknown"


# ---------------------------------------------------------
# Confidence breakdown tests
# ---------------------------------------------------------


def test_topology_confidence_breakdown():
    breakdown = calculate_confidence_breakdown(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Major",
            }
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            }
        ],
    )

    assert breakdown == {
        "base_score": 65,
        "severity_bonus": 8,
        "diversity_bonus": 5,
        "topology_bonus": 10,
        "final_score": 88,
    }


def test_repeated_device_confidence_breakdown():
    breakdown = calculate_confidence_breakdown(
        "priority_fallback",
        [
            {
                "device_id": "dev-003",
                "severity": "Critical",
            }
        ],
        [],
    )

    assert breakdown == {
        "base_score": 45,
        "severity_bonus": 12,
        "diversity_bonus": 5,
        "topology_bonus": 0,
        "final_score": 62,
    }


def test_unknown_reason_breakdown_is_zero():
    breakdown = calculate_confidence_breakdown(
        None,
        [],
        [],
    )

    assert breakdown == {
        "base_score": 0,
        "severity_bonus": 0,
        "diversity_bonus": 0,
        "topology_bonus": 0,
        "final_score": 0,
    }


def test_breakdown_final_score_is_capped_at_100():
    breakdown = calculate_confidence_breakdown(
        "topology_supported",
        [
            {
                "device_id": "dev-002",
                "severity": "Critical",
            },
            {
                "device_id": "dev-003",
                "severity": "Critical",
            },
            {
                "device_id": "dev-004",
                "severity": "Critical",
            },
        ],
        [
            {
                "device_id": "dev-002",
                "depth": 1,
            },
            {
                "device_id": "dev-003",
                "depth": 1,
            },
        ],
    )

    assert breakdown["final_score"] == 100
