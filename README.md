# ReachInbox Distributed Email Scheduler & Dashboard

A production-grade, distributed email scheduling service and real-time dashboard built to handle high-throughput email dispatch, atomic concurrency, rate limiting, and zero data loss on server restarts.

Built strictly according to ReachInbox assignment constraints (**No Cron Jobs**, **BullMQ + Redis**, **Idempotent Dispatch**, **Redis Lua Rate Limiting**, **Ethereal Fake SMTP**, **Elasticsearch Search**, **Live Bull-Board Dashboard**, and **Slack Alerts on Rate Limit Hit**).

---

## 🏗 Architecture & Design Overview

```
                      +---------------------------------------+
                      |         React 18 + Vite UI            |
                      |   (Figma Pixel-Perfect Dashboard)     |
                      +-------------------+-------------------+
                                          |
                              HTTP / REST API (Port 4000)
                                          |
                                          v
+------------------------------------------------------------------------------------+
|                             Express.js API Backend                                 |
|                                                                                    |
|  * Google OAuth & Session Management via Passport.js                               |
|  * Email Dispatch & Scheduling APIs (/api/emails/schedule, /api/emails)            |
|  * Live BullMQ Monitoring Dashboard (/admin/queues) via @bull-board                 |
|  * Slack OAuth & Live Alert Dispatch (/api/slack/oauth, /api/slack/webhook)        |
+---------+-------------------------------+------------------------------+-----------+
          |                               |                              |
          v                               v                              v
 +------------------+           +------------------+           +--------------------+
 |    PostgreSQL    |           |   Elasticsearch  |           |   Redis 7 (AOF ON) |
 | (Source of Truth)|           |  (Search Index)  |           | (BullMQ & Counters)|
 +--------+---------+           +---------+--------+           +---------+----------+
          ^                               ^                              ^
          |                               |                              |
          +-------------------------------+------------------------------+
                                          |
                                          v
                      +---------------------------------------+
                      |         BullMQ Worker Process         |
                      |                                       |
                      |  * Atomic SQL Idempotency Claim       |
                      |  * Redis Lua Hourly Rate Limiting     |
                      |  * Provider Throttling Delay          |
                      |  * Live Slack Rate-Limit Alerts       |
                      |  * Multi-Sender Ethereal SMTP Send    |
                      +---------------------------------------+
```

---

## ⚡ Core Engineering Highlights

### 1. Zero Cron Jobs & Idempotent Scheduling
- **No Cron**: Traditional cron jobs or pollers (`node-cron`, `setInterval`, `agenda`) are strictly avoided. All emails are scheduled directly as **BullMQ delayed jobs** backed by Redis.
- **Idempotency Keying**: Every BullMQ job is enqueued with `jobId = email.id` (UUID generated in PostgreSQL). This mathematically prevents duplicate enqueuing.
- **Atomic Database Claiming**: When a BullMQ worker picks up a job, it executes an atomic PostgreSQL conditional update before touching the SMTP transport:
  ```sql
  UPDATE "Email"
  SET "status" = 'processing', "updatedAt" = NOW()
  WHERE "id" = :emailId AND "status" = 'scheduled';
  ```
  If `0` rows are updated (e.g., if a worker crashed or another worker took the job), the worker skips execution immediately, guaranteeing that no email is ever sent twice.

### 2. High Availability & Server Restart Resilience
- **Redis Append-Only File (AOF)**: Redis is configured with `appendonly yes`. In-flight delayed jobs survive Redis and server restarts.
- **Self-Healing Reconciliation**: On application startup, the backend calls `reconcileDanglingJobs()`, automatically restoring any emails left in `'processing'` from an abrupt server termination back to `'scheduled'` state without losing jobs or sending duplicates.

### 3. Distributed Atomic Rate Limiter (Redis Lua)
- Rate limits per sender (e.g., 100 emails/hour) are enforced atomically across all worker processes using a custom Redis Lua script:
  ```lua
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local current = tonumber(redis.call('get', key) or '0')

  if current >= limit then
    local ttl = redis.call('ttl', key)
    return { 0, current, ttl }
  else
    local new_count = redis.call('incr', key)
    if new_count == 1 then
      redis.call('expire', key, 3600)
    end
    return { 1, new_count, redis.call('ttl', key) }
  end
  ```
