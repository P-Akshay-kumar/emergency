import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSocket } from "../lib/socket";
import { useAuthStore } from "../store/auth";
import type { Incident, IncidentSeverity, IncidentStatus } from "../types";

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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api
      .get("/incidents")
      .then((res) => setIncidents(res.data))
      .finally(() => setLoading(false));
  }, []);

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

    socket.on("incident:created", onCreated);
    socket.on("incident:updated", onUpdated);

    return () => {
      socket.off("incident:created", onCreated);
      socket.off("incident:updated", onUpdated);
    };
  }, [socket]);

  const canManage = user?.role === "ADMIN" || user?.role === "STAFF";

  async function updateStatus(id: string, status: IncidentStatus) {
    await api.patch(`/incidents/${id}/status`, { status });
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
          <button
            onClick={logout}
            className="text-sm text-base-400 hover:text-base-50 transition"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold text-base-50">Incidents</h1>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="rounded-md bg-severity-high px-4 py-2 text-sm font-medium text-base-950 hover:opacity-90 transition"
          >
            {showForm ? "Cancel" : "Report incident"}
          </button>
        </div>

        {showForm && (
          <ReportForm onCreated={() => setShowForm(false)} />
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
                    </p>
                  </div>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function ReportForm({ onCreated }: { onCreated: () => void }) {
  const [eventId, setEventId] = useState("");
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
      <p className="text-xs text-base-400">
        Event ID is required until the events list is built — copy one from the
        database for now.
      </p>
      <input
        placeholder="Event ID"
        required
        value={eventId}
        onChange={(e) => setEventId(e.target.value)}
        className="w-full rounded-md border border-base-700 bg-base-800 px-3 py-2 text-sm text-base-50 font-mono"
      />
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
