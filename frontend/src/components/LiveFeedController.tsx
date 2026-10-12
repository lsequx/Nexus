"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createEvent } from "@/lib/api";

import type { Inventory } from "@/types/inventory";
const types = ["interface_down", "device_unreachable", "packet_loss", "high_latency"];
const severities = ["Minor", "Major", "Major", "Critical"];

function subscribePreference(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("nexus-live-demo-change", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("nexus-live-demo-change", callback);
  };
}

export default function LiveFeedController({ onActivity }: { onActivity?: () => void }) {
  const enabled = useSyncExternalStore(subscribePreference, () => localStorage.getItem("nexus-live-demo") === "true", () => false);
  const [last, setLast] = useState<string>("Waiting");
  const tick = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const run = async () => {
      tick.current += 1;
      const index = tick.current;
      try {
        const response = await fetch("/api/admin/inventory", { cache: "no-store" });
        if (!response.ok) throw new Error("Inventory unavailable");
        const inventory = await response.json() as Inventory;
        if (!inventory.devices.length) { setLast("No devices in inventory"); return; }
        const devices = inventory.devices;
        const link = inventory.links.find((item) => item.source === "dev-002") ?? inventory.links[0];
        const upstream = devices.find((device) => device.id === link?.source) ?? devices[0];
        if (index % 6 === 0) {
          await createEvent({ device_id: upstream.id, type: "device_unreachable", severity: "Critical" });
          await createEvent({ device_id: upstream.id, type: "device_unreachable", severity: "Critical" });
          setLast(`Repeated connectivity failure on ${upstream.name}`);
        } else if (index % 5 === 0 && link) {
          await createEvent({ device_id: link.source, type: "interface_down", severity: "Critical" });
          await createEvent({ device_id: link.target, type: "packet_loss", severity: "Major" });
          setLast(`Upstream outage: ${upstream.name} → ${devices.find((device) => device.id === link.target)?.name}`);
        } else {
          const device = devices[Math.floor(Math.random() * devices.length)];
          const type = types[Math.floor(Math.random() * types.length)];
          const severity = severities[Math.floor(Math.random() * severities.length)];
          await createEvent({ device_id: device.id, type, severity });
          setLast(`${device.name} · ${type} · ${severity}`);
        }
        onActivity?.();
      } catch {
        setLast("Live feed could not reach the backend");
      }
    };

    run();
    const id = window.setInterval(run, 8000);
    return () => window.clearInterval(id);
  }, [enabled, onActivity]);

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">
      <button
        onClick={() => { localStorage.setItem("nexus-live-demo", String(!enabled)); window.dispatchEvent(new Event("nexus-live-demo-change")); }}
        className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-400" : "bg-slate-700"}`}
        role="switch"
        aria-checked={enabled}
        aria-label="Automatic simulated event generation"
      >
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
      </button>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Live demo feed</p>
        <p className="max-w-[260px] truncate text-xs text-slate-300">{enabled ? last : "Off — enable automatic event generation"}</p>
      </div>
    </div>
  );
}
