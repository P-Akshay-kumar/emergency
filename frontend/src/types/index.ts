export type Role = "ADMIN" | "STAFF" | "ATTENDEE";

export type IncidentStatus = "REPORTED" | "ACKNOWLEDGED" | "IN_PROGRESS" | "RESOLVED";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Incident {
  id: string;
  eventId: string;
  title: string;
  description: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  createdAt: string;
  resolvedAt: string | null;
  reportedBy?: { name: string };
  assignments?: { staff: { user: { name: string } } }[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  isAcknowledged: boolean;
  createdAt: string;
}

export interface Event {
  id: string;
  name: string;
  venue: string;
  startsAt: string;
  endsAt: string;
}

export interface StaffMember {
  id: string;
  specialty: string;
  isAvailable: boolean;
  user: { name: string; email: string };
}
