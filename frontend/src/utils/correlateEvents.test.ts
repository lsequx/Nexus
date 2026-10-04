import { describe, it, expect } from "vitest";
import { correlateEvents, findRootCause } from "./correlateEvents";
import type { Event } from "@/types/event";

const createEvent = (overrides: Partial<Event> = {}): Event => ({
  id: "event-001",
  device: "router-01",
  type: "high_latency",
  severity: "Major",
  timestamp: "2026-10-02T10:00:00Z",
  ...overrides,
});

describe("correlateEvents", () => {
  it("returns Closed when there are no events", () => {
    expect(correlateEvents([])).toBe("Closed");
  });

  it("returns Closed when no event is Critical", () => {
    const events = [
      createEvent({ severity: "Major" }),
      createEvent({ id: "event-002", severity: "Minor" }),
    ];

    expect(correlateEvents(events)).toBe("Closed");
  });

  it("returns Open when a Critical event exists", () => {
    const events = [createEvent({ severity: "Critical" })];

    expect(correlateEvents(events)).toBe("Open");
  });

  it("returns Open when Critical is one of several event severities", () => {
    const events = [
      createEvent({ severity: "Minor" }),
      createEvent({ id: "event-002", severity: "Critical" }),
      createEvent({ id: "event-003", severity: "Major" }),
    ];

    expect(correlateEvents(events)).toBe("Open");
  });
});

describe("findRootCause", () => {
  it("returns a Critical interface_down event", () => {
    const rootCause = createEvent({
      type: "interface_down",
      severity: "Critical",
    });

    expect(findRootCause([rootCause])).toEqual(rootCause);
  });

  it("returns undefined when no event matches", () => {
    const events = [
      createEvent({ severity: "Major", type: "interface_down" }),
      createEvent({ severity: "Critical", type: "high_latency" }),
    ];

    expect(findRootCause(events)).toBeUndefined();
  });

  it("returns a Critical device_unreachable event", () => {
    const rootCause = createEvent({
      type: "device_unreachable",
      severity: "Critical",
    });

    expect(findRootCause([rootCause])).toEqual(rootCause);
  });

  it("returns the first matching event when multiple root-cause candidates exist", () => {
    const first = createEvent({
      id: "event-001",
      type: "interface_down",
      severity: "Critical",
    });

    const second = createEvent({
      id: "event-002",
      type: "device_unreachable",
      severity: "Critical",
    });

    expect(findRootCause([first, second])).toEqual(first);
  });
});
