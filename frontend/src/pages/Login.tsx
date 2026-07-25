import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      setAuth(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error ?? "Something went wrong. Try again.");
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

        <h1 className="text-2xl font-semibold text-base-50 mb-1">Sign in</h1>
        <p className="text-sm text-base-400 mb-6">Access your incident dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-base-700 bg-base-900 px-3 py-2 text-base-50 focus:outline-none focus:ring-2 focus:ring-severity-low"
            />
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
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-sm text-base-400">
          No account?{" "}
          <Link to="/register" className="text-severity-low hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
