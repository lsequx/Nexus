
import uuid
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import (
        get_events,
        create_event,
        get_incidents,
        create_incident,
        update_incident_status,
        get_incident_by_id,
        get_incident_status_history,
        get_active_incident_by_device,
        get_device_dependencies,
        get_devices
    )

from utils.correlation import( correlate_events,correlate_events_across_devices,find_root_cause)
from utils.incident import is_valid_incident_transition
from utils.incident_detection import detect_incident
from utils.topology import find_affected_devices

from pydantic import BaseModel
from typing import Literal

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*']
)

class EventCreate(BaseModel):
    device_id: str
    type: str
    severity: str

class IncidentCreate(BaseModel):
    title: str
    severity: str

class IncidentStatusUpdate(BaseModel):
    status: Literal['Open','Investigating','Resolved','Closed']

@app.get('/health')
def health_check():
    return {"status": "ok"}

@app.get('/events')
def get_events_endpoint():
    return get_events()

@app.get('/events/correlated')
def get_correlated_events():
    events = get_events()
    return correlate_events(events)

@app.get('/events/correlated-across-devices')
def get_cross_device_correlated_events():
    events = get_events()
    dependencies = get_device_dependencies()

    return correlate_events_across_devices(
        events,
        dependencies
    )

@app.get('/events/root-causes')
def get_root_causes():
    events = get_events()
    correlated_groups = correlate_events(events)

    results = []

    for group in correlated_groups:
        root_cause = find_root_cause(group["events"])

        results.append({
            "device_id": group["device_id"],
            "root_cause": root_cause,
            "events": group["events"]
        })
    return results

@app.get('/events/incident-candidates')
def get_incident_candidates():
    events = get_events()
    correlated_groups = correlate_events(events)
    candidates = []
    for group in correlated_groups:
        candidate = detect_incident(group)
        if candidate is not None:
            candidates.append(candidate)

    return candidates

# helper function
def analyze_events_and_create_incidents():
    events = get_events()
    correlated_groups = correlate_events(events)
    created_incidents = []

    for group in correlated_groups:
        candidate = detect_incident(group)

        if candidate is None:
            continue
        existing_event = get_active_incident_by_device(
            candidate["device_id"]
        )
        if existing_event is not None:
            continue
        incident_id = str(uuid.uuid4())

        new_incident = {
            "id":incident_id,
            "title":candidate["title"],
            "severity":candidate["severity"],
            "root_cause_event_id": candidate["root_cause_event_id"],
            "affected_devices": candidate["affected_devices"],
            "root_cause_reason": candidate["root_cause_reason"],
            "root_cause_evidence": candidate["root_cause_evidence"]
        }

        created_incident = create_incident(new_incident)
        created_incident["affected_devices"] = candidate["affected_devices"]
        created_incidents.append(created_incident)
    return created_incidents

@app.post('/events/create-incidents')
def create_detected_incidents():
    return analyze_events_and_create_incidents()

@app.get('/incidents/active/{device_id}')
def get_active_incident_endpoint(device_id: str):
    return get_active_incident_by_device(device_id)

@app.post("/events")
def create_event_endpoint(event: EventCreate):
    event_id = str(uuid.uuid4())
    new_event = {
        "id": event_id,
        "device_id": event.device_id,
        "type": event.type,
        "severity": event.severity,
    }
    created_event = create_event(new_event)
    analyze_events_and_create_incidents()
    return created_event

@app.get('/incidents')
def get_incidents_endpoint():
    incidents = get_incidents()
    dependencies = get_device_dependencies()
    all_devices = get_devices()

    device_name = {
        device["id"]: device["name"]
        for device in all_devices
    }
    for incident in incidents:
        device_id = incident.get("root_cause_device_id")

        if device_id is None:
            incident["affected_devices"] = []
            continue

        affected_devices = find_affected_devices(
            device_id,
            dependencies
        )

        incident["affected_devices"] = [
            {
                "device_id": affected_id,
                "device_name": device_name.get(affected_id),
                "impact_level": "Direct" if depth == 1 else "Indirect",
                "depth": depth
            }
            for affected_id, depth in affected_devices.items()
        ]

    return incidents


@app.post('/incidents')
def create_incident_endpoint(incident: IncidentCreate):
    incident_id = str(uuid.uuid4())

    new_incident = {
        "id": incident_id,
        "title": incident.title,
        "severity": incident.severity,
        "root_cause_event_id": None
    }
    created_incident = create_incident(new_incident)
    return created_incident

@app.patch('/incidents/{incident_id}')
def update_incident_status_endpoint(
    incident_id: str,
    update: IncidentStatusUpdate
):
    incident = get_incident_by_id(incident_id)

    if incident is None:
        raise HTTPException(
            status_code=404,
            detail="Incident not found"
        )
    if not is_valid_incident_transition(incident['status'],update.status):
        raise HTTPException(
            status_code=400,
            detail="Invalid incident status transition"
        )
    updated_incident = update_incident_status(
        incident_id,
        incident['status'],
        update.status
    )
    return updated_incident


@app.get('/incidents/{incident_id}/history')
def get_incident_history_endpoint(incident_id: str):
    incident = get_incident_by_id(incident_id)
    if incident is None:
        raise HTTPException(
            status_code = 404,
            detail = "Incident not found"
        )
    return get_incident_status_history(incident_id)

@app.get('/topology/dependencies')
def get_topology_dependencies():
    return get_device_dependencies()

@app.get('/topology/impact/{device_id}')
def get_device_impact(device_id: str):
    dependencies = get_device_dependencies()

    affected_devices = find_affected_devices(
        device_id, dependencies
    )

    all_devices = get_devices()

    device_names = {
        device["id"]: device["name"]
        for device in all_devices
    }
    return {
        "device_id": device_id,
        "device_name": device_names.get(device_id),
        "affected_devices": [
            {
                "device_id": affected_id,
                "device_name": device_names.get(affected_id),
                "impact_level": (
                    "Direct" if depth == 1 else "Indirect"
                ),
                "depth": depth
            }
            for affected_id, depth in affected_devices.items()
        ]
    }
