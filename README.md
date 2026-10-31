# ReachInbox Distributed Email Scheduler & Dashboard

A production-grade, distributed email scheduling service with a real-time dashboard. It handles high-throughput dispatch, atomic concurrency, per-sender rate limiting, and zero job loss across server restarts.

Built strictly to the ReachInbox assignment constraints: **no cron jobs**, **BullMQ + Redis**, **idempotent dispatch**, **Redis Lua rate limiting**, **Ethereal fake SMTP**, **Elasticsearch search**, **live Bull-Board dashboard**, and **Slack alerts on rate-limit hits**.

---

## Overview

| Concern | Approach |
| --- | --- |
| Scheduling | BullMQ delayed jobs in Redis (no `node-cron`, `setInterval`, or `agenda`) |
| Idempotency | `jobId = email.id` plus an atomic PostgreSQL claim before any SMTP call |
| Persistence | Redis AOF (`appendonly yes`) plus startup reconciliation of stuck jobs |
| Rate limiting | Atomic Redis Lua script, per sender, per hour, shared by all workers |
| Throttling | Minimum gap between sends per sender via `last_send:{senderId}` |
| Search | Elasticsearch fuzzy `multi_match` with PostgreSQL `ILIKE` fallback |
| Observability | Bull-Board at `/admin/queues`, Slack alerts on rate-limit hits |

---

## Screenshots

<!-- Add screenshots: Dashboard, Compose, Scheduled list, Bull-Board, Slack alert -->

---

## Architecture

```mermaid
flowchart TD
    UI[React 18 + Vite Dashboard] -->|REST /api| API[Express API :4000]
    API --> PG[(PostgreSQL<br/>source of truth)]
    API --> ES[(Elasticsearch<br/>search index)]
    API --> Q[(Redis 7 AOF<br/>BullMQ + counters)]
    Q --> W[BullMQ Worker]
    W --> PG
    W --> ES
    W --> RL{Lua rate limiter}
    RL -->|allowed| SMTP[Ethereal SMTP]
    RL -->|limit hit| DEF[Defer to next hour]
    DEF --> Q
    DEF --> SLACK[Slack webhook alert]
    API --> BB[Bull-Board /admin/queues]
```

### Email Lifecycle

```mermaid
flowchart TD
    A[POST /api/emails/schedule] --> B[Insert Email row: scheduled]
    B --> C[Enqueue delayed job, jobId = email.id]
    C --> D[Worker picks up job]
    D --> E{Atomic claim:<br/>scheduled to processing}
    E -->|0 rows| X[Skip: already handled]
    E -->|1 row| F{Lua rate limit check}
    F -->|over limit| G[Update scheduledAt to next hour<br/>moveToDelayed + DelayedError<br/>Slack alert]
    F -->|ok| H[Provider throttle delay]
    H --> I[Send via Ethereal SMTP]
    I -->|success| J[status: sent, index in ES]
    I -->|error| K[status: failed]
```

### Deferral Sequence

```mermaid
sequenceDiagram
    participant W as Worker
    participant R as Redis (Lua)
    participant P as PostgreSQL
    participant Q as BullMQ
    participant S as Slack

    W->>P: Claim email (scheduled to processing)
    W->>R: Run rate-limit script
    R-->>W: {0, current, ttl}
    W->>P: scheduledAt = next hour boundary, status = scheduled
    W->>Q: job.moveToDelayed(nextHour, token)
    W->>S: Send rate-limit alert
    W-->>Q: throw DelayedError
```

---

## Core Engineering Highlights

### 1. Zero Cron Jobs and Idempotent Scheduling
- **No cron or pollers.** Every email is a BullMQ delayed job in Redis.
- **Idempotent enqueue.** `jobId = email.id` (UUID from PostgreSQL) prevents duplicate enqueues.
- **Atomic claim.** Before touching SMTP, the worker runs:
  ```sql
  UPDATE "Email"
  SET "status" = 'processing', "updatedAt" = NOW()
  WHERE "id" = :emailId AND "status" = 'scheduled';
  ```
  If zero rows update (another worker took it, or a retry), the worker exits immediately, so no email is sent twice.

