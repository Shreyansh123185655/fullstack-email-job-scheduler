import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "../services/authService";
import type { User } from "../types";

interface AuthValue {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { authService.me().then(setUser).finally(() => setLoading(false)); }, []);

  const loginWithGoogle = useCallback(async () => { const u = await authService.loginWithGoogle(); if (u) setUser(u); }, []);
  const loginWithEmail = useCallback(async (e: string, p: string) => setUser(await authService.loginWithEmail(e, p)), []);
  const logout = useCallback(async () => { await authService.logout(); setUser(null); }, []);

  return <AuthContext.Provider value={{ user, loading, loginWithGoogle, loginWithEmail, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
