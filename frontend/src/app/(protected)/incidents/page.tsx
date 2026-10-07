"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusIndicator from "@/components/StatusIndicator";
import { fetchIncidents } from "@/lib/api";
import type { Incident } from "@/types/incident";
import { calculateNetworkStatus } from "@/utils/networkStatus";
import { getIncidentStatusColor, getSeverityColor } from "@/utils/status";

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetchIncidents().then(setIncidents).finally(() => setLoading(false));
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  const status = calculateNetworkStatus(incidents);

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto flex h-full max-w-[1500px] min-h-0 flex-col gap-4">
        <header className="flex shrink-0 items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Incident workspace</p>
            <h1 className="mt-1 text-2xl font-bold text-white">Incidents</h1>
            <p className="mt-1 text-xs text-slate-500">Select an incident to inspect RCA, evidence, confidence, impact, and history.</p>
          </div>
          <StatusIndicator status={status} label="Network" />
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500">Loading incidents…</p>
            ) : incidents.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 p-10 text-center text-sm text-slate-500">No incidents detected.</div>
            ) : (
              incidents.map((incident) => (
                <Link
                  key={incident.id}
                  href={`/incidents/${incident.id}`}
                  className="grid grid-cols-[minmax(0,1.5fr)_auto_auto_auto] items-center gap-5 rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 transition hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{incident.title}</p>
                    <p className="mt-1 truncate text-xs text-slate-500">{incident.root_cause_device ?? "Root cause undetermined"} · {incident.detection_reason}</p>
                  </div>
                  <span className={`text-xs font-semibold ${getSeverityColor(incident.severity)}`}>{incident.severity}</span>
                  <span className={`text-xs font-semibold ${getIncidentStatusColor(incident.status)}`}>{incident.status}</span>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{incident.confidence_score}/100</p>
                    <p className="text-[10px] text-slate-500">{incident.confidence}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
