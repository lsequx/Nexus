import type { IncidentStatus } from "@/types/incident";

export type IncidentStatusHistory = {
  id: string;
  incident_id: string;
  old_status: IncidentStatus | null;
  new_status: IncidentStatus;
  changed_at: string;
};
