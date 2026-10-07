export type SimulatedEvent = {
  device_id: string;
  type: string;
  severity: string;
};

export type SimulationScenario = {
  id: string;
  name: string;
  description: string;
  events: SimulatedEvent[];
};

export const simulationScenarios: SimulationScenario[] = [
  {
    id: "isolated-packet-loss",
    name: "Isolated Packet Loss",
    description:
      "A single critical packet-loss signal appears with no supporting evidence. NEXUS should keep it as an event instead of immediately creating an incident.",
    events: [{ device_id: "dev-003", type: "packet_loss", severity: "Critical" }],
  },
  {
    id: "repeated-device-unreachable",
    name: "Repeated Device Unreachable",
    description:
      "router-03 repeatedly becomes unreachable. NEXUS should promote the repeated critical evidence into one incident with device_unreachable as the probable cause.",
    events: [
      { device_id: "dev-003", type: "device_unreachable", severity: "Critical" },
      { device_id: "dev-003", type: "device_unreachable", severity: "Critical" },
    ],
  },
  {
    id: "upstream-packet-loss",
    name: "Upstream Failure + Packet Loss",
    description:
      "router-01 experiences an interface failure while router-02 reports major packet loss. NEXUS should correlate the downstream evidence into a topology-supported incident.",
    events: [
      { device_id: "dev-001", type: "interface_down", severity: "Critical" },
      { device_id: "dev-002", type: "packet_loss", severity: "Major" },
    ],
  },
  {
    id: "evolving-diagnosis",
    name: "Evolving Incident Diagnosis",
    description:
      "router-01 first produces repeated device-unreachable failures. A later high-latency signal on router-02 should strengthen the same active incident from repeated-device evidence into a topology-supported diagnosis.",
    events: [
      { device_id: "dev-001", type: "device_unreachable", severity: "Critical" },
      { device_id: "dev-001", type: "device_unreachable", severity: "Critical" },
      { device_id: "dev-002", type: "high_latency", severity: "Major" },
    ],
  },
  {
    id: "independent-device-failures",
    name: "Independent Device Failures",
    description:
      "Two unrelated devices each report repeated critical failures using different event types. NEXUS should keep them as independent incidents instead of merging them.",
    events: [
      { device_id: "dev-003", type: "packet_loss", severity: "Critical" },
      { device_id: "dev-003", type: "packet_loss", severity: "Critical" },
      { device_id: "dev-004", type: "high_latency", severity: "Critical" },
      { device_id: "dev-004", type: "high_latency", severity: "Critical" },
    ],
  },
  {
    id: "latency-degradation",
    name: "Latency Degradation",
    description:
      "A series of non-critical latency signals demonstrates that telemetry can degrade without every signal becoming a Critical incident.",
    events: [
      { device_id: "dev-002", type: "high_latency", severity: "Minor" },
      { device_id: "dev-002", type: "high_latency", severity: "Major" },
      { device_id: "dev-004", type: "high_latency", severity: "Major" },
    ],
  },
  {
    id: "mixed-severity-flow",
    name: "Mixed Severity Traffic Event",
    description:
      "Minor packet loss, major latency, and a critical unreachable device arrive together to demonstrate varied operational signal severity.",
    events: [
      { device_id: "dev-001", type: "packet_loss", severity: "Minor" },
      { device_id: "dev-003", type: "high_latency", severity: "Major" },
      { device_id: "dev-004", type: "device_unreachable", severity: "Critical" },
    ],
  },
];
