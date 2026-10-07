import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal

from database import (
    get_events,
    create_event,
    get_incidents,
    create_incident,
    create_incident_history,
    update_incident_status,
    get_incident_by_id,
    get_incident_status_history,
    get_active_incident_by_device,
    get_incident_analysis_history,
    get_device_dependencies,
    get_devices,
    update_incident_assessment,
)

from utils.correlation import (
    correlate_events,
    correlate_events_across_devices,
    find_root_cause,
)

from utils.incident import is_valid_incident_transition
from utils.incident_detection import detect_incident
from utils.topology import find_affected_devices

from utils.confidence import (
    calculate_confidence_breakdown,
    get_confidence_label,
)


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class EventCreate(BaseModel):
    device_id: str
    type: str
    severity: str


class IncidentCreate(BaseModel):
    title: str
    severity: str


class IncidentStatusUpdate(BaseModel):
    status: Literal[
        "Open",
        "Investigating",
        "Resolved",
        "Closed",
    ]


# ---------------------------------------------------------
# Incident candidate detection
# ---------------------------------------------------------

def get_detected_incident_candidates(
    events,
    dependencies,
):
    per_device_groups = correlate_events(events)

    cross_device_groups = (
        correlate_events_across_devices(
            events,
            dependencies,
        )
    )

    groups = (
        per_device_groups
        + cross_device_groups
    )

    candidates_by_root_event = {}

    for group in groups:
        candidate = detect_incident(
            group,
            dependencies,
        )

        if candidate is None:
            continue

        root_event_id = (
            candidate["root_cause_event_id"]
        )

        existing = (
            candidates_by_root_event.get(
                root_event_id,
            )
        )

        if (
            existing is None
            or (
                candidate[
                    "root_cause_reason"
                ]
                == "topology_supported"
                and existing[
                    "root_cause_reason"
                ]
                != "topology_supported"
            )
        ):
            candidates_by_root_event[
                root_event_id
            ] = candidate

    return list(
        candidates_by_root_event.values()
    )


# ---------------------------------------------------------
# Incident API enrichment
# ---------------------------------------------------------

