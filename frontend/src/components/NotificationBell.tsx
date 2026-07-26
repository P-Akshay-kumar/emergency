import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useSocket } from "../lib/socket";
import type { AppNotification } from "../types";

export default function NotificationBell() {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get("/notifications").then((res) => setNotifications(res.data));
  }, []);

  // The backend already emits this on incident status changes and staff
  // assignments (see incidents.routes.ts) — this is the piece that was
  // entirely missing before: nothing was listening for it in the UI.
  useEffect(() => {
    if (!socket) return;
    const onNew = (notification: AppNotification) =>
      setNotifications((prev) => [notification, ...prev]);
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [socket]);

  // Close the panel on an outside click, standard dropdown behavior.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isAcknowledged).length;

  async function acknowledge(id: string) {
    // Optimistic update — the panel should feel instant, not wait on a
    // round trip before the badge count changes.
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isAcknowledged: true } : n))
    );
    try {
      await api.patch(`/notifications/${id}/acknowledge`);
    } catch {
      // Roll back if the server actually rejected it — better than leaving
      // the UI showing a state that isn't real.
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isAcknowledged: false } : n))
      );
    }
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-base-400 hover:text-base-50 hover:bg-base-800 transition"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-severity-critical px-1 text-[10px] font-bold text-base-50">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-md border border-base-700 bg-base-900 shadow-xl z-10">
          <div className="border-b border-base-800 px-4 py-2.5">
            <p className="text-xs font-mono uppercase tracking-wide text-base-400">
              Notifications
            </p>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-base-400 text-center">
                Nothing yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isAcknowledged && acknowledge(n.id)}
                  className={`block w-full text-left px-4 py-3 border-b border-base-800 last:border-0 transition ${
                    n.isAcknowledged ? "opacity-50" : "hover:bg-base-800"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.isAcknowledged && (
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-base-50">{n.title}</p>
                      <p className="text-xs text-base-400 mt-0.5">{n.message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
