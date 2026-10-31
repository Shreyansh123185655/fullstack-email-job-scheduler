import type { Email, Sender, User } from "../types";

export const mockUser: User = {
  id: "u1",
  name: "Shreyansh Gupta",
  email: "shreyansh.gupta@reachinbox.ai",
  avatarUrl: "https://avatars.githubusercontent.com/u/158720188?v=4",
};

export const mockSenders: Sender[] = [
  { id: "s1", email: "shreyansh.gupta@reachinbox.ai" },
  { id: "s2", email: "outreach@reachinbox.ai" },
];

const hoursFromNow = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

export const mockEmails: Email[] = [
  {
    id: "e1",
    from: mockUser.email,
    to: "alex.partner@enterprise.io",
    subject: "ReachInbox Production Architecture & Performance Review",
    body: "<p>Hi Alex, sending over the architectural benchmarks for our BullMQ distributed scheduler...</p>",
    status: "scheduled",
    scheduledAt: hoursFromNow(20),
    attachments: [],
  },
  {
    id: "e2",
    from: mockUser.email,
    to: "sarah.lead@venture.com",
    subject: "Distributed Job Queue & Rate Limiter Demo Walkthrough",
    body: "<p>Hi Sarah, here are the rate limiter details and slotted deferral metrics...</p>",
    status: "scheduled",
    scheduledAt: hoursFromNow(52),
    attachments: [],
  },
  {
    id: "e3",
    from: mockUser.email,
    to: "tech-review@reachinbox.ai",
    subject: "BullMQ + Redis AOF Server Restart Stress Test Results",
    body: "<p>All 500 queued jobs resumed automatically with zero drop rates after container reboot.</p>",
    status: "sent",
    sentAt: hoursFromNow(-5),
    attachments: [],
  },
  {
    id: "e4",
    from: mockUser.email,
    to: "dev-team@reachinbox.ai",
    subject: "Ethereal Fake SMTP Dispatch Verification",
    body: "<p>Verified test dispatches and preview URLs generation across all concurrent workers.</p>",
    status: "sent",
    sentAt: hoursFromNow(-30),
    attachments: [{ name: "scheduler_benchmark_report.pdf", sizeLabel: "2.4 MB" }],
  },
];
