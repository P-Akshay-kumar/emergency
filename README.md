# EmergencyHub

A real-time incident management platform for live events — attendees report incidents, staff and admins respond, and every dashboard updates instantly over WebSockets instead of requiring a page refresh.

Rebuilt from the ground up (React + Node/Express + PostgreSQL) from an earlier Flask prototype. The original had a notification feature that referenced a database model that was never defined — it crashed on every request. This version's notification system is fully implemented and is the one you'll actually see working below.

## Features

- **Role-based access** — Admin, Staff, and Attendee roles with different permissions (e.g. only admins create events and assign staff; only staff/admin can resolve incidents)
- **Live incident feed** — incidents appear on every relevant dashboard the moment they're reported, via Socket.IO, no polling
- **Real-time notifications** — a notification bell with an unread badge; staff get notified instantly when assigned, reporters get notified when their incident's status changes
- **Staff assignment** — admins assign incidents to available staff from a real directory, not a raw ID field
- **Event management** — admins create events with a server-enforced 24-hour minimum lead time before the event starts, and an end time that must be after the start time
- **Live stats overview** — active incident count, status breakdown, severity distribution, and staff availability, all derived from state already kept live by the socket layer

## Tech stack

**Backend:** Node.js, Express, TypeScript, PostgreSQL, Prisma 7 (driver-adapter based), Socket.IO, JWT auth, Zod validation

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Zustand, React Router, Socket.IO client, Axios

## Architecture

```
backend/
  prisma/schema.prisma   — data model (User, Event, Incident, EmergencyStaff,
                            StaffAssignment, Alert, EmergencyNotification)
  src/
    lib/          — Prisma client singleton, JWT helpers
    middleware/   — auth (JWT verification, role guards)
    routes/       — auth, events, incidents, notifications, staff
    sockets/      — Socket.IO auth + room-based broadcast helpers
    index.ts      — Express app entry, global error handler

frontend/
  src/
    components/   — NotificationBell, StatsOverview
    pages/        — Login, Register, Dashboard
    store/        — Zustand auth store (persisted)
    lib/          — Axios client, Socket.IO hook
```

Real-time updates work by role-based and user-based Socket.IO rooms: every connected client joins a room for their own user ID (personal notifications) and a room for their role (broadcasts like "new incident reported" going to every Admin/Staff dashboard at once).

## Setup

### Prerequisites
- Node.js 20+
- PostgreSQL running locally (or any reachable Postgres instance)

### 1. Clone and install
```bash
git clone https://github.com/P-Akshay-kumar/emergency.git
cd emergency

cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment variables
```bash
cd backend
cp .env.example .env
```
Edit `.env` — set `DATABASE_URL` to your local Postgres connection string and generate a real `JWT_SECRET`:
```bash
sed -i '' "s|replace-with-a-long-random-string|$(openssl rand -hex 32)|" .env
```
(drop the `''` after `-i` if you're on Linux instead of macOS)

```bash
cd ../frontend
cp .env.example .env
```
Defaults point at `http://localhost:4000` — only change these if you're running the backend somewhere else.

### 3. Set up the database
```bash
cd ../backend
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```
The seed script creates a demo admin (`admin@demo.dev` / `password123`) and one demo event, so you're not stuck creating one manually before the app is usable.

### 4. Run it
Two terminals:
```bash
cd backend && npm run dev    # http://localhost:4000
cd frontend && npm run dev   # http://localhost:5173
```

## Known limitations

- No dedicated admin/staff dashboard layout yet — one shared dashboard with role-conditional controls
- No filtering by event on the incident list (all incidents across all events show together)
- No password reset flow
- No automated tests yet

## License

MIT
