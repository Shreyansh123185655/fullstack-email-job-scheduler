import { Worker, Job, DelayedError } from "bullmq";
import { redisConnectionOptions, redisClient } from "../config/redis";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { EMAIL_QUEUE_NAME, EmailJobData } from "../queues/emailQueue";
import { rateLimiter } from "../services/rateLimiter";
import { slackService } from "../services/slackService";
import { sendMailViaSmtp } from "../services/smtpService";
import { elasticService } from "../services/elasticService";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>, token?: string) => {
      const { emailId, senderId, userId, delaySeconds, hourlyLimit } = job.data;
      const effectiveHourlyLimit = hourlyLimit || env.worker.maxEmailsPerHourPerSender;
      const interEmailDelaySec = delaySeconds || env.worker.minDelayBetweenEmailsSec;
      console.log(`[Worker] Processing job ${job.id} for email ${emailId}`);
      const updateResult = await prisma.$executeRaw`
        UPDATE "Email"
        SET "status" = 'processing', "updatedAt" = NOW()
        WHERE "id" = ${emailId} AND "status" = 'scheduled'
      `;
      if (updateResult === 0) {
        console.log(`[Worker] Email ${emailId} is already processed or not in scheduled state. Skipping.`);
        return { skipped: true, reason: "Already processed or claimed" };
      }
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { sender: true },
      });
      if (!email || !email.sender) {
        console.error(`[Worker] Email ${emailId} or Sender ${senderId} not found.`);
        await prisma.email.update({
          where: { id: emailId },
          data: { status: "failed", failedReason: "Sender or email missing" },
        });
        return { success: false, reason: "Sender missing" };
      }
      const rateLimitCheck = await rateLimiter.checkAndIncrement(senderId, effectiveHourlyLimit);

      if (!rateLimitCheck.allowed) {
        console.warn(
          `[Worker Rate-Limit] Sender ${email.sender.email} hit limit (${rateLimitCheck.currentCount}/${effectiveHourlyLimit}). Deferring to next window.`
        );

        const nextHourDate = new Date(rateLimitCheck.nextWindowTimestamp);
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: "scheduled",
            scheduledAt: nextHourDate,
          },
        });
        await slackService.notifyRateLimitHit({
          senderEmail: email.sender.email,
          senderId: email.sender.id,
          hourlyLimit: effectiveHourlyLimit,
          currentCount: rateLimitCheck.currentCount,
          nextWindowTimestamp: rateLimitCheck.nextWindowTimestamp,
          userId: userId || email.userId,
        });
        if (token) {
          await job.moveToDelayed(rateLimitCheck.nextWindowTimestamp, token);
          console.log(`[Worker] Job ${job.id} moved to delayed until ${nextHourDate.toISOString()}`);
          throw new DelayedError();
        } else {
          return { deferred: true, nextWindow: nextHourDate.toISOString() };
        }
      }
      if (interEmailDelaySec > 0) {
        const lastSendKey = `last_send:${senderId}`;
        const lastSendTime = await redisClient.get(lastSendKey);
        const now = Date.now();
        const minGapMs = interEmailDelaySec * 1000;

        if (lastSendTime) {
          const diff = now - parseInt(lastSendTime, 10);
          if (diff < minGapMs) {
            const waitTime = minGapMs - diff;
            console.log(`[Worker] Throttling for ${waitTime}ms to respect ${interEmailDelaySec}s delay`);
            await sleep(waitTime);
          }
        }
        await redisClient.set(lastSendKey, Date.now().toString(), "EX", 300);
      }
      try {
        const sendResult = await sendMailViaSmtp({
          host: email.sender.smtpHost,
          port: email.sender.smtpPort,
          user: email.sender.smtpUser,
          pass: email.sender.smtpPass,
          from: email.from,
          to: email.to,
          subject: email.subject,
          html: email.body,
        });

        const sentAt = new Date();
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: "sent",
            sentAt,
            failedReason: null,
          },
        });
        await elasticService.updateEmailStatus(emailId, "sent", sentAt);

        console.log(`[Worker SUCCESS] Email ${emailId} sent to ${email.to}!`);
        if (sendResult.previewUrl) {
          console.log(`[Ethereal Preview URL] ${sendResult.previewUrl}`);
        }
        return {
          success: true,
          messageId: sendResult.messageId,
          previewUrl: sendResult.previewUrl,
        };
      } catch (err: any) {
        console.error(`[Worker ERROR] Failed to send email ${emailId}:`, err.message);

        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: "failed",
            failedReason: err.message || "SMTP error",
          },
        });

        await elasticService.updateEmailStatus(emailId, "failed");
        throw err;
      }
    },
    {
      connection: redisConnectionOptions,
      concurrency: env.worker.concurrency,
    }
  );
  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully.`);
  });

  worker.on("failed", (job, err) => {
    if (err instanceof DelayedError) {
      return;
    }
    console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
export async function reconcileDanglingJobs(): Promise<void> {
  try {
    const updated = await prisma.$executeRaw`
      UPDATE "Email"
      SET "status" = 'scheduled', "updatedAt" = NOW()
      WHERE "status" = 'processing'
    `;
    if (Number(updated) > 0) {
      console.log(`[Reconcile] Restored ${updated} dangling processing emails to scheduled state.`);
    }
  } catch (err: any) {
    console.warn("[Reconcile Warn] Could not reconcile dangling jobs:", err.message);
  }
}
