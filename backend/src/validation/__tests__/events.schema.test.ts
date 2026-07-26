import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createEventSchema } from "../events.schema";

const FIXED_NOW = new Date("2026-08-01T00:00:00.000Z");

function isoHoursFromNow(hours: number): string {
  return new Date(FIXED_NOW.getTime() + hours * 60 * 60 * 1000).toISOString();
}

describe("createEventSchema", () => {
  beforeEach(() => {
    // The lead-time rule checks against Date.now() — fixing the clock makes
    // this deterministic instead of depending on when the test happens to
    // run relative to wall-clock time.
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid event at least 24 hours out with end after start", () => {
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: isoHoursFromNow(48),
      endsAt: isoHoursFromNow(56),
    });
    expect(result.success).toBe(true);
  });

  it("rejects an event ending before it starts", () => {
    // This exact bug shipped and was caught manually — an event with
    // startsAt after endsAt was accepted because each field was only
    // validated for shape, never checked against the other.
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: isoHoursFromNow(48),
      endsAt: isoHoursFromNow(40),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.endsAt).toBeDefined();
    }
  });

  it("rejects an event ending at the exact same instant it starts", () => {
    const sameTime = isoHoursFromNow(48);
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: sameTime,
      endsAt: sameTime,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an event starting less than 24 hours from now", () => {
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: isoHoursFromNow(2),
      endsAt: isoHoursFromNow(4),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.startsAt).toBeDefined();
    }
  });

  it("rejects an event starting in the past", () => {
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: isoHoursFromNow(-5),
      endsAt: isoHoursFromNow(2),
    });
    expect(result.success).toBe(false);
  });

  it("accepts an event exactly at the 24-hour boundary", () => {
    // Slightly past the boundary (not exactly on it) to avoid the test
    // being flaky over floating-point/millisecond rounding right at the
    // threshold.
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "Main Hall",
      startsAt: isoHoursFromNow(24.01),
      endsAt: isoHoursFromNow(26),
    });
    expect(result.success).toBe(true);
  });

  it("rejects a venue under 2 characters", () => {
    const result = createEventSchema.safeParse({
      name: "Tech Fest",
      venue: "X",
      startsAt: isoHoursFromNow(48),
      endsAt: isoHoursFromNow(56),
    });
    expect(result.success).toBe(false);
  });
});
