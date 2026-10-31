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

[🎥
 Introductory video]
https://github.com/user-attachments/assets/82a66ef5-3446-43be-a6da-eeca856e0639


[🎥 Full project demontration]
https://github.com/user-attachments/assets/6c1f913d-159d-4524-8618-064dfb100ccb




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
## Screenshots

<!-- Add screenshots: Dashboard, Compose, Scheduled list, Bull-Board, Slack alert -->
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 45 52 AM" src="https://github.com/user-attachments/assets/57a05449-4b60-4bd3-bb45-8b0fd94e4a20" /><img width="1710" height="1107" alt="Screenshot 2026-10-31 at 10 38 26 AM" src="https://github.com/user-attachments/assets/2ed0a905-0e6c-476f-b005-6bc983ead64d" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 48 05 AM" src="https://github.com/user-attachments/assets/c611c247-2a09-4faa-ac76-896c669ee53e" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 47 53 AM" src="https://github.com/user-attachments/assets/3dd74f9d-8d65-43d4-89e3-eb064f586a5f" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 47 49 AM" src="https://github.com/user-attachments/assets/6ae66290-1529-4deb-af52-55f52958e245" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 46 07 AM" src="https://github.com/user-attachments/assets/6d52390d-c9ca-4a6d-a592-f56be01b5425" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 46 02 AM" src="https://github.com/user-attachments/assets/c425bddc-aa05-4875-afcd-9811131a541a" />
---
## Architecture
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
