"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import NavIcon from "@/components/NavIcon";

export default function LoginPage() {
  return <Suspense fallback={<p role="status" className="p-6 text-slate-400">Loading sign-in…</p>}><LoginForm /></Suspense>;
}
function LoginForm() {
  const router = useRouter(); const params = useSearchParams();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Unable to sign in. Check your email and password."); return; }
      const next = params.get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/"); router.refresh();
    } catch { setError("Could not connect. Please try again."); }
    finally { setBusy(false); }
  };
  return <main className="grid min-h-dvh lg:grid-cols-2">
    <section className="relative hidden flex-col justify-between border-r border-slate-800 bg-[#080f1d] p-12 xl:p-16 lg:flex">
      <div className="flex items-center gap-3"><span className="brand-mark">NX</span><span className="text-lg font-bold tracking-[0.15em] text-white">NEXUS</span></div>
      <div className="max-w-lg"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">Network intelligence</p><h2 className="mt-6 text-5xl font-semibold leading-[1.12] tracking-tight text-white">From noisy signals<br />to clear decisions.</h2><p className="mt-6 text-base leading-7 text-slate-400">Trace an incident to its source. Understand its impact. See the evidence behind every assessment.</p><div className="mt-10 space-y-5">{[{ icon: "topology", title: "Context from your topology", detail: "Connect upstream failures to downstream symptoms." }, { icon: "events", title: "Evidence you can explain", detail: "Transparent scoring, with every factor visible." }, { icon: "scenarios", title: "A safe space to investigate", detail: "Explore realistic failures using simulated events." }].map(item => <div key={item.title} className="flex gap-4"><span className="mt-1 text-sky-300"><NavIcon name={item.icon as "topology" | "events" | "scenarios"} /></span><div><p className="text-sm font-medium text-slate-200">{item.title}</p><p className="mt-1 text-xs leading-5 text-slate-400">{item.detail}</p></div></div>)}</div></div>
      <p className="text-xs text-slate-500">Network Intelligence & Incident Response Platform</p>
    </section>
    <section className="flex items-center justify-center px-6 py-12 sm:px-12"><div className="w-full max-w-sm"><div className="mb-10 flex items-center gap-3 lg:hidden"><span className="brand-mark">NX</span><span className="text-lg font-bold tracking-wider">NEXUS</span></div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Your operations workspace</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Welcome back</h1><p className="mt-3 text-sm leading-6 text-slate-400">Sign in to investigate incidents and explore your network.</p>
      {error && <div id="login-error" role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-300">{error}</div>}
      <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={busy} aria-describedby={error ? "login-error" : undefined}><div><label htmlFor="email" className="mb-2 block text-xs font-medium text-slate-300">Email address</label><input id="email" name="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500" /></div><div><div className="mb-2 flex items-center justify-between"><label htmlFor="password" className="text-xs font-medium text-slate-300">Password</label><Link className="text-xs text-sky-300 hover:underline" href="/reset-password">Forgot password?</Link></div><input id="password" name="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm text-slate-200" /></div><button disabled={busy} className="flex w-full items-center justify-center gap-3 rounded-lg bg-sky-400 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-300 disabled:cursor-wait disabled:opacity-50">{busy ? "Signing in…" : "Sign in to workspace"}<NavIcon name="arrow" width="16" height="16" /></button></form><p className="mt-6 text-center text-xs text-slate-400">New to NEXUS? <Link className="font-medium text-sky-300 hover:underline" href="/signup">Create an account</Link></p><p className="mt-10 border-t border-slate-800 pt-5 text-center text-xs leading-5 text-slate-500">A topology-aware workspace for network investigation.</p>
    </div></section>
  </main>;
}
