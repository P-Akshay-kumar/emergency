import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// Admin-only: this exists specifically to populate the staff-assignment
// dropdown, not as a general staff directory yet.
router.get("/", requireRole("ADMIN"), async (_req, res) => {
  const staff = await prisma.emergencyStaff.findMany({
    include: { user: { select: { name: true, email: true } } },
    orderBy: { user: { name: "asc" } },
  });
  res.json(staff);
});

export default router;
