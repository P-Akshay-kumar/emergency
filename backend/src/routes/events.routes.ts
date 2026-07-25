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

const createEventSchema = z.object({
  name: z.string().min(2),
  venue: z.string().min(2),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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
