import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";

import { env } from "./config/env";
import { prisma } from "./config/db";
import { redisClient } from "./config/redis";
import { initElasticIndex } from "./config/elastic";
import passport from "./config/passport";
import { emailQueue } from "./queues/emailQueue";
import { startEmailWorker, reconcileDanglingJobs } from "./workers/emailWorker";
import { ensureDefaultSenders } from "./services/smtpService";

import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";
import senderRoutes from "./routes/senderRoutes";
import slackRoutes from "./routes/slackRoutes";

const app = express();

// Enable CORS for Vite frontend with credentials (session cookies)
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: env.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: env.nodeEnv === "production" ? "none" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Live BullMQ Queue Monitoring Dashboard (/admin/queues)
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");
createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});
app.use("/admin/queues", serverAdapter.getRouter());

// REST API Routes
app.use("/api/auth", authRoutes);
app.use("/api/emails", emailRoutes);
app.use("/api/senders", senderRoutes);
app.use("/api/slack", slackRoutes);

// Root endpoint & Healthcheck
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "ReachInbox Email Scheduler Backend",
    version: "1.0.0",
    developer: "Shreyansh Gupta",
    frontend: env.frontendUrl,
    bullBoard: `http://localhost:${env.port}/admin/queues`,
    endpoints: {
      health: "/health",
      apiHealth: "/api/health",
      emails: "/api/emails",
      senders: "/api/senders",
      slack: "/api/slack/status",
    },
  });
});

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "reachinbox-email-scheduler",
    developer: "Shreyansh Gupta",
  });
});

// Global error handler middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("[Express Error Handler]", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

let workerInstance: any = null;

async function bootstrap() {
  try {
    console.log("=== Initializing ReachInbox Email Scheduler ===");

    // 1. Verify PostgreSQL connection
    await prisma.$connect();
    console.log("✓ Connected to PostgreSQL database.");

    // 2. Initialize Elasticsearch index
    await initElasticIndex();

    // 3. Ensure test Ethereal senders exist
    await ensureDefaultSenders();

    // 4. Reconcile any interrupted processing jobs from prior runs
    await reconcileDanglingJobs();

    // 5. Start BullMQ worker process with configured concurrency
    workerInstance = startEmailWorker();
    console.log(`✓ BullMQ worker started with concurrency = ${env.worker.concurrency}`);

    // 6. Listen for incoming API requests
    const server = app.listen(env.port, () => {
      console.log(`✓ ReachInbox API server listening on http://localhost:${env.port}`);
      console.log(`✓ Live BullMQ Dashboard available at http://localhost:${env.port}/admin/queues`);
    });

    // Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      console.log(`\nReceived ${signal}. Shutting down gracefully...`);
      if (workerInstance) {
        await workerInstance.close();
      }
      await emailQueue.close();
      await redisClient.quit();
      await prisma.$disconnect();
      server.close(() => {
        console.log("Server closed cleanly. Goodbye!");
        process.exit(0);
      });
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error: any) {
    console.error("Fatal startup error:", error);
    process.exit(1);
  }
}

bootstrap();

export default app;