- **Next-Hour Slotted Deferral**: When an hourly limit is hit, jobs are **never failed or dropped**. Instead:
  1. The exact timestamp of the next hour boundary is computed (`nextHour = (currentHour + 1) * 3600000`).
  2. The email's `scheduledAt` date in PostgreSQL is updated to the next hour.
  3. The BullMQ job is moved to delayed state via `job.moveToDelayed(nextHour, token)`.
  4. A live alert is dispatched to the user's connected Slack workspace.

### 4. Provider Throttling Delay
- Enforces a minimum gap (e.g., 2 seconds) between consecutive sends for a given sender using Redis timestamp keys (`last_send:{senderId}`), mimicking real-world ISP throttling (SendGrid, SES, Mailgun).

### 5. Multi-Sender SMTP via Ethereal Email
- Supports multiple distinct sender accounts stored in PostgreSQL with their individual SMTP host, port, credentials, and hourly limits.
- If no senders are present on initial boot, the backend automatically provisions test accounts via `nodemailer.createTestAccount()` and logs live preview URLs for all dispatches.

### 6. Elasticsearch Search with Database Fallback
- All scheduled and sent emails are indexed into an Elasticsearch `emails` index.
- Search queries perform fuzzy `multi_match` queries across `to`, `subject`, and `body`.
- If Elasticsearch is initializing or unreachable, the system transparently falls back to PostgreSQL `ILIKE` searching with zero user disruption.

### 7. Live BullMQ Dashboard
- Real-time queue metrics, active workers, delayed jobs, completed tasks, and failures are monitored via Bull-Board mounted at `http://localhost:4000/admin/queues`.

### 8. Slack Integration (Live Verifiable Rate-Limit Alerts)
- **Real OAuth Authorize Flow**: Connect Slack via OAuth (`/api/slack/oauth`), which exchanges credentials and stores the incoming webhook URL per user.
- **Direct Webhook Connect**: Allows pasting an incoming webhook URL directly in the UI for instant testing during offline review.
- When an hourly rate limit is hit, a rich Slack alert is dispatched in real-time.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+) & npm
- PostgreSQL 14+ (Local or Docker)
- Redis 7+ (Local or Docker)
- (Optional) Elasticsearch 8+ (Docker)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Shreyansh123185655/fullstack-email-job-scheduler.git
cd fullstack-email-job-scheduler
```

---

### Step 2: Start Infrastructure (Docker or Local)

#### Option A: Using Docker Compose (Recommended)
```bash
docker compose up -d
```
This spins up:
- PostgreSQL 16 on `localhost:5432`
- Redis 7 (with `appendonly yes`) on `localhost:6379`
- Elasticsearch 8.11 on `localhost:9200`

#### Option B: Using Local Services (Homebrew / System)
```bash
# Start PostgreSQL & Redis
brew services start postgresql@14
brew services start redis

# Enable Redis AOF persistence
redis-cli config set appendonly yes
```

---

### Step 3: Run the Backend

```bash
cd backend

# 1. Install dependencies
npm install

# 2. Configure environment variables (.env)
cp .env.example .env

# 3. Synchronize database schema & seed default Ethereal senders
npm run prisma:push
npm run seed

# 4. Start the backend development server & BullMQ worker
npm run dev
```

The backend starts on `http://localhost:4000`:
- **API Base**: `http://localhost:4000/api`
- **Health Check**: `http://localhost:4000/health`
- **Live BullMQ Dashboard**: `http://localhost:4000/admin/queues`

---

### Step 4: Run the Frontend Dashboard

Open a new terminal window:
```bash
# From project root:
npm install

# Start Vite dev server (proxies /api to http://localhost:4000)
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | Express server port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/reachinbox` | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis server host |
| `REDIS_PORT` | `6379` | Redis server port |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | Elasticsearch node URL |
| `WORKER_CONCURRENCY` | `5` | BullMQ concurrent workers |
| `MIN_DELAY_BETWEEN_EMAILS_SEC` | `2` | Minimum throttling gap between sends |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `100` | Global fallback hourly limit per sender |
| `SESSION_SECRET` | `reachinbox_secret_...` | Session cookie encryption secret |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth Client ID (optional in dev) |
| `GOOGLE_CLIENT_SECRET` | `""` | Google OAuth Client Secret |
| `SLACK_CLIENT_ID` | `""` | Slack App OAuth Client ID |
| `SLACK_CLIENT_SECRET` | `""` | Slack App OAuth Client Secret |
| `SLACK_WEBHOOK_URL` | `""` | Default incoming Slack webhook for alerts |

