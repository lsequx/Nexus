"use client";
import { useEffect, useState } from "react";
import type { IncidentEvidenceEvent } from "@/types/incident";

type Note = { id: string; incidentId: string; eventId?: string; text: string; author: string; createdAt: string };

export default function IncidentNotesPanel({ incidentId, evidenceEvents, canAdd }: { incidentId: string; evidenceEvents: IncidentEvidenceEvent[]; canAdd: boolean }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");
  const [eventId, setEventId] = useState("");

  const load = () => fetch(`/api/notes?incidentId=${encodeURIComponent(incidentId)}`).then((r) => r.ok ? r.json() : []).then(setNotes);
  useEffect(() => { load(); }, [incidentId]);

  const add = async () => {
    if (!text.trim()) return;
    const response = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ incidentId, eventId: eventId || undefined, text }) });
    if (response.ok) { setText(""); setEventId(""); await load(); }
  };

  return (
    <div className="space-y-3">
      {canAdd && <div className="grid gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <textarea value={text} onChange={(e)=>setText(e.target.value)} placeholder="Add investigation notes, observations, commands run, escalation details…" className="min-h-24 rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-amber-400" />
        <div className="flex gap-2">
          <select value={eventId} onChange={(e)=>setEventId(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs">
            <option value="">Link note to incident only</option>
            {evidenceEvents.map((event)=><option key={event.id} value={event.id}>Link: {event.device_name ?? event.device_id} · {event.type}</option>)}
          </select>
          <button onClick={add} className="rounded-lg bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950">Add note</button>
        </div>
      </div>}
      {notes.length === 0 ? <p className="text-sm text-slate-500">No operator notes yet.</p> : notes.map((note)=><div key={note.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"><div className="flex justify-between gap-3 text-[10px] text-slate-600"><span>{note.author}</span><span>{new Date(note.createdAt).toLocaleString()}</span></div><p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{note.text}</p>{note.eventId&&<p className="mt-2 font-mono text-[10px] text-sky-500">Linked event: {note.eventId}</p>}</div>)}
    </div>
  );
}
