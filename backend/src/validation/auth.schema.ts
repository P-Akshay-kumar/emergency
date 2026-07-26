import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  // Postgres's unique constraint on email is case-sensitive by default —
  // without normalizing here, "User@Test.com" and "user@test.com" would be
  // treated as two different accounts. trim()/toLowerCase() must run BEFORE
  // .email() — a caught bug: checking .email() first rejected any input
  // with surrounding whitespace instead of cleaning it up first.
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Deliberately not accepting ADMIN here — admin accounts should be created
  // by an existing admin, never through open self-registration.
  role: z.enum(["STAFF", "ATTENDEE"]).default("ATTENDEE"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});
