# Todo app: WakeIt before/after demo

React + Express + PostgreSQL, deployed on Render's free tier.
The same frontend runs with or without WakeIt:

- `https://<your-site>.onrender.com/?wakeit=off`  -> plain app (before)
- `https://<your-site>.onrender.com/`             -> app wrapped in `@lalit_kumar/wakeit` (after)

## Deploy on Render (all free)

1. Push this folder to a new GitHub repo (e.g. `wakeit-todo-demo`).
2. Render -> New -> PostgreSQL. Name `todo-db`, Region Singapore, Plan Free. Create, then copy the **Internal Database URL**.
3. Render -> New -> Web Service -> pick the repo.
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Region: same as the database. Instance Type: Free.
   - Environment: `DATABASE_URL` = the Internal Database URL.
   - After deploy, open `https://<api>.onrender.com/api/health`. It should return `{"status":"ok"}`.
4. Render -> New -> Static Site -> pick the same repo.
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment: `VITE_API_URL` = `https://<api>.onrender.com` (no trailing slash).
   - Vite bakes this in at build time, so if you change it, redeploy the static site.

## Test protocol (about 40 minutes, mostly waiting)

Render free web services spin down after 15 minutes without traffic. The static site never sleeps.
Do not open the API URL or the site in between runs, or the backend wakes up early.

1. Wait until the backend has been idle for at least 16 minutes.
2. **Run A (before):** start a screen recording, open `/?wakeit=off`. After about 10 s, type a todo and press Add.
   Note "List visible at" and "Last add took" in the footer.
3. Wait another 16+ minutes without touching the backend.
4. **Run B (after):** open the site in a fresh incognito window (WakeIt caches the warm state in localStorage for 14 min), recording on. Open `/`.
   Do the same: wait about 10 s, add a todo, note the footer numbers.

Expected:

| | Run A (off) | Run B (on) |
|---|---|---|
| Feedback while the server sleeps | none, only "Loading todos..." | amber badge after ~1.5 s, input disabled with a hint |
| When the server is up | list appears, nothing tells the user | green toast, list loads |
| Last add took | the rest of the cold start (tens of seconds) | under 1 s |

The test passes if B shows the badge within ~2 s, the toast when the server is up, and "Last add took" under 1 s, while A shows no feedback and a long wait.
Note: WakeIt does not shorten Render's boot. "List visible at" is similar in both runs. What changes is feedback and the wait after the click.

## Run locally (optional)

```bash
# backend (needs a Postgres URL, e.g. your Render *External* Database URL)
cd backend && npm install
DATABASE_URL="postgres://..." npm start        # PowerShell: $env:DATABASE_URL="postgres://..."; npm start

# frontend
cd frontend && npm install
cp .env.example .env.local
npm run dev
```