### 2. Restart Resilience
- **Redis AOF** keeps in-flight delayed jobs across Redis and server restarts.
- **Self-healing reconciliation.** On startup, `reconcileDanglingJobs()` moves emails stuck in `processing` after an abrupt termination back to `scheduled`, without duplicates or lost jobs.

### 3. Distributed Atomic Rate Limiter (Redis Lua)
Hourly limits per sender are enforced atomically across all workers:

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

**Next-hour slotted deferral.** When a limit is hit, jobs are never failed or dropped:
1. Compute the next hour boundary: `nextHour = (currentHour + 1) * 3600000`.
2. Update `scheduledAt` in PostgreSQL.
3. Call `job.moveToDelayed(nextHour, token)` and throw `DelayedError()`.
4. Dispatch a Slack alert to the user's connected workspace.

### 4. Provider Throttling
A minimum gap (default 2s) between consecutive sends per sender, tracked in Redis (`last_send:{senderId}`), mimics ISP throttling (SendGrid, SES, Mailgun).

### 5. Multi-Sender SMTP via Ethereal
Multiple sender accounts are stored in PostgreSQL, each with its own SMTP host, port, credentials, and hourly limit. If none exist on first boot, test accounts are provisioned with `nodemailer.createTestAccount()` and preview URLs are logged for every dispatch.

### 6. Elasticsearch Search with Fallback
Emails are indexed into an `emails` index. Search runs a fuzzy `multi_match` over `to`, `subject`, and `body`. If Elasticsearch is unavailable, queries transparently fall back to PostgreSQL `ILIKE`.

### 7. Live BullMQ Dashboard
Bull-Board at `http://localhost:4000/admin/queues` shows active, delayed, completed, and failed jobs in real time.

### 8. Slack Integration
- **OAuth flow** (`/api/slack/oauth`) exchanges credentials and stores the incoming webhook per user.
- **Direct webhook paste** in the UI for quick testing without a Slack app.
- Rich alert posted in real time whenever an hourly limit is hit.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Passport.js (Google OAuth) |
| Queue | BullMQ, Redis 7 (AOF) |
| Database | PostgreSQL 16, Prisma |
| Search | Elasticsearch 8.11 |
| Email | Nodemailer, Ethereal SMTP |
| Monitoring | @bull-board, Slack webhooks |
| Infrastructure | Docker Compose |

---

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+, Redis 7+ (local or Docker)
- Elasticsearch 8+ (optional, Docker)

### 1. Clone
```bash
git clone https://github.com/Shreyansh123185655/fullstack-email-job-scheduler.git
cd fullstack-email-job-scheduler
```

### 2. Start Infrastructure

**Docker Compose (recommended)**
```bash
docker compose up -d
```
Starts PostgreSQL 16 (`:5432`), Redis 7 with `appendonly yes` (`:6379`), and Elasticsearch 8.11 (`:9200`).

**Local services (Homebrew)**
```bash
brew services start postgresql@14
brew services start redis
redis-cli config set appendonly yes
```

### 3. Run the Backend
```bash
cd backend
npm install
cp .env.example .env
npm run prisma:push
npm run seed
npm run dev
```

| Endpoint | URL |
| --- | --- |
| API | `http://localhost:4000/api` |
| Health | `http://localhost:4000/health` |
| Bull-Board | `http://localhost:4000/admin/queues` |

### 4. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` to port 4000. From the repo root you can also run `npm run dev:backend` and `npm run dev:frontend`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `4000` | Express port |
| `FRONTEND_URL` | `http://localhost:5173` | Allowed CORS origin |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/reachinbox` | PostgreSQL connection string |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `ELASTICSEARCH_NODE` | `http://localhost:9200` | Elasticsearch URL |
| `WORKER_CONCURRENCY` | `5` | Concurrent BullMQ jobs |
| `MIN_DELAY_BETWEEN_EMAILS_SEC` | `2` | Minimum gap between sends per sender |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `100` | Fallback hourly limit per sender |
| `SESSION_SECRET` | `reachinbox_secret_...` | Session cookie secret |
| `GOOGLE_CLIENT_ID` | `""` | Google OAuth client ID (optional in dev) |
| `GOOGLE_CLIENT_SECRET` | `""` | Google OAuth client secret |
| `SLACK_CLIENT_ID` | `""` | Slack app client ID |
| `SLACK_CLIENT_SECRET` | `""` | Slack app client secret |
| `SLACK_WEBHOOK_URL` | `""` | Default Slack incoming webhook |

