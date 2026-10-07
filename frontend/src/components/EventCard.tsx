import { getSeverityColor } from "@/utils/status";
import type { Event } from "@/types/event";
import { formatEventTime } from "@/utils/date";

export default function EventCard({ device, type, severity, timestamp }: Event) {
  return (
    <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto_auto] items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 text-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-100">{device}</p>
        <p className="mt-0.5 text-[11px] text-slate-600">Network event</p>
      </div>
      <p className="truncate text-slate-400">{type}</p>
      <span className={`font-semibold ${getSeverityColor(severity)}`}>{severity}</span>
      <span className="whitespace-nowrap text-xs text-slate-500">{formatEventTime(timestamp)}</span>
    </div>
  );
}
