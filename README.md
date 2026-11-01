# ReachInbox Email Scheduler Project demonstration

My deployed link from the scratch
https://frontend-rouge-two-96.vercel.app
---
---


[🎥 Full project demontration]
https://github.com/user-attachments/assets/6c1f913d-159d-4524-8618-064dfb100ccb

(This is the main Video) Here i have also used the elastic search in the project.

---
## Screenshots

<!-- Add screenshots: Dashboard, Compose, Scheduled list, Bull-Board, Slack alert -->
Elastic Search
<img width="1305" height="929" alt="Screenshot 2026-10-31 at 2 20 41 PM" src="https://github.com/user-attachments/assets/4dcdf84a-03fd-4e2e-a24f-f9f2a026d3c8" />

My schedule and executed task
<img width="1317" height="1025" alt="Screenshot 2026-10-31 at 2 21 18 PM" src="https://github.com/user-attachments/assets/17a0c940-2a57-45f4-8d1d-5d6133a62874" />

<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 45 52 AM" src="https://github.com/user-attachments/assets/57a05449-4b60-4bd3-bb45-8b0fd94e4a20" />

<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 10 38 26 AM" src="https://github.com/user-attachments/assets/2ed0a905-0e6c-476f-b005-6bc983ead64d" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 48 05 AM" src="https://github.com/user-attachments/assets/c611c247-2a09-4faa-ac76-896c669ee53e" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 47 53 AM" src="https://github.com/user-attachments/assets/3dd74f9d-8d65-43d4-89e3-eb064f586a5f" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 47 49 AM" src="https://github.com/user-attachments/assets/6ae66290-1529-4deb-af52-55f52958e245" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 46 07 AM" src="https://github.com/user-attachments/assets/6d52390d-c9ca-4a6d-a592-f56be01b5425" />
<img width="1710" height="1107" alt="Screenshot 2026-10-31 at 9 46 02 AM" src="https://github.com/user-attachments/assets/c425bddc-aa05-4875-afcd-9811131a541a" />
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
## Steps to execute my project first cloning it then simultaneously setup the backend frontend along with the Docker , Bull Mq and Redis 

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+, Redis 7+ (local or Docker)
- Elasticsearch 8+ 

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
| Bull-Board | `http://localhost:4000/admin/queues` | (It also depends on the individual system and the available port system)

### 4. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173`. Vite proxies `/api` to port 4000. From the repo root you can also run `npm run dev:backend` and `npm run dev:frontend`.

---

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

## Points that i have kept in my mind while execution and running the project 

#### 1. Zero Cron Jobs and Idempotent Scheduling
#### 2. Restart Resilience
#### 3. Distributed Atomic Rate Limiter (Redis Lua)
#### 4. Provider Throttling
#### 5. Multi-Sender SMTP via Ethereal
#### 6. Elasticsearch Search with Fallback
#### 7. Live BullMQ Dashboard
#### 8. Slack Integration with the real OAuth (google)

---
**As asked in the requirement section of the description shared by the job. Here are the explained terms**

## 1. Ethereal Email & Environmental Variables
Using Nodemailer to send emails but not actually deliver them to an inbox. Each email sent creates a preview link. 
Environmental variables have been used. These are stored within `.env` files which store the config for PostgreSQL, Redis, Authentication, Slack, and the Email Scheduler.
We have set the max number of running jobs to 5, and limited the time between sending each email to 2 seconds. We also have a limit on how many emails can be sent from a sender per hour (15).

## 2. Architecture
When the user schedules an email, the information will be stored within the PostgreSQL database and will be added to BullMQ. We have used Redis to control the delay of emails, meaning we don’t need to use cron jobs or polling.

Email data is stored in PostgreSQL. Jobs are queued using Redis. If a job was interrupted during a restart, it will be restored.

We can run up to 5 jobs at the same time. Redis has been used with Lua scripts to limit how many emails can be sent per hour. Emails that go over the limit will be rescheduled. We have Slack alerts to inform users when the limit has been hit.

## 3. Features
### Backend
- Scheduled emails using BullMQ.
- Data is stored in the PostgreSQL database. Jobs will be restored after a restart.
- Limited to sending a certain amount per hour. Emails will be rescheduled if they go over the limit. Emails can be sent concurrently.
- Monitoring using Bull Board. Search using Elasticsearch. Slack alerts.
- Send emails using Ethereal SMTP with preview links.

### Frontend
- Login using Google OAuth. Developer login included for easy testing.
- Dashboard with email stats, search, and navigation.
- Create emails by adding recipients manually or uploading CSV/TXT files. Duplicates are removed automatically.
- Schedule emails to send now or later.
- View scheduled and sent emails within tables. See status of emails and Ethereal preview links.
- Connect to Slack using OAuth or Webhook. Test notifications directly from the UI.

## 4. Major Design Decisions
- **Persistence & Queueing:** Email information is stored as the source of truth in PostgreSQL, while rapid queueing and scheduling is handled natively by Redis + BullMQ.
- **Atomic Database Updates:** Updates to the database have been made atomically. This prevents race conditions and stops more than one worker from sending the same scheduled email.
- **Graceful Deferral:** Emails that go over the rate limit are smoothly deferred and rescheduled into the next hour block instead of failing.
- **Testing Ease:** The project has been made easier to test and demo by including a developer login bypass and allowing direct Slack Webhook setup.


---
