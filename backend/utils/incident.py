

ALLOWED_TRANSITIONS = {
    "Open": ["Investigating"],
    "Investigating": ["Resolved","Closed"],
    "Resolved":["Closed"],
    "Closed":[]
}

def is_valid_incident_transition(current_status, new_status):
    return new_status in ALLOWED_TRANSITIONS.get(current_status, [])

