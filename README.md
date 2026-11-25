# NIMUN'27 Registration System (OC Conference '27)

The check-in and attendance system for **OC Conference '27**. Staff scan each OC member's QR code at the door, and the portal shows who has arrived, who got food, and who is still missing, live, per council.

This README describes the `oc-conference-27` branch. The `main` branch is the older NIMUN'26 system and is kept separate: it has its own database, its own Vercel projects and its own data.

Live portal: **https://reg.nimuneg.org**

## What it does

- **QR check-in.** Every OC member has a QR code that holds only their ID (for example `PRS-01`). Scanning it records attendance for the current day.
- **Conference days.** The scanner picks the day from the server clock (Cairo time):

  | Day | Date | What is scanned |
  |---|---|---|
  | Session Day One | 24 Nov | Attendance |
  | Session Day Two | 25 Nov | Attendance |
  | Session Day Three | 26 Nov | Attendance |
  | Conference Day | 27 Nov | Attendance and food |

- **Live Board** (`/analytics/scans`). Counts per day, a list of who is not scanned yet, and a scan log that shows who scanned whom and when. It checks for new scans every 2 seconds and updates within about 2 seconds of a scan.
- **Find a member.** A search box at the top of the Live Board finds a member by name, ID or username and opens their own view: the four days, food, and their scan history with the scanner's name. Clicking a row in any table opens the same view.
- **Manual check-in.** Admin accounts (`OC-REG`, `OC-HB`) and the Secretariats (`OC-UNICEF`, `OC-CCPCJ`, `OC-IAEA`, own council only) can check someone in without their QR: tap **Mark present** in the Live Board's "Not yet scanned" list or **Mark checked out** in its "Scanned in" list, or open the person and use **Mark present**, **Mark checked out**, **Undo check-out** or **Undo check-in** on a day (undos need a second tap). Only today or past days. Every manual change is saved in the scan log with the account's name and shown as "manual" on the board, in the person's history and in the CSV exports ("checked in how/by" and "checked out how/by" columns). Scanning desks and Press Head do not get it.
- **Offline scanning.** If a phone loses its connection, scans are queued on the phone and sent automatically when it is back online. Live scans use the server's time; offline scans keep the time they were made (accepted from 30 seconds up to 3 days old).
- **Undo last scan.** The scanner can undo the scan it just made, in case of a wrong person or a double tap.
- **Duplicate food warning.** A second food scan for the same person on the same day is refused and shows a red "Already got food".
- **Inactive members.** A member marked inactive is hidden from every list and count, and the scanner shows "Inactive: do not admit".
- **CSV export.** Download the attendance for one day or all days from the Live Board.
- **QR codes by email.** The Participants page can send each member their QR code through Resend. This is **switched off** for OC '27: QR emails are sent from Outlook instead, and the in-site send buttons stay locked unless the email settings below are turned on.

## Accounts and access

Everyone signs in with an account ID and password. Passwords are never stored in the repository; the database keeps only bcrypt hashes, and each password is handed out privately.

| Account | Who | Access |
|---|---|---|
| `OC-REG` | Registration Affairs | Everything: dashboard, participants, scanner, Live Board, manual check-in, clears |
| `OC-HB` | Highboard | Everything |
| `OC-PRESS` | Press Head | Live Board for Press only |
| `OC-UNICEF` | UNICEF Secretariat | Live Board and manual check-in for UNICEF only |
| `OC-CCPCJ` | CCPCJ Secretariat | Live Board and manual check-in for CCPCJ only |
| `OC-IAEA` | IAEA Secretariat | Live Board and manual check-in for IAEA only |
| `OC-DESK1`, `OC-DESK2`, `OC-DESK3` | Scanning desks 1 to 3 | Scanner only: check people in by QR or ID. No participant list, Live Board, export, clears, phone numbers or emails |
| `OC-OPS`, `OC-PR`, `OC-MEDIA`, `OC-SOCIALS` | Heads of Operations & Logistics, Public Relations, Media & Design, Socials & Events | Live Board for their own team's members only (every council, no delegates), plus the scanner (scans anyone, like a desk). No manual check-in, participant list or contact details |

Any other account (including the OC members themselves) cannot sign in.

The backend checks a server-side session on every request (the `auth_sessions` table, 7-day sessions, revoked on logout), so these limits hold even if someone calls the API directly. Council accounts are locked to their own council on the board, the log, the search and the export, and never see phone numbers.

To issue a new password for an account (this also signs it out everywhere), run from `Backend/` with `DATABASE_URL` set:

```bash
npm run oc27:accounts -- --reset OC-PRESS   # or --reset all
```

## Member IDs

OC members are stored as members with the role `OC Member (<council>)`. IDs come from their council:

| Council | Prefix | Example |
|---|---|---|
| Press | `PRS` | `PRS-01` |
| UNICEF | `UNI` | `UNI-01` |
| IAEA | `IAE` | `IAE-01` |
| CCPCJ | `CCJ` | `CCJ-01` |

## Stack

- **Backend** (`Backend/`): Node.js, Express and TypeScript. Talks to Postgres directly with `pg`. Runs on Vercel as a single serverless function (`Backend/api/index.js`, `Backend/vercel.json`).
- **Frontend** (`Frontend/`): React 18, Vite, Tailwind CSS and React Router. QR scanning with `html5-qrcode`.
- **Database**: its own Supabase (Postgres) project for OC '27. Row Level Security is on for every table, so the public Supabase key cannot read anything; only the backend reads and writes.
- **Hosting**: two Vercel projects built from the `oc-conference-27` branch, `oc27-api` (root `Backend`) and `oc27-portal` (root `Frontend`, serves `reg.nimuneg.org`).

