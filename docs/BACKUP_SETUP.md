# NINJA MOONS — encrypted database backup (draft)

This workflow is **staged on a separate branch**. It does not run from the default branch yet. No database credentials are committed.

Before enabling it:
1. Generate an age X25519 encryption keypair on a trusted computer; store the **private identity key** outside GitHub in at least two safe locations. Without it the backup cannot be decrypted.
2. In GitHub repository Actions secrets add `NINJA_BACKUP_AGE_RECIPIENT` (public recipient only) and `NINJA_SUPABASE_DB_URL` (Supabase **direct or pooler session-mode PostgreSQL connection string** with a database user permitted to dump the required schemas). Never paste the database password in a chat or commit.
3. Review whether the GitHub-hosted runner can connect to the Supabase database. The default direct database endpoint may require IPv6; a session pooler endpoint can support IPv4.
4. Review PostgreSQL client/server major-version compatibility. This workflow installs the OS default pg_dump and may need to be pinned to PostgreSQL 17 or later for the current database.
5. Test a manually triggered run, download encrypted artifact, decrypt locally, and restore into a **separate nonproduction database**. Verify tables, row counts, permissions, and application login. Never restore into production as a test.
6. Merge only after verification. GitHub Actions artifacts expire after 7 days; this is not an independent long-term offsite archive. For resilience, also copy encrypted backups to a separate storage provider/account.
7. This dump covers PostgreSQL contents, not Supabase Storage object bytes, project secrets, external providers, or necessarily auth/storage restoration behavior. Those need separate recovery procedures.

**Privacy:** Never upload unencrypted dumps, student records, private encryption identities, or database URLs to this public repository. GitHub Actions artifacts are available to authorized users of the repository; encryption protects contents if downloaded.
