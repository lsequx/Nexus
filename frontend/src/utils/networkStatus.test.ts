import { describe, it, expect } from "vitest";
import { calculateNetworkStatus } from "./networkStatus";

describe("calculateNetworkStatus", () => {
  it("returns Operational when there are no incidents", () => {
    const incidents = [];

    expect(calculateNetworkStatus(incidents)).toBe("Operational");
  });

  it("returns Degraded when there is an active Major incident", () => {
    const incidents = [
      {
        status: "Open",
        severity: "Major",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Degraded");
  });

  it("returns Degraded when there is an active Minor incident", () => {
    const incidents = [
      {
        status: "Open",
        severity: "Minor",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Degraded");
  });

  it("returns Critical when there is an active Critical incident", () => {
    const incidents = [
      {
        status: "Open",
        severity: "Critical",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Critical");
  });

  it("returns Operational when a Critical incident is resolved", () => {
    const incidents = [
      {
        status: "Resolved",
        severity: "Critical",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Operational");
  });

  it("returns Critical when a Critical incident is being investigated", () => {
    const incidents = [
      {
        status: "Investigating",
        severity: "Critical",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Critical");
  });

  it("returns Critical when multiple active incidents include a Critical incident", () => {
    const incidents = [
      {
        status: "Open",
        severity: "Major",
      },
      {
        status: "Investigating",
        severity: "Critical",
      },
    ];

    expect(calculateNetworkStatus(incidents)).toBe("Critical");
  });
});