## Project structure

```
Backend/
  api/index.js          Vercel entry point (wraps the Express app)
  db/oc27/              SQL to set up the '27 database (see its README)
  src/index.ts          Express app, CORS, route and access wiring
  src/middleware/       Session check and access levels
  src/routes/           API routes (auth, attendance, food, participants, scan-analytics, qr-email, ...)
  src/scripts/          oc27-import.ts (members + QR codes), oc27-accounts.ts (staff accounts)
Frontend/
  src/features/         Pages: login, dashboard, participants, scanner, Live Board
  src/lib/api.ts        API client and session token handling
```

The root `src/` and `public/` folders are the older JNIMUN'25 Next.js version and are not used by OC '27.

## Environment variables

Set these in the Vercel project settings (or in a git-ignored `.env` file when running locally). Never commit real values. `Backend/.env.example` and `Frontend/.env.example` list them with placeholders.

**Backend (`oc27-api`)**

| Name | What it is |
|---|---|
| `DATABASE_URL` | Postgres connection string for the '27 Supabase project. On Vercel use the Transaction pooler URI (port 6543). |
| `FRONTEND_URL` | The portal's URL, added to the allowed CORS origins |
| `ALLOWED_ORIGINS` | Extra allowed origins, comma-separated (any `*.nimuneg.org` and `*.vercel.app` origin is already allowed) |
| `NODE_ENV` | `production` on Vercel |
| `PORT` | Local port, defaults to 3001 |
| `SUPABASE_URL`, `DB_PASSWORD`, `SUPABASE_SERVICE_ROLE_KEY` | Only used when `DATABASE_URL` is empty |
| `RESEND_API_KEY` | Resend key for QR emails (not set for OC '27) |
| `QR_EMAIL_FROM` | Sender address for QR emails |
| `QR_EMAIL_ENABLED` | Must be `true` before any real QR email can be sent |
| `QR_EMAIL_EXCLUDE` | Extra member IDs that must never be emailed, comma-separated |
| `MOCK_AUTH_ENABLED`, `MOCK_ADMIN_EMAIL`, `MOCK_ADMIN_PASSWORD` | Local testing only; ignored when `NODE_ENV=production` |

**Frontend (`oc27-portal`)**

| Name | What it is |
|---|---|
| `VITE_API_URL` | The API's URL, no trailing slash. Overrides the placeholder in `Frontend/.env.production`. |
| `VITE_ENABLE_MOCK_AUTH` | Local testing only |

## Running locally

You need Node.js 18 or newer.

```bash
# Backend, on http://localhost:3001
cd Backend
npm install
cp .env.example .env      # then fill in the '27 database details
npm run dev

# Frontend, on http://localhost:5173
cd Frontend
npm install
cp .env.example .env.local
npm run dev
```

Check the backend with `GET /health`, which reports whether the database is connected.

## Setting up a new database

The full steps are in [`Backend/db/oc27/README.md`](Backend/db/oc27/README.md). In short:

1. Create a new Supabase project. Never point this branch at the NIMUN'26 database.
2. Run `Backend/db/oc27/01_schema.sql`, then `03_auth_sessions.sql` and `04_inactive_flag.sql`, in its SQL editor. (`02_seed_fake.sql` adds fake test people only; skip it for the real event.)
3. Import members from private CSV files kept in `Backend/private/oc27/` (git-ignored): `npm run oc27:import -- private/oc27/*.csv`. Add `--dry-run` to only make QR codes. QR codes and a roster land in `Backend/private/oc27-output/`.
4. Create the six staff accounts with `npm run oc27:accounts`. Each password is printed once; hand them out privately.

## Deploying

Set **Production Branch** to `oc-conference-27` in both Vercel projects (Settings, Git). Then a push to the branch deploys both to production; until then, deploy the branch by hand from the Vercel dashboard.

1. Push to `oc-conference-27`. Do not push '27 work to `main`.
2. Vercel builds `oc27-api` (TypeScript build, then the Express app as one function, 30 second limit) and `oc27-portal` (Vite build).
3. Open `https://reg.nimuneg.org`, sign in, and check the Live Board loads.

To roll back, promote the previous deployment of each project in the Vercel dashboard.

## Data and privacy

- Participant spreadsheets, CSV files, generated QR codes and `Backend/private/` are git-ignored. Real member data is imported from private files and lives only in the database.
- No passwords, keys or connection strings belong in this repository.
- The NIMUN'26 data files were removed from this branch, but they still exist on `main` and in the git history.

## Things to know

- **Clears are permanent.** "Clear attendance" and "Clear food" (full-access accounts only) wipe tracking for everyone with no backup or undo. Export a CSV first.
- **Deleting all participants** through the API removes every member, staff accounts included.
- **Login throttle** (10 failed tries in 15 minutes) is kept in memory, so on Vercel it is per instance and resets on cold starts.
- **Changing a password** does not sign out existing sessions; use `npm run oc27:accounts -- --reset <ID>` to do both.

## License

Private project for NIMUN.
