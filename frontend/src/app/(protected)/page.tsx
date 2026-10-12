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
import { getSeverityColor } from "@/utils/status";
import { simulationScenarios } from "@/data/scenarios";

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [apiStatus, setApiStatus] = useState("Degraded");
  const [databaseStatus, setDatabaseStatus] = useState("Degraded");
  const [loading, setLoading] = useState(true);
  const [refreshError, setRefreshError] = useState("");

  const refresh = useCallback(async () => {
    const healthPromise = fetchHealth().then((health) => setApiStatus(health.status === "ok" ? "Operational" : "Degraded")).catch(() => setApiStatus("Critical"));
    try {
      const [eventData, incidentData] = await Promise.all([fetchEvents(), fetchIncidents()]);
      setEvents(eventData); setIncidents(incidentData); setDatabaseStatus("Operational"); setRefreshError("");
    } catch { setDatabaseStatus("Critical"); setRefreshError("Unable to refresh operational data. Check the backend connection. Any displayed results may be stale."); }
    await healthPromise; setLoading(false);
  }, []);

  useEffect(() => { const initial = window.setTimeout(refresh, 0); const id = window.setInterval(refresh, 5000); return () => { window.clearTimeout(initial); window.clearInterval(id); }; }, [refresh]);

  const networkStatus = calculateNetworkStatus(incidents);
  const activeIncidents = incidents.filter((incident) => incident.status === "Open" || incident.status === "Investigating");
  const alertCount = events.filter((event) => event.severity === "Critical" || event.severity === "Major").length;
  const latestIncident = useMemo(() => [...incidents].sort((a,b)=>+new Date(b.created_at)-+new Date(a.created_at))[0], [incidents]);
  const latestEvent = useMemo(() => [...events].sort((a,b)=>+new Date(b.timestamp)-+new Date(a.timestamp))[0], [events]);
  const criticalAttention = networkStatus === "Critical" && activeIncidents.length > 0;

  return (
    <main className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-6">
        <section className="flex flex-wrap items-start justify-between gap-5">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Operations overview</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Your network, at a glance</h1><p className="mt-2 text-sm text-slate-400">Triage incidents, trace dependencies, and follow the evidence.</p></div>
          <div className="flex flex-wrap items-center gap-3">
            <LiveFeedController onActivity={refresh} />
            <div className="grid grid-cols-3 gap-4 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3"><StatusIndicator status={networkStatus} label="Network"/><StatusIndicator status={databaseStatus} label="Database"/><StatusIndicator status={apiStatus} label="API"/></div>
          </div>
        </section>

        {refreshError && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-200">{refreshError}</p>}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DashboardStatCard label="Active incidents" value={activeIncidents.length} href="/incidents" detail={criticalAttention ? "Immediate operator attention" : "Open incident workspace"} accent={<StatusIndicator status={networkStatus} compact />} attention={criticalAttention}/>
          <DashboardStatCard label="Alerts" value={alertCount} href="/alerts" detail="Critical & major signals" />
          <DashboardStatCard label="Events" value={events.length} href="/events" detail="Open live telemetry stream" />
          <DashboardStatCard label="Scenarios" value={simulationScenarios.length} href="/scenarios" detail="Run intelligence simulations" />
        </section>

        <section className="grid min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <NetworkTelemetryCharts eventCount={events.length} activeIncidentCount={activeIncidents.length} />
          <div className="grid min-h-0 gap-3">
            <Link href={latestIncident ? `/incidents/${latestIncident.id}` : "/incidents"} className="min-h-0 rounded-2xl border border-slate-800 bg-slate-900/65 p-4 transition hover:border-slate-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest incident</p>{latestIncident?<><p className="mt-2 line-clamp-1 font-semibold text-white">{latestIncident.title}</p><div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{latestIncident.detection_reason}</span><span>{latestIncident.confidence_score}/100</span></div></>:<p className="mt-3 text-sm text-slate-500">No incidents detected.</p>}</Link>
            <Link href="/events" className="min-h-0 rounded-2xl border border-slate-800 bg-slate-900/65 p-4 transition hover:border-slate-700"><p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Latest event</p>{latestEvent?<><p className="mt-2 font-semibold text-white">{latestEvent.device}</p><p className="mt-1 text-xs text-slate-500">{latestEvent.type} · {latestEvent.severity}</p></>:<p className="mt-3 text-sm text-slate-500">No events recorded.</p>}</Link>
            <div className="grid grid-cols-2 gap-3"><Link href="/scenarios" className="rounded-xl bg-sky-500 px-4 py-3 text-center text-xs font-bold text-slate-950 transition hover:bg-sky-400">Run Scenario</Link><Link href="/topology" className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-xs font-semibold text-slate-200 transition hover:bg-slate-800">View Topology</Link></div>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4"><div><h2 className="text-sm font-semibold text-white">Needs attention</h2><p className="mt-1 text-xs text-slate-400">Open and investigating incidents</p></div><Link href="/incidents" className="text-xs font-semibold text-sky-300">View all →</Link></div>
          {loading ? <p role="status" className="p-6 text-sm text-slate-400">Loading incidents…</p> : activeIncidents.length ? <div className="divide-y divide-slate-800">{[...activeIncidents].sort((a,b) => Number(b.severity === "Critical") - Number(a.severity === "Critical") || +new Date(b.created_at)-+new Date(a.created_at)).slice(0,4).map(incident => <Link key={incident.id} href={`/incidents/${incident.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-slate-800/30"><div><p className="text-sm font-medium text-slate-200">{incident.title}</p><p className="mt-1 text-xs text-slate-400">{incident.root_cause_device ?? "Root cause undetermined"}</p></div><div className="flex items-center gap-4 text-xs"><span className={getSeverityColor(incident.severity)}>{incident.severity}</span><span className="text-slate-400">{incident.status}</span><span className="tabular-nums text-slate-200">{incident.confidence_score}/100</span></div></Link>)}</div> : <div className="px-5 py-8"><p className="text-sm font-medium text-slate-200">{refreshError ? "Operational data unavailable" : "No active incidents"}</p><p className="mt-2 text-xs text-slate-400">{refreshError ? "Restore the connection to check incident status." : "Explore the scenario lab to see how NEXUS investigates a simulated failure."}</p></div>}
        </section>
        {loading&&<div className="pointer-events-none fixed bottom-4 right-4 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400">Loading NEXUS state…</div>}
      </div>
    </main>
  );
}
