export type IncidentStatusHistory = {
    id: string;
    incident_id: string;
    old_status: string | null;
    new_status: string;
    changed_at: string;
}
