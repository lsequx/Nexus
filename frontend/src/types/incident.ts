export type IncidentStatus = "Open" | "Investigating" | "Resolved" | "Closed";

export type IncidentConfidence = "High" | "Medium" | "Unknown";

export type ImpactedDevice = {
  device_id: string;
  device_name: string | null;
  impact_level: "Direct" | "Indirect";
  depth: number;
};

export type IncidentEvidenceEvent = {
  id: string;
  device_id: string | null;
  device_name: string | null;
  type: string;
  severity: string;
  timestamp: string;
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

  detection_reason: string;
  confidence: IncidentConfidence;

  evidence_count: number;
  evidence_events: IncidentEvidenceEvent[];

  observed_affected_devices: ImpactedDevice[];
  potential_affected_devices: ImpactedDevice[];
};
