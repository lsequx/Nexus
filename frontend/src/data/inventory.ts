import seed from "../../../network/topology.json";
import type { Inventory } from "@/types/inventory";

export const deviceTypes = ["Router", "Switch", "Firewall", "ISP Gateway", "Gateway", "Server", "Storage", "Computer", "Printer", "Access Point", "LAN Port"];
export const defaultInventory = seed as Inventory;
export const protectedDeviceIds = new Set(seed.devices.map((device) => device.id));

export function validateInventory(data: Inventory) {
  const ids = new Set<string>();
  for (const device of data.devices) {
    if (!device.id?.trim() || !device.name?.trim() || ids.has(device.id)) throw new Error("Device IDs must be unique and names are required.");
    if (!deviceTypes.includes(device.type)) throw new Error("Unsupported device type.");
    if (!["Operational", "Degraded", "Critical"].includes(device.status)) throw new Error("Invalid device status.");
    if (![device.x, device.y].every((value) => Number.isFinite(value) && value >= 0 && value <= 100)) throw new Error("Device coordinates must be between 0 and 100.");
    ids.add(device.id);
  }
  const edges = new Set<string>();
  const linkIds = new Set<string>();
  const children = new Map<string, string[]>();
  for (const link of data.links) {
    const key = `${link.source}:${link.target}`;
    if (!ids.has(link.source) || !ids.has(link.target)) throw new Error("Both link endpoints must exist.");
    if (link.source === link.target || edges.has(key) || linkIds.has(link.id)) throw new Error("Links must be unique and cannot connect a device to itself.");
    edges.add(key);
    linkIds.add(link.id);
    children.set(link.source, [...(children.get(link.source) ?? []), link.target]);
  }
  const visited = new Set<string>();
  const visiting = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) throw new Error("Dependencies cannot contain a cycle.");
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of children.get(id) ?? []) visit(child);
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
}

// Upgrade only the exact bundled four-router demo; preserve custom inventories.
export function migrateInventory(data: Inventory): Inventory {
  const positions = [[50, 14], [30, 48], [70, 48], [30, 82]];
  const legacyDevices = data.devices.length === 4 && data.devices.every((device, index) => device.id === `dev-00${index + 1}` && device.name === `router-0${index + 1}` && device.type === "Router" && device.ip === `10.0.0.${index + 1}` && device.status === "Operational" && device.x === positions[index][0] && device.y === positions[index][1] && !device.zone && !device.role);
  const legacyEdges = ["dev-001:dev-002", "dev-001:dev-003", "dev-002:dev-004"];
  const legacyLinks = data.links.length === 3 && data.links.every((link) => legacyEdges.includes(`${link.source}:${link.target}`) && link.label === "uplink") && new Set(data.links.map((link) => `${link.source}:${link.target}`)).size === 3;
  return legacyDevices && legacyLinks ? structuredClone(defaultInventory) : data;
}
