# NINJA MOONS — Recovery checkpoint, 2026-11-09

## Code recovery copies
- Primary repository: https://github.com/johnrgaetano-Harvard1/Ninja-Moons
- Latest dated source snapshot branch: `backup/current-2026-11-09` (created from main on 2026-11-09)
- Earlier verified recovery branch: `backup/verified-2026-11-08`
- Independent standby Vercel project: `ninja-moons-standby-backup`
- Standby source: `a15a0762ed07f59a0ea06820b47a6f442002f426`
- Main site: https://ninja-moons-publisher.vercel.app/
- Standby site: https://ninja-moons-standby-backup-ninja-fitt.vercel.app/

## Supabase inventory (read-only inspection 2026-11-09)
- Project: `ninja-moons-learning` (`eaqwobzxrpplxymumlki`), reported ACTIVE_HEALTHY.
- Public tables: 18. All reported row-level security enabled.
- Migration history: 9 recorded migrations, including reader sessions and classroom messaging.
- This inventory is NOT a database backup: it contains no private rows, auth users, stored objects, or full database schema.

## Remaining gaps
1. Download a Git repository mirror and store outside GitHub and Vercel.
2. Set up encrypted Supabase PostgreSQL data/schema backup with retention and a separate storage destination.
3. Verify a full restore in an isolated project before connecting any live users.
4. Export user documents currently stored only in browser IndexedDB on individual devices.
5. Confirm standby environment variables and database isolation.

## Recovery rules
Do not overwrite production or restore database dumps onto the live database as a test.
Do not commit secrets, student data, or private keys into this public repository.
A successful website build does not prove database recovery.
