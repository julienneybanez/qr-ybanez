-- ============================================================
-- QR-ATT — Supabase PostgreSQL Schema
--
-- CANONICAL / FRESH-INSTALL SCHEMA
--
-- This file represents the current database structure used by
-- QR-Ybanez, including:
--
--   • Student, Teacher, and Admin profiles
--   • School-issued Student IDs
--   • Event management
--   • Secure QR attendance validation
--   • Role-based Row Level Security (RLS)
--
-- IMPORTANT:
-- This is the canonical schema for a NEW Supabase project.
-- Do not rerun the entire file on the existing production
-- database unless you intentionally want to recreate/update
-- its database objects.
-- ============================================================


-- ============================================================
-- 1. PROFILES
-- ============================================================

-- Each authenticated user has one profile.
--
-- profiles.id
--   = Supabase Auth UUID
--
-- profiles.student_id
--   = actual school-issued Student ID
--     (example: 20242043)
--
-- Student accounts must have a Student ID.
-- Teacher accounts must NOT have a Student ID.
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key
    references auth.users (id)
    on delete cascade,

  email text not null,

  full_name text,

  role text not null
    default 'student'
    check (
      role in (
        'student',
        'teacher',
        'admin'
      )
    ),

  student_id text,

  created_at timestamptz
    not null
    default now(),

  updated_at timestamptz
    not null
    default now()
);


-- ------------------------------------------------------------
-- Student ID uniqueness
-- ------------------------------------------------------------

create unique index
if not exists profiles_student_id_unique
on public.profiles (student_id)
where student_id is not null;


-- ------------------------------------------------------------
-- Student ID / role consistency
--
-- Student:
--   student_id is required
--
-- Teacher/Admin:
--   student_id must be NULL
-- ------------------------------------------------------------

alter table public.profiles
drop constraint
if exists profiles_student_id_role_check;

alter table public.profiles
add constraint profiles_student_id_role_check
check (
  (
    role = 'student'
    and student_id is not null
  )
  or
  (
    role in ('teacher', 'admin')
    and student_id is null
  )
);


-- ------------------------------------------------------------
-- Enable Row Level Security
-- ------------------------------------------------------------

alter table public.profiles
enable row level security;


-- ------------------------------------------------------------
-- Profiles RLS policies
-- ------------------------------------------------------------

drop policy
if exists "Profiles are viewable by owner"
on public.profiles;

create policy
"Profiles are viewable by owner"
on public.profiles
for select
using (
  auth.uid() = id
);


drop policy
if exists "Users can insert their own profile"
on public.profiles;

create policy
"Users can insert their own profile"
on public.profiles
for insert
with check (
  auth.uid() = id
);


drop policy
if exists "Users can update their own profile"
on public.profiles;

create policy
"Users can update their own profile"
on public.profiles
for update
using (
  auth.uid() = id
)
with check (
  auth.uid() = id
);


-- ============================================================
-- AUTOMATIC PROFILE CREATION
-- ============================================================
--
-- Creates a public.profiles record whenever a new Supabase
-- Auth user is created.
--
-- Metadata expected from the app:
--
--   full_name
--   role
--   student_id
--
-- Students must supply a Student ID.
-- Teachers always receive student_id = NULL.
-- Admin is intentionally not accepted from public signup metadata.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  requested_student_id text;
begin

  requested_role :=
    case
      when new.raw_user_meta_data ->> 'role'
        in (
          'student',
          'teacher'
        )
      then
        new.raw_user_meta_data ->> 'role'

      else
        'student'
    end;


  requested_student_id :=
    nullif(
      trim(
        new.raw_user_meta_data ->> 'student_id'
      ),
      ''
    );


  -- Students must have a Student ID.
  if requested_role = 'student'
     and requested_student_id is null then

    raise exception
      'Student ID is required for student accounts.';

  end if;


  -- Teachers never use a Student ID.
  if requested_role = 'teacher' then
    requested_student_id := null;
  end if;


  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    student_id
  )
  values (
    new.id,

    new.email,

    nullif(
      trim(
        new.raw_user_meta_data ->> 'full_name'
      ),
      ''
    ),

    requested_role,

    requested_student_id
  );


  return new;

end;
$$;


drop trigger
if exists on_auth_user_created
on auth.users;


create trigger on_auth_user_created
after insert
on auth.users
for each row
execute procedure public.handle_new_user();


-- ============================================================
-- PREVENT ROLE CHANGES FROM THE CLIENT
-- ============================================================
--
-- Users may edit their permitted profile information through
-- the app, but authenticated clients cannot change their own
-- role.
--
-- SQL Editor / server-side operations still work because
-- auth.uid() is NULL outside an authenticated client request.
-- ============================================================

