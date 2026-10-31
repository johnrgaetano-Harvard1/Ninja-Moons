# NINJA MOONS — Accounts & Progress Lab (Phase 1)

This is a SEPARATE test project. Do not replace the approved Story or NINJA Reader, original login, teacher reports, live audio, or any live database.

## Built
- Responsive role-based sign-in and progress interface for student, guardian, teacher, school administrator, district administrator, and owner.
- UI for pre-approved adult email/password, passwordless email, Google, Microsoft Entra/Azure and Apple sign-in, using Supabase Auth when explicitly configured.
- Planned future methods (NOT active): classroom code/QR with rotating credentials, passkeys, district SSO and roster providers (Clever, ClassLink, LMS).
- Fictional learner dashboard with no personally identifying information.
- Migration for separate PostgreSQL student records, identity links, schools, classrooms, teachers, verified guardians, consent decisions, assignments, reading activity, quiz attempts and audit events.
- Row-level access policies and tracking adapter code, currently NOT attached to the existing reader.
- Unit tests. IMPORTANT: SQL RLS integration tests have NOT been run on a real database.

## Do NOT put real student information here yet
There is NO connected database, no real account provisioning, no proven FERPA/COPPA compliance and no configured school/parent consent process. Student activity collection is disabled by design. The story and NINJA Reader remain unchanged. No microphone audio, transcripts or precise location are stored.

## Activation checklist
1. Connect a dedicated Supabase project, owned by NINJA MOONS.
2. Review school contracts, parental notices and consent requirements, data minimization, retention and deletion policies, and education privacy obligations.
3. Apply SQL in supabase/migrations to the dedicated project, never an existing live school database.
4. Run positive and negative database RLS tests for every role, student, guardian, classroom, and cross-school boundary. Provisioning must enforce the same-school relationship of classroom enrollment and teacher assignments.
5. Configure adult OAuth providers, admin MFA, rate limits, proper redirect URL allowlist and invitation-only onboarding. No public student self-registration.
6. Provision ONLY fictional test accounts, schools, classrooms, and consent records using audited, server-only operations (not browser-client writes). Confirm cross-tenant isolation and that students cannot approve their own consent.
7. In the account-lab Vercel project alone, set public VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY and turn on VITE_ENABLE_AUTH=true only after testing. NEVER expose a Supabase service-role key in VITE_ variables or source files.
8. Complete role and database tests, data export/delete flows, audit reviews, incident response planning and school/guardian approvals before any real users.
9. Attach the separate src/tracker.js adapter to the already-approved NINJA Reader only on a tested and reviewed branch. Progress is self-reported activity, not proof of comprehension. Trusted quiz grading is a later backend feature.

## Build
From integrations/accounts-lab run npm install, npm test, npm run build. By default VITE_ENABLE_AUTH is OFF and every real sign-in button is disabled. This project intentionally has no real student writes.

## Access model
Identity comes from Supabase Auth, not user-controlled metadata. Every app profile, student-to-user link, teacher assignment, guardian verification and consent status must be created by trusted server provisioning. Student progress uses pseudonymous student IDs. Student records are readable by a linked student, a verified guardian, a teacher assigned to an active classroom, or active school administrators. Only an authenticated, active, consent-approved student may insert own activity under RLS. Do not mistake activity logs for verified learning outcomes.

## Still needed
DB provisioning and testing, guardian verification and education legal review, district SSO, consent workflows, administrator 2FA, account recovery, abuse prevention, data retention/export/deletion, secret handling, account provisioning, database migrations, event integration and comprehensive accessibility and live-browser testing.
