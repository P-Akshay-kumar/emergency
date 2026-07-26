import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "http";
import { Prisma } from "@prisma/client";
import { initSockets } from "./sockets";
import authRoutes from "./routes/auth.routes";
import incidentRoutes from "./routes/incidents.routes";
import notificationRoutes from "./routes/notifications.routes";
import eventRoutes from "./routes/events.routes";
import staffRoutes from "./routes/staff.routes";

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "50kb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth routes are the actual brute-force target in this app — someone
// could otherwise script thousands of login/password guesses per minute.
// A generous window (not applied to the rest of the API) keeps normal use
// unaffected while still shutting down that specific attack shape.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Try again in a few minutes." },
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/staff", staffRoutes);

// Without this, an unhandled error (e.g. a foreign key that doesn't exist)
// falls through to Express's default handler, which returns HTML — the
// frontend then has nothing usable in `err.response.data.error` and falls
// back to a generic "Failed to..." message with no real detail. This maps
// the Prisma error codes actually likely to occur into readable JSON.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2003") {
      return res.status(400).json({ error: "Referenced record does not exist (invalid id)" });
    }
    if (err.code === "P2002") {
      return res.status(409).json({ error: "A record with that value already exists" });
    }
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Record not found" });
    }
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

initSockets(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
