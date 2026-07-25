import { Router } from "express";
import { z } from "zod";
import type { Prisma, IncidentStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { broadcastToRoles, notifyUser } from "../sockets";

const router = Router();
router.use(requireAuth);

const reportIncidentSchema = z.object({
  eventId: z.string(),
  title: z.string().min(3),
  description: z.string().min(3),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// Any authenticated role can report an incident — that's the whole point of
// the platform (an attendee is usually the first person to see a problem).
router.post("/", async (req, res) => {
  const parsed = reportIncidentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { eventId, title, description, severity, latitude, longitude } = parsed.data;

  // Built explicitly rather than spread: Zod's .optional() produces
  // `number | undefined`, but with exactOptionalPropertyTypes Prisma wants
  // either a present `number | null` or the key omitted entirely — never an
  // explicit `undefined`. Coercing to null sidesteps that mismatch.
  const incident = await prisma.incident.create({
    data: {
      eventId,
      title,
      description,
      severity,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      reportedById: req.user!.userId,
    },
    include: { reportedBy: { select: { name: true } } },
  });

  // ADMIN and STAFF dashboards get it pushed live — but the reporter (often
  // an ATTENDEE, who isn't in either of those broadcast rooms) also needs to
  // see their own report land without a page refresh.
  broadcastToRoles(["ADMIN", "STAFF"], "incident:created", incident);
  notifyUser(incident.reportedById, "incident:created", incident);

  res.status(201).json(incident);
});

router.get("/", async (req, res) => {
  const { status, eventId } = req.query;

  // Built up conditionally instead of setting keys to `undefined` — same
  // exactOptionalPropertyTypes issue as above, this time on a query filter.
  const where: Prisma.IncidentWhereInput = {};
  const validStatuses: IncidentStatus[] = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];
  if (typeof status === "string" && validStatuses.includes(status as IncidentStatus)) {
    where.status = status as IncidentStatus;
  }
  if (typeof eventId === "string") {
    where.eventId = eventId;
  }

  const incidents = await prisma.incident.findMany({
    where,
    include: {
      reportedBy: { select: { name: true } },
      assignments: { include: { staff: { include: { user: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json(incidents);
});

const updateStatusSchema = z.object({
  status: z.enum(["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"]),
});

// Only staff/admin can change incident status — an attendee can report but
// not mark things resolved themselves.
router.patch("/:id/status", requireRole("ADMIN", "STAFF"), async (req, res) => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const rawId = req.params.id;
  const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!incidentId) {
    return res.status(400).json({ error: "Missing incident id" });
  }

  const incident = await prisma.incident.update({
    where: { id: incidentId },
    data: {
      status: parsed.data.status,
      resolvedAt: parsed.data.status === "RESOLVED" ? new Date() : null,
    },
  });

  broadcastToRoles(["ADMIN", "STAFF"], "incident:updated", incident);

  // Let the original reporter know their report is being handled — this is
  // the notification path that was dead code in the old Flask app.
  const notification = await prisma.emergencyNotification.create({
    data: {
      userId: incident.reportedById,
      title: "Your report was updated",
      message: `"${incident.title}" is now ${incident.status.toLowerCase().replace("_", " ")}`,
    },
  });
  notifyUser(incident.reportedById, "notification:new", notification);

  res.json(incident);
});

const assignStaffSchema = z.object({ staffId: z.string() });

router.post("/:id/assign", requireRole("ADMIN"), async (req, res) => {
  const parsed = assignStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const rawId = req.params.id;
  const incidentId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!incidentId) {
    return res.status(400).json({ error: "Missing incident id" });
  }

  const assignment = await prisma.staffAssignment.create({
    data: { incidentId, staffId: parsed.data.staffId },
    include: { staff: { include: { user: true } }, incident: true },
  });

  broadcastToRoles(["ADMIN", "STAFF"], "incident:assigned", assignment);
  notifyUser(assignment.staff.userId, "notification:new", {
    title: "New assignment",
    message: `You've been assigned to: ${assignment.incident.title}`,
  });

  res.status(201).json(assignment);
});

export default router;