def enrich_incident(
    incident,
    dependencies=None,
    all_devices=None,
    all_events=None,
):
    if dependencies is None:
        dependencies = (
            get_device_dependencies()
        )

    if all_devices is None:
        all_devices = get_devices()

    if all_events is None:
        all_events = get_events()

    device_names = {
        device["id"]: device["name"]
        for device in all_devices
    }

    event_by_id = {
        event["id"]: event
        for event in all_events
    }

    root_device_id = incident.get(
        "root_cause_device_id"
    )

    root_cause_reason = incident.get(
        "root_cause_reason"
    )

    evidence_event_ids = (
        incident.get(
            "root_cause_evidence"
        )
        or []
    )

    # -----------------------------------------------------
    # Detection explanation
    # -----------------------------------------------------

    if root_cause_reason == "topology_supported":
        detection_reason = "Topology Supported"

    elif root_cause_reason == "priority_fallback":
        detection_reason = "Repeated Device Evidence"

    else:
        detection_reason = "Manual / Undetermined"

    # -----------------------------------------------------
    # Supporting evidence
    # -----------------------------------------------------

    evidence_events = []

    for event_id in evidence_event_ids:
        evidence_event = (
            event_by_id.get(event_id)
        )

        if evidence_event is None:
            continue

        evidence_device_id = (
            evidence_event.get(
                "device_id"
            )
        )

        evidence_events.append(
            {
                "id": evidence_event["id"],
                "device_id": evidence_device_id,
                "device_name": (
                    device_names.get(
                        evidence_device_id
                    )
                    or evidence_event.get(
                        "device"
                    )
                ),
                "type": (
                    evidence_event["type"]
                ),
                "severity": (
                    evidence_event["severity"]
                ),
                "timestamp": (
                    evidence_event["timestamp"]
                ),
            }
        )

    # -----------------------------------------------------
    # Impact analysis
    # -----------------------------------------------------

    observed_affected_devices = []
    potential_affected_devices = []

    if root_device_id is not None:
        potential_devices = (
            find_affected_devices(
                root_device_id,
                dependencies,
            )
        )

        potential_affected_devices = [
            {
                "device_id": affected_id,
                "device_name": (
                    device_names.get(
                        affected_id
                    )
                ),
                "impact_level": (
                    "Direct"
                    if depth == 1
                    else "Indirect"
                ),
                "depth": depth,
            }
            for (
                affected_id,
                depth,
            ) in potential_devices.items()
        ]

        # -------------------------------------------------
        # Observed impact
        #
        # Evidence from downstream devices counts as
        # observed impact.
        #
        # Repeated evidence from the root-cause device
        # supports diagnosis but does not mean that the
        # device is downstream impact.
        # -------------------------------------------------

        observed_device_ids = []

        for evidence_event in evidence_events:
            evidence_device_id = (
                evidence_event[
                    "device_id"
                ]
            )

            if evidence_device_id is None:
                continue

            if (
                evidence_device_id
                == root_device_id
            ):
                continue

            if (
                evidence_device_id
                not in observed_device_ids
            ):
                observed_device_ids.append(
                    evidence_device_id
                )

        for device_id in observed_device_ids:
            depth = potential_devices.get(
                device_id
            )

            if depth is None:
                continue

            observed_affected_devices.append(
                {
                    "device_id": device_id,
                    "device_name": (
                        device_names.get(
                            device_id
                        )
                    ),
                    "impact_level": (
                        "Direct"
                        if depth == 1
                        else "Indirect"
                    ),
                    "depth": depth,
                }
            )

    # -----------------------------------------------------
    # Weighted confidence scoring
    # -----------------------------------------------------

    confidence_breakdown = (
        calculate_confidence_breakdown(
            root_cause_reason,
            evidence_events,
            observed_affected_devices,
        )
    )

    confidence_score = (
        confidence_breakdown[
            "final_score"
        ]
    )

    confidence = (
        get_confidence_label(
            confidence_score
        )
    )

    # -----------------------------------------------------
    # API enrichment
    # -----------------------------------------------------

    incident[
        "detection_reason"
    ] = detection_reason

    incident[
        "confidence"
    ] = confidence

    incident[
        "confidence_score"
    ] = confidence_score

    incident[
        "confidence_breakdown"
    ] = {
        "base_score": (
            confidence_breakdown[
                "base_score"
            ]
        ),
        "severity_bonus": (
            confidence_breakdown[
                "severity_bonus"
            ]
        ),
        "diversity_bonus": (
            confidence_breakdown[
                "diversity_bonus"
            ]
        ),
        "topology_bonus": (
            confidence_breakdown[
                "topology_bonus"
            ]
        ),
    }

    incident[
        "evidence_count"
    ] = len(evidence_events)

    incident[
        "evidence_events"
    ] = evidence_events

    incident[
        "observed_affected_devices"
    ] = observed_affected_devices

    incident[
        "potential_affected_devices"
    ] = potential_affected_devices

    return incident

