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
    return res.status(401).json({ message: "Not authenticated" });
  },
  async verifyGoogleToken(req: Request, res: Response) {
    try {
      const { credential } = req.body;
      if (!credential) {
        return res.status(400).json({ error: "Missing Google credential token" });
      }
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!response.ok) {
        return res.status(401).json({ error: "Invalid Google credential" });
      }
      const payload = (await response.json()) as any;
      const { sub: googleId, email, name, picture: avatarUrl } = payload;

      if (!email) {
        return res.status(400).json({ error: "No email associated with Google account" });
      }
      let user = await prisma.user.findFirst({
        where: { OR: [{ googleId }, { email }] },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            googleId,
            email,
            name: name || "Google User",
            avatarUrl: avatarUrl || undefined,
          },
        });
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            googleId,
            name: name || user.name,
            avatarUrl: avatarUrl || user.avatarUrl,
          },
        });
      }

      (req.session as any).userId = user.id;
      if (req.login) {
        req.login(user, (err) => {
          if (err) return res.status(500).json({ error: err.message });
          return req.session.save(() => res.json(user));
        });
      } else {
        return req.session.save(() => res.json(user));
      }
    } catch (err: any) {
      console.error("[Google Token Verification Error]", err);
      return res.status(500).json({ error: err.message });
    }
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
