import { getIncidentStatusColor, getSeverityColor } from "@/utils/status";

import type { IncidentStatusHistory } from "@/types/incidentHistory";
import type { Incident } from "@/types/incident";

export default function IncidentCard({
  id,
  title,
  severity,
  status,
  root_cause_type,
  root_cause_severity,
  root_cause_device,
  affected_devices,
  onStatusChange,
  incidentHistory,
}: Incident & {
  onStatusChange: (newStatus: string) => void;
  incidentHistory: IncidentStatusHistory[];
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>

      <p>
        Severity:{" "}
        <span className={`font-semibold ${getSeverityColor(severity)}`}>
          {severity}
        </span>
      </p>

      {root_cause_device ? (
        <>
          <p>
            Root Cause Device:{" "}
            <span className="font-semibold">{root_cause_device}</span>
          </p>

          <p>
            Root Cause Type:{" "}
            <span className="font-semibold">{root_cause_type}</span>
          </p>

          <p>
            Root Cause Severity:{" "}
            <span className="font-semibold">{root_cause_severity}</span>
          </p>
        </>
      ) : (
        <p>
          Root Cause: <span className="font-semibold">Not determined</span>
        </p>
      )}

      {affected_devices && affected_devices.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Affected Devices</h3>

          {affected_devices.map((device) => (
            <div
              key={device.device_id}
              className="rounded-md border p-2 text-sm"
            >
              <p className="font-medium">{device.device_name}</p>

              <p className="text-gray-500">Impact: {device.impact_level}</p>

              <p className="text-gray-500">Dependency depth: {device.depth}</p>
            </div>
          ))}
        </div>
      )}

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
        <>
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
        </>
      )}
      {status === "Resolved" && (
        <button
          onClick={() => onStatusChange("Closed")}
          className="rounded-lg border px-4 py-2"
        >
          Closed
        </button>
      )}

      {incidentHistory.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Status Historry</h3>
          {incidentHistory.map((history) => (
            <div key={history.id} className="text-sm text-gray-400">
              <p>
                {history.old_status} → {history.new_status}
              </p>
              <p>{new Date(history.changed_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
