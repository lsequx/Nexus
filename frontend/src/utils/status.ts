export function getStatusColor(status: string) {
  if (status === "Operational") {
    return "text-emerald-400";
  }

  if (status === "Degraded") {
    return "text-amber-400";
  }

  if (status === "Critical") {
    return "text-red-400";
  }

  return "text-slate-400";
}

export function getStatusDotColor(status: string) {
  if (status === "Operational") {
    return "bg-emerald-400";
  }

  if (status === "Degraded") {
    return "bg-amber-400";
  }

  if (status === "Critical") {
    return "bg-red-400";
  }

  return "bg-slate-500";
}

export function getIncidentStatusColor(status: string) {
  if (status === "Open") {
    return "text-red-400";
  }

  if (status === "Investigating") {
    return "text-amber-400";
  }

  if (status === "Resolved") {
    return "text-sky-400";
  }

  if (status === "Closed") {
    return "text-emerald-400";
  }

  return "text-slate-400";
}

export function getSeverityColor(severity: string) {
  if (severity === "Critical") {
    return "text-red-400";
  }

  if (severity === "Major") {
    return "text-orange-400";
  }

  if (severity === "Minor") {
    return "text-amber-300";
  }

  return "text-slate-400";
}
