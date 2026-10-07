export type InventoryDevice = {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: "Operational" | "Degraded" | "Critical";
  x: number;
  y: number;
};

export type InventoryLink = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type Inventory = {
  devices: InventoryDevice[];
  links: InventoryLink[];
};
