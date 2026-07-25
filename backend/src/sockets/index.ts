import { Server as HttpServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { verifyToken } from "../lib/jwt";

let io: SocketIOServer | undefined;

export function initSockets(httpServer: HttpServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.CLIENT_URL, credentials: true },
  });

  // Auth happens once at connection time, not per-message — the client sends
  // its JWT in the connection handshake instead of a custom login event.
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("No auth token provided"));
    }
    try {
      const payload = verifyToken(token);
      socket.data.userId = payload.userId;
      socket.data.role = payload.role;
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    // Every connected client joins a room for their own user id (for
    // personal notifications) and a room for their role (for broadcasts
    // like "new incident reported" going to all STAFF/ADMIN dashboards).
    socket.join(`user:${socket.data.userId}`);
    socket.join(`role:${socket.data.role}`);
  });

  return io;
}

function getIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.IO not initialized — call initSockets() before using broadcast helpers");
  }
  return io;
}

export function broadcastToRoles(
  roles: Array<"ADMIN" | "STAFF" | "ATTENDEE">,
  event: string,
  payload: unknown
) {
  const server = getIO();
  for (const role of roles) {
    server.to(`role:${role}`).emit(event, payload);
  }
}

export function notifyUser(userId: string, event: string, payload: unknown) {
  getIO().to(`user:${userId}`).emit(event, payload);
}
