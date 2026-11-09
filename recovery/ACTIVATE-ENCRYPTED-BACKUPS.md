# Encrypted database backups — activation checklist

**Status:** Prepared, not active. GitHub Actions fails closed until required secrets and offsite storage are configured.

The Supabase project uses PostgreSQL 17. The workflow runs a PostgreSQL 17 client in Docker and encrypts the streamed custom-format dump using age before upload. It does not write plaintext database dumps to disk.

## Configure offsite storage

Choose a private S3-compatible bucket with versioning and lifecycle retention, ideally at a provider independent of GitHub, Vercel and Supabase. Confirm any charges before creating it. Create a limited-privilege access key allowed to put objects in `ninja-moons/*` and, if needed, read them for verification. Deny public bucket access. Use bucket-side encryption as a second layer.

## Configure encryption

Generate an age identity locally on a trusted device and store the **private** identity in a password manager or another separate, durable location. Store the **public** `age1...` recipient in the GitHub Actions secret below. Never put the private key into GitHub or chat. If the private key is lost, encrypted backups cannot be recovered.

## GitHub repository settings

In **Settings → Secrets and variables → Actions**, set these **secrets**:
- `NINJA_DATABASE_URL`: Supabase PostgreSQL connection string with sufficient dump permissions; use the direct or compatible pooler connection, TLS, and an account approved for backup. Never paste it into a commit or chat.
- `NINJA_AGE_RECIPIENT`: public age recipient (`age1...`).
- `NINJA_BACKUP_ACCESS_KEY_ID`: storage access key ID.
- `NINJA_BACKUP_SECRET_ACCESS_KEY`: storage secret.

Set these **variables**:
- `NINJA_BACKUP_REGION`: bucket region.
- `NINJA_BACKUP_BUCKET`: private bucket name.
- `NINJA_BACKUP_ENDPOINT`: HTTPS S3-compatible API endpoint.

Workflow: `.github/workflows/encrypted-database-backup.yml`; schedule: daily at 07:17 UTC. A scheduled job may be delayed or disabled by GitHub policies. Manually dispatch a test run after setup, verify its exit status and confirm both encrypted file and SHA-256 checksum exist offsite. Never expose the dump as a GitHub Actions artifact.

## Restore drill

1. Download one encrypted dump and matching checksum from the private bucket to a trusted isolated machine.
2. Validate checksum. Decrypt with the separately stored age private identity.
3. Restore into a **new, isolated** PostgreSQL 17 database using `pg_restore`; do not restore over the live project.
4. Check schema, data counts, permissions/RLS, functions, auth flows and classroom behavior.
5. Independently back up Supabase Storage objects: PostgreSQL dumps do not contain the actual object bytes.
6. Record the tested recovery date and rotate keys if compromised.

**Known limitations:** This PostgreSQL dump does not replace backups of Supabase Storage object bytes, individual browser IndexedDB uploads, or full platform-specific auth/configuration state. No automatic retention pruning is implemented; configure bucket lifecycle rules.
