import { getStatusColor, getStatusDotColor } from "@/utils/status";

type WelcomeCardProps = {
  networkStatus: string;
  activeIncidentCount: number;
  eventCount: number;
};

export default function WelcomeCard({
  networkStatus,
  activeIncidentCount,
  eventCount,
}: WelcomeCardProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/70 shadow-sm">
      <div className="border-b border-slate-800 px-6 py-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Operations Overview
        </p>

        <h2 className="text-2xl font-semibold text-white">
          Network Intelligence at a glance
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
          NEXUS correlates network events, identifies probable root causes,
          evaluates topology impact, and continuously strengthens incident
          assessments as new evidence arrives.
        </p>
      </div>

      <div className="grid gap-px bg-slate-800 sm:grid-cols-3">
        <div className="bg-slate-900 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Network State
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${getStatusDotColor(
                networkStatus,
              )}`}
            />

            <span
              className={`text-lg font-semibold ${getStatusColor(
                networkStatus,
              )}`}
            >
              {networkStatus}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Active Incidents
          </p>

          <p className="mt-3 text-2xl font-semibold text-white">
            {activeIncidentCount}
          </p>
        </div>

        <div className="bg-slate-900 px-6 py-5">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Recorded Events
          </p>

          <p className="mt-3 text-2xl font-semibold text-white">{eventCount}</p>
        </div>
      </div>
    </section>
  );
}
