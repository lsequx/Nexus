"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import DashboardStatCard from "@/components/DashboardStatCard";
import NetworkTelemetryCharts from "@/components/NetworkTelemetryCharts";
import StatusIndicator from "@/components/StatusIndicator";
import LiveFeedController from "@/components/LiveFeedController";
import { fetchEvents, fetchHealth, fetchIncidents } from "@/lib/api";
import type { Event } from "@/types/event";
import type { Incident } from "@/types/incident";
import { calculateNetworkStatus } from "@/utils/networkStatus";
import { simulationScenarios } from "@/data/scenarios";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [apiStatus, setApiStatus] = useState("Degraded");
  const [databaseStatus, setDatabaseStatus] = useState("Degraded");
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const healthPromise = fetchHealth().then((health) => setApiStatus(health.status === "ok" ? "Operational" : "Degraded")).catch(() => setApiStatus("Critical"));
    try {
      const [eventData, incidentData] = await Promise.all([fetchEvents(), fetchIncidents()]);
      setEvents(eventData); setIncidents(incidentData); setDatabaseStatus("Operational");
    } catch { setDatabaseStatus("Critical"); }
    await healthPromise; setLoading(false);
  }, []);

  useEffect(() => { refresh(); const id = window.setInterval(refresh, 5000); return () => window.clearInterval(id); }, [refresh]);

  const networkStatus = calculateNetworkStatus(incidents);
  const activeIncidents = incidents.filter((incident) => incident.status === "Open" || incident.status === "Investigating");
  const alertCount = events.filter((event) => event.severity === "Critical" || event.severity === "Major").length;
  const latestIncident = useMemo(() => [...incidents].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at))[0], [incidents]);
  const latestEvent = events[0];
  const criticalAttention = networkStatus === "Critical" && activeIncidents.length > 0;

  return (
    <main className="h-full overflow-hidden p-4 lg:p-5">
      <div className="mx-auto grid h-full max-w-[1600px] min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] gap-4">
        <section className="flex items-center justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-900/55 px-5 py-4">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Operations Overview</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Network Intelligence Dashboard</h1><p className="mt-1 text-xs text-slate-500">Live monitoring summary — open a workspace for detailed investigation.</p></div>
          <div className="flex items-center gap-3">
            <LiveFeedController onActivity={refresh} />
            <div className="grid grid-cols-3 gap-5 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"><StatusIndicator status={networkStatus} label="Network"/><StatusIndicator status={databaseStatus} label="Database"/><StatusIndicator status={apiStatus} label="API"/></div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardStatCard label="Active incidents" value={activeIncidents.length} href="/incidents" detail={criticalAttention ? "Immediate operator attention" : "Open incident workspace"} accent={<StatusIndicator status={networkStatus} compact />} attention={criticalAttention}/>
          <DashboardStatCard label="Alerts" value={alertCount} href="/alerts" detail="Critical & major signals" />
          <DashboardStatCard label="Events" value={events.length} href="/events" detail="Open live telemetry stream" />
          <DashboardStatCard label="Scenarios" value={simulationScenarios.length} href="/scenarios" detail="Run intelligence simulations" />
        </section>

        <section className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <NetworkTelemetryCharts eventCount={events.length} activeIncidentCount={activeIncidents.length} />
          <div className="grid min-h-0 grid-rows-[1fr_1fr_auto] gap-3">
            <Link href={latestIncident ? `/incidents/${latestIncident.id}` : "/incidents"} className="min-h-0 rounded-2xl border border-slate-800 bg-slate-900/65 p-4 transition hover:border-slate-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest incident</p>{latestIncident?<><p className="mt-2 line-clamp-1 font-semibold text-white">{latestIncident.title}</p><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{latestIncident.detection_reason}</span><span>{latestIncident.confidence_score}/100</span></div></>:<p className="mt-3 text-sm text-slate-500">No incidents detected.</p>}</Link>
            <Link href="/events" className="min-h-0 rounded-2xl border border-slate-800 bg-slate-900/65 p-4 transition hover:border-slate-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest event</p>{latestEvent?<><p className="mt-2 font-semibold text-white">{latestEvent.device}</p><p className="mt-1 text-xs text-slate-500">{latestEvent.type} · {latestEvent.severity}</p></>:<p className="mt-3 text-sm text-slate-500">No events recorded.</p>}</Link>
            <div className="grid grid-cols-2 gap-3"><Link href="/scenarios" className="rounded-xl bg-sky-500 px-4 py-3 text-center text-xs font-bold text-slate-950 transition hover:bg-sky-400">Run Scenario</Link><Link href="/topology" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-xs font-semibold text-slate-200 transition hover:bg-slate-800">View Topology</Link></div>
          </div>
        </section>
        {loading&&<div className="pointer-events-none fixed bottom-4 right-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">Loading NEXUS state…</div>}
      </div>
    </main>
  );
}
