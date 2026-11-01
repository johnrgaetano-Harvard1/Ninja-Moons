-- NINJA MOONS student access hardening.
-- Deployed to Supabase project eaqwobzxrpplxymumlki as:
--   20261101003516_harden_student_access_active_memberships
-- Follows 20261031_0001_accounts_progress.sql.
-- Require active user profiles, approved student consent, active school membership,
-- and school-scoped active teaching assignments on every student-data read.
create or replace function private.is_school_staff(sid uuid)
returns boolean language sql stable security definer set search_path=''
as $$
select exists (
 select 1 from public.school_staff ss
 join public.schools s on s.id=ss.school_id and s.is_active
 join public.profiles p on p.id=ss.user_id and p.is_active and p.role=ss.role
 where ss.school_id=sid and ss.user_id=(select auth.uid()) and ss.is_active
)
$$;

create or replace function private.can_read_student(sid uuid)
returns boolean language sql stable security definer set search_path=''
as $$
select
 exists (
  select 1 from public.student_user_links l
  join public.student_profiles s on s.id=l.student_id and s.is_active and s.consent_status='approved'
  join public.schools sc on sc.id=s.school_id and sc.is_active
  join public.profiles p on p.id=l.user_id and p.is_active and p.role='student'
  where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active
 )
 or exists (
  select 1 from public.guardian_links g
  join public.student_profiles s on s.id=g.student_id and s.is_active and s.consent_status='approved'
  join public.schools sc on sc.id=s.school_id and sc.is_active
  join public.profiles p on p.id=g.guardian_user_id and p.is_active and p.role='guardian'
  where g.student_id=sid and g.guardian_user_id=(select auth.uid())
    and g.verified_at is not null
 )
 or exists (
  select 1 from public.classroom_enrollments e
  join public.student_profiles s on s.id=e.student_id and s.is_active and s.consent_status='approved'
  join public.classroom_teachers t on t.classroom_id=e.classroom_id and t.is_active
  join public.classrooms c on c.id=e.classroom_id and c.is_active and c.school_id=s.school_id
  join public.schools sc on sc.id=c.school_id and sc.is_active
  join public.school_staff ss on ss.user_id=t.teacher_user_id and ss.school_id=c.school_id
    and ss.is_active and ss.role='teacher'
  join public.profiles p on p.id=t.teacher_user_id and p.is_active and p.role='teacher'
  where e.student_id=sid and e.is_active and t.teacher_user_id=(select auth.uid())
 )
 or exists (
  select 1 from public.student_profiles s
  join public.school_staff ss on ss.school_id=s.school_id
    and ss.is_active and ss.role in ('school_admin','district_admin','owner')
  join public.schools sc on sc.id=ss.school_id and sc.is_active
  join public.profiles p on p.id=ss.user_id and p.is_active and p.role=ss.role
  where s.id=sid and ss.user_id=(select auth.uid())
 )
$$;

create or replace function private.can_record_student(sid uuid)
returns boolean language sql stable security definer set search_path=''
as $$
select exists (
 select 1 from public.student_user_links l
 join public.student_profiles s on s.id=l.student_id and s.is_active and s.consent_status='approved'
 join public.schools sc on sc.id=s.school_id and sc.is_active
 join public.profiles p on p.id=l.user_id and p.is_active and p.role='student'
 where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active
)
$$;
-- SECURITY DEFINER functions live in the non-exposed private schema.
-- Privileges and RLS policies were set in migration 0001.
