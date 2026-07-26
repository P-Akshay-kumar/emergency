import { describe, it, expect } from "vitest";
import { registerSchema, loginSchema } from "../auth.schema";

describe("registerSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "ATTENDEE",
    });
    expect(result.success).toBe(true);
  });

  it("normalizes email to lowercase and trims whitespace", () => {
    // This is the exact bug found during manual testing: without this,
    // "User@Test.com" and "user@test.com" were treated as different
    // accounts because Postgres's unique constraint is case-sensitive.
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "  Jane@Example.COM  ",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("trims whitespace from name", () => {
    const result = registerSchema.safeParse({
      name: "  Jane Doe  ",
      email: "jane@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jane Doe");
    }
  });

  it("rejects a password under 8 characters", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email format", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "not-an-email",
      password: "password123",
    });
    expect(result.success).toBe(false);
  });

  it("defaults role to ATTENDEE when omitted", () => {
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe("ATTENDEE");
    }
  });

  it("rejects ADMIN as a self-selected role", () => {
    // Admin accounts must never be created through open registration —
    // this is a security boundary, not just a UX default.
    const result = registerSchema.safeParse({
      name: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
      role: "ADMIN",
    });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("normalizes email the same way registration does", () => {
    // If these two schemas ever normalized differently, an account
    // registered one way could become unable to log in.
    const result = loginSchema.safeParse({
      email: "Jane@Example.COM",
      password: "anything",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jane@example.com");
    }
  });

  it("rejects an empty password", () => {
    const result = loginSchema.safeParse({
      email: "jane@example.com",
      password: "",
    });
    expect(result.success).toBe(false);
  });
});
