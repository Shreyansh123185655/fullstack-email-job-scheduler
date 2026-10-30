import { Request, Response } from "express";
import { prisma } from "../config/db";

export const authController = {
  async getMe(req: Request, res: Response) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return res.json(req.user);
    }

    // If session has userId stored manually
    const sessionUserId = (req.session as any)?.userId;
    if (sessionUserId) {
      const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (user) return res.json(user);
    }

    return res.status(401).json({ message: "Not authenticated" });
  },

  async devLogin(req: Request, res: Response) {
    const { email, name } = req.body;
    const userEmail = email || "oliver.brown@reachinbox.ai";
    const userName = name || "Oliver Brown";

    let user = await prisma.user.findUnique({ where: { email: userEmail } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userEmail,
          name: userName,
          avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80",
        },
      });
    }

    (req.session as any).userId = user.id;
    if (req.login) {
      req.login(user, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        return res.json(user);
      });
    } else {
      return res.json(user);
    }
  },

  async logout(req: Request, res: Response) {
    if (req.logout) {
      req.logout((err) => {
        req.session?.destroy(() => {
          res.clearCookie("connect.sid");
          return res.json({ message: "Logged out successfully" });
        });
      });
    } else {
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    }
  },
};