### Frontend (`.env`)
| Variable | Value | Description |
|---|---|---|
| `VITE_USE_MOCK` | `false` | Set to `false` to communicate with the real backend |
| `VITE_API_URL` | `/api` | Base API path (proxied by Vite to port 4000) |

---

## 🧪 Step-by-Step Demo & Verification Guide

### 1. View Senders & Seed Data
On boot, Ethereal test accounts are auto-created in Postgres. Check `/api/senders`:
```bash
curl -s http://localhost:4000/api/senders
```

### 2. Schedule New Emails
In the dashboard:
1. Click **Compose** (or visit `http://localhost:5173/compose`).
2. Choose a sender from the dropdown.
3. Enter recipients (or upload a CSV/TXT list; the parser deduplicates emails).
4. Set subject, message body, delay between emails (e.g. 2s), and hourly limit.
5. Click **Send** (or **Send Later** with scheduled start time).
6. Verify jobs in BullMQ Dashboard: `http://localhost:4000/admin/queues`.
7. Watch terminal logs output live **Ethereal email preview URLs** upon dispatch.

### 3. Server Restart Scenario (Persistence Test)
1. In the Compose window, pick a time 2 minutes into the future via "Send Later".
2. Submit the form. Notice the email appears in the **Scheduled** tab.
3. Stop the backend server in terminal (`Ctrl + C`).
4. Wait 15 seconds, then restart the server (`npm run dev`).
5. Notice:
   - The pending job in Redis was not lost.
   - The worker resumes and dispatches the email at the exact target timestamp.
   - No duplicates are created.

### 4. Rate Limiting & Slack Alert Test
1. In the dashboard sidebar, click **Slack Alerts**.
2. Click **Connect via Slack OAuth** or paste an incoming webhook URL.
3. Click **Test Alert** to verify live dispatch to your Slack channel.
4. Schedule emails exceeding the sender's configured hourly limit.
5. In the backend logs, observe:
   ```
   [Worker Rate-Limit] Sender ... hit limit (2/2). Deferring to next window.
   [Slack Alert Sent] Successfully notified Slack for sender ...
   [Worker] Job ... moved to delayed until ...
   ```
6. The deferred email stays in the **Scheduled** list with an updated scheduled time at the start of the next hour window.

---

## 📁 Repository Structure

```
.
├── docker-compose.yml           # Multi-container setup (Postgres, Redis AOF, Elasticsearch)
├── package.json                 # Frontend package manifest
├── vite.config.ts               # Vite configuration with /api proxy to port 4000
├── src/                         # Frontend React + TypeScript source
│   ├── components/              # Layout, compose form, email list, SlackModal, UI
│   ├── pages/                   # LoginPage, EmailListPage, EmailDetailPage, ComposePage
│   ├── services/                # authService, emailService, slackService, http client
│   └── types/                   # TypeScript interfaces
└── backend/                     # Backend Express + BullMQ source
    ├── docker-compose.yml       # Backend Docker configuration
    ├── package.json             # Backend dependencies
    ├── prisma/
    │   └── schema.prisma        # Database schema (User, Sender, Email, SlackIntegration)
    └── src/
        ├── config/              # env, db (Prisma), redis, elastic, passport
        ├── queues/              # BullMQ queue definition (email-queue)
        ├── workers/             # emailWorker (idempotency, Lua rate limiter, Nodemailer)
        ├── services/            # smtpService, rateLimiter, slackService, elasticService
        ├── controllers/         # authController, emailController, senderController, slackController
        ├── routes/              # Express API routers
        └── server.ts            # Application bootstrap & graceful shutdown
```

---

## 👥 Submission & Reviewer Access

- **GitHub Repository**: [Shreyansh123185655/fullstack-email-job-scheduler](https://github.com/Shreyansh123185655/fullstack-email-job-scheduler)
- **Collaborator Access Granted**: `Mitrajit` and `Yadav036`