create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
set search_path = public
as $profile_guard$
begin

  if new.role is distinct from old.role
     and auth.uid() is not null then

    if not public.is_admin() then
      raise exception
        'Profile role cannot be changed by the client.';
    end if;

    if old.id = auth.uid() then
      raise exception
        'Admins cannot change their own role.';
    end if;

  end if;


  new.updated_at := now();

  return new;

end;
$profile_guard$;


drop trigger
if exists prevent_profile_role_change
on public.profiles;


create trigger prevent_profile_role_change
before update
on public.profiles
for each row
execute procedure public.prevent_profile_role_change();



-- ============================================================
-- ADMIN ROLE CHECK
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $admin$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$admin$;

revoke all
on function public.is_admin()
from public;

grant execute
on function public.is_admin()
to authenticated;


drop policy
if exists "Admins can view all profiles"
on public.profiles;

create policy
"Admins can view all profiles"
on public.profiles
for select
using (
  public.is_admin()
);

drop policy
if exists "Admins can update all profiles"
on public.profiles;

create policy
"Admins can update all profiles"
on public.profiles
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ============================================================
-- 2. EVENTS
-- ============================================================
--
-- Represents a school attendance event.
--
-- event_code:
--   Public identifier encoded inside the QR payload.
--
-- status:
--   open   = attendance may be accepted depending on schedule
--   closed = manually closed by the teacher
--
-- Display states such as Upcoming, Ongoing, and Ended are
-- calculated by the application using start_time/end_time.
-- ============================================================

create table if not exists public.events (
  id uuid primary key
    default gen_random_uuid(),

  event_code text
    not null
    unique,

  title text
    not null,

  venue text,

  description text,

  status text
    not null
    default 'open'
    check (
      status in (
        'open',
        'closed'
      )
    ),

  start_time timestamptz,

  end_time timestamptz,

  late_after_minutes integer
    not null
    default 15
    check (
      late_after_minutes between 0 and 240
    ),

  created_by uuid
    references auth.users (id)
    on delete set null,

  created_at timestamptz
    not null
    default now()
);


alter table public.events
enable row level security;


-- ------------------------------------------------------------
-- Event read access
--
-- Authenticated Students need to read events so scanned QR
-- codes can be validated against the real database record.
-- ------------------------------------------------------------

drop policy
if exists "Events are readable by any authenticated user"
on public.events;


create policy
"Events are readable by any authenticated user"
on public.events
for select
using (
  auth.role() = 'authenticated'
);


-- ------------------------------------------------------------
-- Event creation
--
-- Only Teacher accounts may create events.
-- The created_by value must match the authenticated user.
-- ------------------------------------------------------------

drop policy
if exists "Users can insert events"
on public.events;

drop policy
if exists "Teachers can insert events"
on public.events;


create policy
"Teachers can insert events"
on public.events
for insert
with check (
  auth.uid() = created_by

  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  )
);

drop policy
if exists "Admins can insert events"
on public.events;

create policy
"Admins can insert events"
on public.events
for insert
with check (
  auth.uid() = created_by
  and public.is_admin()
);


-- ------------------------------------------------------------
-- Event updates
--
-- Teachers may update only events they created.
-- ------------------------------------------------------------

drop policy
if exists "Users can update their own events"
on public.events;

drop policy
if exists "Teachers can update their own events"
on public.events;


create policy
"Teachers can update their own events"
on public.events
for update

using (
  auth.uid() = created_by

  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  )
)

with check (
  auth.uid() = created_by

  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'teacher'
  )
);



-- ------------------------------------------------------------
-- Admin event oversight
-- ------------------------------------------------------------

drop policy
if exists "Admins can update all events"
on public.events;

create policy
"Admins can update all events"
on public.events
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


-- ============================================================
-- 3. ATTENDANCE
-- ============================================================
--
-- Records one Student's attendance for one Event.
--
-- IMPORTANT:
--
-- attendance.student_id contains the Student's PROFILE/AUTH UUID.
-- It does NOT contain the school-issued Student ID.
--
-- Example:
--
-- profiles.id
--   = 06f19cc8-75ad-4a2e-8ac0-3bf316151378
--
-- profiles.student_id
--   = 20242043
--
-- attendance.student_id
--   = 06f19cc8-75ad-4a2e-8ac0-3bf316151378
--
-- This preserves proper relational database keys while allowing
-- the school-issued ID to be displayed separately.
-- ============================================================

create table if not exists public.attendance (
  id uuid primary key
    default gen_random_uuid(),

  student_id uuid
    not null
    references auth.users (id)
    on delete cascade,

  event_id uuid
    not null
    references public.events (id)
    on delete cascade,

  scanned_at timestamptz
    not null
    default now(),

  status text
    not null
    default 'present'
    check (
      status in (
        'present',
        'late',
        'excused'
      )
    ),

  unique (
    student_id,
    event_id
  )
);


