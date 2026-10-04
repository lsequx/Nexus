export function getStatusColor(status: string) {
  if (status === "Operational"){
    return "text-green-400"
  } 
  if (status === "Degraded") {
    return "text-yellow-400"
  }
  return "text-red-400"
}

export function getStatusDotColor(status: string) {
    if (status === "Operational") {
        return "bg-green-400";
    }
    if (status === "Degraded") {
        return "bg-yellow-400";
    }
    return "bg-red-400";
}

export function getIncidentStatusColor(status: string) {
  if (status === "Open") {
    return "text-red-400";
  }
  return "text-green-400";
}

export function getSeverityColor(severity: string) {
  if (severity === "Critical") {
    return 'text-red-400';
  }
  if (severity === 'Major') {
    return 'text-orange-400';
  }
  return 'text-yellow-400';
}