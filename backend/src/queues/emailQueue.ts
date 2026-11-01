import { Queue } from "bullmq";
import { redisConnectionOptions } from "../config/redis";
export const EMAIL_QUEUE_NAME = "email-queue";
export interface EmailJobData {
  emailId: string;
  senderId: string;
  userId?: string | null;
  delaySeconds: number;
  hourlyLimit: number;
}
export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: false,
  },
});
emailQueue.on("error", (err) => {
  console.error("[EmailQueue Error]", err);
});
