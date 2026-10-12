"use client";

import { useEffect, useState } from "react";
import type { Inventory } from "@/types/inventory";
import StatusIndicator from "@/components/StatusIndicator";

import { deviceTypes, protectedDeviceIds } from "@/data/inventory";

export default function AdminPage() {
  const [inventory, setInventory] = useState<Inventory>({ devices: [], links: [] });
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [type, setType] = useState("Switch");
  const [ip, setIp] = useState("");
  const [upstream, setUpstream] = useState("");
  const [zone, setZone] = useState("LAN");
  const [role, setRole] = useState("");
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void fetch("/api/admin/inventory", { cache: "no-store" }).then(async (response) => {
      if (response.ok) setInventory(await response.json());
    });
  }, []);

  const addDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "device", id: id.trim() || undefined, name, type, ip, zone, role, upstream: upstream || undefined }),
    });
    if (response.ok) {
      setInventory(await response.json());
      setName(""); setId(""); setIp(""); setMessage("Device added to the NEXUS topology inventory.");
    } else {
      const data = await response.json(); setMessage(data.error || "Unable to add device.");
    }
  };

  const removeDevice = async (deviceId: string) => {
    if (protectedDeviceIds.has(deviceId)) {
      setMessage("Reference devices are protected because the scenario library uses them."); return;
    }
    const response = await fetch(`/api/admin/inventory?id=${encodeURIComponent(deviceId)}`, { method: "DELETE" });
    const data = await response.json();
    if (response.ok) setInventory(data);
    else setMessage(data.error || "Unable to remove device.");
  };

  const addLink = async (event: React.FormEvent) => {
    event.preventDefault();
    const response = await fetch("/api/admin/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "link", source, target, label }),
    });
    const data = await response.json();
    if (response.ok) { setInventory(data); setMessage("Dependency added."); }
    else setMessage(data.error || "Unable to add dependency.");
  };

  return (
    <main className="h-full overflow-hidden p-5">
      <div className="mx-auto grid h-full max-w-[1500px] min-h-0 grid-cols-[390px_minmax(0,1fr)] gap-4">
        <section className="overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-300">Administrator</p>
          <h1 className="mt-1 text-2xl font-bold text-white">Network Inventory</h1>
          <p className="mt-2 text-xs leading-5 text-slate-500">Manage network assets and upstream dependencies across security zones. Changes feed the topology view and backend event correlation.</p>

          {message && <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-slate-300">{message}</div>}

          <form onSubmit={addDevice} className="mt-5 space-y-3">
            <input required value={name} onChange={(e)=>setName(e.target.value)} placeholder="Device name (e.g. firewall-01)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <input value={id} onChange={(e)=>setId(e.target.value)} placeholder="Device ID (optional)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <select value={type} onChange={(e)=>setType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm">{deviceTypes.map((item)=><option key={item}>{item}</option>)}</select>
            <input value={ip} onChange={(e)=>setIp(e.target.value)} placeholder="IP address / management address" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <select value={upstream} onChange={(e)=>setUpstream(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm"><option value="">No upstream connection</option>{inventory.devices.map((device)=><option key={device.id} value={device.id}>{device.name} · {device.type}</option>)}</select>
            <input value={zone} onChange={(e)=>setZone(e.target.value)} placeholder="Zone (DMZ, Data center, LAN, Wireless)" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <input value={role} onChange={(e)=>setRole(e.target.value)} placeholder="Role / VLAN / subnet" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <button className="w-full rounded-xl bg-violet-400 py-3 text-sm font-bold text-slate-950">Add device</button>
          </form>

          <div className="mt-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-[11px] leading-5 text-amber-200/80">
            Devices are registered with the backend when it next reads inventory or receives an event. Removing a custom device retains its historical events. Arrows indicate upstream dependencies; cycles are rejected.
          </div>
          <form onSubmit={addLink} className="mt-5 space-y-3">
            <h2 className="text-sm font-semibold text-white">Connect existing devices</h2>
            <select required value={source} onChange={(e)=>setSource(e.target.value)} aria-label="Upstream device" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm"><option value="">Upstream device</option>{inventory.devices.map((device)=><option key={device.id} value={device.id}>{device.name}</option>)}</select>
            <select required value={target} onChange={(e)=>setTarget(e.target.value)} aria-label="Downstream device" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm"><option value="">Downstream device</option>{inventory.devices.filter((device)=>device.id!==source).map((device)=><option key={device.id} value={device.id}>{device.name}</option>)}</select>
            <input value={label} onChange={(e)=>setLabel(e.target.value)} placeholder="Connection / VLAN label" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-sm" />
            <button className="w-full rounded-xl border border-violet-400/40 py-3 text-sm font-bold text-violet-300">Add dependency</button>
          </form>
        </section>

        <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/55 p-5">
          <div className="flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Managed assets</p><h2 className="mt-1 text-xl font-bold text-white">{inventory.devices.length} Devices · {inventory.links.length} Connections</h2></div><a href="/topology" className="text-xs font-semibold text-sky-400">Open topology →</a></div>
          <div className="mt-4 h-[calc(100%-55px)] overflow-y-auto pr-1">
            <div className="space-y-2">
              {inventory.devices.map((device)=><div key={device.id} className="grid grid-cols-[1.2fr_.8fr_.8fr_auto] items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3"><div><p className="font-semibold text-white">{device.name}</p><p className="text-[10px] text-slate-600">{device.ip || "No IP"} · {device.zone || "Unassigned"}</p></div><span className="text-xs text-slate-400">{device.type}</span><StatusIndicator compact status={device.status}/><button onClick={()=>removeDevice(device.id)} className="rounded-lg border border-slate-800 px-3 py-2 text-[10px] text-slate-500 hover:border-red-900 hover:text-red-300">Remove</button></div>)}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
