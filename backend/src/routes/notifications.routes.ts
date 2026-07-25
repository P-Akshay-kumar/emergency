import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// This route existed in the old Flask app but crashed on every request
// because the EmergencyNotification model it queried was never defined.
router.get("/", async (req, res) => {
  const notifications = await prisma.emergencyNotification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(notifications);
});

router.patch("/:id/acknowledge", async (req, res) => {
  const rawId = req.params.id;
  const notificationId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!notificationId) {
    return res.status(400).json({ error: "Missing notification id" });
  }

  const notification = await prisma.emergencyNotification.findUnique({
    where: { id: notificationId },
  });

  if (!notification || notification.userId !== req.user!.userId) {
    return res.status(404).json({ error: "Notification not found" });
  }

  const updated = await prisma.emergencyNotification.update({
    where: { id: notificationId },
    data: { isAcknowledged: true },
  });

  res.json(updated);
});

export default router;
