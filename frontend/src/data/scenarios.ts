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
    id: "isolated-critical",
    name: "Isolated Critical Event",
    description:
      "A single critical event occurs with no supporting evidence. NEXUS should keep it as an event and not create an incident.",
    events: [
      {
        device_id: "dev-003",
        type: "interface_down",
        severity: "Critical",
      },
    ],
  },

  {
    id: "repeated-device-failure",
    name: "Repeated Device Failure",
    description:
      "The same device reports multiple critical events. NEXUS should promote the repeated evidence into one incident.",
    events: [
      {
        device_id: "dev-003",
        type: "interface_down",
        severity: "Critical",
      },
      {
        device_id: "dev-003",
        type: "interface_down",
        severity: "Critical",
      },
    ],
  },

  {
    id: "upstream-failure",
    name: "Upstream Failure + Downstream Impact",
    description:
      "router-01 fails and router-02 reports a downstream impact. NEXUS should correlate them into one topology-supported incident with router-01 as the probable root cause.",
    events: [
      {
        device_id: "dev-001",
        type: "interface_down",
        severity: "Critical",
      },
      {
        device_id: "dev-002",
        type: "device_unreachable",
        severity: "Major",
      },
    ],
  },

  {
    id: "independent-device-failures",
    name: "Independent Device Failures",
    description:
      "Two unrelated devices each report repeated critical failures. NEXUS should create two independent incidents and must not merge them into one topology incident.",
    events: [
      {
        device_id: "dev-003",
        type: "interface_down",
        severity: "Critical",
      },
      {
        device_id: "dev-003",
        type: "interface_down",
        severity: "Critical",
      },
      {
        device_id: "dev-004",
        type: "interface_down",
        severity: "Critical",
      },
      {
        device_id: "dev-004",
        type: "interface_down",
        severity: "Critical",
      },
    ],
  },
];
