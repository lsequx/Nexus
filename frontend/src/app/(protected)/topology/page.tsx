"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkTelemetryCharts from "@/components/NetworkTelemetryCharts";
import StatusIndicator from "@/components/StatusIndicator";
import { fetchEvents, fetchIncidents } from "@/lib/api";
import type { Event } from "@/types/event";
import type { Incident } from "@/types/incident";
import type { Inventory } from "@/types/inventory";
import { calculateNetworkStatus } from "@/utils/networkStatus";

export default function TopologyPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [inventory, setInventory] = useState<Inventory>({ devices: [], links: [] });

  useEffect(() => {
    const load = async () => {
      const [eventData, incidentData, inventoryResponse] = await Promise.all([
        fetchEvents(),
        fetchIncidents(),
        fetch("/api/admin/inventory", { cache: "no-store" }),
      ]);
      setEvents(eventData);
      setIncidents(incidentData);
      if (inventoryResponse.ok) setInventory(await inventoryResponse.json());
    };
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  const status = calculateNetworkStatus(incidents);
  const activeIncidents = incidents.filter((incident) => incident.status === "Open" || incident.status === "Investigating");
  const activeIncident = activeIncidents[0];

  const impact = useMemo(() => {
    const root = activeIncident?.root_cause_device;
    const observed = new Set(activeIncident?.observed_affected_devices.map((device) => device.device_name ?? device.device_id) ?? []);
    const potential = new Set(activeIncident?.potential_affected_devices.map((device) => device.device_name ?? device.device_id) ?? []);
    return { root, observed, potential };
  }, [activeIncident]);

  const byId = new Map(inventory.devices.map((device) => [device.id, device]));

  const nodeClass = (name: string, statusValue: string) => {
    if (impact.root === name) return "border-red-500 bg-red-950/80 shadow-[0_0_30px_rgba(239,68,68,.22)]";
    if (impact.observed.has(name)) return "border-orange-400/70 bg-orange-950/50";
    if (impact.potential.has(name)) return "border-amber-400/40 bg-amber-950/30";
    if (statusValue === "Critical") return "border-red-500/60 bg-red-950/40";
    if (statusValue === "Degraded") return "border-amber-400/50 bg-amber-950/30";
    return "border-sky-500/30 bg-slate-900";
  };

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto grid h-full max-w-[1500px] min-h-0 grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)] gap-4">
        <section className="relative min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Dependency map</p><h1 className="mt-1 text-2xl font-bold text-white">Network Topology</h1><p className="mt-1 text-xs text-slate-500">Root cause = red · observed impact = orange · potential impact = amber</p></div>
            <StatusIndicator status={status} label="Network" />
          </div>

          <div className="relative mt-5 h-[calc(100%-85px)] min-h-[400px] rounded-xl border border-slate-800 bg-slate-950/50">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              {inventory.links.map((link) => {
                const source = byId.get(link.source); const target = byId.get(link.target);
                if (!source || !target) return null;
                return <line key={link.id} x1={source.x} y1={source.y} x2={target.x} y2={target.y} stroke="rgb(71 85 105)" strokeWidth="0.6" />;
              })}
            </svg>

            {inventory.devices.map((node) => (
              <div key={node.id} className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-xl border px-4 py-3 text-center shadow-lg transition ${nodeClass(node.name, node.status)}`} style={{ left: `${node.x}%`, top: `${node.y}%` }}>
                <div className={`mx-auto mb-2 h-2.5 w-2.5 rounded-full ${impact.root === node.name ? "bg-red-400 animate-ping" : impact.observed.has(node.name) ? "bg-orange-400 status-pulse-medium" : impact.potential.has(node.name) ? "bg-amber-300 status-pulse-slow" : "bg-emerald-400 status-pulse-slow"}`} />
                <p className="text-xs font-bold text-white">{node.name}</p>
                <p className="mt-1 text-[10px] text-slate-500">{node.type} · {node.id}</p>
              </div>
            ))}

            {inventory.devices.length === 0 && <div className="flex h-full items-center justify-center text-sm text-slate-600">No topology inventory loaded.</div>}
          </div>
        </section>

        <div className="min-h-0 overflow-hidden">
          <NetworkTelemetryCharts eventCount={events.length} activeIncidentCount={activeIncidents.length} />
        </div>
      </div>
    </main>
  );
}
