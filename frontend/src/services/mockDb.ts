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
export const mockEmails: Email[] = [];
