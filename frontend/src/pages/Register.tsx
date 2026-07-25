import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ATTENDEE" | "STAFF">("ATTENDEE");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/register", { name, email, password, role });
      setAuth(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err: any) {
      const fieldErrors = err.response?.data?.error;
      setError(
        typeof fieldErrors === "string"
          ? fieldErrors
          : Object.values(fieldErrors ?? {}).flat().join(" ") || "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-signal animate-pulse" />
          <span className="font-mono text-xs uppercase tracking-widest text-base-400">
            EmergencyHub Console
          </span>
        </div>

        <h1 className="text-2xl font-semibold text-base-50 mb-1">Create account</h1>
        <p className="text-sm text-base-400 mb-6">Join an event's response team</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-base-400 mb-1.5">
              Name
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-base-700 bg-base-900 px-3 py-2 text-base-50 focus:outline-none focus:ring-2 focus:ring-severity-low"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-base-400 mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-base-700 bg-base-900 px-3 py-2 text-base-50 focus:outline-none focus:ring-2 focus:ring-severity-low"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-base-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-base-700 bg-base-900 px-3 py-2 text-base-50 focus:outline-none focus:ring-2 focus:ring-severity-low"
            />
          </div>
          <div>
            <label className="block text-xs font-mono uppercase tracking-wide text-base-400 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "ATTENDEE" | "STAFF")}
              className="w-full rounded-md border border-base-700 bg-base-900 px-3 py-2 text-base-50 focus:outline-none focus:ring-2 focus:ring-severity-low"
            >
              <option value="ATTENDEE">Attendee — report incidents</option>
              <option value="STAFF">Staff — respond to incidents</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-severity-critical" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-severity-low py-2 font-medium text-base-950 transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-base-400">
          Already have an account?{" "}
          <Link to="/login" className="text-severity-low hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
