import { describe, it, expect } from "vitest";
import {
  reportIncidentSchema,
  updateStatusSchema,
  assignStaffSchema,
} from "../incidents.schema";

describe("reportIncidentSchema", () => {
  it("accepts a valid incident report", () => {
    const result = reportIncidentSchema.safeParse({
      eventId: "evt_123",
      title: "Fire in lab",
      description: "Small electrical fire, contained",
      severity: "HIGH",
    });
    expect(result.success).toBe(true);
  });

  it("defaults severity to MEDIUM when omitted", () => {
    const result = reportIncidentSchema.safeParse({
      eventId: "evt_123",
      title: "Minor issue",
      description: "Something minor happened",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.severity).toBe("MEDIUM");
    }
  });

  it("rejects a title under 3 characters", () => {
    const result = reportIncidentSchema.safeParse({
      eventId: "evt_123",
      title: "Hi",
      description: "Something happened",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid severity value", () => {
    const result = reportIncidentSchema.safeParse({
      eventId: "evt_123",
      title: "Fire in lab",
      description: "Small fire",
      severity: "SUPER_URGENT",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateStatusSchema", () => {
  it("accepts each valid status value", () => {
    for (const status of ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"]) {
      expect(updateStatusSchema.safeParse({ status }).success).toBe(true);
    }
  });

  it("rejects a status value not in the enum", () => {
    const result = updateStatusSchema.safeParse({ status: "DONE" });
    expect(result.success).toBe(false);
  });
});

describe("assignStaffSchema", () => {
  it("accepts a staffId string", () => {
    const result = assignStaffSchema.safeParse({ staffId: "staff_123" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing staffId", () => {
    const result = assignStaffSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
