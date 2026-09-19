# UR Future

Job board for Robotics & Automation students in India: fresher jobs, internships,
apprenticeships and trainee roles across core, software and non-technical tracks. Each job
has skills to learn, free resources and two resume prompts. A daily scheduled AI agent
fills it through an MCP server.

No admin panel: a daily AI agent adds and expires jobs through the MCP server, and Vercel
crons clean up. Browsing needs no account. Students can optionally sign in with Google, add
their resume (read in the browser, never uploaded) and get a daily email/Telegram alert with
new jobs matching their skills.

Stack: Next.js 16 (App Router) · Firestore (server-only via Admin SDK) · Firebase Auth (Google
sign-in) · Brevo (email) · Telegram Bot API · pdf.js · Vercel (hosting + cron). All free tiers.

## Run locally

```bash
npm install
npm run emulators          # terminal 1: Firestore emulator on :8080
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run seed   # 10 SAMPLE jobs
npm run dev                # http://localhost:3000
```

`.env.local` for local work only needs `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080`.
See `.env.example` for everything else.

## Checks

```bash
npm run typecheck && npm run lint
npm test                   # unit: validator, dedupe, filters
npm run test:emu           # + MCP server end-to-end + Firestore rules (starts its own emulator)
npm run build
```

## Layout

| Path | What |
|------|------|
| `src/lib/schema/` | zod schemas: the one definition of a job |
| `src/lib/jobs/` | validation, dedupe key, filters, Firestore access |
| `src/lib/mcp/server.ts`, `src/app/api/mcp/` | MCP server (5 tools, bearer auth, rate limit) |
| `src/app/api/cron/` | expiry, auto-delete, dead-link checks |
| `src/lib/jobs/resume-prompts.ts` | ATS resume prompts built from each job |
| `src/lib/tracker.ts`, `src/app/my-jobs/` | per-device application tracker (localStorage) |
| `src/config/ingestion.ts` | keywords, sources, categories the daily task uses |
| `src/config/developer.ts` | your About details |
| `src/lib/skills.ts` | skill vocabulary + synonyms, resume skill extraction, match % |
| `src/lib/digest.ts`, `src/lib/notify.ts` | daily job alerts (selection, email, Telegram) |
| `src/app/profile/`, `src/app/api/profile/` | sign-in, resume, preferences, delete-my-data |
| `src/lib/logo.ts` | company logos stored in Firestore and served at /api/logo |
| `firestore.rules` | deny all browser access |

Rename the site in `src/config/site.ts`.