### Frontend (`frontend/.env`)

| Variable | Value | Description |
| --- | --- | --- |
| `VITE_USE_MOCK` | `false` | `false` uses the real backend |
| `VITE_API_URL` | `/api` | API base path |

---

## Demo and Verification Guide

### 1. Senders and Seed Data
```bash
curl -s http://localhost:4000/api/senders
```

### 2. Schedule Emails
1. Open **Compose** (`/compose`).
2. Choose a sender.
3. Enter recipients or upload a CSV/TXT (duplicates are removed).
4. Set subject, body, delay between emails, and hourly limit.
5. Click **Send**, or **Send Later** with a start time.
6. Watch jobs in Bull-Board and **Ethereal preview URLs** in the terminal.

### 3. Restart Persistence Test
1. Schedule an email 2 minutes ahead via **Send Later**.
2. Confirm it appears under **Scheduled**.
3. Stop the backend (`Ctrl + C`), wait 15 seconds, restart with `npm run dev`.
4. The job survives in Redis, dispatches at the target time, and no duplicate is created.

### 4. Rate Limit and Slack Alert Test
1. Open **Slack Alerts** in the sidebar.
2. Connect via OAuth or paste an incoming webhook URL.
3. Click **Test Alert** to verify delivery.
4. Schedule more emails than the sender's hourly limit.
5. Expect logs like:
   ```
   [Worker Rate-Limit] Sender ... hit limit (2/2). Deferring to next window.
   [Slack Alert Sent] Successfully notified Slack for sender ...
   [Worker] Job ... moved to delayed until ...
   ```
6. The deferred email stays in **Scheduled** with `scheduledAt` moved to the next hour.

---

## Assumptions and Trade-offs

- **Ethereal only.** No real mail is delivered; every send yields a preview URL.
- **Hourly window is fixed**, aligned to the clock hour for deferral, with a Redis key TTL of 3600s for counting.
- **PostgreSQL is the source of truth.** Redis holds queue state and counters; Elasticsearch is a rebuildable index.
- **Google OAuth is optional in development** so reviewers can run the app without credentials.
- **Deferral over failure.** Rate-limited jobs are rescheduled, never dropped.

---

## Repository Structure

```text
fullstack-email-job-scheduler/
├── docker-compose.yml           # Postgres, Redis (AOF), Elasticsearch
├── package.json                 # Monorepo root scripts
├── README.md
├── backend/
│   ├── docker-compose.yml       # Standalone backend infra
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   └── schema.prisma        # User, Sender, Email, SlackIntegration
│   └── src/
│       ├── config/              # env, db, redis, elastic, passport
│       ├── queues/              # email-queue definition
│       ├── workers/             # emailWorker: claim, Lua limiter, send
│       ├── services/            # smtp, rateLimiter, slack, elastic
│       ├── controllers/         # auth, email, sender, slack
│       ├── routes/              # Express routers
│       └── server.ts            # Bootstrap and graceful shutdown
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.ts           # Dev proxy to :4000
    ├── tailwind.config.js
    ├── tsconfig.json
    └── src/
        ├── components/          # Layout, compose form, email list, SlackModal
        ├── pages/               # Login, EmailList, EmailDetail, Compose
        ├── services/            # auth, email, slack, http client
        └── types/               # Shared TypeScript types
```

---

## Future Roadmap

- **Scale:** horizontal worker pools, per-tenant queues, Redis Cluster.
- **Delivery:** real SMTP providers, bounce and retry policies, webhooks for delivery events.
- **Observability:** structured logging, metrics (Prometheus), tracing.
- **Product:** campaign sequences, templates, per-recipient timezones.

---

## Submission and Reviewer Access

- **GitHub Repository:** [Shreyansh123185655/fullstack-email-job-scheduler](https://github.com/Shreyansh123185655/fullstack-email-job-scheduler)
- **Collaborator Access Granted:** `Mitrajit` and `Yadav036`
