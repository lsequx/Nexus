import type { Event } from "@/types/event";

import type { Incident, IncidentStatus } from "@/types/incident";

import type { IncidentStatusHistory } from "@/types/incidentHistory";

import type { IncidentAnalysisHistory } from "@/types/incidentAnalysisHistory";

const API_BASE_URL = "http://127.0.0.1:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

export function fetchEvents(): Promise<Event[]> {
  return request<Event[]>("/events");
}

export function fetchIncidents(): Promise<Incident[]> {
  return request<Incident[]>("/incidents");
}

export function fetchIncidentHistory(
  incidentId: string,
): Promise<IncidentStatusHistory[]> {
  return request<IncidentStatusHistory[]>(`/incidents/${incidentId}/history`);
}

export function fetchIncidentAnalysisHistory(
  incidentId: string,
): Promise<IncidentAnalysisHistory[]> {
  return request<IncidentAnalysisHistory[]>(
    `/incidents/${incidentId}/analysis-history`,
  );
}

export function createIncident(
  title: string,
  severity: string,
): Promise<Incident> {
  return request<Incident>("/incidents", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      severity,
    }),
  });
}

export function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
): Promise<Incident> {
  return request<Incident>(`/incidents/${incidentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
    }),
  });
}

type EventCreate = {
  device_id: string;
  type: string;
  severity: string;
};

export function createEvent(event: EventCreate): Promise<Event> {
  return request<Event>("/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });
}
