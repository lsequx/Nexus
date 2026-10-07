import CollapsibleSection from "@/components/CollapsibleSection";
import StatusIndicator from "@/components/StatusIndicator";
import { getIncidentStatusColor, getSeverityColor } from "@/utils/status";
import type { IncidentStatusHistory } from "@/types/incidentHistory";
import type { IncidentAnalysisHistory } from "@/types/incidentAnalysisHistory";
import type { Incident, IncidentStatus } from "@/types/incident";
import IncidentNotesPanel from "@/components/IncidentNotesPanel";

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
  confidence_breakdown,
  evidence_count,
  evidence_events,
  observed_affected_devices,
  potential_affected_devices,
  onStatusChange,
  incidentHistory,
  analysisHistory,
}: Incident & {
  onStatusChange: (newStatus: IncidentStatus) => void;
  incidentHistory: IncidentStatusHistory[];
  analysisHistory: IncidentAnalysisHistory[];
}) {
  const confidenceStatus =
    confidence === "High" ? "Operational" : confidence === "Medium" ? "Degraded" : "Critical";

  return (
    <article className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
      <header className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/65 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold ${getSeverityColor(severity)}`}>
              {severity}
            </span>
            <span className={`rounded-lg bg-slate-950 px-2.5 py-1 text-xs font-bold ${getIncidentStatusColor(status)}`}>
              {status}
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {root_cause_device ?? "Root cause undetermined"}
            {root_cause_type ? ` · ${root_cause_type}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-5 rounded-xl border border-slate-800 bg-slate-950/60 px-5 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Confidence</p>
            <p className="mt-1 text-3xl font-black text-white">{confidence_score}</p>
            <p className="text-[10px] text-slate-600">out of 100</p>
          </div>
          <StatusIndicator status={confidenceStatus} label={confidence} />
        </div>
      </header>

      <CollapsibleSection
        title="NEXUS Analysis"
        subtitle="Current root-cause assessment and confidence factors"
        defaultOpen
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Detection reason</p>
            <p className="mt-2 font-semibold text-white">{detection_reason}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Root cause</p>
            <p className="mt-2 font-semibold text-white">{root_cause_device ?? "Unknown"}</p>
            <p className="mt-1 text-xs text-slate-500">{root_cause_type ?? "Unknown type"} · {root_cause_severity ?? "Unknown severity"}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-500">Supporting evidence</p>
            <p className="mt-2 text-2xl font-bold text-white">{evidence_count}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            ["Detection basis", confidence_breakdown.base_score],
            ["Evidence severity", confidence_breakdown.severity_bonus],
            ["Evidence diversity", confidence_breakdown.diversity_bonus],
            ["Topology confirmation", confidence_breakdown.topology_bonus],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-[10px] text-slate-500">{label}</p>
              <p className="mt-1 text-sm font-bold text-slate-200">+{value}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Analysis History"
        subtitle="How the diagnosis evolved as evidence arrived"
        count={analysisHistory.length}
      >
        <div className="space-y-3">
          {analysisHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No analysis changes recorded.</p>
          ) : (
            analysisHistory.map((assessment, index) => (
              <div key={assessment.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:grid-cols-[130px_1fr_auto] md:items-center">
                <div>
                  <p className="text-xs font-bold text-white">{assessment.confidence_score}/100</p>
                  <p className="text-[10px] text-slate-500">{assessment.confidence}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {assessment.change_type === "INCIDENT_CREATED" ? "Initial Assessment" : "Assessment Strengthened"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{assessment.detection_reason} · {assessment.root_cause_device ?? "Unknown root"}</p>
                </div>
                <p className="text-[10px] text-slate-600">
                  {new Date(assessment.created_at).toLocaleString()}
                  {index < analysisHistory.length - 1 ? " →" : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Supporting Evidence"
        subtitle="Signals that contributed to the current assessment"
        count={evidence_events.length}
      >
        <div className="space-y-2">
          {evidence_events.length === 0 ? (
            <p className="text-sm text-slate-500">No supporting evidence attached.</p>
          ) : (
            evidence_events.map((event) => (
              <div key={event.id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm md:grid-cols-[1.2fr_1fr_auto_auto] md:items-center">
                <span className="font-semibold text-slate-200">{event.device_name ?? event.device_id ?? "Unknown device"}</span>
                <span className="text-slate-500">{event.type}</span>
                <span className={`font-semibold ${getSeverityColor(event.severity)}`}>{event.severity}</span>
                <span className="text-xs text-slate-600">{new Date(event.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Impact"
        subtitle="Observed evidence and potential downstream dependency scope"
        count={observed_affected_devices.length + potential_affected_devices.length}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Observed affected</p>
            <div className="space-y-2">
              {observed_affected_devices.length === 0 ? (
                <p className="text-sm text-slate-600">No downstream impact observed.</p>
              ) : observed_affected_devices.map((device) => (
                <div key={device.device_id} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-200">{device.device_name ?? device.device_id}</p>
                  <p className="mt-1 text-xs text-slate-500">{device.impact_level} · depth {device.depth}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Potential scope</p>
            <div className="space-y-2">
              {potential_affected_devices.length === 0 ? (
                <p className="text-sm text-slate-600">No downstream dependencies identified.</p>
              ) : potential_affected_devices.map((device) => (
                <div key={device.device_id} className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-200">{device.device_name ?? device.device_id}</p>
                  <p className="mt-1 text-xs text-slate-500">{device.impact_level} · depth {device.depth}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Operator Notes"
        subtitle={status === "Investigating" ? "Capture investigation context and link notes to evidence" : "Saved investigation knowledge for future incidents"}
        defaultOpen={status === "Investigating"}
      >
        <IncidentNotesPanel
          incidentId={id}
          evidenceEvents={evidence_events}
          canAdd={status === "Investigating"}
        />
      </CollapsibleSection>

      <CollapsibleSection
        title="Lifecycle History"
        subtitle="Operator status transitions"
        count={incidentHistory.length}
      >
        <div className="space-y-2">
          {incidentHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No lifecycle transitions recorded.</p>
          ) : incidentHistory.map((history) => (
            <div key={history.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
              <span className="text-slate-300">{history.old_status ?? "Created"} → {history.new_status}</span>
              <span className="text-xs text-slate-600">{new Date(history.changed_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Current status</p>
          <p className={`mt-1 text-sm font-bold ${getIncidentStatusColor(status)}`}>{status}</p>
        </div>
        <div className="flex gap-2">
          {status === "Open" && (
            <button onClick={() => onStatusChange("Investigating")} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">Investigate</button>
          )}
          {status === "Investigating" && (
            <>
              <button onClick={() => onStatusChange("Resolved")} className="rounded-lg bg-sky-400 px-4 py-2 text-xs font-bold text-slate-950">Resolve</button>
              <button onClick={() => onStatusChange("Closed")} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200">Close</button>
            </>
          )}
          {status === "Resolved" && (
            <button onClick={() => onStatusChange("Closed")} className="rounded-lg bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950">Close</button>
          )}
        </div>
      </div>
    </article>
  );
}