def enrich_analysis_history(
    history_entries,
    dependencies=None,
    all_devices=None,
    all_events=None,
):
    if dependencies is None:
        dependencies = (
            get_device_dependencies()
        )

    if all_devices is None:
        all_devices = get_devices()

    if all_events is None:
        all_events = get_events()

    device_names = {
        device["id"]: device["name"]
        for device in all_devices
    }

    event_by_id = {
        event["id"]: event
        for event in all_events
    }

    enriched_history = []

    for entry in history_entries:
        root_cause_event_id = (
            entry.get(
                "root_cause_event_id"
            )
        )

        root_cause_reason = (
            entry.get(
                "root_cause_reason"
            )
        )

        root_cause_event = (
            event_by_id.get(
                root_cause_event_id
            )
            if root_cause_event_id
            else None
        )

        root_device_id = (
            root_cause_event.get(
                "device_id"
            )
            if root_cause_event
            else None
        )

        if (
            root_cause_reason
            == "topology_supported"
        ):
            detection_reason = (
                "Topology Supported"
            )

        elif (
            root_cause_reason
            == "priority_fallback"
        ):
            detection_reason = (
                "Repeated Device Evidence"
            )

        else:
            detection_reason = (
                "Manual / Undetermined"
            )

        # -------------------------------------------------
        # Historical supporting evidence
        # -------------------------------------------------

        evidence_event_ids = (
            entry.get(
                "root_cause_evidence"
            )
            or []
        )

        evidence_events = []

        for event_id in evidence_event_ids:
            event = event_by_id.get(
                event_id
            )

            if event is None:
                continue

            evidence_device_id = (
                event.get(
                    "device_id"
                )
            )

            evidence_events.append(
                {
                    "id": event["id"],
                    "device_id": (
                        evidence_device_id
                    ),
                    "device_name": (
                        device_names.get(
                            evidence_device_id
                        )
                        or event.get(
                            "device"
                        )
                    ),
                    "type": event["type"],
                    "severity": (
                        event["severity"]
                    ),
                    "timestamp": (
                        event["timestamp"]
                    ),
                }
            )

        # -------------------------------------------------
        # Reconstruct observed impact for this assessment
        # -------------------------------------------------

        observed_affected_devices = []

        if root_device_id is not None:
            potential_devices = (
                find_affected_devices(
                    root_device_id,
                    dependencies,
                )
            )

            observed_device_ids = []

            for evidence_event in evidence_events:
                evidence_device_id = (
                    evidence_event[
                        "device_id"
                    ]
                )

                if evidence_device_id is None:
                    continue

                if (
                    evidence_device_id
                    == root_device_id
                ):
                    continue

                if (
                    evidence_device_id
                    not in observed_device_ids
                ):
                    observed_device_ids.append(
                        evidence_device_id
                    )

            for device_id in observed_device_ids:
                depth = potential_devices.get(
                    device_id
                )

                if depth is None:
                    continue

                observed_affected_devices.append(
                    {
                        "device_id": (
                            device_id
                        ),
                        "device_name": (
                            device_names.get(
                                device_id
                            )
                        ),
                        "impact_level": (
                            "Direct"
                            if depth == 1
                            else "Indirect"
                        ),
                        "depth": depth,
                    }
                )

        # -------------------------------------------------
        # Historical confidence score
        # -------------------------------------------------

        confidence_breakdown = (
            calculate_confidence_breakdown(
                root_cause_reason,
                evidence_events,
                observed_affected_devices,
            )
        )

        confidence_score = (
            confidence_breakdown[
                "final_score"
            ]
        )

        confidence = (
            get_confidence_label(
                confidence_score
            )
        )

        enriched_history.append(
            {
                "id": entry["id"],
                "incident_id": (
                    entry[
                        "incident_id"
                    ]
                ),
                "change_type": (
                    entry[
                        "change_type"
                    ]
                ),
                "created_at": (
                    entry[
                        "created_at"
                    ]
                ),
                "severity": (
                    entry["severity"]
                ),
                "root_cause_event_id": (
                    root_cause_event_id
                ),
                "root_cause_device_id": (
                    root_device_id
                ),
                "root_cause_device": (
                    device_names.get(
                        root_device_id
                    )
                    if root_device_id
                    else None
                ),
                "root_cause_type": (
                    root_cause_event.get(
                        "type"
                    )
                    if root_cause_event
                    else None
                ),
                "root_cause_severity": (
                    root_cause_event.get(
                        "severity"
                    )
                    if root_cause_event
                    else None
                ),
                "detection_reason": (
                    detection_reason
                ),
                "confidence": confidence,
                "confidence_score": (
                    confidence_score
                ),
                "confidence_breakdown": {
                    "base_score": (
                        confidence_breakdown[
                            "base_score"
                        ]
                    ),
                    "severity_bonus": (
                        confidence_breakdown[
                            "severity_bonus"
                        ]
                    ),
                    "diversity_bonus": (
                        confidence_breakdown[
                            "diversity_bonus"
                        ]
                    ),
                    "topology_bonus": (
                        confidence_breakdown[
                            "topology_bonus"
                        ]
                    ),
                },
                "evidence_count": (
                    len(
                        evidence_events
                    )
                ),
                "evidence_events": (
                    evidence_events
                ),
                "observed_affected_devices": (
                    observed_affected_devices
                ),
            }
        )

    return enriched_history

# ---------------------------------------------------------
# Health
# ---------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "ok",
    }


# ---------------------------------------------------------
# Events
# ---------------------------------------------------------

