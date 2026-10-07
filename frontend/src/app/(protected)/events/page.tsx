"use client";

import { useEffect, useState } from "react";
import EventCard from "@/components/EventCard";
import { fetchEvents } from "@/lib/api";
import type { Event } from "@/types/event";

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => fetchEvents().then(setEvents).finally(() => setLoading(false));
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto flex h-full max-w-[1500px] min-h-0 flex-col gap-4">
        <header className="shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-400">Telemetry stream</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Network Events</h1>
          <p className="mt-1 text-xs text-slate-500">{events.length} recorded events</p>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="space-y-2">
            {loading ? <p className="text-sm text-slate-500">Loading events…</p> : events.map((event) => <EventCard key={event.id} {...event} />)}
          </div>
        </div>
      </div>
    </main>
  );
}
