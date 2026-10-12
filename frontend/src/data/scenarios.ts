export type SimulatedEvent = { device_id: string; type: string; severity: string };
export type SimulationScenario = { id: string; name: string; description: string; events: SimulatedEvent[] };

export const simulationScenarios: SimulationScenario[] = [
  {
    "id": "isolated-packet-loss",
    "name": "Isolated Wireless Packet Loss",
    "description": "A wireless client reports packet loss with no corroborating evidence. Keep it as an event, not a site-wide incident.",
    "events": [
      {
        "device_id": "dev-laptop",
        "type": "packet_loss",
        "severity": "Critical"
      }
    ]
  },
  {
    "id": "repeated-device-unreachable",
    "name": "Access Point Offline",
    "description": "office-ap-01 repeatedly becomes unreachable. Its wireless client is potentially affected; wired endpoints are outside that dependency scope.",
    "events": [
      {
        "device_id": "dev-ap",
        "type": "device_unreachable",
        "severity": "Critical"
      },
      {
        "device_id": "dev-ap",
        "type": "device_unreachable",
        "severity": "Critical"
      }
    ]
  },
  {
    "id": "upstream-packet-loss",
    "name": "Firewall Failure Across Security Zones",
    "description": "The perimeter firewall loses an interface while the DMZ proxy and application server report loss. The firewall is their common upstream cause; out-of-band management is independent.",
    "events": [
      {
        "device_id": "dev-002",
        "type": "interface_down",
        "severity": "Critical"
      },
      {
        "device_id": "dev-web",
        "type": "packet_loss",
        "severity": "Major"
      },
      {
        "device_id": "dev-app",
        "type": "packet_loss",
        "severity": "Major"
      }
    ]
  },
  {
    "id": "evolving-diagnosis",
    "name": "Evolving Core Switch Outage",
    "description": "Repeated core-switch-01 failures are followed by database and office latency. The assessment should gain topology evidence across the data center and LAN.",
    "events": [
      {
        "device_id": "dev-003",
        "type": "device_unreachable",
        "severity": "Critical"
      },
      {
        "device_id": "dev-003",
        "type": "device_unreachable",
        "severity": "Critical"
      },
      {
        "device_id": "dev-db",
        "type": "high_latency",
        "severity": "Major"
      },
      {
        "device_id": "dev-workstation",
        "type": "high_latency",
        "severity": "Major"
      }
    ]
  },
  {
    "id": "independent-device-failures",
    "name": "Independent DMZ and Storage Failures",
    "description": "The DMZ proxy and storage endpoint each report repeated failures. A shared distant firewall alone is not evidence that the firewall failed.",
    "events": [
      {
        "device_id": "dev-web",
        "type": "packet_loss",
        "severity": "Critical"
      },
      {
        "device_id": "dev-web",
        "type": "packet_loss",
        "severity": "Critical"
      },
      {
        "device_id": "dev-storage",
        "type": "high_latency",
        "severity": "Critical"
      },
      {
        "device_id": "dev-storage",
        "type": "high_latency",
        "severity": "Critical"
      }
    ]
  },
  {
    "id": "latency-degradation",
    "name": "Rack Uplink Congestion",
    "description": "Rack A switch and application server latency degrades. Correlate rack-local evidence without adding unrelated rack B or office devices to observed impact.",
    "events": [
      {
        "device_id": "dev-tor-a",
        "type": "high_latency",
        "severity": "Minor"
      },
      {
        "device_id": "dev-tor-a",
        "type": "high_latency",
        "severity": "Major"
      },
      {
        "device_id": "dev-app",
        "type": "high_latency",
        "severity": "Major"
      }
    ]
  },
  {
    "id": "mixed-severity-flow",
    "name": "Office Access Switch Failure",
    "description": "The PoE access switch fails while its AP and wired workstation report different symptoms. Both branches share the access switch.",
    "events": [
      {
        "device_id": "dev-004",
        "type": "interface_down",
        "severity": "Critical"
      },
      {
        "device_id": "dev-ap",
        "type": "device_unreachable",
        "severity": "Major"
      },
      {
        "device_id": "dev-workstation",
        "type": "packet_loss",
        "severity": "Minor"
      }
    ]
  },
  {
    "id": "wan-provider-outage",
    "name": "WAN Provider Outage",
    "description": "The provider gateway fails and the edge router reports loss. Internet-facing services are potentially affected; this does not prove internal east-west traffic failed.",
    "events": [
      {
        "device_id": "dev-isp",
        "type": "device_unreachable",
        "severity": "Critical"
      },
      {
        "device_id": "dev-isp",
        "type": "device_unreachable",
        "severity": "Critical"
      },
      {
        "device_id": "dev-001",
        "type": "packet_loss",
        "severity": "Major"
      }
    ]
  },
  {
    "id": "management-isolation",
    "name": "Out-of-Band Management Outage",
    "description": "The independent management switch fails and its jump host becomes unreachable. Production workloads are outside this dependency branch.",
    "events": [
      {
        "device_id": "dev-mgmt",
        "type": "interface_down",
        "severity": "Critical"
      },
      {
        "device_id": "dev-jump",
        "type": "device_unreachable",
        "severity": "Major"
      }
    ]
  }
];
