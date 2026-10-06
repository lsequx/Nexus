import { getIncidentStatusColor, getSeverityColor } from "@/utils/status";

import type { IncidentStatusHistory } from "@/types/incidentHistory";

import type { Incident, IncidentStatus } from "@/types/incident";

export default function IncidentCard({
  id,
  title,
  severity,
  status,
  root_cause_type,
  root_cause_severity,
  root_cause_device,
  detection_reason,
  confidence,
  confidence_score,
  evidence_count,
  evidence_events,
  observed_affected_devices,
  potential_affected_devices,
  onStatusChange,
  incidentHistory,
}: Incident & {
  onStatusChange: (newStatus: IncidentStatus) => void;

  incidentHistory: IncidentStatusHistory[];
}) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="text-xl font-semibold">{title}</h2>

      <p>
        Severity:{" "}
        <span className={`font-semibold ${getSeverityColor(severity)}`}>
          {severity}
        </span>
      </p>

      {/* Root-cause analysis */}
      {root_cause_device ? (
        <>
          <p>
            Root Cause Device:{" "}
            <span className="font-semibold">{root_cause_device}</span>
          </p>

          <p>
            Root Cause Type:{" "}
            <span className="font-semibold">
              {root_cause_type ?? "Unknown"}
            </span>
          </p>

          <p>
            Root Cause Severity:{" "}
            <span className="font-semibold">
              {root_cause_severity ?? "Unknown"}
            </span>
          </p>
        </>
      ) : (
        <p>
          Root Cause: <span className="font-semibold">Not determined</span>
        </p>
      )}

      {/* Explainable incident intelligence */}
      <div className="space-y-2 rounded-md border p-3">
        <h3 className="font-semibold">NEXUS Analysis</h3>

        <p className="text-sm">
          Detection Reason:{" "}
          <span className="font-semibold">{detection_reason}</span>
        </p>

        <p className="text-sm">
          Confidence: <span className="font-semibold">{confidence}</span>
        </p>

        <p className="text-sm">
          Confidence Score:{" "}
          <span className="font-semibold">{confidence_score}/100</span>
        </p>

        <p className="text-sm">
          Supporting Evidence Events:{" "}
          <span className="font-semibold">{evidence_count}</span>
        </p>
      </div>

      {/* Supporting evidence */}
      {evidence_events.length > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold">Supporting Evidence</h3>

            <p className="text-xs text-gray-500">
              Network signals that contributed to the NEXUS incident decision.
            </p>
          </div>

          {evidence_events.map((event) => (
            <div key={event.id} className="rounded-md border p-2 text-sm">
              <p className="font-medium">
                {event.device_name ?? event.device_id ?? "Unknown device"}
              </p>

              <p className="text-gray-500">Event: {event.type}</p>

              <p className="text-gray-500">Severity: {event.severity}</p>

              <p className="text-gray-500">
                Time: {new Date(event.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Observed impact */}
      {observed_affected_devices.length > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold">Observed Affected Devices</h3>

            <p className="text-xs text-gray-500">
              Devices that produced downstream network evidence supporting this
              incident.
            </p>
          </div>

          {observed_affected_devices.map((device) => (
            <div
              key={device.device_id}
              className="rounded-md border p-2 text-sm"
            >
              <p className="font-medium">
                {device.device_name ?? device.device_id}
              </p>

              <p className="text-gray-500">Impact: {device.impact_level}</p>

              <p className="text-gray-500">Dependency depth: {device.depth}</p>
            </div>
          ))}
        </div>
      )}

      {/* Potential topology impact */}
      {potential_affected_devices.length > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="font-semibold">Potential Impact Scope</h3>

            <p className="text-xs text-gray-500">
              Downstream devices that could be affected based on network
              topology.
            </p>
          </div>

          {potential_affected_devices.map((device) => (
            <div
              key={device.device_id}
              className="rounded-md border p-2 text-sm"
            >
              <p className="font-medium">
                {device.device_name ?? device.device_id}
              </p>

              <p className="text-gray-500">
                Relationship: {device.impact_level}
              </p>

              <p className="text-gray-500">Dependency depth: {device.depth}</p>
            </div>
          ))}
        </div>
      )}

      {/* Incident lifecycle */}
      <p>
        Status:{" "}
        <span className={`font-semibold ${getIncidentStatusColor(status)}`}>
          {status}
        </span>
      </p>

      {status === "Open" && (
        <button
          onClick={() => onStatusChange("Investigating")}
          className="rounded-lg border px-4 py-2"
        >
          Investigate
        </button>
      )}

      {status === "Investigating" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatusChange("Resolved")}
            className="rounded-lg border px-4 py-2"
          >
            Resolve
          </button>

          <button
            onClick={() => onStatusChange("Closed")}
            className="rounded-lg border px-4 py-2"
          >
            Close
          </button>
        </div>
      )}

      {status === "Resolved" && (
        <button
          onClick={() => onStatusChange("Closed")}
          className="rounded-lg border px-4 py-2"
        >
          Close
        </button>
      )}

      {/* Status history */}
      {incidentHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Status History</h3>

          {incidentHistory.map((history) => (
            <div key={history.id} className="text-sm text-gray-400">
              <p>
                {history.old_status ?? "Created"} → {history.new_status}
              </p>

              <p>{new Date(history.changed_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
