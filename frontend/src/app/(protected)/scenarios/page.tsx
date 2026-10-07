"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { simulationScenarios } from "@/data/scenarios";
import { createEvent, fetchIncidents } from "@/lib/api";

export default function ScenariosPage() {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(simulationScenarios[0].id);
  const [running, setRunning] = useState(false);

  const selected = simulationScenarios.find((scenario) => scenario.id === selectedId) ?? simulationScenarios[0];

  const runScenario = async () => {
    if (running) return;
    setRunning(true);

    try {
      const before = await fetchIncidents();
      const beforeIds = new Set(before.map((incident) => incident.id));

      for (const event of selected.events) {
        await createEvent(event);
      }

      const after = await fetchIncidents();
      const created = after.find((incident) => !beforeIds.has(incident.id));
      const newestActive = after.find((incident) => incident.status === "Open" || incident.status === "Investigating");
      const target = created ?? newestActive;

      if (target) {
        router.push(`/incidents/${target.id}`);
      } else {
        router.push("/events");
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto grid h-full max-w-[1400px] min-h-0 grid-cols-[360px_minmax(0,1fr)] gap-4">
        <aside className="min-h-0 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/55 p-3">
          <p className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Scenario library</p>
          <div className="space-y-2">
            {simulationScenarios.map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => setSelectedId(scenario.id)}
                className={`w-full rounded-xl border px-3 py-3 text-left transition ${selectedId === scenario.id ? "border-sky-500/50 bg-sky-500/10" : "border-slate-800 bg-slate-950/30 hover:bg-slate-900"}`}
              >
                <p className="text-sm font-semibold text-white">{scenario.name}</p>
                <p className="mt-1 text-[11px] text-slate-500">{scenario.events.length} events</p>
              </button>
            ))}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col rounded-2xl border border-slate-800 bg-slate-900/55 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Intelligence lab</p>
          <h1 className="mt-2 text-2xl font-bold text-white">{selected.name}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">{selected.description}</p>

          <div className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selected.events.map((event, index) => (
              <div key={`${event.device_id}-${index}`} className="grid grid-cols-[44px_1fr_auto_auto] items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3">
                <span className="text-xs font-bold text-slate-600">#{index + 1}</span>
                <span className="font-semibold text-slate-200">{event.device_id}</span>
                <span className="text-xs text-slate-400">{event.type}</span>
                <span className="text-xs font-semibold text-slate-300">{event.severity}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-5">
            <p className="text-xs text-slate-500">After execution, NEXUS opens the resulting incident automatically.</p>
            <button
              onClick={runScenario}
              disabled={running}
              className="rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
            >
              {running ? "Running Scenario…" : "Run Scenario"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
