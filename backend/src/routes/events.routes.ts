import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Any authenticated role can view the events list — an attendee needs it to
// pick which event they're reporting an incident for.
router.get("/", async (_req, res) => {
  const events = await prisma.event.findMany({
    orderBy: { startsAt: "asc" },
  });
  res.json(events);
});

const MIN_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

const createEventSchema = z
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

// Only admins create events — staff and attendees join/report against
// events that already exist.
router.post("/", requireRole("ADMIN"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { name, venue, startsAt, endsAt, latitude, longitude } = parsed.data;

  const event = await prisma.event.create({
    data: {
      name,
      venue,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
  });

  res.status(201).json(event);
});

export default router;
