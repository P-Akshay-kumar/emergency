import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 removed the built-in query engine — a driver adapter is required.
// Reusing one instance across the app (rather than creating a new PrismaClient
// per request) avoids exhausting the Postgres connection pool.
const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error("DATABASE_URL is not set. Did you copy .env.example to .env?");
}

const connectionString: string = rawUrl;
const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({ adapter });
