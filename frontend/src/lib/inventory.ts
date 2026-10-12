import fs from "node:fs";
import path from "node:path";
import type { Inventory } from "@/types/inventory";
import { defaultInventory, migrateInventory, validateInventory } from "../data/inventory";

export function inventoryFile() {
  return process.env.NEXUS_INVENTORY_FILE || path.resolve(process.cwd(), "../.nexus-data/inventory.json");
}

export function writeInventory(data: Inventory) {
  validateInventory(data);
  const file = inventoryFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Atomic replacement lets the API read a complete snapshot during edits.
  const temp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp, `${JSON.stringify(data, null, 2)}\n`);
  fs.renameSync(temp, file);
}

export function readInventory(): Inventory {
  const file = inventoryFile();
  if (!fs.existsSync(file)) {
    // Preserve the previous frontend-local inventory on first upgrade.
    const legacy = path.join(process.env.NEXUS_DATA_DIR || path.join(process.cwd(), ".nexus-data"), "inventory.json");
    const data = fs.existsSync(legacy) ? migrateInventory(JSON.parse(fs.readFileSync(legacy, "utf8"))) : structuredClone(defaultInventory);
    writeInventory(data);
  }
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as Inventory;
  validateInventory(data);
  return data;
}
