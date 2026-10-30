import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { user, loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<"google" | "email" | null>(null);

  if (user) return <Navigate to="/" replace />;

  const run = async (kind: "google" | "email", fn: () => Promise<void>) => {
    setBusy(kind);
    try { await fn(); navigate("/"); } catch (e) { toast("error", (e as Error).message || "Login failed"); } finally { setBusy(null); }
  };
  const submit = (e: FormEvent) => { e.preventDefault(); run("email", () => loginWithEmail(email, password)); };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border p-10">
        <h1 className="mb-8 text-center text-4xl font-bold">Login</h1>
        <button onClick={() => run("google", loginWithGoogle)} disabled={busy !== null}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-brand-50 py-3.5 font-medium hover:bg-brand-100 disabled:opacity-60">
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z"/><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
          {busy === "google" ? "Opening Google…" : "Login with Google"}
        </button>
        <div className="my-6 flex items-center gap-4 text-sm text-slate-400"><hr className="flex-1" />or sign up through email<hr className="flex-1" /></div>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email ID" aria-label="Email ID" className="rounded-xl bg-field px-4 py-4 text-sm outline-none" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password" className="rounded-xl bg-field px-4 py-4 text-sm outline-none" />
          <Button type="submit" variant="solid" loading={busy === "email"} className="mt-3 rounded-xl py-3.5 text-base">Login</Button>
        </form>
      </div>
    </div>
  );
}
