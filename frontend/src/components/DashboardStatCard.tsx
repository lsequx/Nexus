import Link from "next/link";
import type { ReactNode } from "react";

export default function DashboardStatCard({ label, value, href, detail, accent, attention = false }: { label: string; value: number | string; href: string; detail: string; accent?: ReactNode; attention?: boolean }) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[140px] flex-col justify-between rounded-2xl border p-5 transition-colors ${attention ? "border-red-500/40 bg-red-950/20 hover:border-red-400 hover:bg-red-950/80" : "border-slate-800 bg-slate-900/65 hover:border-slate-700 hover:bg-slate-900"}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${attention ? "text-red-300" : "text-slate-500"}`}>{label}</p>
        {accent}
      </div>
      <div>
        <p className="text-4xl font-semibold tabular-nums tracking-tight text-white">{value}</p>
        <p className={`mt-1 text-xs transition ${attention ? "text-red-300/80" : "text-slate-500 group-hover:text-slate-400"}`}>{detail} →</p>
      </div>
    </Link>
  );
}
