import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { initSockets } from "./sockets";
import authRoutes from "./routes/auth.routes";
import incidentRoutes from "./routes/incidents.routes";
import notificationRoutes from "./routes/notifications.routes";

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/notifications", notificationRoutes);

initSockets(httpServer);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
