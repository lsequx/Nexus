"use client";

import WelcomeCard from "@/components/WelcomeCard";
import StatusCard from "@/components/StatusCard";
import { getStatusColor } from "@/utils/status";
import { useEffect, useState } from "react";
import IncidentCard from "@/components/IncidentCard";
import EventCard from "@/components/EventCard";
import type { Event } from "@/types/event";
import type { Incident } from "@/types/incident";
import type { IncidentStatusHistory } from "@/types/incidentHistory";
import { calculateNetworkStatus } from "@/utils/networkStatus";

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

  const networkStatus = calculateNetworkStatus(incidents);

  const [incidentSeverity, setIncidentSeverity] = useState("Critical");

  const [incidentHistories, setIncidentHistories] = useState<
    Record<string, IncidentStatusHistory[]>
  >({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Fetch events and incidents when the page loads.
  useEffect(() => {
    fetch("http://127.0.0.1:8000/events")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch events");
        }
        return response.json();
      })
      .then((data) => {
        setEvents(data);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });

    fetch("http://127.0.0.1:8000/incidents")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch incidents");
        }
        return response.json();
      })
      .then((data) => {
        setIncidents(data);
      })
      .catch((err) => {
        console.error("Failed to fetch incidents:", err);
      });
  }, []);

  // Fetch status history separately for every incident.
  useEffect(() => {
    const fetchHistories = async () => {
      const incidentsWithoutHistory = incidents.filter(
        (incident) => !(incident.id in incidentHistories),
      );

      if (incidentsWithoutHistory.length === 0) {
        return;
      }

      const historyResults = await Promise.all(
        incidentsWithoutHistory.map(async (incident) => {
          const response = await fetch(
            `http://127.0.0.1:8000/incidents/${incident.id}/history`,
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch history for incident ${incident.id}`,
            );
          }

          const data: IncidentStatusHistory[] = await response.json();

          return [incident.id, data] as const;
        }),
      );

      setIncidentHistories((current) => ({
        ...current,
        ...Object.fromEntries(historyResults),
      }));
    };

    fetchHistories().catch(console.error);
  }, [incidents, incidentHistories]);

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
            onClick={async () => {
              const response = await fetch("http://127.0.0.1:8000/incidents", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  title: `${incidentSeverity} Network Incident`,
                  severity: incidentSeverity,
                }),
              });

              if (!response.ok) {
                console.error("Failed to create incident");
                return;
              }

              const newIncident = await response.json();

              setIncidents((currentIncidents) => [
                newIncident,
                ...currentIncidents,
              ]);
            }}
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
              onStatusChange={async (newStatus) => {
                const response = await fetch(
                  `http://127.0.0.1:8000/incidents/${incident.id}`,
                  {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      status: newStatus,
                    }),
                  },
                );

                if (!response.ok) {
                  console.error("Failed to update incident status");
                  return;
                }

                const updatedIncident = await response.json();

                console.log("Updated incident:", updatedIncident);

                setIncidents((currentIncidents) =>
                  currentIncidents.map((currentIncident) =>
                    currentIncident.id === updatedIncident.id
                      ? {
                          ...currentIncident,
                          ...updatedIncident,
                        }
                      : currentIncident,
                  ),
                );

                // Fetch the updated history for this incident only.
                const historyResponse = await fetch(
                  `http://127.0.0.1:8000/incidents/${incident.id}/history`,
                );

                if (!historyResponse.ok) {
                  console.error("Failed to fetch updated history");
                  return;
                }

                const updatedHistory: IncidentStatusHistory[] =
                  await historyResponse.json();

                setIncidentHistories((current) => ({
                  ...current,
                  [incident.id]: updatedHistory,
                }));
              }}
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
        onClick={async () => {
          const event =
            eventOptions[Math.floor(Math.random() * eventOptions.length)];

          const response = await fetch("http://127.0.0.1:8000/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(event),
          });

          if (!response.ok) {
            console.error("Failed to create event");
            return;
          }

          const newEvent = await response.json();

          setEvents((currentEvents) => [...currentEvents, newEvent]);
        }}
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
