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
    to: "alex.turner@acme.co",
    subject: "Follow up on our product partnership discussion",
    body: "<p>Hi Alex, following up on our discussion last week regarding the partnership roadmap. Let me know when you're free to chat.</p>",
    status: "scheduled",
    scheduledAt: hoursFromNow(20),
    attachments: [],
  },
  {
    id: "e2",
    from: mockUser.email,
    to: "sarah.jenkins@growthventures.com",
    subject: "Updated discussion notes and presentation",
    body: "<p>Hi Sarah, sharing the updated presentation and discussion notes from yesterday's meeting.</p>",
    status: "scheduled",
    scheduledAt: hoursFromNow(52),
    attachments: [],
  },
];