@app.get("/events")
def get_events_endpoint():
    return get_events()


@app.get("/events/correlated")
def get_correlated_events():
    events = get_events()

    return correlate_events(events)


@app.get(
    "/events/correlated-across-devices"
)
def get_cross_device_correlated_events():
    events = get_events()

    dependencies = (
        get_device_dependencies()
    )

    return (
        correlate_events_across_devices(
            events,
            dependencies,
        )
    )


@app.get("/events/root-causes")
def get_root_causes():
    events = get_events()

    correlated_groups = (
        correlate_events(events)
    )

    results = []

    for group in correlated_groups:
        root_cause = find_root_cause(
            group["events"]
        )

        results.append(
            {
                "device_id": (
                    group["device_id"]
                ),
                "root_cause": root_cause,
                "events": group["events"],
            }
        )

    return results


@app.get(
    "/events/incident-candidates"
)
def get_incident_candidates():
    events = get_events()

    dependencies = (
        get_device_dependencies()
    )

    return (
        get_detected_incident_candidates(
            events,
            dependencies,
        )
    )


# ---------------------------------------------------------
# Automated incident analysis
# ---------------------------------------------------------

def analyze_events_and_create_incidents():
    events = get_events()

    dependencies = (
        get_device_dependencies()
    )

    candidates = (
        get_detected_incident_candidates(
            events,
            dependencies,
        )
    )

    created_incidents = []

    for candidate in candidates:
        existing_incident = (
            get_active_incident_by_device(
                candidate["device_id"]
            )
        )

        if existing_incident is not None:
            current_reason = (
                existing_incident.get(
                    "root_cause_reason"
                )
            )

            new_reason = candidate[
                "root_cause_reason"
            ]

            reason_strength = {
                "priority_fallback": 1,
                "topology_supported": 2,
            }

            current_strength = (
                reason_strength.get(
                    current_reason,
                    0,
                )
            )

            new_strength = (
                reason_strength.get(
                    new_reason,
                    0,
                )
            )

            if (
                new_strength
                <= current_strength
            ):
                continue

            updated_incident = (
                update_incident_assessment(
                    existing_incident[
                        "id"
                    ],
                    candidate,
                )
            )

            create_incident_history(
                {
                    "id": str(
                        uuid.uuid4()
                    ),
                    "incident_id": (
                        existing_incident[
                            "id"
                        ]
                    ),
                    "change_type": (
                        "ROOT_CAUSE_UPDATED"
                    ),
                    "severity": (
                        candidate[
                            "severity"
                        ]
                    ),
                    "root_cause_event_id": (
                        candidate[
                            "root_cause_event_id"
                        ]
                    ),
                    "root_cause_reason": (
                        candidate[
                            "root_cause_reason"
                        ]
                    ),
                    "root_cause_evidence": (
                        candidate[
                            "root_cause_evidence"
                        ]
                    ),
                }
            )

            updated_incident[
                "affected_devices"
            ] = candidate[
                "affected_devices"
            ]

            created_incidents.append(
                updated_incident
            )

            continue

        incident_id = str(
            uuid.uuid4()
        )

        new_incident = {
            "id": incident_id,
            "title": candidate[
                "title"
            ],
            "severity": candidate[
                "severity"
            ],
            "root_cause_event_id": (
                candidate[
                    "root_cause_event_id"
                ]
            ),
            "affected_devices": (
                candidate[
                    "affected_devices"
                ]
            ),
            "root_cause_reason": (
                candidate[
                    "root_cause_reason"
                ]
            ),
            "root_cause_evidence": (
                candidate[
                    "root_cause_evidence"
                ]
            ),
        }

        created_incident = (
            create_incident(
                new_incident
            )
        )

        history_record = {
            "id": str(
                uuid.uuid4()
            ),
            "incident_id": (
                created_incident["id"]
            ),
            "change_type": (
                "INCIDENT_CREATED"
            ),
            "severity": (
                created_incident[
                    "severity"
                ]
            ),
            "root_cause_event_id": (
                created_incident.get(
                    "root_cause_event_id"
                )
            ),
            "root_cause_reason": (
                created_incident.get(
                    "root_cause_reason"
                )
            ),
            "root_cause_evidence": (
                created_incident.get(
                    "root_cause_evidence",
                    [],
                )
            ),
        }

        create_incident_history(
            history_record
        )

        created_incident[
            "affected_devices"
        ] = candidate[
            "affected_devices"
        ]

        created_incidents.append(
            created_incident
        )

    return created_incidents


