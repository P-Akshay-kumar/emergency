import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Did you copy .env.example to .env?");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@demo.dev" },
    update: {},
    create: { name: "Demo Admin", email: "admin@demo.dev", passwordHash, role: "ADMIN" },
  });

  const event = await prisma.event.upsert({
    where: { id: "demo-event-1" },
    update: {},
    create: {
      id: "demo-event-1",
      name: "Campus Tech Fest 2026",
      venue: "Main Auditorium",
      startsAt: new Date("2026-08-01T09:00:00Z"),
      endsAt: new Date("2026-08-01T18:00:00Z"),
      latitude: 17.4933,
      longitude: 78.3915,
    },
  });

  console.log("Seeded:");
  console.log({ admin: admin.email, event: { id: event.id, name: event.name } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
