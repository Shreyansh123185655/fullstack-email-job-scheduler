# ONB – Email Scheduler (Frontend)

React 18 + TypeScript + Tailwind CSS + Vite. Built from the Figma screens: login, Scheduled / Sent lists, email detail, compose, and the Send Later picker.

## Run it
```bash
npm install
npm run dev        # http://localhost:5173
```
It runs on fake data out of the box (`VITE_USE_MOCK=true` in `.env`). Any click on "Login with Google" signs you in as Oliver Brown.

## Folder map
```
src/
  pages/        one file per screen (Login, list, detail, compose, layout)
  components/   layout/ (sidebar, route guard), emails/, compose/, ui/ (button, toast, spinner…)
  services/     the ONLY place that talks to the backend (authService, emailService, http)
  hooks/        useEmails, useDebounce
  context/      AuthContext
  types/        shared TypeScript types (mirror these in the backend)
  utils/        csv + date helpers
```

## Plugging in the backend later
1. Set `VITE_USE_MOCK=false`. Vite proxies `/api` to `http://localhost:4000`.
2. Build the endpoints below; nothing else in the UI changes.

| Frontend call | Endpoint |
|---|---|
| `authService.me / logout` | `GET /api/auth/me`, `POST /api/auth/logout` |
| `authService.loginWithGoogle` | `GET /api/auth/google` (redirect flow) |
| `emailService.senders` | `GET /api/senders` |
| `emailService.list` | `GET /api/emails?status=scheduled\|sent&q=` (Elasticsearch search) |
| `emailService.get / counts` | `GET /api/emails/:id`, `GET /api/emails/counts` |
| `emailService.schedule` | `POST /api/emails/schedule` (`ScheduleEmailPayload` in `types/`) |

Session cookies are sent with `credentials: "include"`.

## Notes
- Recipients: type/paste emails or use **Upload List** (CSV/TXT). Valid addresses are extracted, de-duplicated and counted.
- Delay is in seconds; hourly limit is emails per hour. Both are sent to the backend, which enforces them.
- Email HTML is rendered with `dangerouslySetInnerHTML`; sanitize it (DOMPurify or server-side) before real use.
