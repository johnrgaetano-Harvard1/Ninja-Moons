# NINJA MOONS — Activate encrypted offsite backups

Status: **NOT ACTIVE** until the owner configures secrets and storage, verifies a test restore, and sets `NINJA_BACKUP_ENABLED=true`.

## Recommended destination
Use a dedicated private S3-compatible object-storage bucket with a restricted access key. A Cloudflare R2 bucket is one option; check its current pricing, billing requirements, and free allowance before creating it. Keep this bucket in an account separate from GitHub and Vercel if possible. Enable versioning/retention if offered. Never enable public access.

## Owner setup (in providers' secure settings, never in chat)
1. Create a private bucket and a key scoped to **write and read only this bucket**; note the S3 endpoint and region.
2. Generate an age encryption identity locally using `age-keygen -o ninja-moons-backup-identity.txt`. Keep the **private identity** in a password manager and offline recovery copy, not in GitHub. Copy only the public `age1...` recipient.
3. Obtain a PostgreSQL connection string for the Supabase database from its dashboard. Store it as a GitHub Actions secret; never paste it into an issue, commit, message, or website.
4. In GitHub repository Settings → Secrets and variables → Actions, add these **secrets**:
   - `NINJA_DATABASE_URL` (database connection string)
   - `NINJA_AGE_RECIPIENT` (public encryption recipient)
   - `NINJA_BACKUP_ACCESS_KEY_ID`
   - `NINJA_BACKUP_SECRET_ACCESS_KEY`
5. Add these **variables**:
   - `NINJA_BACKUP_BUCKET` (bucket name)
   - `NINJA_BACKUP_ENDPOINT` (S3-compatible endpoint)
   - `NINJA_BACKUP_REGION` (provider-specific region)
   - `NINJA_BACKUP_ENABLED` = `true` **only when everything above is configured**.
6. Open Actions → Encrypted offsite database backup → Run workflow. Confirm the run succeeds and the encrypted `.dump.age` plus `.sha256` both exist in the private bucket. Inspect logs for errors, not secret values.
7. Download a backup to an isolated computer, verify the checksum, decrypt with the age private identity, and restore into an **isolated test database**. Verify tables, functions, policies, and rows. Never restore a test dump over production.
8. Check daily runs and create an alert on failure. Retain multiple generations; implement lifecycle/retention only after verifying recovery.

## Scope and limitations
- The script uses `pg_dump --format=custom` for the connected PostgreSQL database. Confirm its role can access the required schemas and rows; a restricted connection can produce incomplete backups.
- PostgreSQL dumps do **not** include Supabase Storage object bytes, device-only IndexedDB files, external secrets, or the complete Git repository.
- An encrypted dump is only recoverable while the age **private identity** is preserved.
- This workflow is configured for 07:17 UTC daily, subject to GitHub Actions scheduling delays.
- Do not assume the free tier of any provider guarantees perpetual free service, availability, or automatic restore.
