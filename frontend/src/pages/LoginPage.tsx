import { Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";
export default function LoginPage() {
  const { user, loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("shreyansh.gupta@reachinbox.ai");
  const [password, setPassword] = useState("password123");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);
  if (user) return <Navigate to="/scheduled" replace />;
  const run = async (kind: "google" | "email", fn: () => Promise<void>) => {
    setBusy(kind);
    try {
      await fn();
      navigate("/scheduled");
    } catch (e) {
      toast("error", (e as Error).message || "Login failed");
    } finally {
      setBusy(null);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    run("email", () => loginWithEmail(email, password));
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 p-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-10 shadow-xl shadow-slate-200/40">
        {/* Brand Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-md border border-slate-800 mb-4">
            <Mail size={26} className="stroke-[2] text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">ReachInbox Scheduler</h1>
          <p className="mt-1 text-xs text-slate-500">
            Distributed Email Queue & Concurrency Engine
          </p>
          {/* Developer Tag */}
          <div className="mt-3 flex items-center gap-2 rounded-full border border-slate-200/70 bg-slate-50 px-3 py-1">
            <img
              src="https://avatars.githubusercontent.com/u/158720188?v=4"
              alt="Shreyansh Gupta"
              className="h-5 w-5 rounded-full object-cover border border-slate-300"
            />
            <span className="text-[11px] font-medium text-slate-600">Built by Shreyansh Gupta</span>
          </div>
        </div>
        {/* Google OAuth Login Button */}
        <button
          onClick={() => run("google", loginWithGoogle)}
          disabled={busy !== null}
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden>
            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
            <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
          </svg>
          {busy === "google" ? "Authenticating…" : "Login with Google"}
        </button>
        <div className="my-6 flex items-center gap-4 text-xs text-slate-400">
          <hr className="flex-1 border-slate-200" />
          <span>or sign in with email</span>
          <hr className="flex-1 border-slate-200" />
        </div>
        {/* Email Login Form */}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email ID"
            aria-label="Email ID"
            className="rounded-xl border border-slate-200 bg-field px-4 py-3 text-xs outline-none focus:border-brand-500"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="rounded-xl border border-slate-200 bg-field px-4 py-3 text-xs outline-none focus:border-brand-500"
          />
          <Button type="submit" variant="solid" loading={busy === "email"} className="mt-2 rounded-xl py-3 text-sm font-semibold">
            Sign In to Dashboard
          </Button>
        </form>
      </div>
    </div>
  );
}
