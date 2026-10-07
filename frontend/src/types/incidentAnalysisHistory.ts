import type {
  ConfidenceBreakdown,
  ImpactedDevice,
  IncidentConfidence,
  IncidentEvidenceEvent,
} from "@/types/incident";

export type IncidentAnalysisChangeType =
  | "INCIDENT_CREATED"
  | "ROOT_CAUSE_UPDATED";

export type IncidentAnalysisHistory = {
  id: string;
  incident_id: string;

  change_type: IncidentAnalysisChangeType;

  created_at: string;
  severity: string;

  root_cause_event_id: string | null;

  root_cause_device_id: string | null;
  root_cause_device: string | null;

  root_cause_type: string | null;
  root_cause_severity: string | null;

  detection_reason: string;

  confidence: IncidentConfidence;
  confidence_score: number;

  confidence_breakdown: ConfidenceBreakdown;

  evidence_count: number;
  evidence_events: IncidentEvidenceEvent[];

  observed_affected_devices: ImpactedDevice[];
};
