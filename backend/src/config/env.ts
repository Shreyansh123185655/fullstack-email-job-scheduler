import dotenv from "dotenv";
dotenv.config();
export const env = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  databaseUrl: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public",
  redis: {
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379", 10),
  },
  elasticsearch: {
    node: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || "5", 10),
    minDelayBetweenEmailsSec: parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_SEC || "2", 10),
    maxEmailsPerHourPerSender: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || "100", 10),
  },
  sessionSecret: process.env.SESSION_SECRET || "reachinbox_default_secret_key_session",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || (process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/api/auth/google/callback` : "http://localhost:4000/api/auth/google/callback"),
  },
  slack: {
    clientId: process.env.SLACK_CLIENT_ID || "",
    clientSecret: process.env.SLACK_CLIENT_SECRET || "",
    redirectUri: process.env.SLACK_REDIRECT_URI || "http://localhost:4000/api/slack/callback",
    defaultWebhookUrl: process.env.SLACK_WEBHOOK_URL || "",
  },
};
