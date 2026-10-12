"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import NavIcon from "./NavIcon";

type User = { id: string; name: string; email: string; role: "admin" | "operator" | "viewer" };
const publicPaths = ["/login", "/signup", "/reset-password"];
const navItems = [
  { href: "/", label: "Overview", icon: "overview" },
  { href: "/incidents", label: "Incidents", icon: "incidents" },
  { href: "/alerts", label: "Alerts", icon: "alerts" },
  { href: "/events", label: "Events", icon: "events" },
  { href: "/topology", label: "Topology", icon: "topology" },
  { href: "/scenarios", label: "Scenario lab", icon: "scenarios" },
] as const;

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(!isPublic);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  useEffect(() => {
    if (isPublic) return;
    let cancelled = false;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("unauthorized");
        const data = await response.json();
        if (!cancelled) setUser(data.user);
      })
      .catch(() => { if (!cancelled) router.replace(`/login?next=${encodeURIComponent(pathname)}`); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [isPublic, pathname, router]);

  if (isPublic) return <div className="min-h-dvh bg-slate-950 text-slate-100">{children}</div>;
  if (checking) return <div role="status" className="flex min-h-dvh items-center justify-center gap-3 bg-slate-950 text-sm text-slate-400"><span className="h-2 w-2 rounded-full bg-sky-400" />Opening your workspace…</div>;

  const logout = async () => {
    setSigningOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.replace("/login"); router.refresh();
    } catch { setLogoutError("Could not sign out. Please retry."); setSigningOut(false); }
  };
  const current = pathname.startsWith("/admin") ? "Administration" : navItems.find((item) => item.href === "/" ? pathname === "/" : pathname.startsWith(item.href))?.label ?? "Workspace";

  return (
    <div className="nexus-workspace flex h-dvh min-h-0 overflow-hidden bg-slate-950 text-slate-100">
      <a href="#workspace-content" className="skip-link">Skip to content</a>
      <aside className="hidden w-[224px] shrink-0 flex-col border-r border-slate-800 bg-[#080f1d] lg:flex">
        <Link href="/" className="flex items-center gap-3 px-6 py-7" aria-label="NEXUS overview"><span className="brand-mark">NX</span><span><span className="block text-lg font-bold tracking-[0.14em] text-white">NEXUS</span><span className="block whitespace-nowrap text-[9px] tracking-[0.08em] text-slate-400">NETWORK INTELLIGENCE</span></span></Link>
        <p className="px-6 pb-3 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p>
        <nav aria-label="Main navigation" className="space-y-1 px-3">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`sidebar-link ${active ? "is-active" : ""}`}><NavIcon name={item.icon} />{item.label}{active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sky-400" />}</Link>;
          })}
          {user?.role === "admin" && <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className={`sidebar-link ${pathname.startsWith("/admin") ? "is-active" : ""}`}><NavIcon name="admin" />Administration</Link>}
        </nav>
        <div className="mx-4 mt-auto mb-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4"><p className="text-xs font-semibold text-slate-200">Explore a failure</p><p className="mt-2 text-xs leading-5 text-slate-400">Run a simulated outage and follow the evidence to its source.</p><Link href="/scenarios" className="mt-3 flex items-center gap-2 text-xs font-semibold text-sky-300">Open scenario lab <NavIcon name="arrow" width="15" height="15" /></Link></div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-slate-800 bg-[#080f1d] px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3"><span className="lg:hidden"><Link href="/" className="brand-mark" aria-label="NEXUS overview">NX</Link></span><span className="hidden text-xs text-slate-500 sm:inline">Workspace <span className="px-2 text-slate-600">/</span></span><span className="truncate text-sm font-medium text-slate-200">{current}</span></div>
            <div className="flex items-center gap-3"><span className="hidden rounded-md border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 sm:block">Simulation workspace</span><div className="hidden text-right md:block"><p className="max-w-40 truncate text-xs font-semibold text-slate-200">{user?.name}</p><p className="text-[10px] capitalize text-slate-400">{user?.role}</p></div><button onClick={logout} disabled={signingOut} className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50">{signingOut ? "Signing out…" : "Sign out"}</button></div>
          </div>
          {logoutError && <p role="alert" className="mt-2 text-xs text-red-300">{logoutError}</p>}
          <nav aria-label="Mobile navigation" className="-mx-1 mt-3 flex gap-1 overflow-x-auto pb-1 lg:hidden">{navItems.map((item) => <Link key={item.href} href={item.href} aria-current={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "page" : undefined} className="mobile-link">{item.label}</Link>)}{user?.role === "admin" && <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className="mobile-link">Admin</Link>}</nav>
        </header>
        <div id="workspace-content" tabIndex={-1} className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}
