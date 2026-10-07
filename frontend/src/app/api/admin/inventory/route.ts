import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-server";

const DATA_DIR = process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data");
const FILE = path.join(DATA_DIR, "inventory.json");
const seed = {
  devices: [
    { id: "dev-001", name: "router-01", type: "Router", ip: "10.0.0.1", status: "Operational", x: 50, y: 14 },
    { id: "dev-002", name: "router-02", type: "Router", ip: "10.0.0.2", status: "Operational", x: 30, y: 48 },
    { id: "dev-003", name: "router-03", type: "Router", ip: "10.0.0.3", status: "Operational", x: 70, y: 48 },
    { id: "dev-004", name: "router-04", type: "Router", ip: "10.0.0.4", status: "Operational", x: 30, y: 82 },
  ],
  links: [
    { id: "link-1", source: "dev-001", target: "dev-002", label: "uplink" },
    { id: "link-2", source: "dev-001", target: "dev-003", label: "uplink" },
    { id: "link-3", source: "dev-002", target: "dev-004", label: "uplink" },
  ],
};
function readInventory() { fs.mkdirSync(DATA_DIR, { recursive: true }); if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, `${JSON.stringify(seed, null, 2)}\n`); return JSON.parse(fs.readFileSync(FILE, "utf8")); }
function writeInventory(data: unknown) { fs.writeFileSync(FILE, `${JSON.stringify(data, null, 2)}\n`); }

export async function GET() {
  const user = await requireSession(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(readInventory());
}
export async function POST(request: Request) {
  const user = await requireSession(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json() as any; const data = readInventory();
  if (body.kind === "device") {
    const index = data.devices.length; const device = { id: body.id || `dev-${String(index + 1).padStart(3,"0")}`, name: body.name, type: body.type, ip: body.ip || "", status: body.status || "Operational", x: 18 + (index % 4) * 22, y: 18 + Math.floor(index / 4) * 25 };
    data.devices.push(device);
    if (body.upstream) data.links.push({ id: crypto.randomUUID(), source: body.upstream, target: device.id, label: body.linkLabel || "dependency" });
  } else if (body.kind === "link") {
    data.links.push({ id: crypto.randomUUID(), source: body.source, target: body.target, label: body.label || "dependency" });
  }
  writeInventory(data); return NextResponse.json(data, { status: 201 });
}
export async function DELETE(request: Request) {
  const user = await requireSession(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id"); const data = readInventory();
  data.devices = data.devices.filter((d: any) => d.id !== id); data.links = data.links.filter((l: any) => l.source !== id && l.target !== id); writeInventory(data); return NextResponse.json(data);
}
