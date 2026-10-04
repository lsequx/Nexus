import type { Event } from "@/types/event";

export function correlateEvents(events: Event[]) {
  const criticalEvent = events.find((event) => event.severity === "Critical");
  return criticalEvent ? "Open" : "Closed";
}

export function findRootCause(events: Event[]) {
  const rootCauseEvent = events.find(
    (event) =>
      event.severity === "Critical" &&
      (event.type === "interface_down" || event.type === "device_unreachable"),
  );
  return rootCauseEvent;
}
