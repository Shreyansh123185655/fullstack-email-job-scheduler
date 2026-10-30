import { Request, Response } from "express";
import { prisma } from "../config/db";
import { createEtherealAccount } from "../services/smtpService";

export const senderController = {
  async list(req: Request, res: Response) {
    try {
      const senders = await prisma.sender.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          hourlyLimit: true,
          createdAt: true,
        },
      });
      return res.json(senders);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, email, smtpHost, smtpPort, smtpUser, smtpPass, hourlyLimit } = req.body;

      if (!email || !smtpHost || !smtpPort || !smtpUser || !smtpPass) {
        return res.status(400).json({ error: "Missing required SMTP configuration fields" });
      }

      const sender = await prisma.sender.create({
        data: {
          name: name || email.split("@")[0],
          email,
          smtpHost,
          smtpPort: parseInt(smtpPort, 10),
          smtpUser,
          smtpPass,
          hourlyLimit: hourlyLimit ? parseInt(hourlyLimit, 10) : 100,
        },
      });

      return res.status(201).json(sender);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },

  async createEthereal(req: Request, res: Response) {
    try {
      const acc = await createEtherealAccount();
      const sender = await prisma.sender.create({
        data: {
          name: req.body.name || `Ethereal Sender (${acc.name})`,
          email: acc.email,
          smtpHost: acc.smtpHost,
          smtpPort: acc.smtpPort,
          smtpUser: acc.smtpUser,
          smtpPass: acc.smtpPass,
          hourlyLimit: req.body.hourlyLimit ? parseInt(req.body.hourlyLimit, 10) : 100,
        },
      });

      return res.status(201).json(sender);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
};
