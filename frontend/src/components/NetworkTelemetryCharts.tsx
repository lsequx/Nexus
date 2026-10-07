"use client";

import { useEffect, useMemo, useState } from "react";

function seedSeries(eventCount: number, activeIncidents: number) {
  const base = 30 + Math.min(eventCount * 1.5, 26) + activeIncidents * 8;
  return Array.from({ length: 16 }, (_, index) => {
    const wave = Math.sin(index / 2.1) * 8;
    return Math.max(8, Math.min(94, Math.round(base + wave + (index % 3) * 2)));
  });
}

function buildPath(values: number[]) {
  const width = 560;
  const height = 120;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / 100) * height;
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function NetworkTelemetryCharts({
  eventCount,
  activeIncidentCount,
}: {
  eventCount: number;
  activeIncidentCount: number;
}) {
  const [bandwidth, setBandwidth] = useState(() => seedSeries(eventCount, activeIncidentCount));
  const [packetRate, setPacketRate] = useState(2400);

  useEffect(() => {
    setBandwidth(seedSeries(eventCount, activeIncidentCount));
  }, [eventCount, activeIncidentCount]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setBandwidth((current) => {
        const previous = current.at(-1) ?? 40;
        const incidentPressure = activeIncidentCount * 2.5;
        const next = Math.max(
          8,
          Math.min(
            96,
            Math.round(previous + (Math.random() - 0.47) * 11 + incidentPressure),
          ),
        );
        return [...current.slice(1), next];
      });

      setPacketRate((current) =>
        Math.max(900, Math.round(current + (Math.random() - 0.5) * 420 + activeIncidentCount * 80)),
      );
    }, 2000);

    return () => window.clearInterval(id);
  }, [activeIncidentCount]);

  const latest = bandwidth.at(-1) ?? 0;
  const average = Math.round(bandwidth.reduce((sum, item) => sum + item, 0) / bandwidth.length);
  const path = buildPath(bandwidth);

  const flows = useMemo(
    () => [
      { label: "router-01 → router-02", value: Math.min(96, Math.round(latest * 0.9 + activeIncidentCount * 4)) },
      { label: "router-01 → router-03", value: Math.min(90, Math.round(average * 0.72 + eventCount * 0.8)) },
      { label: "router-02 → router-04", value: Math.min(84, Math.round(average * 0.55 + activeIncidentCount * 6)) },
    ],
    [latest, average, activeIncidentCount, eventCount],
  );

  return (
    <div className="grid min-h-0 gap-4 lg:grid-cols-[1.5fr_1fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Bandwidth utilization
            </p>
            <div className="mt-1 flex items-end gap-3">
              <p className="text-2xl font-bold text-white">{latest}%</p>
              <p className="pb-1 text-[10px] text-slate-500">avg {average}% · {packetRate.toLocaleString()} pkt/s</p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live demo telemetry
          </span>
        </div>

        <div className="mt-3 h-[135px] w-full">
          <svg viewBox="0 0 560 140" className="h-full w-full" preserveAspectRatio="none">
            {[25, 50, 75].map((level) => (
              <line
                key={level}
                x1="0"
                x2="560"
                y1={120 - (level / 100) * 120}
                y2={120 - (level / 100) * 120}
                stroke="rgb(51 65 85)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />
            ))}
            <path d={path} fill="none" stroke="rgb(56 189 248)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
            <circle cx="560" cy={120 - (latest / 100) * 120} r="4" fill="rgb(56 189 248)" />
          </svg>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/65 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Traffic flow
            </p>
            <p className="mt-1 text-sm font-semibold text-white">Link utilization</p>
          </div>
          <span className="text-[10px] text-slate-600">updates every 2s</span>
        </div>

        <div className="mt-4 space-y-4">
          {flows.map((flow) => (
            <div key={flow.label}>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-slate-400">{flow.label}</span>
                <span className="font-semibold text-slate-200">{flow.value}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ${flow.value > 80 ? "bg-red-400" : flow.value > 65 ? "bg-amber-400" : "bg-sky-400"}`}
                  style={{ width: `${flow.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
