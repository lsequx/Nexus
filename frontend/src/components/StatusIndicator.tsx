import { getStatusColor, getStatusDotColor } from "@/utils/status";

export default function StatusIndicator({
  status,
  label,
  compact = false,
}: {
  status: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        <span
          className={`absolute h-3 w-3 rounded-full opacity-60 ${getStatusDotColor(
            status,
          )} ${
            status === "Critical"
              ? "animate-ping"
              : status === "Degraded"
                ? "status-pulse-medium"
                : "status-pulse-slow"
          }`}
        />
        <span
          className={`relative h-2 w-2 rounded-full ${getStatusDotColor(status)}`}
        />
      </span>

      <div className="min-w-0">
        {label && !compact && (
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
        )}
        <p className={`font-semibold ${compact ? "text-xs" : "text-sm"} ${getStatusColor(status)}`}>
          {status}
        </p>
      </div>
    </div>
  );
}
