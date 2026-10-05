export type IncidentStatus = "Open" | "Investigating" | "Resolved" | "Closed";

export type AffectedDevices = {
  device_id: string;
  device_name: string | null;
  impact_level: "Direct" | "Indirect";
  depth: number;
};

export type Incident = {
  id: string;
  title: string;
  severity: string;
  status: IncidentStatus;
  created_at: string;

  root_cause_event_id: string | null;
  root_cause_type: string | null;
  root_cause_severity: string | null;
  root_cause_device: string | null;
  affected_devices: AffectedDevices[];
};
