-- Only for an adult testing a fictional student. Do not use synthetic exemption for real children.
-- The email allowlist is provisioned separately as a digest and intentionally NOT committed to Git.
alter table public.student_profiles add column if not exists is_synthetic_test boolean not null default false;
update public.student_profiles sp set is_synthetic_test=true
where sp.display_alias='Ninja Student 001' and sp.grade_level='6'
  and exists (select 1 from public.schools sc where sc.id=sp.school_id
    and sc.name='NINJA MOONS Test Academy' and sc.district_ref='DEMO-ONLY');

create table if not exists private.pilot_invitations (
 email_digest bytea primary key,
 student_id uuid not null unique references public.student_profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 redeemed_at timestamptz
);
alter table private.pilot_invitations enable row level security;
revoke all on private.pilot_invitations from public,anon,authenticated;

create or replace function private.activate_pilot_student()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_student uuid;
begin
 if new.email is null or new.email_confirmed_at is null then return new; end if;
 select inv.student_id into v_student from private.pilot_invitations inv
 join public.student_profiles sp on sp.id=inv.student_id and sp.is_synthetic_test
 where inv.email_digest=extensions.digest(lower(btrim(new.email)), 'sha256')
 for update of inv;
 if v_student is null then return new; end if;
 insert into public.profiles(id,display_name,role,is_active)
 values(new.id,'Ninja Student 001','student',true)
 on conflict (id) do update set is_active=true where public.profiles.role='student';
 if not exists(select 1 from public.profiles p where p.id=new.id and p.is_active and p.role='student')
 then return new; end if;
 insert into public.student_user_links(student_id,user_id,is_active)
 values(v_student,new.id,true)
 on conflict (student_id,user_id) do update set is_active=true;
 update private.pilot_invitations set redeemed_at=now()
 where email_digest=extensions.digest(lower(btrim(new.email)), 'sha256');
 return new;
exception when others then
 raise warning 'NINJA MOONS pilot activation failed for auth user';
 return new;
end;
$$;
revoke all on function private.activate_pilot_student() from public,anon,authenticated;
drop trigger if exists on_ninja_pilot_email_confirmed on auth.users;
create trigger on_ninja_pilot_email_confirmed
 after insert or update of email_confirmed_at on auth.users
 for each row execute function private.activate_pilot_student();

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
  join public.student_profiles s on s.id=l.student_id and s.is_active and (s.consent_status='approved' or s.is_synthetic_test)
  join public.schools sc on sc.id=s.school_id and sc.is_active
  join public.profiles p on p.id=l.user_id and p.is_active and p.role='student'
  where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active
 )
 or exists (
  select 1 from public.guardian_links g
  join public.student_profiles s on s.id=g.student_id and s.is_active and (s.consent_status='approved' or s.is_synthetic_test)
  join public.schools sc on sc.id=s.school_id and sc.is_active
  join public.profiles p on p.id=g.guardian_user_id and p.is_active and p.role='guardian'
  where g.student_id=sid and g.guardian_user_id=(select auth.uid())
    and g.verified_at is not null
 )
 or exists (
  select 1 from public.classroom_enrollments e
  join public.student_profiles s on s.id=e.student_id and s.is_active and (s.consent_status='approved' or s.is_synthetic_test)
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
 join public.student_profiles s on s.id=l.student_id and s.is_active and (s.consent_status='approved' or s.is_synthetic_test)
 join public.schools sc on sc.id=s.school_id and sc.is_active
 join public.profiles p on p.id=l.user_id and p.is_active and p.role='student'
 where l.student_id=sid and l.user_id=(select auth.uid()) and l.is_active
)
$$;
-- SECURITY DEFINER functions live in the non-exposed private schema.
-- Privileges and RLS policies were set in migration 0001.
