# OC Conference '27 database

This branch (`oc-conference-27`) runs on its **own** Supabase project. Never point it at the NIMUN'26 database.

## Set up a fresh database

1. Create a new Supabase project for OC Conference '27.
2. In its SQL editor, run `01_schema.sql`. It creates every table, index, trigger and RLS policy the app uses, with no data. It has no `DROP` statements, so if it is run against a database that already has these tables, it errors out and changes nothing.
3. Run `02_seed_fake.sql`. It adds one admin, one member and three fake delegates (example.com emails, no real people). The last result shows the generated admin and member passwords once; save them privately.
4. Copy `Backend/.env.example` to `Backend/.env` and fill in the new project's connection details.
5. When the '27 backend is deployed, replace the placeholder in `Frontend/.env.production` (or set `VITE_API_URL` in the hosting dashboard), and add the '27 frontend's domain to the CORS list in `Backend/src/index.ts` if it is not under `.nimuneg.org`.

## What was removed from this branch

The NIMUN'26 participant and staff files (`Full Participants*.xlsx`, `Backend/seeds/Participants.csv`, `Backend/db/seed*.sql`, `Backend/db/migrate_executive_ids.sql`) are deleted here so no real personal data or '26 credentials carry into '27. They still exist on `main` and in git history.

Real '27 participants should be imported from a private file at registration time, not committed to the repository.
