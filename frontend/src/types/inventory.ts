export type InventoryDevice = {
  id: string;
  name: string;
  type: string;
  ip: string;
  status: "Operational" | "Degraded" | "Critical";
  zone?: string;
  role?: string;
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
  version?: number;
  devices: InventoryDevice[];
  links: InventoryLink[];
};
