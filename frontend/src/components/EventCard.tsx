import { getSeverityColor } from "@/utils/status";
import type { Event } from "@/types/event";
import { formatEventTime } from "@/utils/date";

export default function EventCard({
    device,
    type,
    severity,
    timestamp
}: Event) {
    return (
        <div className="rounded-lg border p-4 space-y-3">
            <h2 className="text-xl font-semibold">Newtork Event</h2>
            <p>
                Device: <span className="font-semibold">{device}</span>
            </p>
            <p>
                Type: <span className="font-semibold">{type}</span>
            </p>
            <p>
                Severity: <span className={`font-semibold ${getSeverityColor(severity)}`}>{severity}</span>
            </p>
            <p>
                Time: <span className="font-semibold">{formatEventTime(timestamp)}</span>
            </p>
        </div>
    )
}