import { Request, Response } from "express";
import { prisma } from "../config/db";

export const authController = {
  async getMe(req: Request, res: Response) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return res.json(req.user);
    }
    const sessionUserId = (req.session as any)?.userId;
    if (sessionUserId) {
      const user = await prisma.user.findUnique({ where: { id: sessionUserId } });
      if (user) return res.json(user);
    }
    const primaryUser = await prisma.user.findFirst({
      where: { email: "shreyansh.gupta@reachinbox.ai" },
    });
    if (primaryUser) return res.json(primaryUser);

    return res.status(401).json({ message: "Not authenticated" });
  },

  async devLogin(req: Request, res: Response) {
    try {
      const { email, name } = req.body;
      const userEmail = email || "shreyansh.gupta@reachinbox.ai";
      const userName = name || "Shreyansh Gupta";

      let user = await prisma.user.findUnique({ where: { email: userEmail } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: userEmail,
            name: userName,
            avatarUrl: "https://avatars.githubusercontent.com/u/158720188?v=4",
          },
        });
      }

      (req.session as any).userId = user.id;
      if (req.login) {
        req.login(user, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          return req.session.save(() => {
            return res.json(user);
          });
        });
      } else {
        return req.session.save(() => {
          return res.json(user);
        });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async logout(req: Request, res: Response) {
    const finish = () => {
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        return res.json({ message: "Logged out successfully" });
      });
    };

    if (req.logout) {
      req.logout(() => finish());
    } else {
      finish();
    }
  },
};
