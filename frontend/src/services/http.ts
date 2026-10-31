import { env } from "../config/env";
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${env.apiUrl}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error((await res.text()) || `Request failed (${res.status})`);
  return res.json() as Promise<T>;
}
export const wait = (ms = 600) => new Promise((r) => setTimeout(r, ms));
