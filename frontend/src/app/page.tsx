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

import type { IncidentAnalysisHistory } from "@/types/incidentAnalysisHistory";

import {
  fetchEvents,
  fetchIncidents,
  fetchIncidentHistory,
  fetchIncidentAnalysisHistory,
  createIncident,
  updateIncidentStatus,
  createEvent,
} from "@/lib/api";

import { simulationScenarios } from "@/data/scenarios";

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

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);

  const [incidents, setIncidents] = useState<Incident[]>([]);

  const [incidentSeverity, setIncidentSeverity] = useState("Critical");

  const [incidentHistories, setIncidentHistories] = useState<
    Record<string, IncidentStatusHistory[]>
  >({});

  const [incidentAnalysisHistories, setIncidentAnalysisHistories] = useState<
    Record<string, IncidentAnalysisHistory[]>
  >({});

  const [selectedScenarioId, setSelectedScenarioId] = useState(
    simulationScenarios[0].id,
  );

  const [isRunningScenario, setIsRunningScenario] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const networkStatus = calculateNetworkStatus(incidents);

  const selectedScenario =
    simulationScenarios.find(
      (scenario) => scenario.id === selectedScenarioId,
    ) ?? simulationScenarios[0];

  // -------------------------------------------------------
  // Initial network state
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Incident lifecycle history
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Incident analysis history
  //
  // This records how NEXUS's diagnosis evolved as new
  // network evidence became available.
  // -------------------------------------------------------

  useEffect(() => {
    const loadAnalysisHistories = async () => {
      const incidentsWithoutAnalysisHistory = incidents.filter(
        (incident) => !(incident.id in incidentAnalysisHistories),
      );

      if (incidentsWithoutAnalysisHistory.length === 0) {
        return;
      }

      try {
        const historyResults = await Promise.all(
          incidentsWithoutAnalysisHistory.map(async (incident) => {
            const history = await fetchIncidentAnalysisHistory(incident.id);

            return [incident.id, history] as const;
          }),
        );

        setIncidentAnalysisHistories((current) => ({
          ...current,
          ...Object.fromEntries(historyResults),
        }));
      } catch (err) {
        console.error("Failed to load incident analysis history:", err);
      }
    };

    loadAnalysisHistories();
  }, [incidents, incidentAnalysisHistories]);

  // -------------------------------------------------------
  // Refresh authoritative network state
  // -------------------------------------------------------

  const refreshNetworkData = async () => {
    const [eventData, incidentData] = await Promise.all([
      fetchEvents(),
      fetchIncidents(),
    ]);

    setEvents(eventData);

    setIncidents(incidentData);

    return incidentData;
  };

  // -------------------------------------------------------
  // Manual incident
  // -------------------------------------------------------

  const handleCreateIncident = async () => {
    try {
      const newIncident = await createIncident(
        `${incidentSeverity} Network Incident`,
        incidentSeverity,
      );

      setIncidents((currentIncidents) => [newIncident, ...currentIncidents]);

      // The new incident may have history generated
      // by the backend. Force history retrieval.
      setIncidentHistories((current) => {
        const next = {
          ...current,
        };

        delete next[newIncident.id];

        return next;
      });

      setIncidentAnalysisHistories((current) => {
        const next = {
          ...current,
        };

        delete next[newIncident.id];

        return next;
      });
    } catch (err) {
      console.error("Failed to create incident:", err);
    }
  };

  // -------------------------------------------------------
  // Incident lifecycle
  // -------------------------------------------------------

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

  // -------------------------------------------------------
  // Deterministic NEXUS scenario
  //
  // Events are sent sequentially because POST /events
  // triggers correlation and incident analysis after every
  // new network signal.
  // -------------------------------------------------------

  const handleRunScenario = async () => {
    if (isRunningScenario) {
      return;
    }

    setIsRunningScenario(true);

    try {
      for (const event of selectedScenario.events) {
        await createEvent(event);
      }

      await refreshNetworkData();

      // A scenario may strengthen the diagnosis of an
      // incident that already existed. Clear the cached
      // analysis histories so they are fetched again
      // from the backend with the newest assessment.
      setIncidentAnalysisHistories({});
    } catch (err) {
      console.error("Failed to run simulation scenario:", err);
    } finally {
      setIsRunningScenario(false);
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
            onChange={(event) => setIncidentSeverity(event.target.value)}
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

      {/* Scenario simulator */}
      <section className="space-y-4 rounded-lg border p-4">
        <div>
          <h2 className="text-xl font-semibold">NEXUS Scenario Simulator</h2>

          <p className="text-sm text-gray-400">
            Generate controlled network events to test correlation, incident
            detection, root-cause analysis, and evolving incident intelligence.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedScenarioId}
            disabled={isRunningScenario}
            onChange={(event) => setSelectedScenarioId(event.target.value)}
            className="rounded-lg border bg-gray-900 px-4 py-2 text-white"
          >
            {simulationScenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {scenario.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleRunScenario}
            disabled={isRunningScenario}
            className="rounded-lg border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunningScenario ? "Running Scenario..." : "Run Scenario"}
          </button>
        </div>

        <div className="rounded-md border p-3">
          <p className="font-medium">{selectedScenario.name}</p>

          <p className="mt-1 text-sm text-gray-400">
            {selectedScenario.description}
          </p>

          <p className="mt-2 text-xs text-gray-500">
            Events in scenario: {selectedScenario.events.length}
          </p>
        </div>
      </section>

      {/* Incidents */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Incidents</h2>

        {incidents.length === 0 ? (
          <p className="text-sm text-gray-400">No incidents detected.</p>
        ) : (
          incidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              {...incident}
              incidentHistory={incidentHistories[incident.id] ?? []}
              analysisHistory={incidentAnalysisHistories[incident.id] ?? []}
              onStatusChange={(newStatus) =>
                handleStatusChange(incident, newStatus)
              }
            />
          ))
        )}
      </section>

      {/* Network events */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Network Events</h2>

        {loading ? (
          <p>Loading Events...</p>
        ) : error ? (
          <p>Unable to load events.</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-gray-400">No network events recorded.</p>
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
      </section>

      {/* System status */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">System Status</h2>

        <div className="flex gap-4">
          {systems.map((system) => (
            <StatusCard
              key={system.name}
              name={system.name}
              status={system.name === "Network" ? networkStatus : system.status}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
