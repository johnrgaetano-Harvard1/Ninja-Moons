-- NINJA MOONS accounts/progress foundation. Apply only to a dedicated reviewed Supabase database.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.schools (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160),
 district_ref text, is_active boolean not null default false, created_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(display_name) between 1 and 120),
 role text not null check (role in ('student','guardian','teacher','school_admin','district_admin','owner')),
 is_active boolean not null default false, created_at timestamptz not null default now()
);
create table public.school_staff (
 school_id uuid not null references public.schools(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 role text not null check(role in ('teacher','school_admin','district_admin','owner')),
 is_active boolean not null default false,
 primary key (school_id,user_id)
);
create index school_staff_user_idx on public.school_staff(user_id);
create table public.classrooms (
 id uuid primary key default gen_random_uuid(), school_id uuid not null references public.schools(id) on delete cascade,
 name text not null check(length(name) between 1 and 120), school_year text not null,
 is_active boolean not null default false, created_at timestamptz not null default now()
);
create index classrooms_school_idx on public.classrooms(school_id);
create table public.classroom_teachers (
 classroom_id uuid not null references public.classrooms(id) on delete cascade,
 teacher_user_id uuid not null references public.profiles(id) on delete cascade,
 is_active boolean not null default false,
 primary key(classroom_id,teacher_user_id)
);
create index classroom_teachers_user_idx on public.classroom_teachers(teacher_user_id);
-- Student records are pseudonymous and do not require email addresses.
create table public.student_profiles (
 id uuid primary key default gen_random_uuid(),school_id uuid not null references public.schools(id) on delete cascade,
 display_alias text not null check(length(display_alias) between 1 and 80),
 grade_level text check(grade_level in ('K','1','2','3','4','5','6','7','8','9','10','11','12')),
 consent_status text not null default 'pending' check(consent_status in ('pending','approved','declined','revoked')),
 is_active boolean not null default false,created_at timestamptz not null default now()
);
create index student_profiles_school_idx on public.student_profiles(school_id);
create table public.student_user_links (
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 is_active boolean not null default false,primary key(student_id,user_id)
);
create index student_user_links_user_idx on public.student_user_links(user_id);
create table public.guardian_links (
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 guardian_user_id uuid not null references public.profiles(id) on delete cascade,
 verified_at timestamptz,primary key(student_id,guardian_user_id)
);
create index guardian_links_user_idx on public.guardian_links(guardian_user_id);
create table public.consent_records (
 id uuid primary key default gen_random_uuid(),student_id uuid not null references public.student_profiles(id) on delete cascade,
 guardian_user_id uuid references public.profiles(id),
 basis text not null check(basis in ('verified_parent','school_authorization','rejected','withdrawn')),
 notice_version text not null,verified_by uuid references public.profiles(id),
 verified_at timestamptz,created_at timestamptz not null default now()
);
create table public.classroom_enrollments (
 classroom_id uuid not null references public.classrooms(id) on delete cascade,
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 is_active boolean not null default false,joined_at timestamptz not null default now(),
 primary key(classroom_id,student_id)
);
create index classroom_enrollments_student_idx on public.classroom_enrollments(student_id);
create table public.reading_assignments (
 id uuid primary key default gen_random_uuid(),
 classroom_id uuid not null references public.classrooms(id) on delete cascade,
 assigned_by uuid not null references public.profiles(id),
 story_slug text not null check(story_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 due_at timestamptz,created_at timestamptz not null default now()
);
create table public.reading_events (
 id uuid primary key default gen_random_uuid(),client_event_id uuid not null unique,
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 actor_user_id uuid not null references public.profiles(id),
 story_slug text not null check(story_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 event_type text not null check(event_type in ('story_open','story_close','sentence_read','word_tap','helper_step','question_view')),
 sentence_number integer check(sentence_number between 1 and 50000),
 helper_stage integer check(helper_stage between 1 and 4),
 duration_ms integer check(duration_ms between 0 and 3600000),
 created_at timestamptz not null default now()
);
create index reading_events_student_time_idx on public.reading_events(student_id,created_at desc);
create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(),client_event_id uuid not null unique,
 student_id uuid not null references public.student_profiles(id) on delete cascade,
 actor_user_id uuid not null references public.profiles(id),
 story_slug text not null check(story_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 question_id text not null check(length(question_id) between 1 and 80),
 answer_choice text not null check(length(answer_choice) between 1 and 30),
 created_at timestamptz not null default now()
);
create index quiz_attempts_student_time_idx on public.quiz_attempts(student_id,created_at desc);
-- No client-writeable "is_correct" field: trusted assessment service will grade later.
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),
 actor_user_id uuid references public.profiles(id),
 event_name text not null,entity_kind text,entity_id uuid,
 created_at timestamptz not null default now()
);

-- Helpers bypass RLS recursion but get the identity solely from auth.uid().
create function private.is_school_staff(sid uuid) returns boolean language sql stable
 security definer set search_path = ''
as $$ select exists(select 1 from public.school_staff ss
 join public.schools s on s.id=ss.school_id and s.is_active
 where ss.school_id=sid and ss.user_id=(select auth.uid()) and ss.is_active) $$;
create function private.can_read_student(sid uuid) returns boolean language sql stable
 security definer set search_path = ''
as $$
 select exists(select 1 from public.student_user_links l where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active)
 or exists(select 1 from public.guardian_links g where g.student_id=sid and g.guardian_user_id=(select auth.uid()) and g.verified_at is not null)
 or exists(select 1 from public.classroom_enrollments e
 join public.classroom_teachers t on t.classroom_id=e.classroom_id and t.is_active
 join public.classrooms c on c.id=e.classroom_id and c.is_active
 where e.student_id=sid and e.is_active and t.teacher_user_id=(select auth.uid()))
 or exists(select 1 from public.student_profiles p
 join public.school_staff ss on ss.school_id=p.school_id and ss.is_active
 join public.schools sc on sc.id=ss.school_id and sc.is_active
 where p.id=sid and ss.user_id=(select auth.uid()) and ss.role in ('school_admin','district_admin','owner'))
$$;
create function private.can_record_student(sid uuid) returns boolean language sql stable
 security definer set search_path = ''
as $$ select exists(select 1 from public.student_user_links l
 join public.student_profiles s on s.id=l.student_id
 join public.schools sc on sc.id=s.school_id and sc.is_active
 join public.profiles p on p.id=l.user_id and p.is_active and p.role='student'
 where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active
 and s.is_active and s.consent_status='approved') $$;
revoke all on function private.is_school_staff(uuid) from public;
revoke all on function private.can_read_student(uuid) from public;
revoke all on function private.can_record_student(uuid) from public;
grant execute on function private.is_school_staff(uuid) to authenticated;
grant execute on function private.can_read_student(uuid) to authenticated;
grant execute on function private.can_record_student(uuid) to authenticated;

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.school_staff enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_teachers enable row level security;
alter table public.student_profiles enable row level security;
alter table public.student_user_links enable row level security;
alter table public.guardian_links enable row level security;
alter table public.consent_records enable row level security;
alter table public.classroom_enrollments enable row level security;
alter table public.reading_assignments enable row level security;
alter table public.reading_events enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.audit_events enable row level security;

-- No open self-signup in public tables. Privileged provisioning must run through an audited server.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.profiles,public.schools,public.school_staff,
 public.classrooms,public.classroom_teachers,public.student_profiles,public.student_user_links,
 public.guardian_links,public.classroom_enrollments,public.reading_assignments,
 public.reading_events,public.quiz_attempts to authenticated;
grant insert on public.reading_events,public.quiz_attempts to authenticated;

create policy profiles_self_read on public.profiles for select to authenticated
 using(id=(select auth.uid()));
create policy schools_staff_read on public.schools for select to authenticated
 using((select private.is_school_staff(id)) or exists(select 1 from public.student_profiles sp
 where sp.school_id=id and (select private.can_read_student(sp.id))));
create policy staff_own_read on public.school_staff for select to authenticated
 using(user_id=(select auth.uid()));
create policy classrooms_scoped_read on public.classrooms for select to authenticated
 using((select private.is_school_staff(school_id)) or exists(select 1 from public.classroom_enrollments e
 where e.classroom_id=id and e.is_active and (select private.can_read_student(e.student_id))));
create policy classroom_teachers_own_read on public.classroom_teachers for select to authenticated
 using(teacher_user_id=(select auth.uid()));
create policy student_profiles_scoped_read on public.student_profiles for select to authenticated
 using((select private.can_read_student(id)));
create policy student_links_own_read on public.student_user_links for select to authenticated
 using(user_id=(select auth.uid()));
create policy guardian_links_own_read on public.guardian_links for select to authenticated
 using(guardian_user_id=(select auth.uid()));
create policy enrollments_scoped_read on public.classroom_enrollments for select to authenticated
 using((select private.can_read_student(student_id)));
create policy assignments_scoped_read on public.reading_assignments for select to authenticated
 using(exists(select 1 from public.classrooms c where c.id=classroom_id and
 ((select private.is_school_staff(c.school_id)) or exists(select 1 from public.classroom_enrollments e
 where e.classroom_id=c.id and e.is_active and (select private.can_read_student(e.student_id))))));
create policy events_scoped_read on public.reading_events for select to authenticated
 using((select private.can_read_student(student_id)));
create policy events_student_insert on public.reading_events for insert to authenticated
 with check(actor_user_id=(select auth.uid()) and (select private.can_record_student(student_id)));
create policy attempts_scoped_read on public.quiz_attempts for select to authenticated
 using((select private.can_read_student(student_id)));
create policy attempts_student_insert on public.quiz_attempts for insert to authenticated
 with check(actor_user_id=(select auth.uid()) and (select private.can_record_student(student_id)));
-- Consent and audit tables intentionally expose no client-side policies/grants.
-- IMPORTANT: dedicated DB-side RLS negative tests, multi-school integrity constraints,
-- activity rate limits, retention and access audits are mandatory before actual enrollment.
