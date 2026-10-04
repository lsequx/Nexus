// network status -> impact
import type { Incident } from "@/types/incident";

export function calculateNetworkStatus(incidents: Incident[]): string {
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
