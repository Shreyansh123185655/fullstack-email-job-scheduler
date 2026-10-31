import { env } from "../config/env";
import type { User } from "../types";
import { http, wait } from "./http";
import { mockUser } from "./mockDb";
const KEY = "onb_mock_user";
export const authService = {
  async me(): Promise<User | null> {
    if (env.useMock) { await wait(300); const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; }
    try { return await http<User>("/auth/me"); } catch { return null; }
  },
  async loginWithGoogle(): Promise<User | void> {
    if (env.useMock) { await wait(); localStorage.setItem(KEY, JSON.stringify(mockUser)); return mockUser; }
    window.location.href = `${env.apiUrl}/auth/google`;
  },
  async loginWithEmail(email: string, password: string): Promise<User> {
    if (env.useMock) { await wait(); localStorage.setItem(KEY, JSON.stringify({ ...mockUser, email })); return { ...mockUser, email }; }
    return http<User>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
  },
  async logout(): Promise<void> {
    if (env.useMock) { localStorage.removeItem(KEY); return; }
    await http("/auth/logout", { method: "POST" });
  },
};
