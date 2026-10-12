import { describe, it, expect } from "vitest";
import { defaultInventory, migrateInventory, validateInventory } from "./inventory";
import { simulationScenarios } from "./scenarios";

describe("reference network", () => {
  it("keeps every scenario device in the valid multi-zone inventory", () => {
    expect(() => validateInventory(defaultInventory)).not.toThrow();
    const ids = new Set(defaultInventory.devices.map((device) => device.id));
    for (const scenario of simulationScenarios) for (const event of scenario.events) expect(ids.has(event.device_id)).toBe(true);
    expect(new Set(defaultInventory.devices.map((device) => device.type))).toEqual(new Set(["ISP Gateway", "Router", "Firewall", "Switch", "Server", "Storage", "Access Point", "Computer", "Printer", "Gateway"]));
  });
  it("rejects duplicate identities, missing endpoints, and dependency cycles", () => {
    const data = structuredClone(defaultInventory);
    data.devices.push(data.devices[0]);
    expect(() => validateInventory(data)).toThrow(/unique/);
    data.devices.pop();
    data.links.push({ id: "bad", source: "missing", target: "dev-001", label: "bad" });
    expect(() => validateInventory(data)).toThrow(/endpoints/);
    data.links.pop();
    data.links.push({ id: "cycle", source: "dev-laptop", target: "dev-003", label: "cycle" });
    expect(() => validateInventory(data)).toThrow(/cycle/);
  });
  it("upgrades the bundled legacy demo and leaves custom inventories untouched", () => {
    const legacy = {
      devices: Array.from({ length: 4 }, (_, i) => ({ id: `dev-00${i + 1}`, name: `router-0${i + 1}`, type: "Router", ip: `10.0.0.${i + 1}`, status: "Operational" as const, x: [50, 30, 70, 30][i], y: [14, 48, 48, 82][i] })),
      links: [["dev-001", "dev-002"], ["dev-001", "dev-003"], ["dev-002", "dev-004"]].map(([source, target], i) => ({ id: `link-${i}`, source, target, label: "uplink" })),
    };
    expect(migrateInventory(legacy).devices).toHaveLength(20);
    legacy.devices[0].name = "custom-router";
    expect(migrateInventory(legacy)).toBe(legacy);
  });
});
