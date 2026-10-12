export function backendPathAllowed(path: string, method: string) {
  const id = "[A-Za-z0-9_-]+";
  if (method === "GET") return /^(health|events(?:\/(?:correlated|correlated-across-devices|root-causes|incident-candidates))?|incidents|topology\/dependencies)$/.test(path)
    || new RegExp(`^incidents/(?:active/${id}|${id}/(?:history|analysis-history))$`).test(path)
    || new RegExp(`^topology/impact/${id}$`).test(path);
  if (method === "POST") return ["events", "events/create-incidents", "incidents"].includes(path);
  if (method === "PATCH") return new RegExp(`^incidents/${id}$`).test(path);
  return false;
}

export function mayWrite(role: string) { return role === "admin" || role === "operator"; }
