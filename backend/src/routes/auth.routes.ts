import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  // Postgres's unique constraint on email is case-sensitive by default —
  // without normalizing here, "User@Test.com" and "user@test.com" would be
  // treated as two different accounts.
  email: z.string().email("Invalid email address").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Deliberately not accepting ADMIN here — admin accounts should be created
  // by an existing admin, never through open self-registration.
  role: z.enum(["STAFF", "ATTENDEE"]).default("ATTENDEE"),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { name, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role },
  });

  if (role === "STAFF") {
    await prisma.emergencyStaff.create({
      data: { userId: user.id, specialty: "unassigned" },
    });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

const loginSchema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(1, "Password is required"),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Same error for "no such user" and "wrong password" — don't leak which
  // half of the credential pair was wrong.
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

export default router;
