import { Request, Response } from "express";
import { prisma } from "../config/db";
import { emailQueue } from "../queues/emailQueue";
import { elasticService } from "../services/elasticService";

export const emailController = {
  async schedule(req: Request, res: Response) {
    try {
      const {
        senderId,
        recipients,
        subject,
        body,
        startTime,
        delaySeconds = 0,
        hourlyLimit = 100,
      } = req.body;

      if (!senderId) {
        return res.status(400).json({ error: "Sender ID is required" });
      }
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return res.status(400).json({ error: "At least one recipient is required" });
      }
      if (!subject || !body) {
        return res.status(400).json({ error: "Subject and body are required" });
      }

      const sender = await prisma.sender.findUnique({ where: { id: senderId } });
      if (!sender) {
        return res.status(404).json({ error: "Sender not found" });
      }

      let userId = (req.user as any)?.id || (req.session as any)?.userId || null;
      if (!userId) {
        const primaryUser = await prisma.user.findFirst();
        userId = primaryUser?.id || null;
      }
      const baseTimestamp = startTime ? Math.max(Date.now(), new Date(startTime).getTime()) : Date.now();
      const delayBetweenMs = Math.max(0, parseInt(delaySeconds, 10) || 0) * 1000;
      const effectiveHourlyLimit = Math.max(1, parseInt(hourlyLimit, 10) || sender.hourlyLimit || 100);

      const createdEmails: any[] = [];

      for (let i = 0; i < recipients.length; i++) {
        const to = recipients[i].trim();
        if (!to) continue;

        const targetSendTimestamp = baseTimestamp + i * delayBetweenMs;
        const targetSendDate = new Date(targetSendTimestamp);
        const delayMs = Math.max(0, targetSendTimestamp - Date.now());

        // Create Email in PostgreSQL with 'scheduled' status
        const email = await prisma.email.create({
          data: {
            senderId,
            userId,
            from: sender.email,
            to,
            subject,
            body,
            status: "scheduled",
            scheduledAt: targetSendDate,
          },
        });
        elasticService.indexEmail({
          id: email.id,
          senderId: email.senderId,
          userId: email.userId,
          from: email.from,
          to: email.to,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt?.toISOString(),
          sentAt: null,
          createdAt: email.createdAt.toISOString(),
        });
        await emailQueue.add(
          "send-email",
          {
            emailId: email.id,
            senderId,
            userId,
            delaySeconds: parseInt(delaySeconds, 10) || 0,
            hourlyLimit: effectiveHourlyLimit,
          },
          {
            jobId: email.id,
            delay: delayMs,
          }
        );

        createdEmails.push(email);
      }

      console.log(`[Schedule API] Enqueued ${createdEmails.length} email jobs in BullMQ.`);
      return res.status(201).json({ count: createdEmails.length });
    } catch (err: any) {
      console.error("[Schedule API Error]", err);
      return res.status(500).json({ error: err.message });
    }
  },
  async list(req: Request, res: Response) {
    try {
      const status = (req.query.status as string) || "scheduled";
      const q = (req.query.q as string) || "";
      const emails = await elasticService.searchEmails(status, q);
      const formatted = emails.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        subject: e.subject,
        body: e.body,
        status: e.status,
        scheduledAt: e.scheduledAt ? new Date(e.scheduledAt).toISOString() : undefined,
        sentAt: e.sentAt ? new Date(e.sentAt).toISOString() : undefined,
        attachments: [],
      }));

      return res.json(formatted);
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
  async counts(req: Request, res: Response) {
    try {
      const [scheduled, sent] = await Promise.all([
        prisma.email.count({ where: { status: "scheduled" } }),
        prisma.email.count({ where: { status: "sent" } }),
      ]);
      return res.json({ scheduled, sent });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const email = await prisma.email.findUnique({
        where: { id },
      });

      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }

      return res.json({
        id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? email.scheduledAt.toISOString() : undefined,
        sentAt: email.sentAt ? email.sentAt.toISOString() : undefined,
        attachments: [],
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  },
};
