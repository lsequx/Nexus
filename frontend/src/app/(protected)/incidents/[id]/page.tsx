"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import IncidentCard from "@/components/IncidentCard";
import { fetchIncidentAnalysisHistory, fetchIncidentHistory, fetchIncidents, updateIncidentStatus } from "@/lib/api";
import type { Incident } from "@/types/incident";
import type { IncidentAnalysisHistory } from "@/types/incidentAnalysisHistory";
import type { IncidentStatusHistory } from "@/types/incidentHistory";

export default function IncidentDetailPage() {
  const params = useParams<{ id: string }>();
  const incidentId = params.id;
  const [incident, setIncident] = useState<Incident | null>(null);
  const [statusHistory, setStatusHistory] = useState<IncidentStatusHistory[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<IncidentAnalysisHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [incidents, statuses, analyses] = await Promise.all([
      fetchIncidents(),
      fetchIncidentHistory(incidentId),
      fetchIncidentAnalysisHistory(incidentId),
    ]);
    setIncident(incidents.find((item) => item.id === incidentId) ?? null);
    setStatusHistory(statuses);
    setAnalysisHistory(analyses);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [incidentId]);

  const handleStatusChange = async (newStatus: Incident["status"]) => {
    if (!incident) return;
    await updateIncidentStatus(incident.id, newStatus);
    await load();
  };

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto flex h-full max-w-[1400px] min-h-0 flex-col gap-3">
        <div className="shrink-0">
          <Link href="/incidents" className="text-xs font-medium text-sky-400 hover:text-sky-300">← Back to incidents</Link>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading ? (
            <p className="text-sm text-slate-500">Loading incident intelligence…</p>
          ) : incident ? (
            <IncidentCard
              {...incident}
              incidentHistory={statusHistory}
              analysisHistory={analysisHistory}
              onStatusChange={handleStatusChange}
            />
          ) : (
            <div className="rounded-2xl border border-slate-800 p-10 text-center text-slate-500">Incident not found.</div>
          )}
        </div>
      </div>
    </main>
  );
}