@app.post(
    "/events/create-incidents"
)
def create_detected_incidents():
    return (
        analyze_events_and_create_incidents()
    )


@app.get(
    "/incidents/active/{device_id}"
)
def get_active_incident_endpoint(
    device_id: str,
):
    return (
        get_active_incident_by_device(
            device_id
        )
    )


@app.post("/events")
def create_event_endpoint(
    event: EventCreate,
):
    event_id = str(
        uuid.uuid4()
    )

    new_event = {
        "id": event_id,
        "device_id": event.device_id,
        "type": event.type,
        "severity": event.severity,
    }

    created_event = create_event(
        new_event
    )

    analyze_events_and_create_incidents()

    return created_event


# ---------------------------------------------------------
# Incidents
# ---------------------------------------------------------

@app.get("/incidents")
def get_incidents_endpoint():
    incidents = get_incidents()

    dependencies = (
        get_device_dependencies()
    )

    all_devices = get_devices()
    all_events = get_events()

    return [
        enrich_incident(
            incident,
            dependencies,
            all_devices,
            all_events,
        )
        for incident in incidents
    ]


@app.post("/incidents")
def create_incident_endpoint(
    incident: IncidentCreate,
):
    incident_id = str(
        uuid.uuid4()
    )

    new_incident = {
        "id": incident_id,
        "title": incident.title,
        "severity": incident.severity,
        "root_cause_event_id": None,
    }

    create_incident(
        new_incident
    )

    created_incident = (
        get_incident_by_id(
            incident_id
        )
    )

    return enrich_incident(
        created_incident
    )


@app.patch(
    "/incidents/{incident_id}"
)
def update_incident_status_endpoint(
    incident_id: str,
    update: IncidentStatusUpdate,
):
    incident = get_incident_by_id(
        incident_id
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    if not is_valid_incident_transition(
        incident["status"],
        update.status,
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid incident "
                "status transition"
            ),
        )

    update_incident_status(
        incident_id,
        incident["status"],
        update.status,
    )

    updated_incident = (
        get_incident_by_id(
            incident_id
        )
    )

    return enrich_incident(
        updated_incident
    )


@app.get(
    "/incidents/{incident_id}/history"
)
def get_incident_history_endpoint(
    incident_id: str,
):
    incident = get_incident_by_id(
        incident_id
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    return (
        get_incident_status_history(
            incident_id
        )
    )

@app.get(
    "/incidents/{incident_id}/analysis-history"
)
def get_incident_analysis_history_endpoint(
    incident_id: str,
):
    incident = get_incident_by_id(
        incident_id
    )

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found",
        )

    history = (
        get_incident_analysis_history(
            incident_id
        )
    )

    dependencies = (
        get_device_dependencies()
    )

    all_devices = get_devices()
    all_events = get_events()

    return enrich_analysis_history(
        history,
        dependencies,
        all_devices,
        all_events,
    )

# ---------------------------------------------------------
# Topology
# ---------------------------------------------------------

@app.get(
    "/topology/dependencies"
)
def get_topology_dependencies():
    return (
        get_device_dependencies()
    )


@app.get(
    "/topology/impact/{device_id}"
)
def get_device_impact(
    device_id: str,
):
    dependencies = (
        get_device_dependencies()
    )

    affected_devices = (
        find_affected_devices(
            device_id,
            dependencies,
        )
    )

    all_devices = get_devices()

    device_names = {
        device["id"]: device["name"]
        for device in all_devices
    }

    return {
        "device_id": device_id,
        "device_name": (
            device_names.get(
                device_id
            )
        ),
        "affected_devices": [
            {
                "device_id": (
                    affected_id
                ),
                "device_name": (
                    device_names.get(
                        affected_id
                    )
                ),
                "impact_level": (
                    "Direct"
                    if depth == 1
                    else "Indirect"
                ),
                "depth": depth,
            }
            for (
                affected_id,
                depth,
            ) in affected_devices.items()
        ],
    }
