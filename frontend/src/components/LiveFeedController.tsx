"use client";
import { useEffect, useRef, useState } from "react";
import { createEvent } from "@/lib/api";

const devices = ["dev-001", "dev-002", "dev-003", "dev-004"];
const types = ["interface_down", "device_unreachable", "packet_loss", "high_latency"];
const severities = ["Minor", "Major", "Major", "Critical"];

export default function LiveFeedController({ onActivity }: { onActivity?: () => void }) {
  const [enabled, setEnabled] = useState(false);
  const [last, setLast] = useState<string>("Waiting");
  const tick = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("nexus-live-demo") === "true";
    setEnabled(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem("nexus-live-demo", String(enabled));
    if (!enabled) return;

    const run = async () => {
      tick.current += 1;
      const index = tick.current;
      try {
        if (index % 6 === 0) {
          await createEvent({ device_id: "dev-001", type: "device_unreachable", severity: "Critical" });
          await createEvent({ device_id: "dev-001", type: "device_unreachable", severity: "Critical" });
          setLast("Critical device-unreachable burst on router-01");
        } else if (index % 5 === 0) {
          await createEvent({ device_id: "dev-001", type: "interface_down", severity: "Critical" });
          await createEvent({ device_id: "dev-002", type: "packet_loss", severity: "Major" });
          setLast("Topology-linked outage on router-01 → router-02");
        } else {
          const device = devices[Math.floor(Math.random() * devices.length)];
          const type = types[Math.floor(Math.random() * types.length)];
          const severity = severities[Math.floor(Math.random() * severities.length)];
          await createEvent({ device_id: device, type, severity });
          setLast(`${device} · ${type} · ${severity}`);
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
        onClick={() => setEnabled((value) => !value)}
        className={`relative h-6 w-11 rounded-full transition ${enabled ? "bg-emerald-400" : "bg-slate-700"}`}
        aria-label="Toggle live demo feed"
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