alter table public.attendance
enable row level security;


-- ============================================================
-- AUTOMATIC ATTENDANCE STATUS
-- ============================================================

create or replace function public.set_attendance_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $attendance$
declare
  event_start timestamptz;
  late_minutes integer;
begin

  select
    e.start_time,
    e.late_after_minutes
  into
    event_start,
    late_minutes
  from public.events e
  where e.id = new.event_id;


  if event_start is not null
     and new.scanned_at >
       event_start
       + make_interval(
           mins => coalesce(late_minutes, 15)
         ) then

    new.status := 'late';

  else

    new.status := 'present';

  end if;


  return new;

end;
$attendance$;


drop trigger
if exists set_attendance_status_before_insert
on public.attendance;


create trigger set_attendance_status_before_insert
before insert
on public.attendance
for each row
execute procedure public.set_attendance_status();


-- ============================================================
-- ATTENDANCE -> PROFILE RELATIONSHIP
-- ============================================================
--
-- This direct foreign key allows Supabase/PostgREST to resolve:
--
-- attendance
--   -> profiles
--
-- It is used by the Teacher History screen to retrieve:
--
--   • Student name
--   • School-issued Student ID
-- ============================================================

alter table public.attendance
drop constraint
if exists attendance_student_profile_fkey;


alter table public.attendance
add constraint attendance_student_profile_fkey
foreign key (student_id)
references public.profiles (id)
on delete cascade;



-- ============================================================
-- ATTENDANCE RLS POLICIES
-- ============================================================


-- ------------------------------------------------------------
-- Students may view only their own attendance.
-- ------------------------------------------------------------

drop policy
if exists "Students can view their own attendance"
on public.attendance;


create policy
"Students can view their own attendance"
on public.attendance
for select
using (
  auth.uid() = student_id
);


-- ------------------------------------------------------------
-- Students may register only their own attendance.
--
-- Attendance is accepted only when:
--
--   • Logged-in account owns the attendance record
--   • Account role is Student
--   • Event exists
--   • Event is open
--   • Event has started
--   • Event has not ended
--
-- Duplicate attendance is also prevented by:
--
--   UNIQUE(student_id, event_id)
-- ------------------------------------------------------------

drop policy
if exists "Students can insert their own attendance"
on public.attendance;


create policy
"Students can insert their own attendance"
on public.attendance
for insert
with check (

  auth.uid() = student_id


  and exists (
    select 1

    from public.profiles p

    where p.id = auth.uid()
      and p.role = 'student'
      and p.student_id is not null
  )


  and exists (
    select 1

    from public.events e

    where e.id = event_id

      and e.status = 'open'

      and (
        e.start_time is null
        or now() >= e.start_time
      )

      and (
        e.end_time is null
        or now() <= e.end_time
      )
  )
);


-- ------------------------------------------------------------
-- Teachers may view attendance only for events they created.
-- ------------------------------------------------------------

drop policy
if exists "Teachers can view attendance for their events"
on public.attendance;


create policy
"Teachers can view attendance for their events"
on public.attendance
for select
using (

  exists (
    select 1

    from public.events e

    where e.id = attendance.event_id
      and e.created_by = auth.uid()
  )
);


-- ------------------------------------------------------------
-- Admins may view all attendance.
-- ------------------------------------------------------------

drop policy
if exists "Admins can view all attendance"
on public.attendance;

create policy
"Admins can view all attendance"
on public.attendance
for select
using (
  public.is_admin()
);

drop policy
if exists "Admins can update all attendance"
on public.attendance;

create policy
"Admins can update all attendance"
on public.attendance
for update
using (
  public.is_admin()
)
with check (
  public.is_admin()
);


drop policy
if exists "Admins can delete attendance"
on public.attendance;

create policy
"Admins can delete attendance"
on public.attendance
for delete
using (
  public.is_admin()
);


-- ------------------------------------------------------------
-- Teachers may read profile information for Students who
-- attended their own events.
--
-- Required by Teacher History for:
--
--   • Student full name
--   • Student ID
-- ------------------------------------------------------------

drop policy
if exists "Teachers can view profiles of their attendees"
on public.profiles;


create policy
"Teachers can view profiles of their attendees"
on public.profiles
for select
using (

  exists (
    select 1

    from public.attendance a

    join public.events e
      on e.id = a.event_id

    where a.student_id = profiles.id
      and e.created_by = auth.uid()
  )
);



