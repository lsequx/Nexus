import Link from "next/link";

export default function ResetPage() {
  return <main className="flex h-full items-center justify-center p-6"><div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-7"><h1 className="text-2xl font-bold">Password recovery</h1><p className="mt-3 text-sm leading-6 text-slate-400">Contact the project administrator to reset your password. Online recovery is unavailable until verified email delivery is configured.</p><Link href="/login" className="mt-5 block text-xs text-sky-400">← Back to login</Link></div></main>;
}
