import { getStatusColor, getStatusDotColor } from "@/utils/status";

type StatusCardProps = {
  name: string;
  status: string;
  description?: string;
};

export default function StatusCard({
  name,
  status,
  description,
}: StatusCardProps) {
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-sm">
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {name}
        </p>

        <div className="flex items-center gap-3">
          <span
            className={`h-2.5 w-2.5 rounded-full ${getStatusDotColor(status)}`}
          />

          <p className={`text-lg font-semibold ${getStatusColor(status)}`}>
            {status}
          </p>
        </div>

        {description && (
          <p className="text-sm leading-6 text-slate-400">{description}</p>
        )}
      </div>
    </div>
  );
}
