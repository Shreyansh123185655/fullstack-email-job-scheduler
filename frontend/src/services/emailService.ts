import { env } from "../config/env";
import type { Email, EmailCounts, EmailStatus, ScheduleEmailPayload, Sender } from "../types";
import { http, wait } from "./http";
import { mockEmails, mockSenders } from "./mockDb";

const db: Email[] = [...mockEmails]; // in-memory only, used when VITE_USE_MOCK=true

const isVercelStandalone = () => typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

export const emailService = {
  async list(status: EmailStatus, q = ""): Promise<Email[]> {
    if (!env.useMock && !isVercelStandalone()) {
      try {
        return await http<Email[]>(`/emails?status=${status}&q=${encodeURIComponent(q)}`);
      } catch (e) {
        console.warn("Backend list failed, falling back to local data", e);
      }
    }
    await wait(150);
    const needle = q.toLowerCase();
    return db.filter((e) => e.status === status && `${e.to} ${e.subject} ${e.body}`.toLowerCase().includes(needle));
  },

  async get(id: string): Promise<Email> {
    if (!env.useMock && !isVercelStandalone()) {
      try {
        return await http<Email>(`/emails/${id}`);
      } catch (e) {
        console.warn("Backend get failed, falling back to local data", e);
      }
    }
    await wait(150);
    const found = db.find((e) => e.id === id);
    if (!found) throw new Error("Email not found");
    return found;
  },

  async counts(): Promise<EmailCounts> {
    if (!env.useMock && !isVercelStandalone()) {
      try {
        return await http<EmailCounts>("/emails/counts");
      } catch (e) {
        console.warn("Backend counts failed, falling back to local data", e);
      }
    }
    return {
      scheduled: db.filter((e) => e.status === "scheduled").length,
      sent: db.filter((e) => e.status === "sent").length,
    };
  },

  async senders(): Promise<Sender[]> {
    if (!env.useMock && !isVercelStandalone()) {
      try {
        return await http<Sender[]>("/senders");
      } catch (e) {
        console.warn("Backend senders failed, falling back to local data", e);
      }
    }
    return mockSenders;
  },

  async schedule(p: ScheduleEmailPayload): Promise<{ count: number }> {
    if (!env.useMock && !isVercelStandalone()) {
      try {
        return await http("/emails/schedule", { method: "POST", body: JSON.stringify(p) });
      } catch (e) {
        console.warn("Backend schedule failed, falling back to local scheduler", e);
      }
    }
    await wait(400);
    const from = mockSenders.find((s) => s.id === p.senderId)?.email ?? "shreyansh.gupta@reachinbox.ai";
    p.recipients.forEach((to, i) =>
      db.unshift({
        id: crypto.randomUUID(),
        from,
        to,
        subject: p.subject,
        body: p.body,
        status: "scheduled",
        scheduledAt: new Date(
          (p.startTime ? +new Date(p.startTime) : Date.now()) + i * p.delaySeconds * 1000
        ).toISOString(),
        attachments: [],
      })
    );
    return { count: p.recipients.length };
  },
};
