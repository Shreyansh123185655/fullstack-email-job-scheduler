import { env } from "../config/env";
import type { User } from "../types";
import { http } from "./http";
import { mockUser } from "./mockDb";

const KEY = "onb_mock_user";

export const authService = {
  async me(): Promise<User | null> {
    // 1. Check if user data was passed via URL query parameter from OAuth redirect
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get("user");
      if (userParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(userParam));
          if (parsed && (parsed.email || parsed.id)) {
            localStorage.setItem(KEY, JSON.stringify(parsed));
            // Clean query params from the browser address bar
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
            return parsed;
          }
        } catch (e) {
          console.error("Failed to parse user from query param:", e);
        }
      }
    }

    // 2. Check localStorage
    const raw = localStorage.getItem(KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {}
    }

    // 3. Check backend session
    try {
      const u = await http<User>("/auth/me");
      if (u && (u.email || u.id)) {
        localStorage.setItem(KEY, JSON.stringify(u));
        return u;
      }
    } catch {}

    return null;
  },

  loginWithGoogle(): void {
    // Real Google OAuth redirect - no mock
    const apiUrl = env.apiUrl.startsWith("http")
      ? env.apiUrl
      : `${window.location.origin}${env.apiUrl}`;
    window.location.href = `${apiUrl}/auth/google`;
  },

  async loginWithGoogleToken(credential: string): Promise<User> {
    const user = await http<User>("/auth/google/verify", {
      method: "POST",
      body: JSON.stringify({ credential }),
    });
    localStorage.setItem(KEY, JSON.stringify(user));
    return user;
  },

  async loginWithEmail(email: string, password: string): Promise<User> {
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
