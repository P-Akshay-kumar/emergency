import { useMemo } from "react";
import type { Incident, IncidentSeverity, IncidentStatus, StaffMember } from "../types";

const SEVERITY_BG: Record<IncidentSeverity, string> = {
  LOW: "bg-severity-low",
  MEDIUM: "bg-severity-medium",
  HIGH: "bg-severity-high",
  CRITICAL: "bg-severity-critical",
};

const SEVERITY_ORDER: IncidentSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUS_ORDER: IncidentStatus[] = ["REPORTED", "ACKNOWLEDGED", "IN_PROGRESS", "RESOLVED"];

const STATUS_LABELS: Record<IncidentStatus, string> = {
  REPORTED: "Reported",
  ACKNOWLEDGED: "Acked",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
};

export default function StatsOverview({
  incidents,
  staff,
  showStaff,
}: {
  incidents: Incident[];
  staff: StaffMember[];
  showStaff: boolean;
}) {
  // Derived entirely from props already kept live by the socket listeners
  // in Dashboard — no separate fetch, no separate "is this stale" question,
  // this recalculates automatically on every render those props change.
  const stats = useMemo(() => {
    const byStatus: Record<IncidentStatus, number> = {
      REPORTED: 0,
      ACKNOWLEDGED: 0,
      IN_PROGRESS: 0,
      RESOLVED: 0,
    };
    const bySeverity: Record<IncidentSeverity, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const incident of incidents) {
      byStatus[incident.status]++;
      bySeverity[incident.severity]++;
    }
    const active = incidents.length - byStatus.RESOLVED;
    return { byStatus, bySeverity, active, total: incidents.length };
  }, [incidents]);

  const availableStaff = staff.filter((s) => s.isAvailable).length;

  return (
    <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard label="Active" value={stats.active} />
      {STATUS_ORDER.filter((s) => s !== "REPORTED").map((status) => (
        <StatCard key={status} label={STATUS_LABELS[status]} value={stats.byStatus[status]} />
      ))}

      <div className="col-span-2 sm:col-span-4 rounded-md border border-base-800 bg-base-900 p-3">
        <p className="text-xs font-mono uppercase tracking-wide text-base-400 mb-2">
          By severity
        </p>
        {stats.total === 0 ? (
          <p className="text-xs text-base-600">No incidents yet</p>
        ) : (
          <>
            <div className="flex h-2 rounded-full overflow-hidden">
              {SEVERITY_ORDER.map((severity) => {
                const count = stats.bySeverity[severity];
                if (count === 0) return null;
                return (
                  <div
                    key={severity}
                    className={SEVERITY_BG[severity]}
                    style={{ width: `${(count / stats.total) * 100}%` }}
                    title={`${severity}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex gap-4 mt-2">
              {SEVERITY_ORDER.map((severity) => (
                <div key={severity} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${SEVERITY_BG[severity]}`} />
                  <span className="text-xs font-mono text-base-400">
                    {severity} {stats.bySeverity[severity]}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {showStaff && (
        <div className="col-span-2 sm:col-span-4 rounded-md border border-base-800 bg-base-900 p-3 flex items-center justify-between">
          <p className="text-xs font-mono uppercase tracking-wide text-base-400">
            Staff available
          </p>
          <p className="text-sm font-mono text-base-50">
            {availableStaff} / {staff.length}
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-base-800 bg-base-900 p-3">
      <p className="text-2xl font-semibold text-base-50 font-mono">{value}</p>
      <p className="text-xs text-base-400 mt-0.5">{label}</p>
    </div>
  );
}
