"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import StatusIndicator from "@/components/StatusIndicator";
import NavIcon from "@/components/NavIcon";
import { fetchIncidents } from "@/lib/api";
import type { Incident } from "@/types/incident";
import { calculateNetworkStatus } from "@/utils/networkStatus";
import { getIncidentStatusColor, getSeverityColor } from "@/utils/status";

const filters = ["All", "Active", "Resolved", "Closed"] as const;
export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]>("All");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await fetchIncidents();
        if (!cancelled) { setIncidents(data); setError(""); }
      } catch { if (!cancelled) setError("Unable to refresh incidents. Showing the last available results."); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    const id = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const isActive = (incident: Incident) => incident.status === "Open" || incident.status === "Investigating";
  const counts = { All: incidents.length, Active: incidents.filter(isActive).length, Resolved: incidents.filter(i => i.status === "Resolved").length, Closed: incidents.filter(i => i.status === "Closed").length };
  const visible = incidents.filter(incident => (filter === "All" || (filter === "Active" ? isActive(incident) : incident.status === filter)) && `${incident.title} ${incident.root_cause_device ?? ""} ${incident.severity} ${incident.detection_reason}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <main className="h-full overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Investigate & respond</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Incident workspace</h1><p className="mt-2 text-sm text-slate-400">Follow the evidence. Identify the source. Track the resolution.</p></div><StatusIndicator status={calculateNetworkStatus(incidents)} label="Network" /></header>
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40" aria-label="Incident list">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 p-4"><div className="flex flex-wrap gap-1" role="group" aria-label="Filter incidents by status">{filters.map(item => <button key={item} aria-pressed={filter === item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-2 text-xs font-medium ${filter === item ? "bg-sky-500/15 text-sky-300" : "text-slate-400 hover:bg-slate-800"}`}>{item}<span className="ml-2 tabular-nums opacity-70">{counts[item]}</span></button>)}</div><div className="w-full sm:w-64"><label className="sr-only" htmlFor="incident-search">Search incidents</label><input id="incident-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search title, device, severity…" className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-xs text-slate-200 placeholder:text-slate-500" /></div></div>
          {error && <p role="alert" className="border-b border-amber-400/20 bg-amber-400/5 px-5 py-3 text-xs text-amber-200">{error}</p>}
          <div className="hidden grid-cols-[minmax(0,1fr)_90px_110px_90px_20px] gap-4 border-b border-slate-800 bg-slate-950/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400 md:grid"><span>Incident / root cause</span><span>Severity</span><span>Status</span><span>Confidence</span><span /></div>
          {loading ? <p role="status" className="p-10 text-center text-sm text-slate-400">Loading incident workspace…</p> : visible.length === 0 ? <div className="px-6 py-16 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 text-sky-300"><NavIcon name="incidents" /></span><h2 className="mt-4 text-base font-semibold text-white">{incidents.length ? "No matching incidents" : error ? "Incidents unavailable" : "No incidents detected"}</h2><p className="mt-2 text-sm text-slate-400">{incidents.length ? "Try another search or status filter." : error ? "Check the backend connection and try again." : "Run a scenario to explore root-cause analysis and impact."}</p>{incidents.length ? <button onClick={() => { setQuery(""); setFilter("All"); }} className="mt-5 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200">Clear filters</button> : !error && <Link href="/scenarios" className="mt-5 inline-flex rounded-lg bg-sky-400 px-4 py-2 text-xs font-semibold text-slate-950">Explore scenarios</Link>}</div> : <div className="divide-y divide-slate-800">{visible.map(incident => <Link key={incident.id} href={`/incidents/${incident.id}`} className="grid grid-cols-2 items-center gap-3 px-5 py-5 transition-colors hover:bg-slate-800/40 md:grid-cols-[minmax(0,1fr)_90px_110px_90px_20px] md:gap-4"><div className="col-span-2 min-w-0 md:col-span-1"><p className="font-medium text-white">{incident.title}</p><p className="mt-1.5 text-xs leading-5 text-slate-400">{incident.root_cause_device ?? "Root cause undetermined"} · {incident.detection_reason}</p></div><span className={`text-xs font-semibold ${getSeverityColor(incident.severity)}`}>{incident.severity}</span><span className={`text-xs font-medium ${getIncidentStatusColor(incident.status)}`}>{incident.status}</span><div><p className="text-sm font-semibold tabular-nums text-white">{incident.confidence_score}<span className="text-xs font-normal text-slate-400"> / 100</span></p><p className="mt-1 text-[10px] text-slate-400">{incident.confidence} confidence</p></div><NavIcon name="arrow" className="justify-self-end text-slate-500" width="16" height="16" /></Link>)}</div>}
          {!loading && visible.length > 0 && <p aria-live="polite" className="border-t border-slate-800 px-5 py-3 text-xs text-slate-400">Showing {visible.length} of {incidents.length} incidents · active incidents first</p>}
        </section>
      </div>
    </main>
  );
}
