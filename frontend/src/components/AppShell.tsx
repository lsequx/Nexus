"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

type User = { id: string; name: string; email: string; role: "admin" | "operator" | "viewer" };
const publicPaths = ["/login", "/signup", "/reset-password"];
const navItems = [
  { href: "/", label: "Overview" },
  { href: "/incidents", label: "Incidents" },
  { href: "/alerts", label: "Alerts" },
  { href: "/events", label: "Events" },
  { href: "/scenarios", label: "Scenarios" },
  { href: "/topology", label: "Topology" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(!isPublic);

  useEffect(() => {
    if (isPublic) { setChecking(false); return; }
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("unauthorized");
        const data = await response.json();
        setUser(data.user);
      })
      .catch(() => router.replace(`/login?next=${encodeURIComponent(pathname)}`))
      .finally(() => setChecking(false));
  }, [isPublic, pathname, router]);

  if (isPublic) return <div className="h-screen overflow-hidden bg-slate-950 text-slate-100">{children}</div>;
  if (checking) return <div className="flex h-screen items-center justify-center bg-slate-950 text-sm text-slate-500">Validating NEXUS session…</div>;

  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); };

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="shrink-0 border-b border-slate-800 bg-slate-950/95 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-xs font-black tracking-wider text-sky-400">NX</div>
            <div><p className="text-lg font-bold tracking-tight text-white">NEXUS</p><p className="hidden text-[11px] text-slate-500 sm:block">Network Intelligence & Incident Response</p></div>
          </Link>
          <nav className="flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 p-1">
            {navItems.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return <Link key={item.href} href={item.href} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium transition ${active ? "bg-sky-500 text-slate-950" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>{item.label}</Link>;
            })}
            {user?.role === "admin" && <Link href="/admin" className={`rounded-lg px-3 py-2 text-xs font-medium transition ${pathname.startsWith("/admin") ? "bg-violet-400 text-slate-950" : "text-violet-300 hover:bg-slate-800"}`}>Admin</Link>}
          </nav>
          <div className="hidden items-center gap-3 xl:flex">
            <div className="text-right"><p className="text-xs font-semibold text-slate-200">{user?.name}</p><p className="text-[10px] uppercase tracking-wide text-slate-600">{user?.role}</p></div>
            <button onClick={logout} className="rounded-lg border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:bg-slate-900 hover:text-white">Sign out</button>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
