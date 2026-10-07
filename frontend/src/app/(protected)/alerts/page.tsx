"use client";

import { useEffect, useMemo, useState } from "react";
import EventCard from "@/components/EventCard";
import { fetchEvents } from "@/lib/api";
import type { Event } from "@/types/event";

export default function AlertsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetchEvents().then(setEvents).finally(() => setLoading(false));
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  const alerts = useMemo(
    () => events.filter((event) => event.severity === "Critical" || event.severity === "Major"),
    [events],
  );

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto flex h-full max-w-[1500px] min-h-0 flex-col gap-4">
        <header className="shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-400">Attention queue</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Alerts</h1>
          <p className="mt-1 text-xs text-slate-500">Derived from Critical and Major network events · {alerts.length} active records</p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {loading ? <p className="text-sm text-slate-500">Loading alerts…</p> : alerts.map((event) => <EventCard key={event.id} {...event} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
