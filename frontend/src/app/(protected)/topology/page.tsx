"use client";

import { useEffect, useState } from "react";
import NetworkTelemetryCharts from "@/components/NetworkTelemetryCharts";
import StatusIndicator from "@/components/StatusIndicator";
import { fetchEvents, fetchIncidents } from "@/lib/api";
import type { Event } from "@/types/event";
import type { Incident } from "@/types/incident";
import type { Inventory, InventoryDevice } from "@/types/inventory";
import { calculateNetworkStatus } from "@/utils/networkStatus";

const zoneColors: Record<string, string> = {
  WAN: "border-slate-500 bg-slate-900", Edge: "border-red-400/50 bg-slate-900",
  DMZ: "border-orange-400/50 bg-slate-900", Core: "border-violet-400/50 bg-slate-900",
  "Data center": "border-sky-400/50 bg-slate-900", LAN: "border-emerald-400/50 bg-slate-900",
  Wireless: "border-cyan-400/50 bg-slate-900", Management: "border-pink-400/50 bg-slate-900",
};

export default function TopologyPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inventory, setInventory] = useState<Inventory>({ devices: [], links: [] });
  const [selectedId, setSelectedId] = useState("");
  const [incidentId, setIncidentId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [eventData, incidentData, response] = await Promise.all([
          fetchEvents(), fetchIncidents(), fetch("/api/admin/inventory", { cache: "no-store" }),
        ]);
        if (!response.ok) throw new Error("Inventory could not be loaded.");
        const data = await response.json() as Inventory;
        if (!cancelled) { setEvents(eventData); setIncidents(incidentData); setInventory(data); setError(""); }
      } catch { if (!cancelled) setError("Unable to refresh topology. Check the backend connection and your session."); }
    };
    void load();
    const timer = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const activeIncidents = incidents.filter((incident) => incident.status === "Open" || incident.status === "Investigating");
  const activeIncident = activeIncidents.find((incident) => incident.id === incidentId) ?? activeIncidents[0];
  const impact = {
    root: activeIncident?.root_cause_device,
    rootId: activeIncident?.root_cause_device_id,
    observed: new Set(activeIncident?.observed_affected_devices.map((device) => device.device_id) ?? []),
    potential: new Set(activeIncident?.potential_affected_devices.map((device) => device.device_id) ?? []),
  };
  const byId = new Map(inventory.devices.map((device) => [device.id, device]));
  const selected = byId.get(selectedId);
  const nodeClass = (node: InventoryDevice) => {
    if (impact.rootId ? impact.rootId === node.id : impact.root === node.name) return "border-red-500 bg-red-950 shadow-[0_0_25px_rgba(239,68,68,.25)]";
    if (impact.observed.has(node.id)) return "border-orange-400 bg-orange-950";
    if (impact.potential.has(node.id)) return "border-amber-400 bg-amber-950";
    if (node.status === "Critical") return "border-red-500 bg-red-950";
    if (node.status === "Degraded") return "border-amber-400 bg-amber-950";
    return zoneColors[node.zone ?? ""] ?? "border-sky-500/40 bg-slate-900";
  };

  return (
    <main className="h-full overflow-auto p-5">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">WAN · DMZ · Data center · LAN · Wireless · Management</p><h1 className="mt-1 text-2xl font-bold text-white">Network Topology</h1><p className="mt-2 max-w-3xl text-xs leading-5 text-slate-400">Scroll to explore the full site. Arrows run from upstream service to dependent device. Select an asset to inspect its role, management address, and connections. Potential impact is dependency scope, not proof of an outage.</p></div>
            <StatusIndicator status={calculateNetworkStatus(incidents)} label="Network" />
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <span className="text-slate-400">{inventory.devices.length} assets · {inventory.links.length} dependencies</span>
            <span className="text-red-400">● Root cause</span><span className="text-orange-400">● Observed impact</span><span className="text-amber-400">● Potential impact</span>
            {activeIncidents.length > 0 && <select aria-label="Incident to highlight" value={activeIncident?.id ?? ""} onChange={(event) => setIncidentId(event.target.value)} className="max-w-sm rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300">{activeIncidents.map((incident) => <option key={incident.id} value={incident.id}>{incident.title}</option>)}</select>}
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="overflow-auto rounded-xl border border-slate-800 bg-slate-950/50">
              <div className="relative h-[1100px] min-w-[1800px]">
                <svg aria-hidden="true" className="absolute inset-0 h-full w-full" viewBox="0 0 1800 1100" preserveAspectRatio="none">
                  <defs><marker id="dependency-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" /></marker></defs>
                  {inventory.links.map((link) => {
                    const source = byId.get(link.source), target = byId.get(link.target);
                    if (!source || !target) return null;
                    const x1 = source.x * 18, y1 = source.y * 11 + 42;
                    const x2 = target.x * 18, y2 = target.y * 11 - 42;
                    const middle = (y1 + y2) / 2;
                    return <g key={link.id}><path d={`M ${x1} ${y1} V ${middle} H ${x2} V ${y2}`} fill="none" stroke="#475569" strokeWidth="2" markerEnd="url(#dependency-arrow)" /><title>{source.name} → {target.name}: {link.label}</title></g>;
                  })}
                </svg>
                {inventory.devices.map((node) => <button key={node.id} onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id} className={`absolute w-[174px] -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 text-center shadow-lg transition focus:outline-2 focus:outline-sky-400 ${nodeClass(node)} ${selectedId === node.id ? "ring-2 ring-sky-400" : ""}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{node.zone} · {node.type}</p>
                  <p className="mt-1 truncate text-xs font-bold text-white" title={node.name}>{node.name}</p>
                  <p className="mt-1 font-mono text-[10px] text-slate-400">{node.ip || "No address"}</p>
                </button>)}
                {inventory.devices.length === 0 && <p className="p-8 text-sm text-slate-500">No inventory loaded.</p>}
              </div>
            </div>
            <aside className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <h2 className="text-sm font-bold text-white">{selected?.name ?? "Asset details"}</h2>
              {selected ? <div className="mt-3 space-y-4 text-xs text-slate-400">
                <p>{selected.type} · {selected.zone || "Unassigned zone"}</p><p className="font-mono">{selected.ip || "No management address"}</p><p className="leading-5">{selected.role || "No role specified"}</p><StatusIndicator compact status={selected.status} />
                <p className="font-mono text-[10px]">{selected.id}</p>
                <h3 className="font-semibold text-white">Upstream services</h3>
                {inventory.links.filter((link) => link.target === selected.id).map((link) => <p key={link.id}>{byId.get(link.source)?.name}<br /><span className="text-slate-500">{link.label}</span></p>)}
                {!inventory.links.some((link) => link.target === selected.id) && <p>Independent root / provider handoff</p>}
                <h3 className="font-semibold text-white">Downstream dependencies</h3>
                {inventory.links.filter((link) => link.source === selected.id).map((link) => <p key={link.id}>{byId.get(link.target)?.name}<br /><span className="text-slate-500">{link.label}</span></p>)}
                {!inventory.links.some((link) => link.source === selected.id) && <p>Endpoint</p>}
              </div> : <p className="mt-3 text-xs leading-5 text-slate-400">Choose a device on the map. This reference site includes segmented server racks, a DMZ, office access, wireless clients, and an independent management network.</p>}
              <p className="mt-6 border-t border-slate-800 pt-4 text-[11px] leading-5 text-slate-500">This is a logical dependency map. Production sites typically add redundant edge, firewall, and core pairs; physical HA paths and failover state are not simulated here.</p>
            </aside>
          </div>
        </section>
        <NetworkTelemetryCharts eventCount={events.length} activeIncidentCount={activeIncidents.length} inventory={inventory} />
      </div>
    </main>
  );
}
