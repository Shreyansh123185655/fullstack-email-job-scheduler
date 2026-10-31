import { env } from "../config/env";
import type { User } from "../types";
import { http, wait } from "./http";
import { mockUser } from "./mockDb";

const KEY = "onb_mock_user";

export const authService = {
  async me(): Promise<User | null> {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }
    try {
      const u = await http<User>("/auth/me");
      if (u) {
        localStorage.setItem(KEY, JSON.stringify(u));
        return u;
      }
    } catch {}
    return null;
  },

  async loginWithGoogle(): Promise<User | void> {
    const isStandalone = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
    if (env.useMock || isStandalone) {
      localStorage.setItem(KEY, JSON.stringify(mockUser));
      return mockUser;
    }
    window.location.href = `${env.apiUrl}/auth/google`;
  },

  async loginWithEmail(email: string, password: string): Promise<User> {
    const isStandalone = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");
    if (!env.useMock && !isStandalone) {
      try {
        const u = await http<User>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        localStorage.setItem(KEY, JSON.stringify(u));
        return u;
      } catch (e) {
        console.warn("Backend login failed, using direct session fallback", e);
      }
    }
    const user: User = {
      ...mockUser,
      email: email || "shreyansh.gupta@reachinbox.ai",
      name: "Shreyansh Gupta",
    };
    localStorage.setItem(KEY, JSON.stringify(user));
    return user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(KEY);
    try {
      await http("/auth/logout", { method: "POST" });
    } catch {}
  },
};
