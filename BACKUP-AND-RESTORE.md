# NINJA MOONS — Backup & Recovery Runbook

Created: 2026-11-08
Last verified source release: `abbe52487ce2a3f1705a10d095095bc3b92b94a9`
Protected recovery branch: `backup/verified-2026-11-08`

## Production identifiers

- GitHub: `johnrgaetano-Harvard1/Ninja-Moons`
- Production Vercel project: `ninja-moons-publisher` (`prj_XEMb7VHHqi58kVjlHB9P1sMaLMl6`)
- Production site: https://ninja-moons-publisher.vercel.app/
- Supabase learning project: `ninja-moons-learning` (`eaqwobzxrpplxymumlki`)
- Build: `node publishing-lab/publisher/test-import.js && node publishing-lab/publisher/build.js`
- Release source: the exact commit in the recovery branch, not the mutable main branch.

## Recovery priorities

1. **Bad code release:** Inspect the failing deployment and its build logs. Restore the last verified Vercel production deployment or deploy the recovery branch's commit. Do not reset or force-push `main` merely to restore production. Verify homepage, Student Station, Teacher Dashboard, Ask Ninja, classroom sessions, and the document importer.
2. **Lost hosting/project:** Recreate the Vercel project from the GitHub repository at the pinned recovery commit. Copy verified build settings and manually reconfigure the necessary environment variables from a secure secrets manager. Test a new deployment before moving the domain.
3. **Lost GitHub repository:** Restore from an independent, complete `git clone --mirror` or GitHub repository archive held in a separate account/storage provider. An archive of `main` alone does not preserve all branches and tags.
4. **Lost database:** Restore from a dated Supabase/PostgreSQL backup **to a separate database first**, validate row counts, RLS policies, RPCs, authentication and classroom behavior, then switch traffic. Never run an unverified database restore against production.
5. **Lost story assets:** Restore the source-controlled story and illustration files from the pinned GitHub commit or offline archive. Any assets stored outside GitHub require separate exports.
6. **Lost personal uploads:** Student and teacher personal documents currently live in each device's browser IndexedDB; they are **not** backed up by GitHub, Vercel, or Supabase. Do not clear browser storage. A future authenticated cloud library/export workflow is needed for recoverable personal uploads.

## Backup policy (desired; not yet automatically configured)

- Before risky edits: record the known-good commit, keep the verified recovery branch unchanged, and deploy/test on a separate preview first.
- Weekly: export a complete Git repository mirror and story assets to a separate provider, and retain several dated generations.
- Daily: create and verify encrypted database backups, including schema, data, RPCs, RLS policies and storage assets. Verify plan capabilities and schedule before claiming this is active.
- Monthly: restore the source and a database backup into an isolated environment and exercise student/teacher workflows.
- Quarterly: review secrets, access controls, domain ownership, recovery contacts, and retention.

## Standby deployment design

A **separate** Vercel project should deploy only the pinned verified commit/backup branch, never automatically follow production `main`. Give it its own standby URL. Keep it read-only or isolated from production Supabase during drills; sharing the live database means a database outage still affects both sites. Verify all routes and required environment variables before calling it an operational standby.

## Credentials and privacy

Never commit API keys, database passwords, service-role keys, student data exports, private session tokens, or secrets to GitHub. Store encrypted database backups separately with restricted access and retention rules. Classroom information may be sensitive; restrict access to authorized personnel. Back up database schema and policies as well as rows.

## What has been done as of creation

- A verified source recovery branch has been created at the pinned release SHA.
- This runbook documents the recovery procedure.
- **Not yet done:** independent offline archive, automated database export, separate tested standby deployment, scheduled restore drill. These are separate tasks and must be confirmed before being represented as active.
