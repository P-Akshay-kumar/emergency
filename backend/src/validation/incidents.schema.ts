import { z } from "zod";

export const reportIncidentSchema = z.object({
  eventId: z.string(),
  title: z.string().min(3),
  description: z.string().min(3),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"]),
});

export const assignStaffSchema = z.object({ staffId: z.string() });
