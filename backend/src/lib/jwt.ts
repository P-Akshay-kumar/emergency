import jwt from "jsonwebtoken";

const rawSecret = process.env.JWT_SECRET;

if (!rawSecret) {
  throw new Error("JWT_SECRET is not set. Did you copy .env.example to .env?");
}

// Re-assigning to a new const with an explicit type avoids relying on
// TypeScript narrowing the original value across the closures below.
const JWT_SECRET: string = rawSecret;

export interface AuthTokenPayload {
  userId: string;
  role: "ADMIN" | "STAFF" | "ATTENDEE";
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as AuthTokenPayload;
}
