import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSocket } from "../lib/socket";
import { useAuthStore } from "../store/auth";
import NotificationBell from "../components/NotificationBell";
import StatsOverview from "../components/StatsOverview";
import type { Incident, IncidentSeverity, IncidentStatus, Event, StaffMember } from "../types";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  LOW: "border-l-severity-low",
  MEDIUM: "border-l-severity-medium",
  HIGH: "border-l-severity-high",
  CRITICAL: "border-l-severity-critical",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: "Reported",
  ACKNOWLEDGED: "Acknowledged",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { socket, connected } = useSocket();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showIncidentForm, setShowIncidentForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);

  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    const requests = [api.get("/incidents"), api.get("/events")];
    if (isAdmin) requests.push(api.get("/staff"));

    Promise.all(requests)
      .then(([incidentsRes, eventsRes, staffRes]) => {
        setIncidents(incidentsRes.data);
        setEvents(eventsRes.data);
        if (staffRes) setStaff(staffRes.data);
      })
      .finally(() => setLoading(false));
  }, [isAdmin]);

  // Live updates — this is the actual upgrade over the old app's
  // refresh-to-see-anything dashboards.
  useEffect(() => {
    if (!socket) return;

    const onCreated = (incident: Incident) =>
      setIncidents((prev) =>
        prev.some((i) => i.id === incident.id) ? prev : [incident, ...prev]
      );

    const onUpdated = (incident: Incident) =>
      setIncidents((prev) => prev.map((i) => (i.id === incident.id ? incident : i)));

    // The assign endpoint broadcasts the StaffAssignment record, not a full
    // Incident — so this appends to the matching incident's assignment list
    // rather than replacing the whole incident.
    const onAssigned = (assignment: {
      incidentId: string;
      staff: { user: { name: string } };
    }) =>
      setIncidents((prev) =>
        prev.map((i) =>
          i.id === assignment.incidentId
            ? { ...i, assignments: [...(i.assignments ?? []), { staff: assignment.staff }] }
            : i
        )
      );

    socket.on("incident:created", onCreated);
    socket.on("incident:updated", onUpdated);
    socket.on("incident:assigned", onAssigned);

    return () => {
      socket.off("incident:created", onCreated);
      socket.off("incident:updated", onUpdated);
      socket.off("incident:assigned", onAssigned);
    };
  }, [socket]);

  const canManage = isAdmin || user?.role === "STAFF";

  async function updateStatus(id: string, status: IncidentStatus) {
    await api.patch(`/incidents/${id}/status`, { status });
  }

  async function assignStaff(incidentId: string, staffId: string) {
    if (!staffId) return;
    await api.post(`/incidents/${incidentId}/assign`, { staffId });
  }

  return (
    <div className="min-h-screen bg-base-950">
      <header className="border-b border-base-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-signal animate-pulse" : "bg-base-600"}`}
            title={connected ? "Live" : "Disconnected"}
          />
          <span className="font-mono text-xs uppercase tracking-widest text-base-400">
            EmergencyHub — {connected ? "Live" : "Reconnecting…"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-base-400">
            {user?.name} · <span className="font-mono text-xs">{user?.role}</span>
          </span>
          <NotificationBell />
          <button
            onClick={logout}
            className="text-sm text-base-400 hover:text-base-50 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {isAdmin && (
          <div className="mb-8 pb-8 border-b border-base-800">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-mono uppercase tracking-wide text-base-400">
                Events ({events.length})
              </h2>
              <button
                onClick={() => setShowEventForm((v) => !v)}
                className="rounded-md border border-base-700 px-3 py-1.5 text-xs font-medium text-base-200 hover:bg-base-800 transition"
              >
                {showEventForm ? "Cancel" : "+ New event"}
              </button>
            </div>
            {showEventForm && (
              <EventForm
                onCreated={(event) => {
                  setEvents((prev) => [...prev, event]);
                  setShowEventForm(false);
                }}
              />
            )}
          </div>
        )}

        <StatsOverview incidents={incidents} staff={staff} showStaff={isAdmin} />

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-base-50">Incidents</h1>
          <button
            onClick={() => setShowIncidentForm((v) => !v)}
            disabled={events.length === 0}
            className="rounded-md bg-severity-high px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {showIncidentForm ? "Cancel" : "Report incident"}
          </button>
        </div>

        {events.length === 0 && (
          <p className="text-sm text-base-400 mb-6">
            {isAdmin
              ? "Create an event above before incidents can be reported against it."
              : "No events exist yet — an admin needs to create one before incidents can be reported."}
          </p>
        )}

        {showIncidentForm && (
          <ReportForm events={events} onCreated={() => setShowIncidentForm(false)} />
        )}

        {loading ? (
          <p className="text-base-400 text-sm">Loading incidents…</p>
        ) : incidents.length === 0 ? (
          <p className="text-base-400 text-sm">No incidents reported yet.</p>
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li
                key={incident.id}
                className={`border-l-4 ${SEVERITY_STYLES[incident.severity]} bg-base-900 rounded-r-md px-4 py-3`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-base-50">{incident.title}</p>
                    <p className="text-sm text-base-400 mt-0.5">{incident.description}</p>
                    <p className="text-xs font-mono text-base-600 mt-2">
                      {STATUS_LABELS[incident.status]} · reported by{" "}
                      {incident.reportedBy?.name ?? "unknown"}
                      {incident.assignments && incident.assignments.length > 0 && (
                        <>
                          {" "}
                          · assigned to{" "}
                          {incident.assignments.map((a) => a.staff.user.name).join(", ")}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {canManage && incident.status !== "RESOLVED" && (
                      <select
                        value={incident.status}
                        onChange={(e) =>
                          updateStatus(incident.id, e.target.value as IncidentStatus)
                        }
                        className="text-xs font-mono rounded border border-base-700 bg-base-800 text-base-200 px-2 py-1"
                      >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    )}
                    {isAdmin && incident.status !== "RESOLVED" && staff.length > 0 && (
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          assignStaff(incident.id, e.target.value);
                          e.target.value = "";
                        }}
                        className="text-xs font-mono rounded border border-base-700 bg-base-800 text-base-200 px-2 py-1"
                      >
                        <option value="" disabled>
                          Assign staff…
                        </option>
                        {staff.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.user.name}
                            {s.isAvailable ? "" : " (unavailable)"}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

// Formats a Date as the local "YYYY-MM-DDTHH:mm" string datetime-local
// inputs expect — used to set the earliest pickable start time in the UI
// itself, not just to validate after the fact.
function toDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const MIN_LEAD_TIME_MS = 24 * 60 * 60 * 1000;

function EventForm({ onCreated }: { onCreated: (event: Event) => void }) {
  const [name, setName] = useState("");
  const [venue, setVenue] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const minStart = toDatetimeLocal(new Date(Date.now() + MIN_LEAD_TIME_MS));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Same checks the backend enforces — catching them here means an
    // obviously invalid submission doesn't need a round trip to reject.
    if (new Date(startsAt).getTime() - Date.now() < MIN_LEAD_TIME_MS) {
      setError("Event must be created at least 24 hours before it starts.");
      return;
    }
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError("End time must be after the start time.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post("/events", {
        name,
        venue,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
      });
      onCreated(res.data);
    } catch (err: any) {
      setError(
        err.response?.data?.error
          ? JSON.stringify(err.response.data.error)
          : "Failed to create event."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-md border border-base-800 bg-base-900 p-4 space-y-3"
    >
      <p className="text-xs text-base-400">
        Events must be created at least 24 hours before they start.
      </p>
      <input
        placeholder="Event name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
      />
      <input
        placeholder="Venue"
        required
        value={venue}
        onChange={(e) => setVenue(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
      />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-base-400 mb-1">Starts</label>
          <input
            type="datetime-local"
            required
            min={minStart}
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
          />
        </div>
        <div>
          <label className="block text-xs text-base-400 mb-1">Ends</label>
          <input
            type="datetime-local"
            required
            min={startsAt || minStart}
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
          />
        </div>
      </div>

      {error && <p className="text-sm text-severity-critical">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-severity-low px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Creating…" : "Create event"}
      </button>
    </form>
  );
}

function ReportForm({
  events,
  onCreated,
}: {
  events: Event[];
  onCreated: () => void;
}) {
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("MEDIUM");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post("/incidents", { eventId, title, description, severity });
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.error ? JSON.stringify(err.response.data.error) : "Failed to report incident.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 rounded-md border border-base-800 bg-base-900 p-4 space-y-3"
    >
      <select
        required
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
      >
        {events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name} — {event.venue}
          </option>
        ))}
      </select>
      <input
        placeholder="Title"
        required
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
      />
      <textarea
        placeholder="Description"
        required
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
        rows={2}
      />
      <select
        value={severity}
        onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50"
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      {error && <p className="text-sm text-severity-critical">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-severity-high px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}
