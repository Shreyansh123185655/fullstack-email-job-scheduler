import { env } from "../config/env";
import type { Email, EmailCounts, EmailStatus, ScheduleEmailPayload, Sender } from "../types";
import { http, wait } from "./http";
import { mockEmails, mockSenders } from "./mockDb";
const db: Email[] = [...mockEmails]; 
export const emailService = {
  async list(status: EmailStatus, q = ""): Promise<Email[]> {
    if (!env.useMock) return http<Email[]>(`/emails?status=${status}&q=${encodeURIComponent(q)}`);
    await wait();
    const needle = q.toLowerCase();
    return db.filter((e) => e.status === status && `${e.to} ${e.subject} ${e.body}`.toLowerCase().includes(needle));
  },
  async get(id: string): Promise<Email> {
    if (!env.useMock) return http<Email>(`/emails/${id}`);
    await wait(300);
    const found = db.find((e) => e.id === id);
    if (!found) throw new Error("Email not found");
    return found;
  },
  async counts(): Promise<EmailCounts> {
    if (!env.useMock) return http<EmailCounts>("/emails/counts");
    return { scheduled: db.filter((e) => e.status === "scheduled").length, sent: db.filter((e) => e.status === "sent").length };
  },
  async senders(): Promise<Sender[]> {
    return env.useMock ? mockSenders : http<Sender[]>("/senders");
  },
  async schedule(p: ScheduleEmailPayload): Promise<{ count: number }> {
    if (!env.useMock) return http("/emails/schedule", { method: "POST", body: JSON.stringify(p) });
    await wait(800);
    const from = mockSenders.find((s) => s.id === p.senderId)?.email ?? "";
    p.recipients.forEach((to, i) =>
      db.unshift({
        id: crypto.randomUUID(), from, to, subject: p.subject, body: p.body, status: "scheduled",
        scheduledAt: new Date((p.startTime ? +new Date(p.startTime) : Date.now()) + i * p.delaySeconds * 1000).toISOString(),
        attachments: [],
      })
    );
    return { count: p.recipients.length };
  },
};
