import type { Email, Sender, User } from "../types";

export const mockUser: User = {
  id: "u1", name: "Oliver Brown", email: "oliver.brown@domain.io",
  avatarUrl: "https://i.pravatar.cc/80?img=12",
};
export const mockSenders: Sender[] = [
  { id: "s1", email: "oliver.brown@domain.io" },
  { id: "s2", email: "sales@domain.io" },
];

const hoursFromNow = (h: number) => new Date(Date.now() + h * 36e5).toISOString();

export const mockEmails: Email[] = [
  { id: "e1", from: mockUser.email, to: "John Smith", subject: "Meeting follow-up - Scheduled",
    body: "<p>Hi John, just wanted to follow up on our meeting...</p>", status: "scheduled",
    scheduledAt: hoursFromNow(20), attachments: [] },
  { id: "e2", from: mockUser.email, to: "Olive", subject: "Ramit, great to meet you - you'll love it",
    body: "<p>Hi Olive, just wanted to follow up on our meeting...</p>", status: "scheduled",
    scheduledAt: hoursFromNow(52), attachments: [] },
  { id: "e3", from: mockUser.email, to: "Sarah Wilson", subject: "Re: Project Update",
    body: "<p>Thanks for the update, Sarah. Looks good!</p>", status: "sent",
    sentAt: hoursFromNow(-5), attachments: [] },
  { id: "e4", from: mockUser.email, to: "Support", subject: "Issue with login",
    body: "<p>I am having trouble logging in to the dashboard...</p>", status: "sent",
    sentAt: hoursFromNow(-30),
    attachments: [{ name: "Tennis_Coach_Profile.png", sizeLabel: "1.2 MB" }] },
];
