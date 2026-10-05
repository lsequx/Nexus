"use client";

import { useEffect, useState } from "react";

import WelcomeCard from "@/components/WelcomeCard";
import StatusCard from "@/components/StatusCard";
import IncidentCard from "@/components/IncidentCard";
import EventCard from "@/components/EventCard";

import { getStatusColor } from "@/utils/status";
import { calculateNetworkStatus } from "@/utils/networkStatus";

import type { Event } from "@/types/event";
import type { Incident } from "@/types/incident";
import type { IncidentStatusHistory } from "@/types/incidentHistory";

import {
  fetchEvents,
  fetchIncidents,
  fetchIncidentHistory,
  createIncident,
  updateIncidentStatus,
  createEvent,
} from "@/lib/api";

const systems = [
  {
    name: "Network",
    status: "Operational",
  },
  {
    name: "Database",
    status: "Operational",
  },
  {
    name: "API",
    status: "Degraded",
  },
];

const eventOptions = [
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
  {
    device_id: "dev-003",
    type: "high_latency",
    severity: "Major",
  },
  {
    device_id: "dev-004",
    type: "packet_loss",
    severity: "Minor",
  },
];

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [incidentSeverity, setIncidentSeverity] = useState("Critical");

  const [incidentHistories, setIncidentHistories] = useState<
    Record<string, IncidentStatusHistory[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const networkStatus = calculateNetworkStatus(incidents);

  // Load events and incidents when the page first opens.
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [eventData, incidentData] = await Promise.all([
          fetchEvents(),
          fetchIncidents(),
        ]);

        setEvents(eventData);
        setIncidents(incidentData);
        setError(false);
      } catch (err) {
        console.error("Failed to load initial data:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Fetch status history for incidents that do not have history loaded yet.
  useEffect(() => {
    const loadIncidentHistories = async () => {
      const incidentsWithoutHistory = incidents.filter(
        (incident) => !(incident.id in incidentHistories),
      );

      if (incidentsWithoutHistory.length === 0) {
        return;
      }

      try {
        const historyResults = await Promise.all(
          incidentsWithoutHistory.map(async (incident) => {
            const history = await fetchIncidentHistory(incident.id);

            return [incident.id, history] as const;
          }),
        );

        setIncidentHistories((current) => ({
          ...current,
          ...Object.fromEntries(historyResults),
        }));
      } catch (err) {
        console.error("Failed to load incident history:", err);
      }
    };

    loadIncidentHistories();
  }, [incidents, incidentHistories]);

  const handleCreateIncident = async () => {
    try {
      const newIncident = await createIncident(
        `${incidentSeverity} Network Incident`,
        incidentSeverity,
      );

      setIncidents((currentIncidents) => [newIncident, ...currentIncidents]);
    } catch (err) {
      console.error("Failed to create incident:", err);
    }
  };

  const handleStatusChange = async (
    incident: Incident,
    newStatus: Incident["status"],
  ) => {
    try {
      const updatedIncident = await updateIncidentStatus(
        incident.id,
        newStatus,
      );

      setIncidents((currentIncidents) =>
        currentIncidents.map((currentIncident) =>
          currentIncident.id === updatedIncident.id
            ? updatedIncident
            : currentIncident,
        ),
      );

      const updatedHistory = await fetchIncidentHistory(incident.id);

      setIncidentHistories((current) => ({
        ...current,
        [incident.id]: updatedHistory,
      }));
    } catch (err) {
      console.error("Failed to update incident status:", err);
    }
  };

  const handleCreateEvent = async () => {
    try {
      const event =
        eventOptions[Math.floor(Math.random() * eventOptions.length)];

      const newEvent = await createEvent(event);

      setEvents((currentEvents) => [...currentEvents, newEvent]);

      // Creating an event can trigger backend incident detection,
      // so refresh the incident list after the event is created.
      const refreshedIncidents = await fetchIncidents();

      setIncidents(refreshedIncidents);
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  return (
    <main className="min-h-screen space-y-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            NEXUS
          </h1>

          <p className="text-sm text-gray-400">
            Network Intelligence & Incident Response Platform
          </p>
        </div>

        <div className="rounded-lg border px-4 py-2">
          <span className="text-sm">Network Status: </span>

          <span className={`font-semibold ${getStatusColor(networkStatus)}`}>
            {networkStatus}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={incidentSeverity}
            onChange={(e) => setIncidentSeverity(e.target.value)}
            className="rounded-lg border bg-gray-900 px-7 py-2 text-white"
          >
            <option value="Critical">Critical</option>
            <option value="Major">Major</option>
            <option value="Minor">Minor</option>
          </select>

          <button
            onClick={handleCreateIncident}
            className="rounded-lg border px-4 py-2"
          >
            Simulate Incident
          </button>
        </div>
      </header>

      <WelcomeCard />

      {/* Incident cards */}
      {incidents.length > 0 && (
        <div className="space-y-4">
          {incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              {...incident}
              incidentHistory={incidentHistories[incident.id] ?? []}
              onStatusChange={(newStatus) =>
                handleStatusChange(incident, newStatus)
              }
            />
          ))}
        </div>
      )}

      {/* Network events */}
      {loading ? (
        <p>Loading Events...</p>
      ) : error ? (
        <p>Unable to load events.</p>
      ) : (
        <div className="space-y-4">
          {[...events].reverse().map((event) => (
            <EventCard
              key={event.id}
              id={event.id}
              device={event.device}
              type={event.type}
              severity={event.severity}
              timestamp={event.timestamp}
            />
          ))}
        </div>
      )}

      {/* Simulate a network event */}
      <button
        onClick={handleCreateEvent}
        className="rounded-lg border px-4 py-2"
      >
        Simulate Event
      </button>

      {/* System status cards */}
      <div className="flex gap-4">
        {systems.map((system) => (
          <StatusCard
            key={system.name}
            name={system.name}
            status={system.name === "Network" ? networkStatus : system.status}
          />
        ))}
      </div>
    </main>
  );
}
