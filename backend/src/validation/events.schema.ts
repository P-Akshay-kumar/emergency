import { z } from "zod";

export const MIN_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

export const createEventSchema = z
  .object({
    name: z.string().min(2),
    venue: z.string().min(2),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  })
  // Zod validates each field's shape independently — it doesn't check
  // fields against each other unless told to. This is what let an event
  // end before it starts.
  .refine((data) => new Date(data.endsAt) > new Date(data.startsAt), {
    message: "Event end time must be after the start time",
    path: ["endsAt"],
  })
  // Response planning (staffing, evacuation routes) needs real lead time —
  // an event created minutes before it starts defeats the purpose of this
  // platform. Checked server-side using the server's own clock, not the
  // client's, since a client's system time can't be trusted.
  .refine((data) => new Date(data.startsAt).getTime() - Date.now() >= MIN_LEAD_TIME_MS, {
    message: "Event must be created at least 24 hours before it starts",
    path: ["startsAt"],
  });
