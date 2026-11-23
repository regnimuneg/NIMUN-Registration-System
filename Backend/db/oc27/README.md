# OC Conference '27 database

This branch (`oc-conference-27`) runs on its **own** Supabase project. Never point it at the NIMUN'26 database.

## Set up a fresh database

1. Create a new Supabase project for OC Conference '27.
2. In its SQL editor, run `01_schema.sql`. It creates every table, index, trigger and RLS policy the app uses, with no data. It has no `DROP` statements, so if it is run against a database that already has these tables, it errors out and changes nothing.
3. Run `03_auth_sessions.sql` (login sessions), then `02_seed_fake.sql`. It adds one admin, one member and three fake delegates (example.com emails, no real people). The last result shows the generated admin and member passwords once; save them privately.
4. Copy `Backend/.env.example` to `Backend/.env` and fill in the new project's connection details.
5. When the '27 backend is deployed, replace the placeholder in `Frontend/.env.production` (or set `VITE_API_URL` in the hosting dashboard), and add the '27 frontend's domain to the CORS list in `Backend/src/index.ts` if it is not under `.nimuneg.org`.

## Import OC members and make QR codes

1. Save each council's sheet as CSV in `Backend/private/oc27/` (git-ignored). Columns: First Name, Last Name, Phone Number, Council, Committee, and optionally ID and Email.
2. From `Backend/`, run `npm run oc27:import -- private/oc27/*.csv` (add `--dry-run` to only make QR codes, without touching the database).
3. Each person gets an ID from their council: Press `PRS-01`, UNICEF `UNI-01`, IAEA `IAE-01`, CCPCJ `CCJ-01` (change `COUNCIL_PREFIXES` in `src/scripts/oc27-import.ts` before the first import if you want others). They are stored as members with role `OC Member (<council>)`.
4. QR codes and a `roster.csv` land in `Backend/private/oc27-output/`. Each QR code holds only the ID; the existing Scan page reads it and shows name, phone and ID.

Re-running is safe: people are matched by council and phone number and keep their ID. Adding an Email column later fills in emails for sending QR codes.

## Staff accounts and access

From `Backend/`, run `npm run oc27:accounts`. It creates six accounts and prints each password once (also saved to the git-ignored `Backend/private/oc27-accounts.csv`). Only bcrypt hashes are stored in the database. Sign in with the account ID.

| Account ID | Who | Access |
|---|---|---|
| OC-REG | Registration Affairs | Everything |
| OC-HB | Highboard | Everything |
| OC-PRESS | Press Head | Scan Analytics, Press only |
| OC-UNICEF | UNICEF Secretariat | Scan Analytics, UNICEF only |
| OC-CCPCJ | CCPCJ Secretariat | Scan Analytics, CCPCJ only |
| OC-IAEA | IAEA Secretariat | Scan Analytics, IAEA only |

The backend checks a server-side session on every request (`auth_sessions` table), so these limits hold even if someone calls the API directly. `npm run oc27:accounts -- --reset OC-PRESS` (or `--reset all`) issues a new password and signs that account out everywhere.

## What was removed from this branch

The NIMUN'26 participant and staff files (`Full Participants*.xlsx`, `Backend/seeds/Participants.csv`, `Backend/db/seed*.sql`, `Backend/db/migrate_executive_ids.sql`) are deleted here so no real personal data or '26 credentials carry into '27. They still exist on `main` and in git history.

Real '27 participants should be imported from a private file at registration time, not committed to the repository.
