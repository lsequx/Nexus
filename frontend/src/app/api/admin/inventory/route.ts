import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/session-server";
import { readInventory, writeInventory } from "@/lib/inventory";
import { protectedDeviceIds } from "@/data/inventory";
import type { InventoryDevice } from "@/types/inventory";

export async function GET() {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(readInventory());
}

export async function POST(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    const data = readInventory();
    const text = (key: string, fallback = "") => typeof body[key] === "string" ? (body[key] as string).trim() : fallback;
    if (body.kind === "device") {
      const index = data.devices.length;
      data.devices.push({
        id: text("id") || `dev-${crypto.randomUUID()}`, name: text("name"), type: text("type"),
        ip: text("ip"), status: text("status", "Operational") as InventoryDevice["status"],
        zone: text("zone", "LAN"), role: text("role"), x: 12 + (index % 5) * 18, y: 20 + (Math.floor(index / 5) % 4) * 22,
      });
      const upstream = text("upstream");
      if (upstream) data.links.push({ id: crypto.randomUUID(), source: upstream, target: data.devices.at(-1)!.id, label: text("linkLabel", "Access uplink") });
    } else if (body.kind === "link") {
      data.links.push({ id: crypto.randomUUID(), source: text("source"), target: text("target"), label: text("label", "Upstream dependency") });
    } else {
      return NextResponse.json({ error: "Choose device or link." }, { status: 400 });
    }
    writeInventory(data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid inventory request." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requireSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A device ID is required." }, { status: 400 });
  if (protectedDeviceIds.has(id)) return NextResponse.json({ error: "Reference topology devices are used by the scenario library and cannot be removed." }, { status: 409 });
  const data = readInventory();
  if (!data.devices.some((device) => device.id === id)) return NextResponse.json({ error: "Device not found." }, { status: 404 });
  // Keep historical database devices/events; remove current topology membership only.
  data.devices = data.devices.filter((device) => device.id !== id);
  data.links = data.links.filter((link) => link.source !== id && link.target !== id);
  writeInventory(data);
  return NextResponse.json(data);
}