-- ============================================================
-- 4. AUDIT LOGS / SYSTEM RECORDS
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key
    default gen_random_uuid(),

  actor_id uuid
    references public.profiles (id)
    on delete set null,

  action text
    not null,

  entity_type text
    not null,

  entity_id text,

  details jsonb
    not null
    default '{}'::jsonb,

  created_at timestamptz
    not null
    default now()
);


alter table public.audit_logs
enable row level security;


drop policy
if exists "Admins can view audit logs"
on public.audit_logs;


create policy
"Admins can view audit logs"
on public.audit_logs
for select
using (
  public.is_admin()
);


create or replace function public.audit_event_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_event$
declare
  audit_action text;
begin

  if tg_op = 'INSERT' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      coalesce(auth.uid(), new.created_by),
      'event_created',
      'event',
      new.id::text,
      jsonb_build_object(
        'title', new.title,
        'event_code', new.event_code,
        'status', new.status
      )
    );

    return new;

  end if;


  if old.status is distinct from new.status
     and new.status = 'closed' then
    audit_action := 'event_closed';
  else
    audit_action := 'event_updated';
  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    audit_action,
    'event',
    new.id::text,
    jsonb_build_object(
      'title', new.title,
      'event_code', new.event_code,
      'old_status', old.status,
      'new_status', new.status
    )
  );


  return new;

end;
$audit_event$;


drop trigger
if exists audit_event_change_trigger
on public.events;


create trigger audit_event_change_trigger
after insert or update
on public.events
for each row
execute procedure public.audit_event_change();


create or replace function public.audit_attendance_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_attendance$
declare
  event_title text;
  event_code_value text;
  event_ref uuid;
begin

  if tg_op = 'DELETE' then
    event_ref := old.event_id;
  else
    event_ref := new.event_id;
  end if;


  select
    e.title,
    e.event_code
  into
    event_title,
    event_code_value
  from public.events e
  where e.id = event_ref;


  if tg_op = 'INSERT' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      coalesce(auth.uid(), new.student_id),
      'attendance_recorded',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id', new.event_id,
        'event_title', event_title,
        'event_code', event_code_value,
        'status', new.status
      )
    );

    return new;

  end if;


  if tg_op = 'UPDATE' then

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      details
    )
    values (
      auth.uid(),
      'attendance_updated',
      'attendance',
      new.id::text,
      jsonb_build_object(
        'event_id', new.event_id,
        'event_title', event_title,
        'old_status', old.status,
        'new_status', new.status,
        'student_id', new.student_id
      )
    );

    return new;

  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    'attendance_deleted',
    'attendance',
    old.id::text,
    jsonb_build_object(
      'event_id', old.event_id,
      'event_title', event_title,
      'status', old.status,
      'student_id', old.student_id
    )
  );


  return old;

end;
$audit_attendance$;


drop trigger
if exists audit_attendance_change_trigger
on public.attendance;


create trigger audit_attendance_change_trigger
after insert or update or delete
on public.attendance
for each row
execute procedure public.audit_attendance_change();


create or replace function public.audit_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $audit_profile$
begin

  if old.full_name is not distinct from new.full_name
     and old.role is not distinct from new.role
     and old.student_id is not distinct from new.student_id then
    return new;
  end if;


  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    details
  )
  values (
    auth.uid(),
    'profile_updated',
    'profile',
    new.id::text,
    jsonb_build_object(
      'target_email', new.email,
      'old_role', old.role,
      'new_role', new.role,
      'old_student_id', old.student_id,
      'new_student_id', new.student_id
    )
  );


  return new;

end;
$audit_profile$;


drop trigger
if exists audit_profile_change_trigger
on public.profiles;


create trigger audit_profile_change_trigger
after update
on public.profiles
for each row
execute procedure public.audit_profile_change();


create index
if not exists audit_logs_created_at_idx
on public.audit_logs (created_at desc);

create index
if not exists audit_logs_actor_id_idx
on public.audit_logs (actor_id);


-- ============================================================
-- REPORTING / ADMIN INDEXES
-- ============================================================

create index
if not exists profiles_role_idx
on public.profiles (role);

create index
if not exists events_created_by_idx
on public.events (created_by);

create index
if not exists attendance_event_id_idx
on public.attendance (event_id);

create index
if not exists attendance_scanned_at_idx
on public.attendance (scanned_at);

create index
if not exists attendance_status_idx
on public.attendance (status);


-- ------------------------------------------------------------
-- Realtime attendance monitoring
-- ------------------------------------------------------------

do $realtime$
begin
  alter publication supabase_realtime
  add table public.attendance;
exception
  when duplicate_object then
    null;
end
$realtime$;


-- ============================================================
-- END OF QR-ATT SCHEMA
-- ============================================================