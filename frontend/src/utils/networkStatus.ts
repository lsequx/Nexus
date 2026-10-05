import type { IncidentStatus } from "@/types/incident";

type NetworkStatusIncident = {
  status: IncidentStatus;
  severity: string;
};

export function calculateNetworkStatus(
  incidents: NetworkStatusIncident[],
): string {
  const activeIncidents = incidents.filter(
    (incident) =>
      incident.status === "Open" || incident.status === "Investigating",
  );

  if (activeIncidents.some((incident) => incident.severity === "Critical")) {
    return "Critical";
  }

  if (activeIncidents.length > 0) {
    return "Degraded";
  }

  return "Operational";
}
